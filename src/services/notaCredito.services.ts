import { poolSigesp } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from "../utils/apiExternaClient.js";
import type { INotaCreditoDetalle } from "../types/INotaCreditoDetalle.js";
import type { IResponseNotaCredito } from "../types/IResponseNotaCredito.js";
import type { IResponseNotaCreditoParcial } from "../types/IResponseNotaCreditoParcial.js";
import type { INotaCreditoDetPayload } from "../types/INotaCreditoDetPayload.js";
import * as func from "../utils/funcionesGlobales.js";

// ? LISTA: 17-09-2026
export async function postCrearNCService(
    id_doc: number,
    codigo_usuario: string,
): Promise<IResponseNotaCredito> {
    let prm_coddoc;
    let id_fact;
    let numfact;

    // REDIS. Arma la clave del documento que se va a procesar
    const documento = `NC:${id_doc.toString()}`;
    const lockKey = `LOCK:${documento}`; // 👈 Clave efímera solo para concurrencia
    let lockToken: string | null = null; // 👇 guardaremos el Token Único para el bloqueo

    try {
        // 👇 1. REDIS. Para evitar concurrencia (DOBLE CLIC) - Bloqueo de 30s
        lockToken = await func.adquirirLockRedis(
            lockKey,
            "service:postCrearNCService",
        );

        if (!lockToken) {
            throw new AppError(
                "Esta nota de credito está siendo procesada en este instante. Evite hacer doble clic y espere unos segundos.",
                429,
                "service:postCrearNCService",
            );
        }

        // 👇 PASO 2. REDIS. Verificacion HISTÓRICA si la clave en Redis existe y su estatus
        await func.verificaKeyRedis(documento, "service:postCrearNCService");

        // 👇 PASO 3. Busco los datos de la Nota de Credito
        const query = "SELECT * FROM fn_api_get_nota_credito_detalle($1)";
        const result = await poolSigesp.query<INotaCreditoDetalle>(query, [
            id_doc,
        ]);

        // verifico si existe la Nota de Credito
        if (result.rows.length <= 0) {
            throw new AppError(
                "Nota de Credito no encontrada",
                404,
                "service:postCrearNCService",
            );
        }

        //
        const estado = result.rows[0].estado?.trim();
        const observacion = result.rows[0].observacion?.trim();
        const numControl = result.rows[0]?.num_control?.trim();
        id_fact = result.rows[0]?.id_fact;
        numfact = Number(result.rows[0]?.numfact);
        prm_coddoc = result.rows[0]?.coddoc;

        // 👇 PASO 4. Verifico el estado del documento (NOTA DE CREDITO).
        if (estado?.toUpperCase() === "RECHAZADO") {
            throw new AppError(
                `La Nota de Credito ${prm_coddoc} fue rechazada por la imprenta digital por el siguiente motivo: ${observacion}`,
                409,
                "service:postCrearNCService",
            );
        }

        if (estado?.toUpperCase() === "ENVIADO" && numControl) {
            throw new AppError(
                `La Nota de Credito ${prm_coddoc} ya fue enviada a la imprenta digital.`,
                409,
                "service:postCrearNCService",
            );
        }

        // 👇 PASO 5. Verifico si la FACTURA asociada a la Nota de Credito ya fue enviada anteriormente.
        const queryVerificaFact = `SELECT public.fn_api_integracion_verifica_factura_enviada($1) AS enviada;`;

        const respVerificaFact = await poolSigesp.query(queryVerificaFact, [
            id_fact,
        ]);

        const facturaEnviada = respVerificaFact.rows[0].enviada;

        if (!facturaEnviada) {
            throw new AppError(
                `El número de factura ${numfact} asociada a la Nota de Crédito ${prm_coddoc}, no ha sido enviada a la imprenta digital.`,
                401,
                "service:postCrearNCService",
            );
        }

        // Datos planos de la nota de credito
        const datosNC = result.rows[0];

        // 👇 PASO 6. Se validan los campos requeridos y formatos
        await validarPayloadNC(datosNC);

        // 👇 PASO 7. Construir objeto para enviarlo a la api externa
        const payLoad = {
            numeroFactura: datosNC.numfact.trim(), // Número de factura a afectar
            numeroNotaCredito: datosNC.coddoc.trim(), // Número de nota de crédito a crear
            descripcion: datosNC.motivo?.trim(), // Descripcion del motivo de la nota de crédito a crear
        };

        // 👇 PASO 8. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // No le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post(
            "/api/Invoice/add_credit_note",
            payLoad,
        );

        // Validacion estricta de la respuesta
        const datosResp = response?.data;

        // Validamos que sea un objeto plano válido
        if (!datosResp || typeof datosResp !== "object") {
            throw new AppError(
                `El proveedor devolvió una estructura de respuesta inválida para la nota de credirto ${prm_coddoc}.`,
                502,
                "service:postCrearNCService",
            );
        }

        // Validamos y obtengo la respuesta
        const msgProveedor =
            typeof datosResp.message === "string"
                ? datosResp.message.trim()
                : "Sin detalle del proveedor";

        if (!datosResp.success) {
            const errorMsg = `${msgProveedor} ${prm_coddoc}`;

            // 👇 PASO 8.1. REDIS. Actualiza la clave del documento en Redis (RECHAZO)
            await func.actualizarKeyRedis(documento, {
                estatusEnvioRedis: 0,
                id_fact: id_fact,
                numfact: numfact,
                id_doc: id_doc,
                codtipdoc: "NC",
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
                "service:postCrearNCService",
            );
        }

        // Extraemos, Normalizamos y validamos estrictamente que los campos obligatorios del contrato NO estén vacíos ni solo tengan espacios
        const invoice_number_affected =
            typeof datosResp.invoice_number_affected === "string"
                ? datosResp.invoice_number_affected.trim()
                : "";

        const control_number =
            typeof datosResp.control_number === "string"
                ? datosResp.control_number.trim()
                : "";

        const credit_note_pdf =
            typeof datosResp.credit_note_pdf === "string"
                ? datosResp.credit_note_pdf.trim()
                : "";

        if (!invoice_number_affected || !control_number || !credit_note_pdf) {
            throw new AppError(
                `El proveedor procesó la nota de credito ${prm_coddoc} pero omitió campos fiscales obligatorios (invoice_number_affected, control_number o credit_note_pdf).`,
                502,
                "service:postCrearNCService",
            );
        }

        // 👇 PASO 9. REDIS. Actualiza la clave del documento en Redis (ENVIADO)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: 1,
            id_fact: id_fact,
            numfact: numfact,
            id_doc: id_doc,
            codtipdoc: "NC",
            estado: "ENVIADO",
            num_control: (control_number ?? "").trim(),
            url_pdf: (credit_note_pdf ?? "").trim(),
            observacion: (msgProveedor ?? "").trim(),
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        const data = {
            invoice_number_affected: (invoice_number_affected ?? "").trim(),
            control_number: (control_number ?? "").trim(),
            credit_note_pdf: (credit_note_pdf ?? "").trim(),
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
                id_fact: id_fact,
                numfact: numfact,
                id_doc: id_doc,
                codtipdoc: "NC",
                estado: "RECHAZADO",
                num_control: null,
                url_pdf: null,
                observacion: `${errorMessage} ${prm_coddoc}`,
                codusu: (codigo_usuario ?? "").trim(),
                api_modulo: "SIGESP",
                api_id_origen: null,
            });

            throw new AppError(
                errorMessage,
                error.response.status || 400,
                "service:postCrearNCService",
            );
        }

        // ✅ Por aquí entran los errores 500 o no capturados
        const fallbackMessage = safeTrim(error?.message, "Error desconocido");

        // 👇 REDIS. Actualiza la clave del documento en Redis (ERROR)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: -1,
            id_fact: id_fact,
            numfact: numfact ? numfact : null,
            id_doc: id_doc,
            codtipdoc: "NC",
            estado: "ERROR",
            num_control: null,
            url_pdf: null,
            observacion: prm_coddoc
                ? `${fallbackMessage} ${prm_coddoc}`
                : fallbackMessage,
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        throw new AppError(fallbackMessage, 500, "service:postCrearNCService");
    } finally {
        // 👇 REDIS. Liberacion del bloqueo. Sin importar si fue un éxito o si explotó por un error, liberamos la puerta.
        if (lockToken) {
            await func.liberarLockRedis(lockKey, lockToken);
        }
    }
}

// ? LISTA: 17-09-2026
export async function postCrearNCParcialService(
    id_doc: number,
    codigo_usuario: string,
): Promise<IResponseNotaCreditoParcial> {
    let prm_coddoc;
    let id_fact;
    let numfact;

    // REDIS. Arma la clave del documento que se va a procesar
    const documento = `NC-PARCIAL:${id_doc.toString()}`;
    const lockKey = `LOCK:${documento}`; // 👈 Clave efímera solo para concurrencia
    let lockToken: string | null = null; // 👇 guardaremos el Token Único para el bloqueo

    try {
        // 👇 1. REDIS. Para evitar concurrencia (DOBLE CLIC) - Bloqueo de 30s
        lockToken = await func.adquirirLockRedis(
            lockKey,
            "service:postCrearNCParcialService",
        );

        if (!lockToken) {
            throw new AppError(
                "Esta nota de credito parcial está siendo procesada en este instante. Evite hacer doble clic y espere unos segundos.",
                429,
                "service:postCrearNCParcialService",
            );
        }

        // 👇 PASO 2. REDIS. Verificacion HISTÓRICA si la clave en Redis existe y su estatus
        await func.verificaKeyRedis(
            documento,
            "service:postCrearNCParcialService",
        );

        // 👇 PASO 3. Busco los datos de la Nota de Credito Parcial
        const query = "SELECT * FROM fn_api_get_nota_credito_detalle($1)";
        const result = await poolSigesp.query<INotaCreditoDetalle>(query, [
            id_doc,
        ]);

        // verifico si existe la Nota de Credito Parcial
        if (result.rows.length <= 0) {
            throw new AppError(
                "Nota de Credito Parcial no encontrada",
                404,
                "service:postCrearNCParcialService",
            );
        }

        //
        const estado = result.rows[0].estado?.trim();
        const observacion = result.rows[0].observacion?.trim();
        const numControl = result.rows[0]?.num_control?.trim();
        id_fact = result.rows[0]?.id_fact;
        numfact = Number(result.rows[0]?.numfact);
        prm_coddoc = result.rows[0]?.coddoc;

        // 👇 PASO 4. Verifico el estado del documento (NOTA DE CREDITO).
        if (estado?.toUpperCase() === "RECHAZADO") {
            throw new AppError(
                `La Nota de Credito Parcial ${prm_coddoc} fue rechazada por la imprenta digital por el siguiente motivo: ${observacion}`,
                409,
                "service:postCrearNCParcialService",
            );
        }

        if (estado?.toUpperCase() === "ENVIADO" && numControl) {
            throw new AppError(
                `La Nota de Credito Parcial ${prm_coddoc} ya fue enviada a la imprenta digital.`,
                409,
                "service:postCrearNCParcialService",
            );
        }

        // 👇 PASO 5. Verifico si la FACTURA asociada a la Nota de Credito ya fue enviada anteriormente.
        const queryVerificaFact = `SELECT public.fn_api_integracion_verifica_factura_enviada($1) AS enviada;`;
        const respVerificaFact = await poolSigesp.query(queryVerificaFact, [
            id_fact,
        ]);

        const facturaEnviada = respVerificaFact.rows[0].enviada;

        if (!facturaEnviada) {
            throw new AppError(
                `El número de factura ${numfact} asociada a la Nota de Crédito Parcial ${prm_coddoc}, no ha sido enviada a la imprenta digital.`,
                401,
                "service:postCrearNCParcialService",
            );
        }

        // Datos planos de la nota de credito parcial
        const encNC = result.rows[0];

        // Datos del detalle
        const detalleNC: INotaCreditoDetPayload[] = result.rows.map((row) => {
            return {
                codigo: row.coddetalle.trim(),
                cantidad: Number(row.cantidad_detdoc),
                descripcion: row.descripcion.trim(),
            };
        });

        // 👇 PASO 6. Se validan los campos requeridos y formatos
        await validarPayloadNCParcial(encNC, detalleNC);

        // 👇 PASO 7. Construir objeto para enviarlo a la api externa
        const payLoad = {
            numeroFactura: encNC.numfact.trim(), // Número de factura a afectar
            numeroNotaCredito: encNC.coddoc.trim(), // Número de nota de crédito a crear
            descripcion: encNC.motivo?.trim(), // Descripcion del motivo de la nota de crédito a crear
            productos: detalleNC,
        };

        // 👇 PASO 8. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // No le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post(
            "/api/Invoice/add_credit_note_with_products",
            payLoad,
        );

        // Validacion estricta de la respuesta
        const datosResp = response?.data;

        // Validamos que sea un objeto plano válido
        if (!datosResp || typeof datosResp !== "object") {
            throw new AppError(
                `El proveedor devolvió una estructura de respuesta inválida para la nota de credirto parcial ${prm_coddoc}.`,
                502,
                "service:postCrearNCParcialService",
            );
        }

        // Validamos y obtengo la respuesta
        const msgProveedor =
            typeof datosResp.message === "string"
                ? datosResp.message.trim()
                : "Sin detalle del proveedor";

        if (!datosResp.success) {
            const errorMsg = `${msgProveedor} ${prm_coddoc}`;

            // 👇 PASO 8.1. REDIS. Actualiza la clave del documento en Redis (RECHAZO)
            await func.actualizarKeyRedis(documento, {
                estatusEnvioRedis: 0,
                id_fact: id_fact,
                numfact: numfact,
                id_doc: id_doc,
                codtipdoc: "NC-PARCIAL",
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
                "service:postCrearNCParcialService",
            );
        }

        // Extraemos, Normalizamos y validamos estrictamente que los campos obligatorios del contrato NO estén vacíos ni solo tengan espacios
        const note_credit_number =
            typeof datosResp.note_credit_number === "string"
                ? datosResp.note_credit_number.trim()
                : "";

        const invoice_number_affected =
            typeof datosResp.invoice_number_affected === "string"
                ? datosResp.invoice_number_affected.trim()
                : "";

        const control_number =
            typeof datosResp.control_number === "string"
                ? datosResp.control_number.trim()
                : "";

        const credit_note_pdf =
            typeof datosResp.credit_note_pdf === "string"
                ? datosResp.credit_note_pdf.trim()
                : "";

        if (
            !note_credit_number ||
            !invoice_number_affected ||
            !control_number ||
            !credit_note_pdf
        ) {
            throw new AppError(
                `El proveedor procesó la nota de credito ${prm_coddoc} pero omitió campos fiscales obligatorios (note_credit_number, invoice_number_affected, control_number o credit_note_pdf).`,
                502,
                "service:postCrearNCParcialService",
            );
        }

        // 👇 PASO 9. REDIS. Actualiza la clave del documento en Redis (ENVIADO)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: 1,
            id_fact: id_fact,
            numfact: numfact,
            id_doc: id_doc,
            codtipdoc: "NC-PARCIAL",
            estado: "ENVIADO",
            num_control: (control_number ?? "").trim(),
            url_pdf: (credit_note_pdf ?? "").trim(),
            observacion: (msgProveedor ?? "").trim(),
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        const data = {
            note_credit_number: (note_credit_number ?? "").trim(),
            invoice_number_affected: (invoice_number_affected ?? "").trim(),
            control_number: (control_number ?? "").trim(),
            credit_note_pdf: (credit_note_pdf ?? "").trim(),
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
                id_fact: id_fact,
                numfact: numfact,
                id_doc: id_doc,
                codtipdoc: "NC-PARCIAL",
                estado: "RECHAZADO",
                num_control: null,
                url_pdf: null,
                observacion: `${errorMessage} ${prm_coddoc}`,
                codusu: (codigo_usuario ?? "").trim(),
                api_modulo: "SIGESP",
                api_id_origen: null,
            });

            throw new AppError(
                errorMessage,
                error.response.status || 400,
                "service:postCrearNCParcialService",
            );
        }

        // ✅ Por aquí entran los errores 500 o no capturados
        const fallbackMessage = safeTrim(error?.message, "Error desconocido");

        // 👇 REDIS. Actualiza la clave del documento en Redis (ERROR)
        await func.actualizarKeyRedis(documento, {
            estatusEnvioRedis: -1,
            id_fact: id_fact,
            numfact: numfact ? numfact : null,
            id_doc: id_doc,
            codtipdoc: "NC-PARCIAL",
            estado: "ERROR",
            num_control: null,
            url_pdf: null,
            observacion: prm_coddoc
                ? `${fallbackMessage} ${prm_coddoc}`
                : fallbackMessage,
            codusu: (codigo_usuario ?? "").trim(),
            api_modulo: "SIGESP",
            api_id_origen: null,
        });

        throw new AppError(
            fallbackMessage,
            500,
            "service:postCrearNCParcialService",
        );
    } finally {
        // 👇 REDIS. Liberacion del bloqueo. Sin importar si fue un éxito o si explotó por un error, liberamos la puerta.
        if (lockToken) {
            await func.liberarLockRedis(lockKey, lockToken);
        }
    }
}

// ? LISTA: 17-09-2026
async function validarPayloadNC(datosNC: INotaCreditoDetalle): Promise<void> {
    const numfact = datosNC.numfact ? datosNC.numfact.trim() : "";
    const coddoc = datosNC.coddoc ? datosNC.coddoc.trim() : "";
    const motivo = datosNC.motivo ? datosNC.motivo.trim() : "";

    // Expresión regular: Solo dígitos (mínimo 1, máximo 19 caracteres)
    const regexSoloNumeros = /^\d{1,19}$/;

    // Valida que el numero de factura no sea vacio o nulo
    if (!numfact || numfact.trim().length <= 0) {
        throw new AppError(
            "El número de factura es requerido.",
            400,
            "service:validarPayloadNC",
        );
    }

    // Valida que el numero de factura sea Solo dígitos + Max 19
    if (!regexSoloNumeros.test(numfact)) {
        throw new AppError(
            `El número de factura ('${numfact}') debe contener solo dígitos (máximo 19 caracteres).`,
            400,
            "service:validarPayloadNC",
        );
    }

    // Valida que el numero de factura no sea vacio o nulo
    if (!coddoc || coddoc.trim().length <= 0) {
        throw new AppError(
            "El número de Nota de Crédito es requerido.",
            400,
            "service:validarPayloadNC",
        );
    }

    if (!regexSoloNumeros.test(coddoc)) {
        throw new AppError(
            `El número de Nota de Crédito ('${coddoc}') debe contener solo dígitos (máximo 19 caracteres).`,
            400,
            "service:validarPayloadNC",
        );
    }

    // Valida que la descripcion de la Nota de Credito no sea vacio o nulo
    if (!motivo || motivo.trim().length <= 0) {
        throw new AppError(
            "La descripción del motivo de la Nota de Crédito es requerida.",
            400,
            "service:validarPayloadNC",
        );
    }

    if (motivo.length > 50) {
        throw new AppError(
            `La descripción del motivo de la Nota de Crédito excede el límite permitido de 50 caracteres (actual: ${motivo.length}).`,
            400,
            "service:validarPayloadNC",
        );
    }
}

// ? LISTA: 17-09-2026
async function validarPayloadNCParcial(
    encNC: INotaCreditoDetalle,
    detNC: INotaCreditoDetPayload[],
): Promise<void> {
    // Expresión regular: Solo dígitos (mínimo 1, máximo 19 caracteres)
    const regexSoloNumeros = /^\d{1,19}$/;

    // 1. Valida que el numero de factura no sea vacio o nulo
    if (!encNC.numfact || encNC.numfact.trim().length <= 0) {
        throw new AppError(
            "El número de factura es requerido.",
            400,
            "service:validarPayloadNCParcial",
        );
    }

    // Valida que el numero de factura sea Solo dígitos + Max 19
    if (!regexSoloNumeros.test(encNC.numfact)) {
        throw new AppError(
            `El número de factura ('${encNC.numfact}') debe contener solo dígitos (máximo 19 caracteres).`,
            400,
            "service:validarPayloadNCParcial",
        );
    }

    // 2. Valida que el numero de factura no sea vacio o nulo
    if (!encNC.coddoc || encNC.coddoc.trim().length <= 0) {
        throw new AppError(
            "El número de Nota de Crédito es requerido.",
            400,
            "service:validarPayloadNCParcial",
        );
    }

    // Valida que el numero de factura sea Solo dígitos + Max 19
    if (!regexSoloNumeros.test(encNC.coddoc)) {
        throw new AppError(
            `El número de Nota de Crédito ('${encNC.coddoc}') debe contener solo dígitos (máximo 19 caracteres).`,
            400,
            "service:validarPayloadNCParcial",
        );
    }

    // 3. Valida que la descripcion de la Nota de Credito no sea vacio o nulo
    if (!encNC.motivo || encNC.motivo.trim().length <= 0) {
        throw new AppError(
            "La descripción del motivo de la Nota de Crédito es requerida.",
            400,
            "service:validarPayloadNCParcial",
        );
    }

    if (encNC.motivo.length > 50) {
        throw new AppError(
            `La descripción del motivo de la Nota de Crédito excede el límite permitido de 50 caracteres (actual: ${encNC.motivo.length}).`,
            400,
            "service:validarPayloadNCParcial",
        );
    }

    // 4. Validar Detalle
    if (!detNC || detNC.length === 0) {
        throw new AppError(
            "Productos debe tener al menos un item asociado.",
            400,
            "service:validarPayloadNCParcial",
        );
    }

    for (const prod of detNC) {
        // 5. Valida que el codigo del producto no sea vacio o nulo
        if (prod.codigo.trim().length <= 0) {
            throw new AppError(
                "El código del producto es requerido.",
                400,
                "service:validarPayloadNCParcial",
            );
        }

        // 6. Valida la cantidad adquirida
        if (prod.cantidad <= 0) {
            throw new AppError(
                `La cantidad del producto '${prod.codigo}' (${prod.cantidad}) debe ser mayor a 0.`,
                400,
                "service:validarPayloadNCParcial",
            );
        }

        // 7. Valida que el nombre del producto no sea vacio o nulo
        if (prod.descripcion.trim().length <= 0) {
            throw new AppError(
                "La descripción del producto es requerido.",
                400,
                "service:validarPayloadNCParcial",
            );
        }
    }
}

// ? LISTA: 17-09-2026
const safeTrim = (val: any, fallback = "Error desconocido"): string => {
    if (typeof val === "string") return val.trim();
    return val ? JSON.stringify(val) : fallback;
};
