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
        const payload = invoicesList
            .filter((item: any) => item.status?.toLowerCase().trim() === 'emitida')
            .map((item: any) => {
                const isFactura = item.document?.toUpperCase().trim() === 'FACTURA';

                return {
                    numfact: isFactura ? Number(item.invoice_number) : null,
                    coddoc: isFactura ? null : item.invoice_number?.trim(),
                    codtipdoc: isFactura ? item.document?.toUpperCase().trim() : 'NC',
                    num_control: item.control_number?.trim(),
                    url_pdf: item.invoice_pdf?.trim(),
                    fecreg: item.created,
                    codusu: codigo_usuario,
                    estado: 'ENVIADO',
                    observacion: isFactura ? 'Factura enviada satisfactoriamente' : 'Nota de Crédito enviada satisfactoriamente'
                };
            });

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
// export async function postCargaRetencionesIslrService(codigo_usuario: string): Promise<void> {
//     try {
//         // 1. ✅ - EJECUTAMOS LA PETICIÓN LIMPIA
//         // Nota como no le pasamos headers, ni baseURL, ni Authorization.
//         // El interceptor hace todo eso antes de salir de tu backend.
//         const response = await apiExternaClient.get('/api/Invoice/get_retention_islr');

//         // 2. ✅ - Aplanamos la matriz por si viene como [[{...}, {...}]]
//         const retentionsList = response.data.retention.flat(); 

//     //     // 3. ✅ - Mapeamos la lista a un arreglo de objetos con los campos formateados
//     //     const payload = retentionsList
//     //         .filter((item: any) => item.status?.toLowerCase().trim() === 'emitida')
//     //         .map((item: any) => {
//     //             const isFactura = item.document?.toUpperCase().trim() === 'FACTURA';

//     //             return {
//     //                 numfact: isFactura ? Number(item.invoice_number) : null,
//     //                 coddoc: isFactura ? null : item.invoice_number?.trim(),
//     //                 codtipdoc: isFactura ? item.document?.toUpperCase().trim() : 'NC',
//     //                 num_control: item.control_number?.trim(),
//     //                 url_pdf: item.invoice_pdf?.trim(),
//     //                 fecreg: item.created,
//     //                 codusu: codigo_usuario,
//     //                 estado: 'ENVIADO',
//     //                 observacion: isFactura ? 'Factura enviada satisfactoriamente' : 'Nota de Crédito enviada satisfactoriamente'
//     //             };
//     //         });

//     //         /*
//     //         id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
// 	// numcom bpchar(15) NOT NULL,
// 	// numsol bpchar(15) NOT NULL,
// 	// codtipdoc varchar(10) NOT NULL,
// 	// estado varchar(20) NOT NULL,
// 	// num_control varchar(25) NULL,
// 	// url_pdf text NULL,
// 	// observacion text NOT NULL,
// 	// fecreg timestamptz DEFAULT now() NOT NULL,
// 	// codusu bpchar(30) NOT NULL,
// 	// api_modulo varchar DEFAULT 'SIGESP'::character varying NOT NULL,
// 	// api_id_origen int4 NULL,
//     //         */

//     //     // 4. ✅ - Ejecutamos la función enviando todo el lote en un solo parámetro JSONB
//     //     const query = 'SELECT fn_api_contingencia_documentos_fiscales_enviados($1::jsonb)';
//     //     await poolSigesp.query(query, [JSON.stringify(payload)]);
        

//         return retentionsList;

//     } catch (error: any) {
//         if (error instanceof AppError) {
//             throw error; // ✅ ya tiene statusCode y location
//         }

//         if (error?.response?.data) {
//             throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCargaRetencionesIslrService");    
//         }

//         throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCargaRetencionesIslrService");
//     }
// }

// ! NO APLICA: 17-09-2026
// export async function postCargaRetencionesIvaService(codigo_usuario: string): Promise<void> {
//     try {
//         //
//         const response = await apiExternaClient.get<IRetencion[]>('/api/Invoice/get_retention_iva');

//         return response.data;

//     } catch (error: any) {
//         if (error instanceof AppError) {
//             throw error; // ✅ ya tiene statusCode y location
//         }

//         if (error?.response?.data) {
//             throw new AppError(error.response.data.message.trim(), error.response.status, "service:getRetencionesIvaService");
//         }

//         throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:getRetencionesIvaService");
//     }
// }

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