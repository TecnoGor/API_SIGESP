import { pool } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from '../utils/apiExternaClient.js';

// ? VERIFICADA - 27-07-2026
export async function postCargarDocumentosEnviadosService(codigo_usuario: string): Promise<void> {
    try {
        // 4. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.get('/api/Invoice/get_list_invoices');
        
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
            const prm_codusu = codigo_usuario;

            // 3. Ejecutamos el Stored Procedure / Función para cada registro
            const query = 'SELECT * FROM fn_api_contingencia_documentos_enviados($1, $2, $3, $4, $5, $6, $7)';
            await pool.query(query, [prm_numfact, prm_coddoc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_fecreg, prm_codusu]);
        }

        return;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCrearNCService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCrearNCService");
    }
}

