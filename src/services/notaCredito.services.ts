import { poolSigesp } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from '../utils/apiExternaClient.js';
import type { INotaCreditoDetalle } from '../types/INotaCreditoDetalle.js';
import type { IResponseNotaCredito } from '../types/IResponseNotaCredito.js';
import type { IResponseNotaCreditoParcial } from '../types/IResponseNotaCreditoParcial.js';
import * as func from "../utils/funcionesGlobales.js";

// ? LISTA: 17-09-2026
export async function postCrearNCService(id_doc: number, codigo_usuario: string): Promise<IResponseNotaCredito> {
    // arma el documento que se va a procesar
    const documento = `NC: ${id_doc.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postCrearNCService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

    try {
        // 👇 PASO 1. Busco los datos de la Nota de Credito
        const query = 'SELECT * FROM fn_api_get_nota_credito_detalle($1)';
        const result = await poolSigesp.query<INotaCreditoDetalle>(query, [id_doc]);    

        // verifico si existe la Nota de Credito
        if (result.rows.length <= 0 ) {
            throw new AppError('Nota de Credito no encontrada', 404, "service:postCrearNCService");
        }

        // Datos planos de la nota de credito
        const datosNC = result.rows[0];

        const id_fact = datosNC.id_fact;
        const numControl = datosNC?.num_control;
        const ncEnviada = numControl ? numControl.trim() : '';

        // 👇 PASO 2. Verifico si el documento (NC) ya fue enviado anteriormente.
        if (ncEnviada.length > 0) {
            throw new AppError('Esta Nota de Crédito ya habia sido Enviada Anteriormente.', 401, "service:postCrearNCService");
        }

        // 👇 PASO 3. Verifico si la FACTURA asociada a la Nota de Credito ya fue enviada anteriormente.
        const queryVerificaFact = `SELECT public.fn_api_integracion_verifica_factura_enviada($1) AS enviada;`;

        const respVerificaFact = await poolSigesp.query(queryVerificaFact, [id_fact]);

        const facturaEnviada = respVerificaFact.rows[0].enviada;

        if (!facturaEnviada) {
            throw new AppError('El número de factura asociada a la Nota de Crédito, no existe.', 401, "service:postCrearNCService");
        }

        // 👇 PASO 4. Se validan los campos requeridos y formatos
        await validarPayloadNC(datosNC);

        // 👇 PASO 5. Construir objeto para enviarlo a la api externa
        const payLoad = {
            numeroFactura: datosNC.numfact.trim(),      // Número de factura a afectar
            numeroNotaCredito: datosNC.coddoc.trim(),   // Número de nota de crédito a crear
            descripcion: datosNC.motivo?.trim(),        // Descripcion del motivo de la nota de crédito a crear
        };

        // 👇 PASO 6. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_credit_note', payLoad);

        if (!response.data.success) {
            throw new AppError(`${response.data.message.trim()}`, 409, "service:postCrearNCService");
        }

        const data = {
            "invoice_number_affected": response.data.invoice_number_affected,
            "control_number": response.data.control_number,
            "credit_note_pdf": response.data.credit_note_pdf,
            "warning_control_numbers": response.data.warning_control_numbers
        }

        // 👇 PASO 7. Guarda los datos del documento enviado        
        const prm_id_fact = id_fact;
        const prm_numfact = datosNC.numfact;
        const prm_id_doc = id_doc;
        const prm_codtipdoc = 'NC';
        const prm_num_control = data.control_number;
        const prm_url_pdf = data.credit_note_pdf;
        const prm_codusu = codigo_usuario;

        // 👇 NUEVO: Envolvemos SOLO la base de datos en un try-catch independiente
        try {
            // Elimina los datos de la configuracion Local
            const query1 = 'SELECT * FROM fn_api_post_integracion_documentos_fiscales($1, $2, $3, $4, $5, $6, $7, $8, $9)';
            await poolSigesp.query(query1, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu, 'SIGESP', null]);        
        
        } catch (dbError) {
            // 🚨 LOG CRÍTICO: La factura existe en el ente externo, pero no se guardó localmente.
            // Aquí usamos console.error, pero idealmente deberías usar una librería como Winston 
            // o guardar este error en un archivo de texto para no perder el rastro.
            console.error(`🚨 CRÍTICO: Nota de Credito ${datosNC.coddoc.trim()} creada en CGI, pero falló guardado local:`, dbError);
            
            // ¡MUY IMPORTANTE! NO hacemos 'throw' aquí. 
            // Dejamos que el código continúe para que el cliente reciba su respuesta de éxito.
        }        
        
        // retornamos la respuesta
        return data;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCrearNCService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCrearNCService");
    } finally {
        // Libera el documento del proceso
        func.liberarDocumento(documento);
    }
}

// ? LISTA: 17-09-2026
export async function postCrearNCParcialService(id_doc: number, codigo_usuario: string): Promise<IResponseNotaCreditoParcial> {
    // arma el documento que se va a procesar
    const documento = `NC-PARCIAL: ${id_doc.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postCrearNCParcialService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

    try {
        // 👇 PASO 1. Busco los datos de la Nota de Credito Parcial
        const query = 'SELECT * FROM fn_api_get_nota_credito_detalle($1)';
        const result = await poolSigesp.query<INotaCreditoDetalle>(query, [id_doc]);    

        // verifico si existe la Nota de Credito Parcial
        if (result.rows.length <= 0 ) {
            throw new AppError('Nota de Credito Parcial no encontrada', 404, "service:postCrearNCParcialService");
        }

        // Datos del Encabezado
        const encNC = result.rows[0];

        const id_fact = encNC.id_fact;
        const numControl = encNC?.num_control;
        const ncEnviada = numControl ? numControl.trim() : '';

        // 👇 PASO 2. Verifico si el documento (NC Parcial) ya fue enviado anteriormente.
        if (ncEnviada.length > 0) {
            throw new AppError('Esta Nota de Crédito Parcial ya habia sido Enviada Anteriormente.', 401, "service:postCrearNCParcialService");
        }

        // 👇 PASO 3. Verifico si la FACTURA asociada a la Nota de Credito Parcial ya fue enviada anteriormente.
        const queryVerificaFact = `SELECT public.fn_api_integracion_verifica_factura_enviada($1) AS enviada;`;

        const respVerificaFact = await poolSigesp.query(queryVerificaFact, [id_fact]);

        const facturaEnviada = respVerificaFact.rows[0].enviada;

        if (!facturaEnviada) {
            throw new AppError('El número de factura asociada a la Nota de Crédito Parcial, no existe.', 401, "service:postCrearNCParcialService");
        }

        // Datos del detalle
        const detalleNC = result.rows.map(row => {
            return {
                codigo: row.coddetalle.trim(),
                cantidad: row.cantidad_detdoc,
                descripcion: row.descripcion.trim()
            }
        });

        // 👇 PASO 4. Se validan los campos requeridos y formatos
        await validarPayloadNCParcial(encNC, detalleNC);

        // 👇 PASO 5. Construir objeto para enviarlo a la api externa
        const payLoad = {
            numeroFactura: encNC.numfact.trim(),        // Número de factura a afectar
            numeroNotaCredito: encNC.coddoc.trim(),     // Número de nota de crédito a crear
            descripcion: encNC.motivo?.trim(),          // Descripcion del motivo de la nota de crédito a crear
            productos: detalleNC
        };

        // 👇 PASO 6. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_credit_note_with_products', payLoad);

        if (!response.data.success) {
            throw new AppError(`${response.data.message.trim()}`, 409, "service:postCrearNCParcialService");
        }

        const data = {
            "note_credit_number": response.data.note_credit_number,
            "invoice_number_affected": response.data.invoice_number_affected,
            "control_number": response.data.control_number,
            "credit_note_pdf": response.data.credit_note_pdf,           
            "productos_acreditados_esta_nc": response.data.productos_acreditados_esta_nc
        }

        // Guarda los datos del documento enviado
        const prm_id_fact = result.rows[0].id_fact;
        const prm_numfact = result.rows[0].numfact;
        const prm_id_doc = id_doc;
        const prm_codtipdoc = 'NC';
        const prm_num_control = data.control_number;
        const prm_url_pdf = data.credit_note_pdf;
        const prm_codusu = codigo_usuario;

        // 👇 NUEVO: Envolvemos SOLO la base de datos en un try-catch independiente
        try {
            // Elimina los datos de la configuracion Local
            const query1 = 'SELECT * FROM fn_api_post_integracion_documentos_fiscales($1, $2, $3, $4, $5, $6, $7, $8, $9)';
            await poolSigesp.query(query1, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu, 'SIGESP', null]);
            
        } catch (dbError) {
            // 🚨 LOG CRÍTICO: La factura existe en el ente externo, pero no se guardó localmente.
            // Aquí usamos console.error, pero idealmente deberías usar una librería como Winston 
            // o guardar este error en un archivo de texto para no perder el rastro.
            console.error(`🚨 CRÍTICO: Nota de Credito Parcial ${result.rows[0].coddoc} creada en CGI, pero falló guardado local:`, dbError);
            
            // ¡MUY IMPORTANTE! NO hacemos 'throw' aquí. 
            // Dejamos que el código continúe para que el cliente reciba su respuesta de éxito.
        }
        
        return response.data;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCrearNCParcialService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCrearNCParcialService");
    } finally {
        // Libera el documento del proceso
        func.liberarDocumento(documento);
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
        throw new AppError("El número de factura es requerido.", 400, "service:validarPayloadNC");
    }

    // Valida que el numero de factura sea Solo dígitos + Max 19
    if (!regexSoloNumeros.test(numfact)) {
        throw new AppError(`El número de factura ('${numfact}') debe contener solo dígitos (máximo 19 caracteres).`, 400, "service:validarPayloadNC");
    }
    
    // Valida que el numero de factura no sea vacio o nulo
    if (!coddoc || coddoc.trim().length <= 0) {
        throw new AppError("El número de Nota de Crédito es requerido.", 400, "service:validarPayloadNC");
    }

    if (!regexSoloNumeros.test(coddoc)) {
        throw new AppError(`El número de Nota de Crédito ('${coddoc}') debe contener solo dígitos (máximo 19 caracteres).`, 400, "service:validarPayloadNC");
    }

    // Valida que la descripcion de la Nota de Credito no sea vacio o nulo
    if (!motivo || motivo.trim().length <= 0) {
        throw new AppError("La descripción del motivo de la Nota de Crédito es requerida.", 400, "service:validarPayloadNC");
    }

    if (motivo.length > 50) {
        throw new AppError(`La descripción del motivo de la Nota de Crédito excede el límite permitido de 50 caracteres (actual: ${motivo.length}).`, 400, "service:validarPayloadNC");
    }
}

// ? LISTA: 17-09-2026
async function validarPayloadNCParcial(encNC: INotaCreditoDetalle, detNC: any[]): Promise<void> {
    // Expresión regular: Solo dígitos (mínimo 1, máximo 19 caracteres)
    const regexSoloNumeros = /^\d{1,19}$/;

    // 1. Valida que el numero de factura no sea vacio o nulo
    if (!encNC.numfact || encNC.numfact.trim().length <= 0) {
        throw new AppError("El número de factura es requerido.", 400, "service:validarPayloadNCParcial");
    }

    // Valida que el numero de factura sea Solo dígitos + Max 19
    if (!regexSoloNumeros.test(encNC.numfact)) {
        throw new AppError(`El número de factura ('${encNC.numfact}') debe contener solo dígitos (máximo 19 caracteres).`, 400, "service:validarPayloadNCParcial");
    }

    // 2. Valida que el numero de factura no sea vacio o nulo
    if (!encNC.coddoc || encNC.coddoc.trim().length <= 0) {
        throw new AppError("El número de Nota de Crédito es requerido.", 400, "service:validarPayloadNCParcial");
    }

    // Valida que el numero de factura sea Solo dígitos + Max 19
    if (!regexSoloNumeros.test(encNC.coddoc)) {
        throw new AppError(`El número de Nota de Crédito ('${encNC.coddoc}') debe contener solo dígitos (máximo 19 caracteres).`, 400, "service:validarPayloadNCParcial");
    }

    // 3. Valida que la descripcion de la Nota de Credito no sea vacio o nulo
    if (!encNC.motivo || encNC.motivo.trim().length <= 0) {
        throw new AppError("La descripción del motivo de la Nota de Crédito es requerida.", 400, "service:validarPayloadNCParcial");
    }

    if (encNC.motivo.length > 50) {
        throw new AppError(`La descripción del motivo de la Nota de Crédito excede el límite permitido de 50 caracteres (actual: ${encNC.motivo.length}).`, 400, "service:validarPayloadNCParcial");
    }

    // 4. Validar Detalle
    if (!detNC || detNC.length === 0) {
        throw new AppError('Productos debe tener al menos un item asociado.', 400, "service:validarPayloadNCParcial");
    }

    for (const prod of detNC) {
        // 5. Valida que el codigo del producto no sea vacio o nulo
        if (prod.codigo.trim().length <= 0) {
            throw new AppError("El código del producto es requerido.", 400, "service:validarPayloadNCParcial");
        }

        // 6. Valida la cantidad adquirida
        if (prod.cantidad <= 0) {
            throw new AppError(`La cantidad del producto '${prod.codigo}' (${prod.cantidad}) debe ser mayor a 0.`, 400, "service:validarPayloadNCParcial");
        }

        // 7. Valida que el nombre del producto no sea vacio o nulo
        if (prod.descripcion.trim().length <= 0) {
            throw new AppError("La descripción del producto es requerido.", 400, "service:validarPayloadNCParcial");
        }
    }
}