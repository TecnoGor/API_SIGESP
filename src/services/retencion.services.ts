import { pool } from "../database/db.js";
import apiExternaClient from "../utils/apiExternaClient.js";
import { AppError } from "../utils/appError.js";
import * as func from "../utils/funcionesGlobales.js";
import type { IRetencion } from "../types/IRetencion.js";
import type { IRetencionIslr } from "../types/IRetencionIslr.js";
import type { IResponseRetencionIslr } from "../types/IResponseRetencionIslr.js";
import type { IRetencionIva } from "../types/IRetencionIva.js";

// ? VERIFICADA - 27-07-2026
export async function getRetencionesIslrService(): Promise<IRetencion[]> {
    try {
        // 
        const response = await apiExternaClient.get<IRetencion[]>('/api/Invoice/get_retention_islr');

        return response.data;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:getRetencionesIslrService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:getRetencionesIslrService");
    }
}

// ? VERIFICADA - 27-07-2026
export async function getRetencionesIvaService(): Promise<IRetencion[]> {
    try {
        // 
        const response = await apiExternaClient.get<IRetencion[]>('/api/Invoice/get_retention_iva');

        return response.data;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:getRetencionesIvaService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:getRetencionesIvaService");
    }
}

// ? VERIFICADA - 27-07-2026
export async function postAgregarRetencionIsrlService(numcom: string, codigo_usuario: string): Promise<IResponseRetencionIslr[]> {
    // arma el documento que se va a procesar
    const documento = `ISLR: ${numcom.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postAgregarRetencionIsrlService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

    try {
        // Busco los datos de la retencion
        const query = 'SELECT * FROM fn_api_get_retencion_islr($1)';
        const result = await pool.query<IRetencionIslr>(query, [numcom]);    

        // verifico si existe la retencion
        if (result.rows.length <= 0 ) {
            throw new AppError('Retencion no encontrada', 404, "service:postAgregarRetencionIsrlService");
        }

        // Datos del detalle de la retencion
        const detalleRet = result.rows.map(row => {
            return {
                numeroDocumento: row.numfac.trim(),
                numeroControl: row.num_control.trim(),  // TODO: OJO OJO OJO - PREGUNTAR SI ESTENUMERO DE CONTROL DEBE SER EL GENERADO POR LA IMPRENTA DIGITAL PARA UNA FACTURA
                                                        // TODO: OJO OJO OJO - SI ES ASI SE DEBE CAMBIAR EN EL QUERY fn_api_get_retencion_islr
                fecha: row.fecfac,
                codigo: row.cmp_codret.trim(),
                conceptoPago: row.consol.trim(),
                montoDocumento: row.totcmp_con_iva,
                baseRetencion: row.basimp,
                sustraendo: row.sustraendo,
                porcentaje: row.porded.trim(),
                montoRetenido: row.cmp_monret,
                codigoRetencionIslr: row.cmp_codret.trim() //row.numsol.trim()
            }
        });

        // Construir objeto para enviar
        const payLoad = {
            data: [
                {
                    cliente: [
                        {
                            documentoIdentidadCliente: result.rows[0].rif.trim(),
                            nombreRazonSocialCliente: result.rows[0].nomsujret.trim(),
                            correoCliente: result.rows[0].email.trim(),
                            direccionCliente: result.rows[0].dirsujret.trim(),
                            telefonoCliente: result.rows[0].telefono.trim()
                        }
                    ],
                    retencionIslr: detalleRet
                }
            ]            
        };
        
        // return payLoad as any ;

        // 4. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_retention_islr', payLoad);

        if (response.data.invoice_errors && response.data.invoice_errors.length > 0) {
            throw new AppError(`${response.data.message.trim()} ${response.data.invoice_errors[0]}`, 409, "service:postAgregarRetencionIsrlService");
        }

        // TODO: FALTA GUARDAR/REGISTRAR LA RESPUESTA EN UNA TABLA INTERMEDIA COMO api_integracion_documentos_cgi        
        /*
        // Guarda los datos del documento enviado        
        const prm_id_fact = id_fact;
        const prm_numfact = result.rows[0].numfact;
        const prm_id_doc = null;
        const prm_codtipdoc = 'FACTURA';
        const prm_num_control = response.data.invoice_list_success[0].control_number;
        const prm_url_pdf = response.data.invoice_list_success[0].invoice_pdf;
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
            console.error(`🚨 CRÍTICO: Factura ${prm_numfact} creada en CGI, pero falló guardado local:`, dbError);
            
            // ¡MUY IMPORTANTE! NO hacemos 'throw' aquí. 
            // Dejamos que el código continúe para que el cliente reciba su respuesta de éxito.
        }
        

        //console.log(response.data)
        // retornamos la respuesta
        // return response.data.invoice_list_success[0];
        */        

        return response.data;
                
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postAgregarRetencionIsrlService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postAgregarRetencionIsrlService");
    } finally {
        // Libera el documento del proceso
        func.liberarDocumento(documento);
    }
}

// ? VERIFICADA - 27-07-2026
export async function postAgregarRetencionIvaService(numcom: string, codigo_usuario: string): Promise<IResponseRetencionIslr[]> {
    // arma el documento que se va a procesar
    const documento = `IVA: ${numcom.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postAgregarRetencionIvaService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

    try {
        // Busco los datos de la retencion
        const query = 'SELECT * FROM fn_api_get_retencion_iva($1)';
        const result = await pool.query<IRetencionIva>(query, [numcom]);    

        // verifico si existe la retencion
        if (result.rows.length <= 0 ) {
            throw new AppError('Retencion no encontrada', 404, "service:postAgregarRetencionIvaService");
        }

        // Datos del detalle de la retencion
        const detalleRet = result.rows.map(row => {
            return {
                fechaDeFactura: row.fecfac,
                numeroFactura: row.numfac.trim(),
                numeroControl: row.num_control.trim(),  // TODO: OJO OJO OJO - PREGUNTAR SI ESTENUMERO DE CONTROL DEBE SER EL GENERADO POR LA IMPRENTA DIGITAL PARA UNA FACTURA
                                                        // TODO: OJO OJO OJO - SI ES ASI SE DEBE CAMBIAR EN EL QUERY fn_api_get_retencion_islr                
                numeroNotaDeCredito: row.nota_credito.trim(),
                numeroNotaDeDebito: row.nota_debito.trim(),
                numeroFacturaAfectada: row.factura_afectada.trim(),                
                totalDeCompraIncluyendoIva: row.totcmp_con_iva,
                compraSinDerechoACreditoFiscal: row.compsinderiva,
                baseImponible: row.basimp,
                porcentaje_iva: row.porimp.trim(),
                porcentaje: row.porded.trim()
            }
        });

        // Construir objeto para enviar
        const payLoad = {
            data: [
                {
                    cliente: [
                        {
                            documentoIdentidadCliente: result.rows[0].rif.trim(),
                            nombreRazonSocialCliente: result.rows[0].nomsujret.trim(),
                            correoCliente: result.rows[0].email.trim(),
                            direccionCliente: result.rows[0].dirsujret.trim(),
                            telefonoCliente: result.rows[0].telefono.trim()
                        }
                    ],
                    RetencionIva: detalleRet
                }
            ]            
        };
        
        // return payLoad as any ;

        // 4. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_retention_iva', payLoad);

        if (response.data.invoice_errors && response.data.invoice_errors.length > 0) {
            throw new AppError(`${response.data.message.trim()} ${response.data.invoice_errors[0]}`, 409, "service:postAgregarRetencionIvaService");
        }

        // TODO: FALTA GUARDAR/REGISTRAR LA RESPUESTA EN UNA TABLA INTERMEDIA COMO api_integracion_documentos_cgi        
        /*
        // Guarda los datos del documento enviado        
        const prm_id_fact = id_fact;
        const prm_numfact = result.rows[0].numfact;
        const prm_id_doc = null;
        const prm_codtipdoc = 'FACTURA';
        const prm_num_control = response.data.invoice_list_success[0].control_number;
        const prm_url_pdf = response.data.invoice_list_success[0].invoice_pdf;
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
            console.error(`🚨 CRÍTICO: Factura ${prm_numfact} creada en CGI, pero falló guardado local:`, dbError);
            
            // ¡MUY IMPORTANTE! NO hacemos 'throw' aquí. 
            // Dejamos que el código continúe para que el cliente reciba su respuesta de éxito.
        }
        

        //console.log(response.data)
        // retornamos la respuesta
        // return response.data.invoice_list_success[0];
        */        

        return response.data;
                
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postAgregarRetencionIvaService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postAgregarRetencionIvaService");
    } finally {
        // Libera el documento del proceso
        func.liberarDocumento(documento);
    }
}

// export async function postAnularRetencionIvaIslrService(numsol: string, codigo_usuario: string): Promise<string[]> {
//     return []
// }