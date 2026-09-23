import apiExternaClient from '../utils/apiExternaClient.js';
import { poolSigesp } from "../database/db.js";
import { AppError } from "../utils/appError.js";

// ? LISTA: 17-09-2026
export async function postCargarDocumentosEnviadosService(codigo_usuario: string): Promise<void> {
    try {
        // 1. ✅ - EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.get('/api/Invoice/get_list_invoices');
        
        // 2. ✅ - Aplanamos la matriz por si viene como [[{...}, {...}]]
        const invoicesList = response.data.invoices.flat(); 

        // 3. ✅ - Mapeamos la lista a un arreglo de objetos con los campos formateados
        const payload = invoicesList.map((item: any) => ({
            numfact: item.document.trim() === 'FACTURA' ? Number(item.invoice_number) : null,
            coddoc: item.document.trim() === 'FACTURA' ? null : item.invoice_number.trim(),
            codtipdoc: item.document.trim() === 'FACTURA' ? item.document.trim() : 'NC',
            num_control: item.control_number.trim(),
            url_pdf: item.invoice_pdf.trim(),
            fecreg: item.created,
            codusu: codigo_usuario
        }));

        // 4. ✅ - Ejecutamos la función enviando todo el lote en un solo parámetro JSONB
        const query = 'SELECT fn_api_contingencia_documentos_fiscales_enviados($1::jsonb)';
        await poolSigesp.query(query, [JSON.stringify(payload)]);

        return;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCargarDocumentosEnviadosService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCargarDocumentosEnviadosService");
    }
}

// ? LISTA: 17-09-2026
export async function postCargarCodigosRetencionIslrService(codigo_usuario: string): Promise<void> {
    try {
        // 1. ✅ - EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.get('/api/Invoice/islr_retention_codes');
        
        // 2. ✅ - Aplanamos la matriz por si viene como [[{...}, {...}]]
        const codigosList = response.data.islr_retention_codes.flat(); 
        
        // 3. ✅ - Mapeamos la lista a un arreglo de objetos con los campos formateados
        const payload = codigosList.map((item: any) => ({
            codigo: item.Codigo.trim(),
            concepto_de_retencion: item.concepto_de_retencion.trim()
        }));

        // 4. ✅ - Ejecutamos la función enviando todo el lote en un solo parámetro JSONB
        const query = 'SELECT fn_api_contingencia_codigos_retenciones_islr($1::jsonb)';
        await poolSigesp.query(query, [JSON.stringify(payload)]);

        return;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCargarCodigosRetencionIslrService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCargarCodigosRetencionIslrService");
    }
}

// ! NO APLICA: 17-09-2026
// export async function postTasaDolaroficialService(): Promise<void> {
//     try {
//         // Usamos axios global para no entrar en bucle
//         const response = await axios.get(`https://ve.dolarapi.com/v1/dolares`, { timeout: 5000 });

//         if (!response.data) {
//             throw new AppError("Respuesta inválida desde la API externa", 400, "service:postTasaDolaroficialService");
//         }
            
//         // Buscar el elemento cuyo objeto tenga fuente === 'oficial'
//         const dolarOficial = response.data.find((item: any) => item.fuente.trim().toLowerCase() === 'oficial');

//         if (!dolarOficial || !dolarOficial.promedio) {
//             throw new AppError("No se encontró la Tasa Oficial en la API externa.", 500, "service:postTasaDolaroficialService");
//         }

//         // Ejecutamos el Stored Procedure / Función para cargar el registro
//         const query = 'SELECT * FROM fn_api_post_integracion_parametros($1, $2)';
//         await poolSigesp.query(query, [dolarOficial.promedio, dolarOficial.fechaActualizacion]);

//         return;
        
//     } catch (error: any) {
//         if (error instanceof AppError) {
//             throw error; // ✅ ya tiene statusCode y location
//         }

//         if (error?.response?.data) {
//             throw new AppError(error.response.data.message.trim(), error.response.status, "service:postTasaDolaroficialService");    
//         }

//         throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postTasaDolaroficialService");
//     }
// }

/* 
TODO: RESPALDO 
export async function postCargarDocumentosEnviadosService(codigo_usuario: string): Promise<void> {
    try {
        // 1. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.get('/api/Invoice/get_list_invoices');
        
        // 2. ✅  Aplanamos la matriz por si viene como [[{...}, {...}]]
        const invoicesList = response.data.invoices.flat(); 

        // 3. ✅  Recorremos cada documento recibido de la API
        for (const item of invoicesList) {
            // Extraemos los datos recibidos del endpoint
            const prm_numfact = item.document.trim() === 'FACTURA' ? Number(item.invoice_number) : null;
            const prm_coddoc = item.document.trim() === 'FACTURA' ? null : item.invoice_number.trim();
            const prm_codtipdoc = item.document.trim() === 'FACTURA' ? item.document.trim() : 'NC';
            const prm_num_control = item.control_number.trim();
            const prm_url_pdf = item.invoice_pdf.trim();
            const prm_fecreg = item.created;
            const prm_codusu = codigo_usuario;

            // 3. Ejecutamos el Stored Procedure / Función para cada registro
            const query = 'SELECT * FROM fn_api_contingencia_documentos_fiscales_enviados($1, $2, $3, $4, $5, $6, $7)';
            await poolSigesp.query(query, [prm_numfact, prm_coddoc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_fecreg, prm_codusu]);
        }
        
        return;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCargarDocumentosEnviadosService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCargarDocumentosEnviadosService");
    }
}
*/