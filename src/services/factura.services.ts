import { poolSigesp } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from "../utils/apiExternaClient.js";
import type { IFacturaDetalle } from "../types/IFacturaDetalle.js";
import type { IResponseFactura } from "../types/IResponseFactura.js";
import type { IFacturaDetPayload } from "../types/IFacturaDetPayload.js";
import * as func from "../utils/funcionesGlobales.js";

// ? LISTA: 17-09-2026
export async function postAgregarService(
    id_fact: number,
    codigo_usuario: string,
): Promise<IResponseFactura> {
    let prm_numfact;

    // REDIS. Arma la clave del documento que se va a procesar
    const documento = `FACTURA:${id_fact.toString()}`;
    const lockKey = `LOCK:${documento}`; // 👈 Clave efímera solo para concurrencia
    let lockToken: string | null = null; // 👇 guardaremos el Token Único para el bloqueo

    try {
        // 👇 1. REDIS. Para evitar concurrencia (DOBLE CLIC) - Bloqueo de 30s
        lockToken = await func.adquirirLockRedis(
            lockKey,
            "service:postAgregarService",
        );

        if (!lockToken) {
            throw new AppError(
                "Esta factura está siendo procesada en este instante. Evite hacer doble clic y espere unos segundos.",
                429,
                "service:postAgregarService",
            );
        }

        // 👇 PASO 2. REDIS. Verificacion HISTÓRICA si la clave en Redis existe y su estatus
        await func.verificaKeyRedis(documento, "service:postAgregarService");

        // 👇 PASO 3. Busco los datos de la factura
        const query = "SELECT * FROM fn_api_get_factura_detalle($1)";
        const result = await poolSigesp.query<IFacturaDetalle>(query, [
            id_fact,
        ]);

        // verifico si existe la factura
        if (result.rows.length <= 0) {
            throw new AppError(
                "Factura no encontrada",
                404,
                "service:postAgregarService",
            );
        }

        //
        const estado = result.rows[0].estado?.trim() ?? "";
        const observacion = result.rows[0].observacion?.trim() ?? "";
        const numControl = result.rows[0]?.num_control?.trim() ?? "";
        prm_numfact = Number(result.rows[0]?.numfact);

        // 👇 PASO 4. Verifico el estado del documento (FACTURA).
        if (estado?.toUpperCase() === "RECHAZADO") {
            throw new AppError(
                `La Factura ${prm_numfact} fue rechazada por la imprenta digital por el siguiente motivo: ${observacion}`,
                409,
                "service:postAgregarService",
            );
        }

        if (estado?.toUpperCase() === "ENVIADO" && numControl) {
            throw new AppError(
                `La Factura ${prm_numfact} ya fue enviada a la imprenta digital.`,
                409,
                "service:postAgregarService",
            );
        }

        // Datos del Encabezado
        const encFactura = result.rows[0];

        // Datos del detalle
        const detFactura: IFacturaDetPayload[] = result.rows.map((row) => {
            return {
                codigoProducto: row.coddetalle?.trim() ?? "",
                nombreProducto: row.nombreProducto?.trim() ?? "",
                descripcionProducto: row.descripcionProducto?.trim() ?? "",
                tipoImpuesto: row.tipoImpuesto?.trim() ?? "",
                cantidadAdquirida: Number(row.cantidadAdquirida),
                precioProducto: row.precioProducto,
            };
        });

        // 👇 PASO 5. Se validan los campos requeridos y formatos
        await validarPayloadFactura(encFactura, detFactura);

        // 👇 PASO 6. Construir objeto para enviarlo a la api externa
        const payLoad = {
            numeroSerie: encFactura.numero_serie?.trim() ?? "",
            cantidadFactura: 1,
            facturas: [
                {
                    numeroFactura: encFactura.numfact?.trim() ?? "",
                    documentoIdentidadCliente:
                        encFactura.numpririf?.trim() ?? "",
                    nombreRazonSocialCliente:
                        encFactura.nombre_cliente?.trim() ?? "",
                    correoCliente: encFactura.emailcliente?.trim() ?? "",
                    direccionCliente: encFactura.dircliente?.trim() ?? "",
                    telefonoCliente: encFactura.telcliente?.trim() ?? "",
                    productos: detFactura,
                    tasa_del_dia: encFactura.tasa_del_dia?.trim() ?? "",
                    fecha_tasa: encFactura.fecha_tasa?.trim() ?? "",
                    order_payment_methods: [],
                },
            ],
        };

        // 👇 PASO 7. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // No le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post(
            "/api/Invoice/add_list_invoice",
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
                `El proveedor devolvió una estructura de respuesta inválida para la factura ${prm_numfact}.`,
                502,
                "service:postAgregarService",
            );
        }

        // Validamos y obtengo la respuesta
        const msgProveedor =
            typeof datosResp.message === "string"
                ? datosResp.message.trim()
                : "Sin detalle del proveedor";

        // Extraemos y validamos estrictamente que invoice_errors sea un arreglo
        const erroresFactura = Array.isArray(datosResp.invoice_errors)
            ? datosResp.invoice_errors
            : [];

        // Evaluamos usando las variables seguras
        if (erroresFactura.length > 0) {
            const errorMsg = `${msgProveedor} ${erroresFactura[0]}`;

            // 🔄 PASO 7.1-A. DETECCIÓN DE FACTURA YA REGISTRADA (AUTO-RECUPERACIÓN)
            const esFacturaYaRegistrada =
                datosResp.success === true &&
                msgProveedor.toLowerCase().includes("facturas ya registradas");

            if (esFacturaYaRegistrada) {
                try {
                    // const numFacturaBuscar = encFactura.numfact?.trim() ?? "";
                    const numFacturaBuscar =
                        typeof erroresFactura[0] === "string" && erroresFactura[0].trim()
                            ? erroresFactura[0].trim()
                            : encFactura.numfact?.trim() ?? "";

                    // Consulta GET para recuperar los datos fiscales de la imprenta
                    const responseGet = await apiExternaClient.get(`/api/Invoice/get_list_invoices/`, 
                        {
                            params: { numeroDeFactura: numFacturaBuscar },
                        }
                    );

                    const datosRespGet = responseGet?.data;

                    // 🔍 Extracción segura contemplando la estructura anidada "invoices": [ [ { ... } ] ]
                    let facturaRecuperada: any = null;

                    if (
                        datosRespGet?.success === true &&
                        Array.isArray(datosRespGet?.invoices) &&
                        Array.isArray(datosRespGet.invoices[0]) &&
                        datosRespGet.invoices[0].length > 0
                    ) {
                        facturaRecuperada = datosRespGet.invoices[0][0];
                    }

                    
                  const control_number_rec =
                        typeof facturaRecuperada?.control_number === "string"
                            ? facturaRecuperada.control_number.trim()
                            : "";

                    const invoice_pdf_rec =
                        typeof facturaRecuperada?.invoice_pdf === "string"
                            ? facturaRecuperada.invoice_pdf.trim()
                            : "";
                    
                    // Si la imprenta devolvió exitosamente los datos fiscales de la factura existente
                    if (control_number_rec && invoice_pdf_rec) {
                        // ✅ REDIS: Se actualiza a ENVIADO con los datos recuperados
                        await func.actualizarKeyRedis(documento, {
                            estatusEnvioRedis: 1,
                            id_fact: id_fact,
                            numfact: prm_numfact,
                            id_doc: null,
                            codtipdoc: "FACTURA",
                            estado: "ENVIADO",
                            num_control: control_number_rec,
                            url_pdf: invoice_pdf_rec,
                            observacion:
                                "Factura recuperada exitosamente (ya existía en la imprenta)",
                            codusu: (codigo_usuario ?? "").trim(),
                            api_modulo: "SIGESP",
                            api_id_origen: null,
                        });

                        // Se retorna la estructura equivalente a un envío exitoso
                        return {
                            ...facturaRecuperada,
                            control_number: control_number_rec,
                            invoice_pdf: invoice_pdf_rec,
                        };
                    }
                } catch (_errGet) {
                    // Permite saber en logs que se intentó la recuperación pero falló la petición GET
    console.warn(
        `[postAgregarService] No se pudo auto-recuperar la factura ${prm_numfact} desde la imprenta:`,
        _errGet
    );
                }
            }

            // 👇 PASO 7.1. REDIS. Actualiza la clave del documento en Redis (RECHAZO)
            await func.actualizarKeyRedis(documento, {
                estatusEnvioRedis: 0,
                id_fact: id_fact,
                numfact: prm_numfact,
                id_doc: null,
                codtipdoc: "FACTURA",
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
                "service:postAgregarService",
            );
        }

        // Validacion estricta de Exito
        const listaExitosa = datosResp.invoice_list_success;

        if (!Array.isArray(listaExitosa) || listaExitosa.length === 0) {
            throw new AppError(
                `El proveedor procesó la solicitud (200 OK) pero no devolvió la lista de éxito para la factura ${prm_numfact}.`,
                502,
                "service:postAgregarService",
            );
        }

        // Extraemos el objeto de éxito de forma segura (si no existe, usamos un objeto vacío para evitar errores de undefined)
        const facturaExitosa = listaExitosa[0];

        // Validamos que sea un objeto plano válido
        if (
            !facturaExitosa ||
            typeof facturaExitosa !== "object" ||
            Array.isArray(facturaExitosa)
        ) {
            throw new AppError(
                `El proveedor devolvió una estructura de éxito inválida para la factura ${prm_numfact}.`,
                502,
                "service:postAgregarService",
            );
        }

        // Extraemos, Normalizamos y validamos estrictamente que los campos obligatorios del contrato NO estén vacíos ni solo tengan espacios
        const control_number =
            typeof facturaExitosa.control_number === "string"
                ? facturaExitosa.control_number.trim()
                : "";

        const invoice_pdf =
            typeof facturaExitosa.invoice_pdf === "string"
                ? facturaExitosa.invoice_pdf.trim()
                : "";

        if (!control_number || !invoice_pdf) {
            throw new AppError(
                `El proveedor procesó la factura ${prm_numfact} pero omitió campos fiscales obligatorios (invoice_number, control_number o invoice_pdf).`,
                502,
                "service:postAgregarService",
            );
        }

        // 👇 PASO 8. REDIS. Actualiza la clave del documento en Redis (ENVIADO)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: 1,
            id_fact: id_fact,
            numfact: prm_numfact,
            id_doc: null,
            codtipdoc: "FACTURA",
            estado: "ENVIADO",
            num_control: (control_number ?? "").trim(),
            url_pdf: (invoice_pdf ?? "").trim(),
            observacion: (msgProveedor ?? "").trim(),
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        // retornamos la respuesta
        return facturaExitosa;
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
                id_fact: id_fact,
                numfact: prm_numfact,
                id_doc: null,
                codtipdoc: "FACTURA",
                estado: "RECHAZADO",
                num_control: null,
                url_pdf: null,
                observacion: `${errorMessage} ${prm_numfact}`,
                codusu: (codigo_usuario ?? "").trim(),
                api_modulo: "SIGESP",
                api_id_origen: null,
            });

            throw new AppError(
                errorMessage,
                error.response.status || 400,
                "service:postAgregarService",
            );
        }

        // ✅ Por aquí entran los errores 500 o no capturados
        const fallbackMessage = safeTrim(error?.message, "Error desconocido");

        // 👇 REDIS. Actualiza la clave del documento en Redis (ERROR)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: -1,
            id_fact: id_fact,
            numfact: prm_numfact ? prm_numfact : null,
            id_doc: null,
            codtipdoc: "FACTURA",
            estado: "ERROR",
            num_control: null,
            url_pdf: null,
            observacion: prm_numfact
                ? `${fallbackMessage} ${prm_numfact}`
                : fallbackMessage,
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        throw new AppError(fallbackMessage, 500, "service:postAgregarService");
    } finally {
        // 👇 REDIS. Liberacion del bloqueo. Sin importar si fue un éxito o si explotó por un error, liberamos la puerta.
        if (lockToken) {
            await func.liberarLockRedis(lockKey, lockToken);
        }
    }
}

// ? LISTA: 17-09-2026
async function validarPayloadFactura(
    encFactura: IFacturaDetalle,
    detFactura: IFacturaDetPayload[],
): Promise<void> {
    // 1. Valida que el Numero de Serie no sea vacio o nulo
    if (
        !encFactura.numero_serie ||
        encFactura.numero_serie.trim().length <= 0
    ) {
        throw new AppError(
            "El número de serie es requerido.",
            400,
            "service:validarPayloadFactura",
        );
    }

    // 2. Valida que el numero de factura no sea vacio o nulo
    if (!encFactura.numfact || encFactura.numfact.trim().length <= 0) {
        throw new AppError(
            "El número de factura es requerido.",
            400,
            "service:validarPayloadFactura",
        );
    }

    // 3. Validar Documento de Identidad (V, E, P, J, G, C + min 5 dígitos)
    const rifRegex = /^[VEPJGC]\d{5,}$/i;

    if (!rifRegex.test(encFactura.numpririf.trim())) {
        throw new AppError(
            `El documento de identidad ('${encFactura.numpririf.trim()}') no cumple con el formato fiscal requerido.`,
            400,
            "service:validarPayloadFactura",
        );
    }

    // 4. Valida que el nombre del cliente no sea vacio o nulo
    if (
        !encFactura.nombre_cliente ||
        encFactura.nombre_cliente.trim().length <= 0
    ) {
        throw new AppError(
            "El nombre de la razon social del cliente es requerido.",
            400,
            "service:validarPayloadFactura",
        );
    }

    // 5. Validar Correo Electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(encFactura.emailcliente.trim())) {
        throw new AppError(
            `El correo del cliente ('${encFactura.emailcliente.trim()}') no posee un formato válido.`,
            400,
            "service:validarPayloadFactura",
        );
    }

    // 6. Valida que la direccion del cliente no sea vacio o nulo
    if (!encFactura.dircliente || encFactura.dircliente.trim().length <= 0) {
        throw new AppError(
            "La dirección del Cliente es requerida.",
            400,
            "service:validarPayloadFactura",
        );
    }

    // 7. Valida que el telefono del cliente no sea vacio o nulo
    if (!encFactura.telcliente || encFactura.telcliente.trim().length <= 0) {
        throw new AppError(
            "El numero de telefono del Cliente es requerido.",
            400,
            "service:validarPayloadFactura",
        );
    }

    // 8. Validar Tasa del Día (Formato: 3 enteros y 4 decimales con punto. Ej: "342.8633" o "056.6500")
    // Obtener fecha de hoy en formato YYYY-MM-DD (Zona horaria Venezuela / Local)
    const hoyStr = new Date().toLocaleDateString("sv-SE", {
        timeZone: "America/Caracas",
    });

    // Extraer valores de la consulta SQL
    let tasaRaw = encFactura.tasa_del_dia ? encFactura.tasa_del_dia.trim() : "";
    let fechaRaw = encFactura.fecha_tasa ? encFactura.fecha_tasa.trim() : "";

    // Validar presencia y valor numérico válido
    if (
        !tasaRaw ||
        tasaRaw.trim().length <= 0 ||
        parseFloat(tasaRaw) <= 0 ||
        !fechaRaw ||
        fechaRaw.trim().length <= 0
    ) {
        throw new AppError(
            "La tasa oficial del día está desactualizada.",
            400,
            "service:validarPayloadFactura",
        );
    }

    // Validar formato estricto: Exactamente 3 enteros y 4 decimales con punto (Ej: "342.8633" o "056.6500")
    const tasaRegex = /^\d{3}\.\d{4}$/;

    if (!tasaRegex.test(tasaRaw)) {
        throw new AppError(
            `La tasa del día ('${tasaRaw}') debe tener un formato fiscal estricto de 3 enteros y 4 decimales (Ej: '056.6500').`,
            400,
            "service:validarPayloadFactura",
        );
    }

    // 9. Validar la Fecha de la Tasa del Día en formato ("DD-MM-YYYY" o "YYYY-MM-DD")
    const fechaRegex = /^(?:(\d{2})-(\d{2})-(\d{4})|(\d{4})-(\d{2})-(\d{2}))$/;
    const fechaMatch = fechaRaw.match(fechaRegex);

    if (!fechaMatch) {
        throw new AppError(
            `La fecha de la tasa ('${fechaRaw}') no tiene un formato válido (DD-MM-YYYY o YYYY-MM-DD).`,
            400,
            "service:validarPayloadFactura",
        );
    }

    // Normalizar los formatos documentados a YYYY-MM-DD antes de comparar la fecha vigente.
    const fechaNormalizada = fechaMatch[3]
        ? `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}`
        : fechaRaw;

    if (fechaNormalizada !== hoyStr) {
        throw new AppError(
            "La tasa oficial del día está desactualizada.",
            400,
            "service:validarPayloadFactura",
        );
    }

    // 10. Validar Detalle
    if (!detFactura || detFactura.length === 0) {
        throw new AppError(
            "La factura debe tener al menos un producto asociado.",
            400,
            "service:validarPayloadFactura",
        );
    }

    for (const prod of detFactura) {
        // 11. Valida que el codigo del producto no sea vacio o nulo
        if (!prod.codigoProducto || prod.codigoProducto.trim().length <= 0) {
            throw new AppError(
                "El código del producto es requerido.",
                400,
                "service:validarPayloadFactura",
            );
        }

        // 12. Valida que el nombre del producto no sea vacio o nulo
        if (!prod.nombreProducto || prod.nombreProducto.trim().length <= 0) {
            throw new AppError(
                "El nombre del producto es requerido.",
                400,
                "service:validarPayloadFactura",
            );
        }

        // 13. Valida que la descripcion del producto no sea vacio o nulo
        if (
            !prod.descripcionProducto ||
            prod.descripcionProducto.trim().length <= 0
        ) {
            throw new AppError(
                "La descripcion del producto es requerida.",
                400,
                "service:validarPayloadFactura",
            );
        }

        // 14. Valida que el tipo de impuesto del producto no sea vacio o nulo
        if (!prod.tipoImpuesto || prod.tipoImpuesto.trim().length <= 0) {
            throw new AppError(
                "El tipo de impuesto del producto es requerido.",
                400,
                "service:validarPayloadFactura",
            );
        }

        // 15. Valida la cantidad adquirida
        if (
            typeof prod.cantidadAdquirida !== "number" ||
            Number.isNaN(prod.cantidadAdquirida) ||
            !Number.isInteger(prod.cantidadAdquirida) ||
            prod.cantidadAdquirida < 1 ||
            prod.cantidadAdquirida > 1000
        ) {
            throw new AppError(
                `La cantidad del producto '${prod.codigoProducto}' debe ser un número entero válido entre 1 y 1000.`,
                400,
                "service:validarPayloadFactura",
            );
        }

        // Normalizar el separador decimal antes de comprobar que el precio sea mayor que cero.
        // 16. Valida que el precio mantenga la coma como separador decimal
        const precioRegex = /^\d+(,\d{1,2})?$/;

        if (!precioRegex.test(prod.precioProducto)) {
            throw new AppError(
                `El precio del producto '${prod.codigoProducto}' (${prod.precioProducto}) debe usar coma como separador decimal.`,
                400,
                "service:validarPayloadFactura",
            );
        }

        const precioNumerico = Number(prod.precioProducto.replace(",", "."));

        if (!Number.isFinite(precioNumerico) || precioNumerico <= 0) {
            throw new AppError(
                `El precio del producto es requerido.`,
                400,
                "service:validarPayloadFactura",
            );
        }
    }
}

// ? LISTA: 17-09-2026
const safeTrim = (val: any, fallback = "Error desconocido"): string => {
    if (typeof val === "string") return val.trim();
    return val ? JSON.stringify(val) : fallback;
};

// ! NO APLICA: 17-09-2026
// export async function postAnularService(id_fact: number): Promise<any> {
//     // arma el documento que se va a procesar
//     const documento = `ANULACION: ${id_fact.toString()}`;

//     // Verifica si el documento ya esta en proceso
//     func.VerificaDocumentoEnProceso(documento, "service:postAnularService");

//     // Bloquea el documento
//     func.bloquearDocumento(documento)

//     try {
//         // 👇 PASO 1. Busco los datos de la factura que quiere anular
//         const query = 'SELECT * FROM fn_api_get_factura_anular($1)';
//         const result = await poolSigesp.query<IFacturaAnular>(query, [id_fact]);

//         // verifico si existe la factura
//         if (result.rows.length <= 0 ) {
//             throw new AppError('Factura no encontrada', 404, "service:postAnularService");
//         }

//         // 👇 PASO 2. Construir objeto para enviarlo a la api externa
//         const payLoad = {
//             numero_documento: result.rows[0].numfact,
//             numero_control: result.rows[0].num_control
//         };

//         // 👇 PASO 3. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
//         // Nota como no le pasamos headers, ni baseURL, ni Authorization.
//         // El interceptor hace todo eso antes de salir de tu backend.
//         const response = await apiExternaClient.post('/api/Invoice/cancel_invoice', payLoad);

//         return;

//     } catch (error: any) {
//         if (error instanceof AppError) {
//             throw error; // ✅ ya tiene statusCode y location
//         }

//         if (error?.response?.data) {
//             throw new AppError(error.response.data.message.trim(), error.response.status, "service:postAnularService");
//         }

//         throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postAnularService");
//     }
//     finally {
//         // Libera el documento del proceso
//         func.liberarDocumento(documento);
//     }
// }
