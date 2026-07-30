import axios from 'axios';
import { pool } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import { TokenManager } from '../utils/tokenManager.js';

// ? VERIFICADA - 27-07-2026
export async function postCargarDocumentosEnviadosService(): Promise<void> {
    try {
        // TODO: OJO OJO OJO - QUITAR porque se utilizara interceptores
        // TODO: SOLO SE HABILITO POR PRUEBAS
        // Crear instancia del TokenManager
        const tokenManager = new TokenManager();

        const bearerToken = await tokenManager.getToken();
        // const bearerToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJGYWN0dXJhY2lcdTAwZjNuIENHIiwiaWF0IjoxNzg0ODM0MjIwLCJleHAiOjE3ODQ4Mzc4MjAsIm5iZiI6MTc4NDgzNDIyMCwiY2xpZW50X2lkIjoiUm8zNW5IQXEzYkVVTXYxV3RcL3hRTXc9PSIsImNsaWVudF9uYW1lIjoiSU5TVElUVVRPIFBPU1RBTCBURUxFR1JBRklDTyBERSBWRU5FWlVFTEEiLCJjbGllbnRfdHlwZV9kb2N1bWVudF9yaWYiOiJndkFZczdUSmkxZ204WllwZFc5d2F3PT0iLCJjbGllbnRfcmlmIjoiQ1ZzMXJXUWRJcDhrNHhvM2pmUHFOZz09In0.mOczOGDNbgSabnC1Jd6t-SzuKad21nzqIr2IO178Tn8"; //await tokenManager.getToken();
        // TODO: SOLO SE HABILITO POR PRUEBAS

        // Ejecuto la peticion
        const response = await axios.get(
            `${process.env.APP_API_CGI_URL}/api/Invoice/get_list_invoices`,
            {             
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                }
            }
        );

        // console.log('******* RESPONSE DATA ************')
        // console.log(response.data.invoices.length)
        // console.log(response.data.invoices.flat().length)
        // console.log('**********************************')

        // 1. Aplanamos la matriz por si viene como [[{...}, {...}]]
        const invoicesList = response.data.invoices.flat(); 

        // 2. Recorremos cada documento recibido de la API
        for (const item of invoicesList) {
            // Extraemos los datos recibidos del endpoint
            const prm_numfact = item.document.trim() === 'FACTURA' ? item.invoice_number : null;
            const prm_coddoc = item.document.trim() === 'FACTURA' ? null : item.invoice_number;
            const prm_codtipdoc = item.document.trim() === 'FACTURA' ? item.document.trim() : 'NC';
            const prm_num_control = item.control_number;
            const prm_url_pdf = item.invoice_pdf;
            const prm_fecreg = item.created;

            // 3. Ejecutamos el Stored Procedure / Función para cada registro
            const query = 'SELECT * FROM fn_api_contingencia_documentos_enviados($1, $2, $3, $4, $5, $6)';
            await pool.query(query, [prm_numfact, prm_coddoc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_fecreg]);
        }

        return;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        // console.log('************* ERROR **************')
        // console.log(error.response.data)
        // console.log(error.response.status)        
        // console.log('**********************************')

        if (error.response.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCrearNCService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCrearNCService");
    }
}

