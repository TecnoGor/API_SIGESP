import { pool } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from '../utils/apiExternaClient.js';
import type { INotaCreditoDetalle } from '../types/INotaCreditoDetalle.js';
import type { IResponseNotaCredito } from '../types/IResponseNotaCredito.js';
import type { IResponseNotaCreditoParcial } from '../types/IResponseNotaCreditoParcial.js';
<<<<<<< HEAD
import * as func from "../utils/funcionesGlobales.js";

// ? VERIFICADA - 27-07-2026
export async function postCrearNCService(id_doc: number, codigo_usuario: string): Promise<IResponseNotaCredito> {
    // arma el documento que se va a procesar
    const documento = `NC: ${id_doc.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postCrearNCService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

=======

// ? VERIFICADA - 27-07-2026
export async function postCrearNCService(id_doc: number, codigo_usuario: string): Promise<IResponseNotaCredito> {
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0
    try {
        // Busco los datos de la Nota de Credito
        const query = 'SELECT * FROM fn_api_get_nota_credito($1)';
        const result = await pool.query<INotaCreditoDetalle>(query, [id_doc]);    

        // verifico si existe la Nota de Credito
        if (result.rows.length <= 0 ) {
            throw new AppError('Nota de Credito no encontrada', 404, "service:postCrearNCService");
        }

        // Construir objeto para enviar
        const payLoad = {
            numeroFactura: result.rows[0].numfact.toString(),       // Número de factura a afectar
            numeroNotaCredito: result.rows[0].coddoc.toString()     // Número de nota de crédito a crear
        };
        
        // 4. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
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
            const query1 = 'SELECT * FROM fn_api_post_integracion_documentos($1, $2, $3, $4, $5, $6, $7)';
            await pool.query(query1, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu]);        
        } catch (dbError) {
            // 🚨 LOG CRÍTICO: La factura existe en el ente externo, pero no se guardó localmente.
            // Aquí usamos console.error, pero idealmente deberías usar una librería como Winston 
            // o guardar este error en un archivo de texto para no perder el rastro.
            console.error(`🚨 CRÍTICO: Nota de Credito ${result.rows[0].coddoc} creada en CGI, pero falló guardado local:`, dbError);
            
            // ¡MUY IMPORTANTE! NO hacemos 'throw' aquí. 
            // Dejamos que el código continúe para que el cliente reciba su respuesta de éxito.
        }        
        
        return data;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCrearNCService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCrearNCService");
<<<<<<< HEAD
    } finally {
        // Libera el documento del proceso
        func.liberarDocumento(documento);
=======
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0
    }
}

// ? VERIFICADA - 27-07-2026
export async function postCrearNCParcialService(id_doc: number, codigo_usuario: string): Promise<IResponseNotaCreditoParcial> {
<<<<<<< HEAD
    // arma el documento que se va a procesar
    const documento = `NC-PARCIAL: ${id_doc.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postCrearNCParcialService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

=======
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0
    try {
        // Busco los datos de la Nota de Credito Parcial
        const query = 'SELECT * FROM fn_api_get_nota_credito($1)';
        const result = await pool.query<INotaCreditoDetalle>(query, [id_doc]);    

        // verifico si existe la Nota de Credito Parcial
        if (result.rows.length <= 0 ) {
            throw new AppError('Nota de Credito Parcial no encontrada', 404, "service:postCrearNCParcialService");
        }

        // Datos del detalle
        const detalle = result.rows.map(row => {
            return {
                codigo: row.coddetalle.trim(),
                cantidad: row.cantidad_detdoc,
                descripcion: row.descripcionProducto.trim()
            }
        });        

        // Construir objeto para enviar
        const payLoad = {
            numeroFactura: result.rows[0].numfact.toString(),       // Número de factura a afectar
            numeroNotaCredito: result.rows[0].coddoc.toString(),    // Número de nota de crédito a crear
            productos: detalle
        };
        
        // 4. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
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
            const query1 = 'SELECT * FROM fn_api_post_integracion_documentos($1, $2, $3, $4, $5, $6, $7)';
            await pool.query(query1, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu]);
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
<<<<<<< HEAD
    } finally {
        // Libera el documento del proceso
        func.liberarDocumento(documento);
=======
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0
    }
}