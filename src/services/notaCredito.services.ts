import axios from 'axios';
import { pool } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import { TokenManager } from '../utils/tokenManager.js';
import type { INotaCreditoDetalle } from '../types/INotaCreditoDetalle.js';
import type { IResponseNotaCredito } from '../types/IResponseNotaCredito.js';
import type { IResponseNotaCreditoParcial } from '../types/IResponseNotaCreditoParcial.js';

// ? VERIFICADA - 27-07-2026
export async function postCrearNCService(id_doc: number): Promise<IResponseNotaCredito> {
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
        
        // TODO: OJO OJO OJO - QUITAR porque se utilizara interceptores
        // TODO: SOLO SE HABILITO POR PRUEBAS
        // Crear instancia del TokenManager
        const tokenManager = new TokenManager();

        const bearerToken = await tokenManager.getToken();
        // const bearerToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJGYWN0dXJhY2lcdTAwZjNuIENHIiwiaWF0IjoxNzg0ODM0MjIwLCJleHAiOjE3ODQ4Mzc4MjAsIm5iZiI6MTc4NDgzNDIyMCwiY2xpZW50X2lkIjoiUm8zNW5IQXEzYkVVTXYxV3RcL3hRTXc9PSIsImNsaWVudF9uYW1lIjoiSU5TVElUVVRPIFBPU1RBTCBURUxFR1JBRklDTyBERSBWRU5FWlVFTEEiLCJjbGllbnRfdHlwZV9kb2N1bWVudF9yaWYiOiJndkFZczdUSmkxZ204WllwZFc5d2F3PT0iLCJjbGllbnRfcmlmIjoiQ1ZzMXJXUWRJcDhrNHhvM2pmUHFOZz09In0.mOczOGDNbgSabnC1Jd6t-SzuKad21nzqIr2IO178Tn8"; //await tokenManager.getToken();
        // TODO: SOLO SE HABILITO POR PRUEBAS

        // Ejecuto la peticion
        const response = await axios.post(
            `${process.env.APP_API_CGI_URL}/api/Invoice/add_credit_note`, 
            payLoad, 
            {             
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                }
            }
        );

        if (!response.data.success) {
            throw new AppError(`${response.data.message.trim()}`, 409, "service:postCrearNCService");
        }

        const data = {
            "invoice_number_affected": response.data.invoice_number_affected,
            "control_number": response.data.control_number,
            "credit_note_pdf": response.data.credit_note_pdf,
            "warning_control_numbers": response.data.warning_control_numbers
        }

        // TODO: FALTA AGREGAR EL NUMERO DE CONTROL Y LA RUTA DEL PDF A LA NUEVA TABLA
        const prm_id_fact = result.rows[0].id_fact;
        const prm_numfact = result.rows[0].numfact;
        const prm_id_doc = id_doc;
        const prm_codtipdoc = 'NC';
        const prm_num_control = data.control_number;
        const prm_url_pdf = data.credit_note_pdf;

        // Elimina los datos de la configuracion Local
        const query1 = 'SELECT * FROM fn_api_post_integracion_documentos($1, $2, $3, $4, $5, $6)';
        const result1 = await pool.query(query1, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf]);
        // TODO: FALTA AGREGAR EL NUMERO DE CONTROL Y LA RUTA DEL PDF A LA NUEVA TABLA
        
        return data;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error.response.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCrearNCService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCrearNCService");
    }
}

// ? VERIFICADA - 27-07-2026
export async function postCrearNCParcialService(id_doc: number): Promise<IResponseNotaCreditoParcial> {
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
        
        // TODO: OJO OJO OJO - QUITAR porque se utilizara interceptores
        // TODO: SOLO SE HABILITO POR PRUEBAS
        // Crear instancia del TokenManager
        const tokenManager = new TokenManager();

        const bearerToken = await tokenManager.getToken();
        // const bearerToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJGYWN0dXJhY2lcdTAwZjNuIENHIiwiaWF0IjoxNzg0ODM0MjIwLCJleHAiOjE3ODQ4Mzc4MjAsIm5iZiI6MTc4NDgzNDIyMCwiY2xpZW50X2lkIjoiUm8zNW5IQXEzYkVVTXYxV3RcL3hRTXc9PSIsImNsaWVudF9uYW1lIjoiSU5TVElUVVRPIFBPU1RBTCBURUxFR1JBRklDTyBERSBWRU5FWlVFTEEiLCJjbGllbnRfdHlwZV9kb2N1bWVudF9yaWYiOiJndkFZczdUSmkxZ204WllwZFc5d2F3PT0iLCJjbGllbnRfcmlmIjoiQ1ZzMXJXUWRJcDhrNHhvM2pmUHFOZz09In0.mOczOGDNbgSabnC1Jd6t-SzuKad21nzqIr2IO178Tn8"; //await tokenManager.getToken();
        // TODO: SOLO SE HABILITO POR PRUEBAS

        // Ejecuto la peticion
        const response = await axios.post(
            `${process.env.APP_API_CGI_URL}/api/Invoice/add_credit_note_with_products`, 
            payLoad, 
            {             
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                }
            }
        );

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

        // TODO: FALTA AGREGAR EL NUMERO DE CONTROL Y LA RUTA DEL PDF A LA NUEVA TABLA
        const prm_id_fact = result.rows[0].id_fact;
        const prm_numfact = result.rows[0].numfact;
        const prm_id_doc = id_doc;
        const prm_codtipdoc = 'NC';
        const prm_num_control = data.control_number;
        const prm_url_pdf = data.credit_note_pdf;

        // Elimina los datos de la configuracion Local
        const query1 = 'SELECT * FROM fn_api_post_integracion_documentos($1, $2, $3, $4, $5, $6)';
        const result1 = await pool.query(query1, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf]);
        // TODO: FALTA AGREGAR EL NUMERO DE CONTROL Y LA RUTA DEL PDF A LA NUEVA TABLA
        
        return response.data;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error.response.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCrearNCParcialService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCrearNCParcialService");
    }
}