import { pool } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from '../utils/apiExternaClient.js';
import type { IFacturaDetalle } from '../types/IFacturaDetalle.js';
import type { IResponseFactura } from '../types/IResponseFactura.js';
import type { IFacturaAnular } from '../types/IFacturaAnular.js';


// ? VERIFICADA - 27-07-2026
export async function postAgregarService(id_fact: number, codigo_usuario: string): Promise<IResponseFactura> {
    try {
        // Busco los datos de la factura
        const query = 'SELECT * FROM fn_api_get_factura_detalle($1)';
        const result = await pool.query<IFacturaDetalle>(query, [id_fact]);    

        // verifico si existe la factura
        if (result.rows.length <= 0 ) {
            throw new AppError('Factura no encontrada', 404, "service:postAgregarService");
        }

        // Datos del detalle
        const detalle = result.rows.map(row => {
            return {
                codigoProducto: row.coddetalle.trim(),
                nombreProducto: row.nombreProducto.trim(),
                descripcionProducto: row.descripcionProducto.trim(),
                tipoImpuesto: row.tipoImpuesto,
                cantidadAdquirida: Number(row.cantidadAdquirida), 
                precioProducto: row.precioProducto
            }
        });

        // Construir objeto para enviar
        const payLoad = {
            numeroSerie: "A",
            cantidadFactura: 1,
            facturas: [
                {
                    numeroFactura: result.rows[0].numfact,
                    documentoIdentidadCliente: result.rows[0].numpririf.trim(),
                    nombreRazonSocialCliente: result.rows[0].nombre_cliente.trim(),
                    correoCliente: result.rows[0].emailcliente.trim(),
                    direccionCliente: result.rows[0].dircliente.trim(),
                    telefonoCliente: result.rows[0].telcliente.trim(),
                    productos: detalle,
                    order_payment_methods: []
                }
            ]
        };

        // 4. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_list_invoice', payLoad);

        if (response.data.invoice_errors && response.data.invoice_errors.length > 0) {
            throw new AppError(`${response.data.message.trim()} ${response.data.invoice_errors[0]}`, 409, "service:postAgregarService");
        }

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

        // retornamos la respuesta
        return response.data.invoice_list_success[0];
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postAgregarService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postAgregarService");
    }
}

// ? VERIFICADA - 27-07-2026
export async function postAnularService(id_fact: number): Promise<any> {
    try {
        // Busco los datos de la factura
        const query = 'SELECT * FROM fn_api_get_factura_anular($1)';
        const result = await pool.query<IFacturaAnular>(query, [id_fact]);    

        // verifico si existe la factura
        if (result.rows.length <= 0 ) {
            throw new AppError('Factura no encontrada', 404, "service:postAnularService");
        }
        
        // Construir objeto para enviar
        const payLoad = {
            numero_documento: result.rows[0].numfact,
            numero_control: result.rows[0].num_control
        };

        // 4. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/cancel_invoice', payLoad);

        return;
        
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postAnularService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postAnularService");
    }
}

