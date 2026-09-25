import { poolSigesp } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from '../utils/apiExternaClient.js';
import type { IFacturaDetalle } from '../types/IFacturaDetalle.js';
import type { IResponseFactura } from '../types/IResponseFactura.js';
import * as func from "../utils/funcionesGlobales.js";

// ? LISTA: 17-09-2026
export async function postAgregarService(id_fact: number, codigo_usuario: string): Promise<IResponseFactura> {
    // arma el documento que se va a procesar
    const documento = `FACTURA: ${id_fact.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postAgregarService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

    try {
        // 👇 PASO 1. Busco los datos de la factura
        const query = 'SELECT * FROM fn_api_get_factura_detalle($1)';
        const result = await poolSigesp.query<IFacturaDetalle>(query, [id_fact]);

        // verifico si existe la factura
        if (result.rows.length <= 0 ) {
            throw new AppError('Factura no encontrada', 404, "service:postAgregarService");
        }

        // 👇 PASO 2. Verifico si el estado del documento (FACTURA).
        const estado = result.rows[0].estado?.trim();
        const observacion = result.rows[0].observacion?.trim();
        const numControl = result.rows[0]?.num_control?.trim();        
        
        if (estado?.toUpperCase() === "PENDIENTE") {
            throw new AppError("Esta factura tiene un proceso pendiente.", 409,"service:postAgregarService");
        }

        if (estado?.toUpperCase() === "ENVIADO" && numControl) {
            throw new AppError("Esta factura ya fue enviada correctamente.", 409, "service:postAgregarService");
        }

        if (estado?.toUpperCase() === "RECHAZADO") {
            throw new AppError(`Esta factura fue rechazada por el siguiente motivo: ${observacion}`, 409, "service:postAgregarService");
        }

        // Datos del Encabezado
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

        // 👇 PASO 3. Se validan los campos requeridos y formatos
        await validarPayloadFactura(encFactura, detFactura);

        // 👇 PASO 4. Construir objeto para enviarlo a la api externa
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
                    // tasa_del_dia: Number(encFactura.tasa_del_dia).toFixed(4),
                    tasa_del_dia: encFactura.tasa_del_dia?.trim(),
                    fecha_tasa: encFactura.fecha_tasa?.trim(),
                    order_payment_methods: []
                }
            ]
        };

        // 👇 PASO 5. Realiza el registro inicial de la factura        
        const prm_id_fact = id_fact;
        const prm_numfact = Number(encFactura.numfact);
        const prm_id_doc = null;
        const prm_codtipdoc = 'FACTURA';        
        const prm_codusu = codigo_usuario;

        // registro inicial
        const queryIni = 'SELECT fn_api_post_integracion_documentos_fiscales($1, $2, $3, $4, $5) AS filas_afectadas';
        const resIni = await poolSigesp.query(queryIni, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_codusu]);

        // Convertimos el resultado a número entero
        const filasAfectadas = parseInt(resIni.rows[0].filas_afectadas, 10);

        if (filasAfectadas <= 0) {
            console.error(`🚨 CRÍTICO: Factura ${prm_numfact} no pudo ser registrada localmente`);

            throw new AppError(`Factura ${prm_numfact} no pudo ser registrada localmente`, 500, "service:postAgregarService");        
        }

        // 👇 PASO 6. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_list_invoice', payLoad);

        if (response.data.invoice_errors && response.data.invoice_errors.length > 0) {
            const prm_observacion = response.data.message.trim();
        
            try {
                // actualiza respuesta de rechazo
                const queryError = 'SELECT fn_api_put_integracion_documentos_fiscales($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) AS filas_actualizadas';
                const resError = await poolSigesp.query(queryError, [prm_id_fact,  prm_numfact, prm_id_doc, prm_codtipdoc, 'RECHAZADO', null, null, prm_observacion, null, null]);
            
                // Convertimos el resultado a número entero
                const filas_actualizadas = parseInt(resError.rows[0].filas_actualizadas, 10);

                if (filas_actualizadas <= 0) {
                    throw new Error (`🚨 CRÍTICO: Factura ${prm_numfact} no pudo ser actualizada localmente`)
                }
            } catch (dbError) {
                console.error(dbError);
            }

            throw new AppError(`${response.data.message.trim()} ${response.data.invoice_errors[0]}`, 409, "service:postAgregarService");        
        }

        // 👇 PASO 7. Realiza la actualizacion de exito del registro de la factura    
        const prm_num_control = response.data.invoice_list_success[0].control_number.trim();
        const prm_url_pdf = response.data.invoice_list_success[0].invoice_pdf.trim();
        const prm_observacion_resault = response.data.message.trim();

        //
        try {
            // actualiza respuesta de exito ENVIADO
            const queryExito = 'SELECT fn_api_put_integracion_documentos_fiscales($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) AS filas_act';
            const resExito = await poolSigesp.query(queryExito, [prm_id_fact,  prm_numfact, prm_id_doc, prm_codtipdoc, 'ENVIADO', prm_num_control, prm_url_pdf, prm_observacion_resault, null, null]);
            
            // Convertimos el resultado a número entero
            const filas_act = parseInt(resExito.rows[0].filas_act, 10);

            if (filas_act <= 0) {
                throw new Error (`🚨 CRÍTICO: Factura ${prm_numfact} creada en CGI, pero falló la actualizacion local`)
            }

        } catch (dbError) {
            console.error(dbError);
        }

        // retornamos la respuesta
        return response.data.invoice_list_success[0];
        
    } catch (error: any) {
        // TODO: AQUI HAY QUE LLAMAR AL SP PARA ACTUALIZAR EL POSIBLE ERROR

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

// ! NO APLICA: 17-09-2026
// export async function postAnularService(id_fact: number): Promise<any> {
//     // arma el documento que se va a procesar
//     const documento = `ANULACION: ${id_fact.toString()}`;

//     // Verifica si el documento ya esta en proceso
//     func.VerificaDocumentoEnProceso(documento, "service:postAnularService");

//     // Bloquea el documento
//     func.bloquearDocumento(documento)

//     try {
//         // 👇 PASO 1. Busco los datos de la factura que quiere anular
//         const query = 'SELECT * FROM fn_api_get_factura_anular($1)';
//         const result = await poolSigesp.query<IFacturaAnular>(query, [id_fact]);    

//         // verifico si existe la factura
//         if (result.rows.length <= 0 ) {
//             throw new AppError('Factura no encontrada', 404, "service:postAnularService");
//         }
        
//         // 👇 PASO 2. Construir objeto para enviarlo a la api externa
//         const payLoad = {
//             numero_documento: result.rows[0].numfact,
//             numero_control: result.rows[0].num_control
//         };

//         // 👇 PASO 3. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
//         // Nota como no le pasamos headers, ni baseURL, ni Authorization.
//         // El interceptor hace todo eso antes de salir de tu backend.
//         const response = await apiExternaClient.post('/api/Invoice/cancel_invoice', payLoad);

//         return;
        
//     } catch (error: any) {
//         if (error instanceof AppError) {
//             throw error; // ✅ ya tiene statusCode y location
//         }

//         if (error?.response?.data) {
//             throw new AppError(error.response.data.message.trim(), error.response.status, "service:postAnularService");    
//         }

//         throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postAnularService");
//     } 
//     finally {
//         // Libera el documento del proceso
//         func.liberarDocumento(documento);
//     }
// }

// ? LISTA: 17-09-2026
async function validarPayloadFactura(encFactura: IFacturaDetalle, detFactura: any[]): Promise<void> {
    // 1. Valida que el numero de factura no sea vacio o nulo
    if (encFactura.numfact.trim().length <= 0) {
        throw new AppError("El número de factura es requerido.", 400, "service:validarPayloadFactura");
    }

    // 2. Validar Documento de Identidad (V, E, P, J, G, C + min 5 dígitos)
    const rifRegex = /^[VEPJGC]\d{5,}$/i;
        
    if (!rifRegex.test(encFactura.numpririf.trim())) {
        throw new AppError(`El documento de identidad ('${encFactura.numpririf.trim()}') no cumple con el formato fiscal requerido.`, 400, "service:validarPayloadFactura");
    }

    // 3. Valida que el nombre del cliente no sea vacio o nulo
    if (encFactura.nombre_cliente.trim().length <= 0) {
        throw new AppError("El nombre de la razon social del cliente es requerido.", 400, "service:validarPayloadFactura");
    }

    // 4. Validar Correo Electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(encFactura.emailcliente.trim())) {
        throw new AppError(`El correo del cliente ('${encFactura.emailcliente.trim()}') no posee un formato válido.`, 400, "service:validarPayloadFactura");
    }

    // 5. Valida que la direccion del cliente no sea vacio o nulo
    if (encFactura.dircliente.trim().length <= 0) {
        throw new AppError("La dirección del Cliente es requerida.", 400, "service:validarPayloadFactura");
    }

    // 6. Valida que el telefono del cliente no sea vacio o nulo
    if (encFactura.telcliente.trim().length <= 0) {
        throw new AppError("El numero de telefono del Cliente es requerido.", 400, "service:validarPayloadFactura");
    }

    // 7. Validar Tasa del Día (Formato: 3 enteros y 4 decimales con punto. Ej: "342.8633" o "056.6500")
    // Obtener fecha de hoy en formato YYYY-MM-DD (Zona horaria Venezuela / Local)
    // const hoyStr = new Date().toLocaleDateString('sv-SE');
    const hoyStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Caracas' });

    // Extraer valores de la consulta SQL
    let tasaRaw = encFactura.tasa_del_dia ? encFactura.tasa_del_dia.trim() : "";
    let fechaRaw = encFactura.fecha_tasa ? encFactura.fecha_tasa.trim() : "";

    // Validar presencia y valor numérico válido
    if (!tasaRaw || tasaRaw.trim().length <= 0 || parseFloat(tasaRaw) <= 0 || !fechaRaw || fechaRaw.trim().length <= 0 || fechaRaw !== hoyStr) {
        throw new AppError("La tasa oficial del día está desactualizada.", 400, "service:validarPayloadFactura");
    }

    // Validar formato estricto: Exactamente 3 enteros y 4 decimales con punto (Ej: "342.8633" o "056.6500")
    const tasaRegex = /^\d{3}\.\d{4}$/;

    if (!tasaRegex.test(tasaRaw)) {
        throw new AppError(`La tasa del día ('${tasaRaw}') debe tener un formato fiscal estricto de 3 enteros y 4 decimales (Ej: '056.6500').`, 400, "service:validarPayloadFactura");
    }

    // 8. Validar la Fecha de la Tasa del Día en formato ("DD-MM-YYYY" o "YYYY-MM-DD")
    const fechaRegex = /^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/;
        
    if (!fechaRegex.test(fechaRaw)) {
        throw new AppError(`La fecha de la tasa ('${fechaRaw}') no tiene un formato válido (DD-MM-YYYY o YYYY-MM-DD).`, 400, "service:validarPayloadFactura");
    }

    // 9. Validar Detalle
    if (!detFactura || detFactura.length === 0) {
        throw new AppError('La factura debe tener al menos un producto asociado.', 400, "service:validarPayloadFactura");
    }

    for (const prod of detFactura) {
        // 10. Valida que el codigo del producto no sea vacio o nulo
        if (prod.codigoProducto.trim().length <= 0) {
            throw new AppError("El código del producto es requerido.", 400, "service:validarPayloadFactura");
        }

        // 11. Valida que el nombre del producto no sea vacio o nulo
        if (prod.nombreProducto.trim().length <= 0) {
            throw new AppError("El nombre del producto es requerido.", 400, "service:validarPayloadFactura");
        }

        // 12. Valida que la descripcion del producto no sea vacio o nulo
        if (prod.descripcionProducto.trim().length <= 0) {
            throw new AppError("La descripcion del producto es requerida.", 400, "service:validarPayloadFactura");
        }

        // 13. Valida que el tipo de impuesto del producto no sea vacio o nulo
        if (prod.tipoImpuesto.trim().length <= 0) {
            throw new AppError("El tipo de impuesto del producto es requerido.", 400, "service:validarPayloadFactura");
        }

        // 14. Valida la cantidad adquirida
        if (prod.cantidadAdquirida <= 0 || prod.cantidadAdquirida > 1000.00) {
            throw new AppError(`La cantidad del producto '${prod.codigoProducto}' (${prod.cantidadAdquirida}) debe ser entre 1 y 1000.00.`, 400, "service:validarPayloadFactura");
        }

        // 15. Valida que el precio mantenga la coma como separador decimal
        if (prod.precioProducto <= 0) {
            throw new AppError(`El precio del producto es requerido.`, 400, "service:validarPayloadFactura");
        }

        const precioRegex = /^\d+(,\d{1,2})?$/;

        if (!precioRegex.test(prod.precioProducto)) {
            throw new AppError(`El precio del producto '${prod.codigoProducto}' (${prod.precioProducto}) debe usar coma como separador decimal.`, 400, "service:validarPayloadFactura");
        }        
    }
}