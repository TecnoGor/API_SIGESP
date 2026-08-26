import { poolSigesp } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from '../utils/apiExternaClient.js';
import type { IFacturaDetalle } from '../types/IFacturaDetalle.js';
import type { IResponseFactura } from '../types/IResponseFactura.js';
import type { IFacturaAnular } from '../types/IFacturaAnular.js';
import * as func from "../utils/funcionesGlobales.js";

// ? VERIFICADA - 27-07-2026
export async function postAgregarService(id_fact: number, codigo_usuario: string): Promise<IResponseFactura> {
    // arma el documento que se va a procesar
    const documento = `FACTURA: ${id_fact.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postAgregarService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

    try {
        // Busco los datos de la factura
        const query = 'SELECT * FROM fn_api_get_factura_detalle($1)';
        const result = await poolSigesp.query<IFacturaDetalle>(query, [id_fact]);

        // verifico si existe la factura
        if (result.rows.length <= 0 ) {
            throw new AppError('Factura no encontrada', 404, "service:postAgregarService");
        }

        //
        const encFactura = result.rows[0];

        // Datos del detalle
        const detFactura = result.rows.map(row => {
            return {
                codigoProducto: row.coddetalle.trim(),
                nombreProducto: row.nombreProducto.trim(),
                descripcionProducto: row.descripcionProducto.trim(),
                tipoImpuesto: row.tipoImpuesto.trim(),
                cantidadAdquirida: Number(row.cantidadAdquirida), 
                precioProducto: row.precioProducto
            }
        });

        // Se validan los campos requeridos
        await validarPayloadFactura(encFactura, detFactura);

        // 5. Formateo de Tasa Estricto a 4 Decimales en String (Ej: "342.8633")
        const tasaFormateada = Number(encFactura.tasa_del_dia).toFixed(4);

        // Construir objeto para enviar
        const payLoad = {
            numeroSerie: "A",
            cantidadFactura: 1,
            facturas: [
                {
                    numeroFactura: encFactura.numfact.trim(),
                    documentoIdentidadCliente: encFactura.numpririf.trim(),
                    nombreRazonSocialCliente: encFactura.nombre_cliente.trim(),
                    correoCliente: encFactura.emailcliente.trim(),
                    direccionCliente: encFactura.dircliente.trim(),
                    telefonoCliente: encFactura.telcliente.trim(),
                    productos: detFactura,
                    tasa_del_dia: tasaFormateada,
                    fecha_tasa: encFactura.fecha_tasa.trim(),
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
            const query1 = 'SELECT * FROM fn_api_post_integracion_documentos($1, $2, $3, $4, $5, $6, $7, $8, $9)';
            await poolSigesp.query(query1, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu, 'SIGESP', null]);

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
    } finally {
        // Libera el documento del proceso
        func.liberarDocumento(documento);
    }
}

// ? VERIFICADA - 27-07-2026
export async function postAnularService(id_fact: number): Promise<any> {
    // arma el documento que se va a procesar
    const documento = `ANULACION: ${id_fact.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postAnularService");

    // Bloquea el documento
    func.bloquearDocumento(documento)

    try {
        // Busco los datos de la factura
        const query = 'SELECT * FROM fn_api_get_factura_anular($1)';
        const result = await poolSigesp.query<IFacturaAnular>(query, [id_fact]);    

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
    finally {
        // Libera el documento del proceso
        func.liberarDocumento(documento);
    }
}

// ? VERIFICADA - 27-07-2026
async function validarPayloadFactura(encFactura: IFacturaDetalle, detFactura: any[]): Promise<void> {
    // 1. Validar Documento de Identidad (V, E, P, J, G, C + min 5 dígitos)
    const rifRegex = /^[VEPJGC]\d{5,}$/i;
    
    if (!rifRegex.test(encFactura.numpririf.trim())) {
        throw new AppError(`El documento de identidad ('${encFactura.numpririf.trim()}') no cumple con el formato fiscal requerido.`, 400, "service:validarPayloadFactura");
    }

    // 2. Validar Correo Electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(encFactura.emailcliente.trim())) {
        throw new AppError(`El correo del cliente ('${encFactura.emailcliente.trim()}') no posee un formato válido (user@domain).`, 400, "service:validarPayloadFactura");
    }

    // 3. Validar Tasa del Día (Formato: 3 enteros y 4 decimales con punto. Ej: "342.8633" o "056.6500")
    // Obtener fecha de hoy en formato YYYY-MM-DD (Zona horaria Venezuela / Local)
    const hoyStr = new Date().toLocaleDateString('sv-SE');

    // Extraer valores de la consulta SQL
    let tasaRaw: number | null = encFactura.tasa_del_dia;
    let fechaRaw: string | null = encFactura.fecha_tasa; // Viene como 'YYYY-MM-DD' o null

    if (!tasaRaw || tasaRaw === null || tasaRaw === undefined || tasaRaw <= 0 || !fechaRaw || fechaRaw.trim().length <= 0 || fechaRaw.trim() !== hoyStr) {
        throw new AppError("La tasa oficial del dia está desactualizada o no esta configurada.", 400, "service:postAgregarService");
    }    

    // Tasa: Formato número decimal con punto a 4 decimales (Ej: 342.8633) SIN ceros a la izquierda
    const tasaRegex = /^\d{1,3}\.\d{4}$/;
    
    if (!tasaRegex.test(tasaRaw.toString())) {
        throw new AppError(`La tasa del día ('${tasaRaw}') debe tener formato estrictamente de 3 enteros y 4 decimales con punto (ej: '342.8633').`, 400, "service:validarPayloadFactura");
    }

    const fechaRegex = /^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/;
    
    if (!fechaRegex.test(fechaRaw)) {
        throw new AppError(`La fecha de la tasa ('${fechaRaw}') no tiene un formato válido (DD-MM-YYYY o YYYY-MM-DD).`, 400, "service:validarPayloadFactura");
    }

    // Asignación de nuevos valores a la estructura
    encFactura.tasa_del_dia = Number(tasaRaw); 
    encFactura.fecha_tasa = hoyStr;

    // 4. Validar Detalle
    if (!detFactura || detFactura.length === 0) {
        throw new AppError('La factura debe tener al menos un producto asociado.', 400, "service:validarPayloadFactura");
    }

    for (const prod of detFactura) {
        // 5. Validar Detalle
        if (prod.cantidadAdquirida <= 0 || prod.cantidadAdquirida > 1000.00) {
            throw new AppError(`La cantidad del producto '${prod.codigoProducto}' (${prod.cantidadAdquirida}) debe ser mayor a 0 y menor o igual a 1000.00.`, 400, "service:validarPayloadFactura");
        }

        // 5. Valida que el precio mantenga la coma como separador decimal
        const precioRegex = /^\d+(,\d{1,2})?$/;
        
        if (!precioRegex.test(prod.precioProducto)) {
            throw new AppError(`El precio del producto '${prod.codigoProducto}' (${prod.precioProducto}) debe usar coma como separador decimal (máximo 2 decimales).`, 400, "service:validarPayloadFactura");
        }
    }
}