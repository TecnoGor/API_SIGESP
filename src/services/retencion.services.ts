import { poolSigesp } from "../database/db.js";
import apiExternaClient from "../utils/apiExternaClient.js";
import { AppError } from "../utils/appError.js";
import * as func from "../utils/funcionesGlobales.js";
import type { IRetencionIslr } from "../types/IRetencionIslr.js";
import type { IResponseRetencion } from "../types/IResponseRetencion.js";
import type { IRetencionIva } from "../types/IRetencionIva.js";
import type { IRetencionIslrDetPayload } from "../types/IRetencionIslrDetPayload.js";
import type { IRetencionIvaDetPayload } from "../types/IRetencionIvaDetPayload.js";

// ? LISTA: 17-09-2026
export async function postAgregarRetencionIsrlService(
    numcom: string,
    codigo_usuario: string,
): Promise<IResponseRetencion> {
    let prm_numcom;
    let numsol;

    // REDIS. Arma la clave del documento que se va a procesar
    const documento = `ISLR:${numcom.toString()}`;
    const lockKey = `LOCK:${documento}`; // 👈 Clave efímera solo para concurrencia
    let lockToken: string | null = null; // 👇 guardaremos el Token Único para el bloqueo

    try {
        // 👇 1. REDIS. Para evitar concurrencia (DOBLE CLIC) - Bloqueo de 30s
        lockToken = await func.adquirirLockRedis(
            lockKey,
            "service:postAgregarRetencionIsrlService",
        );

        if (!lockToken) {
            throw new AppError(
                "Esta Retencion de ISLR está siendo procesada en este instante. Evite hacer doble clic y espere unos segundos.",
                429,
                "service:postAgregarRetencionIsrlService",
            );
        }

        // 👇 PASO 2. REDIS. Verificacion HISTÓRICA si la clave en Redis existe y su estatus
        await func.verificaKeyRedis(
            documento,
            "service:postAgregarRetencionIsrlService",
        );

        // 👇 PASO 3. Busco los datos de la retencion
        const query = "SELECT * FROM fn_api_get_retencion_islr_detalle($1)";
        const result = await poolSigesp.query<IRetencionIslr>(query, [numcom]);

        // verifico si existe la retencion
        if (result.rows.length <= 0) {
            throw new AppError(
                "Retención no encontrada",
                404,
                "service:postAgregarRetencionIsrlService",
            );
        }

        //
        const estado = result.rows[0].estado?.trim() ?? "";
        const observacion = result.rows[0].observacion?.trim() ?? "";
        const numControl = result.rows[0]?.num_control?.trim() ?? "";
        numsol = result.rows[0]?.numsol?.trim() ?? "";
        prm_numcom = result.rows[0]?.numcom?.trim() ?? "";

        // 👇 PASO 4. Verifico el estado del documento (NOTA DE CREDITO).
        if (estado?.toUpperCase() === "RECHAZADO") {
            throw new AppError(
                `La Retencion de ISLR ${prm_numcom} fue rechazada por la imprenta digital por el siguiente motivo: ${observacion}`,
                409,
                "service:postAgregarRetencionIsrlService",
            );
        }

        if (estado?.toUpperCase() === "ENVIADO" && numControl) {
            throw new AppError(
                `La Retencion de ISLR ${prm_numcom} ya fue enviada a la imprenta digital.`,
                409,
                "service:postAgregarRetencionIsrlService",
            );
        }

        // TODO: FALTA VERIFICAR SI LOS DOCUMENTOS ASOCIADOS A LA RETENCION YA FUERON ENVIADOS ANTERIORMENTE

        // Datos del Encabezado (Cliente)
        const encabezadoRet = result.rows[0];

        // Datos del detalle de la retencion
        const detalleRet: IRetencionIslrDetPayload[] = result.rows.map(
            (row) => {
                return {
                    numeroDocumento: row.numfac?.trim() ?? "",
                    numeroControl: row.numcon?.trim() ?? "",
                    fecha: row.fecfac?.trim() ?? "",
                    codigo: row.numope?.trim() ?? "",
                    conceptoPago: row.consol?.trim() ?? "",
                    montoDocumento: row.totcmp_con_iva,
                    baseRetencion: row.basimp,
                    sustraendo: row.sustraendo,
                    porcentaje: row.porded?.trim() ?? "",
                    montoRetenido: row.cmp_monret,
                    codigoRetencionIslr: row.id_codigo_ret?.trim() ?? "",
                };
            },
        );

        // 👇 PASO 5. Se validan los campos requeridos y formatos
        await validarPayloadRetencionIslr(encabezadoRet, detalleRet);

        // 👇 PASO 6. Construir objeto para enviarlo a la api externa
        const payLoad = {
            data: [
                {
                    cliente: [
                        {
                            documentoIdentidadCliente:
                                encabezadoRet.rif?.trim() ?? "",
                            nombreRazonSocialCliente:
                                encabezadoRet.nomsujret?.trim() ?? "",
                            correoCliente: encabezadoRet.email?.trim() ?? "",
                            direccionCliente:
                                encabezadoRet.dirsujret?.trim() ?? "",
                            telefonoCliente:
                                encabezadoRet.telefono?.trim() ?? "",
                        },
                    ],
                    retencionIslr: detalleRet,
                },
            ],
        };

        // 👇 PASO 7. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // No le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post(
            "/api/Invoice/add_retention_islr",
            payLoad,
        );

        // Validacion estricta de la respuesta
        const datosResp = response?.data;

        // Validamos que sea un objeto plano válido
        if (
            !datosResp ||
            typeof datosResp !== "object" ||
            Array.isArray(datosResp)
        ) {
            throw new AppError(
                `El proveedor devolvió una estructura de respuesta inválida para la retencion de ISLR ${prm_numcom}.`,
                502,
                "service:postAgregarRetencionIsrlService",
            );
        }

        if (datosResp.success === false) {
            // Validamos y obtengo la respuesta
            const msgProveedor =
                typeof datosResp.message === "string"
                    ? datosResp.message.trim()
                    : "Sin detalle del proveedor";

            const errorMsg = `${msgProveedor} ${prm_numcom}`;

            // 👇 PASO 7.1. REDIS. Actualiza la clave del documento en Redis (RECHAZO)
            await func.actualizarKeyRedis(documento, {
                estatusEnvioRedis: 0,
                numcom: (prm_numcom ?? "").trim(),
                numsol: (numsol ?? "").trim(),
                codtipdoc: "ISLR",
                estado: "RECHAZADO",
                num_control: null,
                url_pdf: null,
                observacion: errorMsg.trim(),
                codusu: (codigo_usuario ?? "").trim(),
                api_modulo: "SIGESP",
                api_id_origen: null,
            });

            throw new AppError(
                `${errorMsg.trim()}`,
                409,
                "service:postAgregarRetencionIsrlService",
            );
        }

        // 1. Validar Mensaje de éxito
        const msgExito =
            typeof datosResp.Mensaje === "string"
                ? datosResp.Mensaje.trim()
                : "Retenciones guardadas con éxito.";

        // 2. Extraer número de control de forma segura (Arreglo simple)
        const rawControl = datosResp.controles_usados?.[0];
        const control_number =
            typeof rawControl === "string" ? rawControl.trim() : "";

        // 3. Extraer URL del PDF de forma segura (Arreglo anidado)
        const rawPdf = datosResp.pdf?.[0]?.[0];
        const retention_pdf = typeof rawPdf === "string" ? rawPdf.trim() : "";

        // 4. Validación final de campos obligatorios
        if (!control_number || !retention_pdf) {
            throw new AppError(
                `El proveedor procesó la retencion de ISLR ${prm_numcom} (200 OK) pero omitió campos fiscales obligatorios (control_number o retention_pdf).`,
                502,
                "service:postAgregarRetencionIsrlService",
            );
        }

        // 👇 PASO 8. REDIS. Actualiza la clave del documento en Redis (ENVIADO)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: 1,
            numcom: (prm_numcom ?? "").trim(),
            numsol: (numsol ?? "").trim(),
            codtipdoc: "ISLR",
            estado: "ENVIADO",
            num_control: (control_number ?? "").trim(),
            url_pdf: (retention_pdf ?? "").trim(),
            observacion: msgExito.trim(),
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        const data = {
            control_number: (control_number ?? "").trim(),
            retention_pdf: (retention_pdf ?? "").trim(),
        };

        // retornamos la respuesta
        return data;
    } catch (error: any) {
        // ✅ Por aquí entran los errores lanzados con throw new AppError. Ya tiene statusCode y location
        if (error instanceof AppError) {
            throw error;
        }

        // ✅ Por aquí entran los errores lanzados por la API externa (ej. 400)
        if (error?.response?.data) {
            const errorMessage = safeTrim(
                error.response.data.message,
                "Error en API externa",
            );

            // 👇 REDIS. Actualiza la clave del documento en Redis (RECHAZO)
            await func.actualizarKeyRedis(documento, {
                estatusEnvioRedis: 0,
                numcom: prm_numcom?.trim(),
                numsol: numsol?.trim(),
                codtipdoc: "ISLR",
                estado: "RECHAZADO",
                num_control: null,
                url_pdf: null,
                observacion: `${errorMessage} ${prm_numcom}`,
                codusu: (codigo_usuario ?? "").trim(),
                api_modulo: "SIGESP",
                api_id_origen: null,
            });

            throw new AppError(
                errorMessage,
                error.response.status || 400,
                "service:postAgregarRetencionIsrlService",
            );
        }

        // ✅ Por aquí entran los errores 500 o no capturados
        const fallbackMessage = safeTrim(error?.message, "Error desconocido");

        // 👇 REDIS. Actualiza la clave del documento en Redis (ERROR)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: -1,
            numcom: (prm_numcom ?? "").trim(),
            numsol: (numsol ?? "").trim(),
            codtipdoc: "ISLR",
            estado: "ERROR",
            num_control: null,
            url_pdf: null,
            observacion: prm_numcom
                ? `${fallbackMessage} ${prm_numcom}`
                : fallbackMessage,
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        throw new AppError(
            fallbackMessage,
            500,
            "service:postAgregarRetencionIsrlService",
        );
    } finally {
        // 👇 REDIS. Liberacion del bloqueo. Sin importar si fue un éxito o si explotó por un error, liberamos la puerta.
        if (lockToken) {
            await func.liberarLockRedis(lockKey, lockToken);
        }
    }
}

// ? LISTA: 17-09-2026
export async function postAgregarRetencionIvaService(
    numcom: string,
    codigo_usuario: string,
): Promise<IResponseRetencion> {
    let prm_numcom;
    let numsol;

    // REDIS. Arma la clave del documento que se va a procesar
    const documento = `IVA:${numcom.toString()}`;
    const lockKey = `LOCK:${documento}`; // 👈 Clave efímera solo para concurrencia
    let lockToken: string | null = null; // 👇 guardaremos el Token Único para el bloqueo

    try {
        // 👇 1. REDIS. Para evitar concurrencia (DOBLE CLIC) - Bloqueo de 30s
        lockToken = await func.adquirirLockRedis(
            lockKey,
            "service:postAgregarRetencionIvaService",
        );

        if (!lockToken) {
            throw new AppError(
                "Esta Retencion de IVA está siendo procesada en este instante. Evite hacer doble clic y espere unos segundos.",
                429,
                "service:postAgregarRetencionIvaService",
            );
        }

        // 👇 PASO 2. REDIS. Verificacion HISTÓRICA si la clave en Redis existe y su estatus
        await func.verificaKeyRedis(
            documento,
            "service:postAgregarRetencionIvaService",
        );

        // 👇 PASO 3. Busco los datos de la retencion
        const query = "SELECT * FROM fn_api_get_retencion_iva_detalle($1)";
        const result = await poolSigesp.query<IRetencionIva>(query, [numcom]);

        // verifico si existe la retencion
        if (result.rows.length <= 0) {
            throw new AppError(
                "Retención no encontrada",
                404,
                "service:postAgregarRetencionIvaService",
            );
        }

        //
        const estado = result.rows[0].estado?.trim() ?? "";
        const observacion = result.rows[0].observacion?.trim() ?? "";
        const numControl = result.rows[0]?.num_control?.trim() ?? "";
        numsol = result.rows[0]?.numsol?.trim() ?? "";
        prm_numcom = result.rows[0]?.numcom?.trim() ?? "";

        // 👇 PASO 4. Verifico el estado del documento (NOTA DE CREDITO).
        if (estado?.toUpperCase() === "RECHAZADO") {
            throw new AppError(
                `La Retencion de IVA ${prm_numcom} fue rechazada por la imprenta digital por el siguiente motivo: ${observacion}`,
                409,
                "service:postAgregarRetencionIvaService",
            );
        }

        if (estado?.toUpperCase() === "ENVIADO" && numControl) {
            throw new AppError(
                `La Retencion de IVA ${prm_numcom} ya fue enviada a la imprenta digital.`,
                409,
                "service:postAgregarRetencionIvaService",
            );
        }

        // TODO: FALTA VERIFICAR SI LOS DOCUMENTOS ASOCIADOS A LA RETENCION YA FUERON ENVIADOS ANTERIORMENTE

        // Datos del Encabezado (Cliente)
        const encabezadoRet = result.rows[0];

        // Datos del detalle de la retencion
        const detalleRet: IRetencionIvaDetPayload[] = result.rows.map((row) => {
            return {
                fechaDeFactura: row.fecfac?.trim() ?? "",
                numeroFactura: row.numfac?.trim() ?? "",
                numeroControl: row.numcon?.trim() ?? "",
                numeroNotaDeCredito: row.nota_credito?.trim() ?? "",
                numeroNotaDeDebito: row.nota_debito?.trim() ?? "",
                numeroFacturaAfectada: row.factura_afectada?.trim() ?? "",
                totalDeCompraIncluyendoIva: row.totcmp_con_iva,
                compraSinDerechoACreditoFiscal: row.compsinderiva,
                baseImponible: row.basimp,
                porcentaje_iva: row.porimp?.trim() ?? "",
                porcentaje: row.porded?.trim() ?? "",
            };
        });

        // 👇 PASO 5. Se validan los campos requeridos y formatos
        await validarPayloadRetencionIva(encabezadoRet, detalleRet);

        // 👇 PASO 6. Construir objeto para enviarlo a la api externa
        const payLoad = {
            data: [
                {
                    cliente: [
                        {
                            documentoIdentidadCliente:
                                encabezadoRet.rif?.trim() ?? "",
                            nombreRazonSocialCliente:
                                encabezadoRet.nomsujret?.trim() ?? "",
                            correoCliente: encabezadoRet.email?.trim() ?? "",
                            direccionCliente:
                                encabezadoRet.dirsujret?.trim() ?? "",
                            telefonoCliente:
                                encabezadoRet.telefono?.trim() ?? "",
                        },
                    ],
                    RetencionIva: detalleRet,
                },
            ],
        };

        // 👇 PASO 7. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // No le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post(
            "/api/Invoice/add_retention_iva",
            payLoad,
        );

        // Validacion estricta de la respuesta
        const datosResp = response?.data;

        // Validamos que sea un objeto plano válido
        if (
            !datosResp ||
            typeof datosResp !== "object" ||
            Array.isArray(datosResp)
        ) {
            throw new AppError(
                `El proveedor devolvió una estructura de respuesta inválida para la retencion de IVA ${prm_numcom}.`,
                502,
                "service:postAgregarRetencionIvaService",
            );
        }

        if (datosResp.success === false) {
            // Validamos y obtengo la respuesta
            const msgProveedor =
                typeof datosResp.message === "string"
                    ? datosResp.message.trim()
                    : "Sin detalle del proveedor";

            const errorMsg = `${msgProveedor} ${prm_numcom}`;

            // 👇 PASO 7.1. REDIS. Actualiza la clave del documento en Redis (RECHAZO)
            await func.actualizarKeyRedis(documento, {
                estatusEnvioRedis: 0,
                numcom: (prm_numcom ?? "").trim(),
                numsol: (numsol ?? "").trim(),
                codtipdoc: "IVA",
                estado: "RECHAZADO",
                num_control: null,
                url_pdf: null,
                observacion: errorMsg.trim(),
                codusu: (codigo_usuario ?? "").trim(),
                api_modulo: "SIGESP",
                api_id_origen: null,
            });

            throw new AppError(
                `${errorMsg.trim()}`,
                409,
                "service:postAgregarRetencionIvaService",
            );
        }

        // 1. Validar Mensaje de éxito
        const msgExito =
            typeof datosResp.Mensaje === "string"
                ? datosResp.Mensaje.trim()
                : "Retenciones guardadas con éxito.";

        // 2. Extraer número de control de forma segura (Arreglo simple)
        const rawControl = datosResp.controles_usados?.[0];
        const control_number =
            typeof rawControl === "string" ? rawControl.trim() : "";

        // 3. Extraer URL del PDF de forma segura (Arreglo anidado)
        const rawPdf = datosResp.pdf?.[0]?.[0];
        const retention_pdf = typeof rawPdf === "string" ? rawPdf.trim() : "";

        if (!control_number || !retention_pdf) {
            throw new AppError(
                `El proveedor procesó la retencion de IVA ${prm_numcom} (200 OK) pero omitió campos fiscales obligatorios (control_number o retention_pdf).`,
                502,
                "service:postAgregarRetencionIvaService",
            );
        }

        // 👇 PASO 8. REDIS. Actualiza la clave del documento en Redis (ENVIADO)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: 1,
            numcom: (prm_numcom ?? "").trim(),
            numsol: (numsol ?? "").trim(),
            codtipdoc: "IVA",
            estado: "ENVIADO",
            num_control: (control_number ?? "").trim(),
            url_pdf: (retention_pdf ?? "").trim(),
            observacion: msgExito.trim(),
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        const data = {
            control_number: (control_number ?? "").trim(),
            retention_pdf: (retention_pdf ?? "").trim(),
        };

        // retornamos la respuesta
        return data;
    } catch (error: any) {
        // ✅ Por aquí entran los errores lanzados con throw new AppError. Ya tiene statusCode y location
        if (error instanceof AppError) {
            throw error;
        }

        // ✅ Por aquí entran los errores lanzados por la API externa (ej. 400)
        if (error?.response?.data) {
            const errorMessage = safeTrim(
                error.response.data.message,
                "Error en API externa",
            );

            // 👇 REDIS. Actualiza la clave del documento en Redis (RECHAZO)
            await func.actualizarKeyRedis(documento, {
                estatusEnvioRedis: 0,
                numcom: prm_numcom?.trim(),
                numsol: numsol?.trim(),
                codtipdoc: "IVA",
                estado: "RECHAZADO",
                num_control: null,
                url_pdf: null,
                observacion: `${errorMessage} ${prm_numcom}`,
                codusu: (codigo_usuario ?? "").trim(),
                api_modulo: "SIGESP",
                api_id_origen: null,
            });

            throw new AppError(
                errorMessage,
                error.response.status || 400,
                "service:postAgregarRetencionIvaService",
            );
        }

        // ✅ Por aquí entran los errores 500 o no capturados
        const fallbackMessage = safeTrim(error?.message, "Error desconocido");

        // 👇 REDIS. Actualiza la clave del documento en Redis (ERROR)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: -1,
            numcom: (prm_numcom ?? "").trim(),
            numsol: (numsol ?? "").trim(),
            codtipdoc: "IVA",
            estado: "ERROR",
            num_control: null,
            url_pdf: null,
            observacion: prm_numcom
                ? `${fallbackMessage} ${prm_numcom}`
                : fallbackMessage,
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        throw new AppError(
            fallbackMessage,
            500,
            "service:postAgregarRetencionIvaService",
        );
    } finally {
        // 👇 REDIS. Liberacion del bloqueo. Sin importar si fue un éxito o si explotó por un error, liberamos la puerta.
        if (lockToken) {
            await func.liberarLockRedis(lockKey, lockToken);
        }
    }
}

// ? LISTA: 17-09-2026
async function validarPayloadRetencionIslr(
    encRetencion: IRetencionIslr,
    detRetencion: IRetencionIslrDetPayload[],
): Promise<void> {
    // Helper para convertir strings con formato "123,45" a número
    const parseMonto = (val: string): number => {
        if (!val) return 0;

        return parseFloat(val.toString().trim().replace(",", "."));
    };

    const rifRegex = /^[VEPJGC]\d{5,}$/i;
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
    const precioRegex = /^\d+(,\d{1,2})?$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const tipoPersona = encRetencion.rif.trim().charAt(0);
    const esJuridica = ["J", "G", "C"].includes(tipoPersona);

    // 1. Validar Documento de Identidad (V, E, P, J, G, C + min 5 dígitos)
    if (!rifRegex.test(encRetencion.rif.trim())) {
        throw new AppError(
            `El documento de identidad ('${encRetencion.rif.trim()}') no cumple con el formato fiscal requerido.`,
            400,
            "service:validarPayloadRetencionIslr",
        );
    }

    // 2. Valida que el nombre del cliente no sea vacio o nulo
    if (!encRetencion.nomsujret || encRetencion.nomsujret.trim().length <= 0) {
        throw new AppError(
            "El nombre de la razón social del cliente es requerido.",
            400,
            "service:validarPayloadRetencionIslr",
        );
    }

    // 3. Validar Correo Electrónico
    if (!encRetencion.email || !emailRegex.test(encRetencion.email.trim())) {
        throw new AppError(
            `El correo del cliente ('${encRetencion.email.trim()}') no posee un formato válido.`,
            400,
            "service:validarPayloadRetencionIslr",
        );
    }

    // 4. Valida que la direccion del cliente no sea vacio o nulo
    if (!encRetencion.dirsujret || encRetencion.dirsujret.trim().length <= 0) {
        throw new AppError(
            "La dirección del Cliente es requerida.",
            400,
            "service:validarPayloadRetencionIslr",
        );
    }

    // 5. Valida que el telefono del cliente no sea vacio o nulo
    if (!encRetencion.telefono || encRetencion.telefono.trim().length <= 0) {
        throw new AppError(
            "El número de teléfono del Cliente es requerido.",
            400,
            "service:validarPayloadRetencionIslr",
        );
    }

    // 6. Validar Detalle
    if (!detRetencion || detRetencion.length === 0) {
        throw new AppError(
            "La retención debe tener al menos una factura asociada.",
            400,
            "service:validarPayloadRetencionIslr",
        );
    }

    // 7. Verifico la configuracion del parametro cantidad_doc_ret
    if (!encRetencion.cantidad_doc_ret || encRetencion.cantidad_doc_ret <= 0) {
        throw new AppError(
            "Falta configurar el parametro cantidad_doc_ret.",
            400,
            "service:validarPayloadRetencionIslr",
        );
    }

    // 8. Verifico la cantidad de facturas asociadas a la retencion. No puede ser mayor a 3 facturas
    if (detRetencion.length > encRetencion.cantidad_doc_ret) {
        throw new AppError(
            "La retención solo pertmite un máximo de 3 facturas por documento",
            400,
            "service:validarPayloadRetencionIslr",
        );
    }

    for (const ret of detRetencion) {
        // 9. Valida que el numero de factura no sea vacio o nulo
        if (!ret.numeroDocumento || ret.numeroDocumento.trim().length <= 0) {
            throw new AppError(
                "El número de factura es requerido.",
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 10. Valida que el numero de factura no sea vacio o nulo
        if (!ret.numeroControl || ret.numeroControl.trim().length <= 0) {
            throw new AppError(
                `El número de control de la factura ${ret.numeroDocumento.trim()} es requerido.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 11. Validar la Fceha de la Tasa del Día en formato ("YYYY-MM-DD")
        if (!ret.fecha || !fechaRegex.test(ret.fecha.trim())) {
            throw new AppError(
                `La fecha de la factura ('${ret.numeroDocumento.trim()}') no tiene un formato válido (YYYY-MM-DD).`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 12. Valida que el codigo de la retencion no sea vacio o nulo
        if (!ret.codigo || ret.codigo.trim().length <= 0) {
            throw new AppError(
                `El código de retención de la factura ${ret.numeroDocumento.trim()} es requerido.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 13. Valida que el nombre del producto no sea vacio o nulo
        if (!ret.conceptoPago || ret.conceptoPago.trim().length <= 0) {
            throw new AppError(
                `El concepto del pago de la factura ${ret.numeroDocumento.trim()} es requerido.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 14. Valida que el monto de la factura sea valido y mantenga la coma como separador decimal
        if (
            parseMonto(ret.montoDocumento) <= 0 ||
            !precioRegex.test(ret.montoDocumento)
        ) {
            throw new AppError(
                `El monto total de la factura ${ret.numeroDocumento.trim()} debe ser mayor a 0 y usar coma como separador decimal.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 15. Valida que el monto de la base imponible sea valido y mantenga la coma como separador decimal
        if (
            parseMonto(ret.baseRetencion) <= 0 ||
            !precioRegex.test(ret.baseRetencion)
        ) {
            throw new AppError(
                `La base imponible de la factura ${ret.numeroDocumento.trim()} debe ser mayor a 0 y usar coma como separador decimal.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 16. Validar Sustraendo según Tipo de Persona (Natural vs Jurídica)
        // Convertir valor con coma a numérico para evaluar
        const valorSustraendo = parseMonto(ret.sustraendo);

        if (esJuridica && valorSustraendo !== 0) {
            throw new AppError(
                `Para Personas Jurídicas (${tipoPersona}), el sustraendo debe ser '0' o '0,00'.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        if (!esJuridica && valorSustraendo <= 0) {
            throw new AppError(
                `Para Personas Naturales (${tipoPersona}), el sustraendo debe ser un valor mayor a 0.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        if (valorSustraendo > 0 && !precioRegex.test(ret.sustraendo)) {
            throw new AppError(
                `El sustraendo de la factura ${ret.numeroDocumento.trim()} debe usar coma como separador decimal.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 17. Valida el porcentaje de retencion
        if (!ret.porcentaje || ret.porcentaje.trim().length <= 0) {
            throw new AppError(
                `El Porcentaje de retención de la factura ${ret.numeroDocumento.trim()} es requerido.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 18. Valida que el monto de la retencion sea valido y mantenga la coma como separador decimal
        if (
            parseMonto(ret.montoRetenido) <= 0 ||
            !precioRegex.test(ret.montoRetenido)
        ) {
            throw new AppError(
                `El monto de la retención de la factura ${ret.numeroDocumento.trim()} debe ser mayor a 0 y usar coma como separador decimal.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }

        // 19. Valida que el Id de la retencion no sea vacio o nulo
        if (
            !ret.codigoRetencionIslr ||
            ret.codigoRetencionIslr.trim().length <= 0
        ) {
            throw new AppError(
                `El ID de la retención de la factura ${ret.numeroDocumento.trim()} es requerido.`,
                400,
                "service:validarPayloadRetencionIslr",
            );
        }
    }
}

// ? LISTA: 17-09-2026
async function validarPayloadRetencionIva(
    encRetencion: IRetencionIva,
    detRetencion: IRetencionIvaDetPayload[],
): Promise<void> {
    // Helper para convertir strings con formato "123,45" a número
    const parseMonto = (val: string): number => {
        if (!val) return 0;

        return parseFloat(val.toString().trim().replace(",", "."));
    };

    const rifRegex = /^[VEPJGC]\d{5,}$/i;
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
    const precioRegex = /^\d+(,\d{1,2})?$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Validar Documento de Identidad (V, E, P, J, G, C + min 5 dígitos)
    if (!rifRegex.test(encRetencion.rif.trim())) {
        throw new AppError(
            `El documento de identidad ('${encRetencion.rif.trim()}') no cumple con el formato fiscal requerido.`,
            400,
            "service:validarPayloadRetencionIva",
        );
    }

    // 2. Valida que el nombre del cliente no sea vacio o nulo
    if (!encRetencion.nomsujret || encRetencion.nomsujret.trim().length <= 0) {
        throw new AppError(
            "El nombre de la razón social del cliente es requerido.",
            400,
            "service:validarPayloadRetencionIva",
        );
    }

    // 3. Validar Correo Electrónico
    if (!encRetencion.email || !emailRegex.test(encRetencion.email.trim())) {
        throw new AppError(
            `El correo del cliente ('${encRetencion.email.trim()}') no posee un formato válido.`,
            400,
            "service:validarPayloadRetencionIva",
        );
    }

    // 4. Valida que la direccion del cliente no sea vacio o nulo
    if (!encRetencion.dirsujret || encRetencion.dirsujret.trim().length <= 0) {
        throw new AppError(
            "La dirección del Cliente es requerida.",
            400,
            "service:validarPayloadRetencionIva",
        );
    }

    // 5. Valida que el telefono del cliente no sea vacio o nulo
    if (!encRetencion.telefono || encRetencion.telefono.trim().length <= 0) {
        throw new AppError(
            "El número de teléfono del Cliente es requerido.",
            400,
            "service:validarPayloadRetencionIva",
        );
    }

    // 6. Verifico la configuracion del parametro cantidad_doc_ret
    if (!encRetencion.cantidad_doc_ret || encRetencion.cantidad_doc_ret <= 0) {
        throw new AppError(
            "Falta configurar el parametro cantidad_doc_ret.",
            400,
            "service:validarPayloadRetencionIva",
        );
    }

    // 7. Validar Detalle
    if (!detRetencion || detRetencion.length === 0) {
        throw new AppError(
            "La retención debe tener al menos una factura asociada.",
            400,
            "service:validarPayloadRetencionIva",
        );
    }

    // 8. Verifico la cantidad de facturas asociadas a la retencion. No puede ser mayor a 3 facturas
    if (detRetencion.length > encRetencion.cantidad_doc_ret) {
        throw new AppError(
            "La retención solo pertmite un máximo de 3 facturas por documento",
            400,
            "service:validarPayloadRetencionIva",
        );
    }

    for (const ret of detRetencion) {
        // 9. Valida que el numero de factura no sea vacio o nulo
        if (!ret.numeroFactura || ret.numeroFactura.trim().length <= 0) {
            throw new AppError(
                "El número de factura es requerido.",
                400,
                "service:validarPayloadRetencionIva",
            );
        }

        // 10. Validar la Fceha de la Tasa del Día en formato ("DD-MM-YYYY" o "YYYY-MM-DD")
        if (
            !ret.fechaDeFactura ||
            !fechaRegex.test(ret.fechaDeFactura.trim())
        ) {
            throw new AppError(
                `La fecha de la factura ('${ret.numeroFactura.trim()}') no tiene un formato válido (YYYY-MM-DD).`,
                400,
                "service:validarPayloadRetencionIva",
            );
        }

        // 11. Valida que el numero de factura no sea vacio o nulo
        if (!ret.numeroControl || ret.numeroControl.trim().length <= 0) {
            throw new AppError(
                `El número de control de la factura ${ret.numeroFactura.trim()} es requerido.`,
                400,
                "service:validarPayloadRetencionIva",
            );
        }

        // 12. Valida que el monto de la factura sea valido y mantenga la coma como separador decimal
        if (
            parseMonto(ret.totalDeCompraIncluyendoIva) <= 0 ||
            !precioRegex.test(ret.totalDeCompraIncluyendoIva)
        ) {
            throw new AppError(
                `El monto total de la compra incluyendo iva de la factura ${ret.numeroFactura.trim()} debe ser mayor a 0 y usar coma como separador decimal.`,
                400,
                "service:validarPayloadRetencionIva",
            );
        }

        // 13. Valida que el monto de la factura sea valido y mantenga la coma como separador decimal
        if (
            parseMonto(ret.compraSinDerechoACreditoFiscal) < 0 ||
            !precioRegex.test(ret.compraSinDerechoACreditoFiscal)
        ) {
            throw new AppError(
                `El monto total de la compra sin derecho a credito fiscal de la factura ${ret.numeroFactura.trim()} debe ser mayor o igual a 0 y usar coma como separador decimal.`,
                400,
                "service:validarPayloadRetencionIva",
            );
        }

        // 14. Valida que el monto de la base imponible sea valido y mantenga la coma como separador decimal
        if (
            parseMonto(ret.baseImponible) <= 0 ||
            !precioRegex.test(ret.baseImponible)
        ) {
            throw new AppError(
                `La base imponible de la factura ${ret.numeroFactura.trim()} debe ser mayor a 0 y usar coma como separador decimal.`,
                400,
                "service:validarPayloadRetencionIva",
            );
        }

        // 15. Valida que el Porcentaje de retención no sea vacio o nulo
        if (!ret.porcentaje_iva || ret.porcentaje_iva.trim().length <= 0) {
            throw new AppError(
                `El Porcentaje de retención de la retención de la factura ${ret.numeroFactura.trim()} es requerido.`,
                400,
                "service:validarPayloadRetencionIva",
            );
        }

        // 16. Valida que el Porcentaje de retención no sea vacio o nulo
        if (!ret.porcentaje || ret.porcentaje.trim().length <= 0) {
            throw new AppError(
                `El Porcentaje de alícuota de IVA de la factura ${ret.numeroFactura.trim()} es requerido.`,
                400,
                "service:validarPayloadRetencionIva",
            );
        }
    }
}

// ? LISTA: 17-09-2026
const safeTrim = (val: any, fallback = "Error desconocido"): string => {
    if (typeof val === "string") return val.trim();
    return val ? JSON.stringify(val) : fallback;
};
