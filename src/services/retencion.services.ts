import { poolSigesp } from "../database/db.js";
import apiExternaClient from "../utils/apiExternaClient.js";
import { AppError } from "../utils/appError.js";
import * as func from "../utils/funcionesGlobales.js";
import type { IRetencion } from "../types/IRetencion.js";
import type { IRetencionIslr } from "../types/IRetencionIslr.js";
import type { IResponseRetencion } from "../types/IResponseRetencion.js";
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
export async function postAgregarRetencionIsrlService(numcom: string, codigo_usuario: string): Promise<IResponseRetencion> {
    // arma el documento que se va a procesar
    const documento = `ISLR: ${numcom.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postAgregarRetencionIsrlService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

    try {
        // 👇 PASO 1. Busco los datos de la retencion
        const query = 'SELECT * FROM fn_api_get_retencion_islr_detalle($1)';
        const result = await poolSigesp.query<IRetencionIslr>(query, [numcom]);    

        // verifico si existe la retencion
        if (result.rows.length <= 0 ) {
            throw new AppError('Retención no encontrada', 404, "service:postAgregarRetencionIsrlService");
        }

        // 👇 PASO 2. Verifico si el documento (RETENCION ISLR) ya fue enviado anteriormente.
        const numControl = result.rows[0]?.num_control;
        const retencionEnviada = numControl ? numControl.trim() : '';

        if (retencionEnviada.length > 0) {
            throw new AppError('Esta Retención ya habia sido Enviada Anteriormente.', 401, "service:postAgregarRetencionIsrlService");
        }

        // TODO: FALTA VERIFICAR SI LOS DOCUMENTOS ASOCIADOS A LA RETENCION YA FUERON ENVIADOS ANTERIORMENTE 

        // Datos del Encabezado (Cliente)
        const encabezadoRet = result.rows[0];

        // Datos del detalle de la retencion
        const detalleRet = result.rows.map(row => {
            return {
                numeroDocumento: row.numfac.trim(),
                numeroControl: row.numcon.trim(),
                fecha: row.fecfac,
                codigo: row.cmp_codret.trim(),
                conceptoPago: row.consol.trim(),
                montoDocumento: row.totcmp_con_iva,
                baseRetencion: row.basimp,
                sustraendo: row.sustraendo,
                porcentaje: row.porded.trim(),
                montoRetenido: row.cmp_monret,
                codigoRetencionIslr: row.id_codigo_ret.trim()
            }
        });

        // 👇 PASO 3. Se validan los campos requeridos y formatos
        await validarPayloadRetencionIslr(encabezadoRet, detalleRet);

        // 👇 PASO 4. Construir objeto para enviarlo a la api externa
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
        
        // 👇 PASO 5. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_retention_islr', payLoad);

        // 👇 PASO 6. Guarda los datos del documento enviado
        const prm_numcom = encabezadoRet.numcom.trim();
        const prm_numsol = encabezadoRet.numsol.trim();
        const prm_codtipdoc = 'ISLR';
        const prm_num_control = response.data.controles_usados[0];
        const prm_url_pdf = response.data.pdf[0][0];
        const prm_codusu = codigo_usuario.trim();

        //
        try {
            // Registra el documento enviado
            const query1 = 'SELECT * FROM fn_api_integracion_documentos_retenciones($1, $2, $3, $4, $5, $6, $7, $8)';
            await poolSigesp.query(query1, [prm_numcom, prm_numsol, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu, 'SIGESP', null]);

        } catch (dbError) {
            // 🚨 LOG CRÍTICO: La factura existe en el ente externo, pero no se guardó localmente.
            // Aquí usamos console.error, pero idealmente deberías usar una librería como Winston 
            // o guardar este error en un archivo de texto para no perder el rastro.
            console.error(`🚨 CRÍTICO: Retención ${prm_numcom} creada en CGI, pero falló guardado local:`, dbError);
            
            // ¡MUY IMPORTANTE! NO hacemos 'throw' aquí. 
            // Dejamos que el código continúe para que el cliente reciba su respuesta de éxito.
        }

        return {
            control_number: response.data.controles_usados[0],
            retention_pdf: response.data.pdf[0][0]
        };

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
export async function postAgregarRetencionIvaService(numcom: string, codigo_usuario: string): Promise<IResponseRetencion> {
    // arma el documento que se va a procesar
    const documento = `IVA: ${numcom.toString()}`;

    // Verifica si el documento ya esta en proceso
    func.VerificaDocumentoEnProceso(documento, "service:postAgregarRetencionIvaService");

    // Bloquea el documento
    func.bloquearDocumento(documento);

    try {
        // 👇 PASO 1. Busco los datos de la retencion
        const query = 'SELECT * FROM fn_api_get_retencion_iva_detalle($1)';
        const result = await poolSigesp.query<IRetencionIva>(query, [numcom]);    

        // verifico si existe la retencion
        if (result.rows.length <= 0 ) {
            throw new AppError('Retención no encontrada', 404, "service:postAgregarRetencionIvaService");
        }

        // 👇 PASO 2. Verifico si el documento (RETENCION ISLR) ya fue enviado anteriormente.
        const numControl = result.rows[0]?.num_control;
        const retencionEnviada = numControl ? numControl.trim() : '';

        if (retencionEnviada.length > 0) {
            throw new AppError('Esta Retención ya habia sido Enviada Anteriormente.', 401, "service:postAgregarRetencionIvaService");
        }

        // TODO: FALTA VERIFICAR SI LOS DOCUMENTOS ASOCIADOS A LA RETENCION YA FUERON ENVIADOS ANTERIORMENTE 

        // Datos del Encabezado (Cliente)
        const encabezadoRet = result.rows[0];

        // Datos del detalle de la retencion
        const detalleRet = result.rows.map(row => {
            return {
                fechaDeFactura: row.fecfac.trim(),
                numeroFactura: row.numfac.trim(),
                numeroControl: row.numcon.trim(),
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

        // 👇 PASO 3. Se validan los campos requeridos y formatos
        await validarPayloadRetencionIva(encabezadoRet, detalleRet);

        // 👇 PASO 4. Construir objeto para enviarlo a la api externa
        const payLoad = {
            data: [
                {
                    cliente: [
                        {
                            documentoIdentidadCliente: encabezadoRet.rif.trim(),
                            nombreRazonSocialCliente: encabezadoRet.nomsujret.trim(),
                            correoCliente: encabezadoRet.email.trim(),
                            direccionCliente: encabezadoRet.dirsujret.trim(),
                            telefonoCliente: encabezadoRet.telefono.trim()
                        }
                    ],
                    RetencionIva: detalleRet
                }
            ]            
        };

        // 👇 PASO 5. ✅ EJECUTAMOS LA PETICIÓN LIMPIA
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_retention_iva', payLoad);

        // 👇 PASO 6. Guarda los datos del documento enviado
        const prm_numcom = encabezadoRet.numcom.trim();
        const prm_numsol = encabezadoRet.numsol.trim();
        const prm_codtipdoc = 'IVA';
        const prm_num_control = response.data.controles_usados[0];
        const prm_url_pdf = response.data.pdf[0][0];
        const prm_codusu = codigo_usuario.trim();

        //
        try {
            // Registra el documento enviado
            const query1 = 'SELECT * FROM fn_api_integracion_documentos_retenciones($1, $2, $3, $4, $5, $6, $7, $8)';
            await poolSigesp.query(query1, [prm_numcom, prm_numsol, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu, 'SIGESP', null]);

        } catch (dbError) {
            // 🚨 LOG CRÍTICO: La factura existe en el ente externo, pero no se guardó localmente.
            // Aquí usamos console.error, pero idealmente deberías usar una librería como Winston 
            // o guardar este error en un archivo de texto para no perder el rastro.
            console.error(`🚨 CRÍTICO: Retención ${prm_numcom} creada en CGI, pero falló guardado local:`, dbError);
            
            // ¡MUY IMPORTANTE! NO hacemos 'throw' aquí. 
            // Dejamos que el código continúe para que el cliente reciba su respuesta de éxito.
        }
        
        return {
            control_number: response.data.controles_usados[0],
            retention_pdf: response.data.pdf[0][0]
        };
                
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

// ? VERIFICADA - 27-07-2026
async function validarPayloadRetencionIslr(encRetencion: IRetencionIslr, detRetencion: any[]): Promise<void> {
    // 1. Validar Documento de Identidad (V, E, P, J, G, C + min 5 dígitos)
    const rifRegex = /^[VEPJGC]\d{5,}$/i;
        
    if (!rifRegex.test(encRetencion.rif.trim())) {
        throw new AppError(`El documento de identidad ('${encRetencion.rif.trim()}') no cumple con el formato fiscal requerido.`, 400, "service:validarPayloadRetencionIslr");
    }

    // 2. Valida que el nombre del cliente no sea vacio o nulo
    if (encRetencion.nomsujret.trim().length <= 0) {
        throw new AppError("El nombre de la razón social del cliente es requerido.", 400, "service:validarPayloadRetencionIslr");
    }

    // 3. Validar Correo Electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(encRetencion.email.trim())) {
        throw new AppError(`El correo del cliente ('${encRetencion.email.trim()}') no posee un formato válido.`, 400, "service:validarPayloadRetencionIslr");
    }

    // 4. Valida que la direccion del cliente no sea vacio o nulo
    if (encRetencion.dirsujret.trim().length <= 0) {
        throw new AppError("La dirección del Cliente es requerida.", 400, "service:validarPayloadRetencionIslr");
    }

    // 5. Valida que el telefono del cliente no sea vacio o nulo
    if (encRetencion.telefono.trim().length <= 0) {
        throw new AppError("El número de teléfono del Cliente es requerido.", 400, "service:validarPayloadRetencionIslr");
    }

    // 6. Validar Detalle
    if (!detRetencion || detRetencion.length === 0) {
        throw new AppError('La retención debe tener al menos una factura asociada.', 400, "service:validarPayloadRetencionIslr");
    }

    // TODO: PASAR COMO PARAMETRO EL VALOR 3 A UNA BASE DE DATOS. (PASARLO A LAS VALIDACIONES)
    // 7. Verifico la cantidad de facturas asociadas a la retencion. No puede ser mayor a 3 facturas
    if (detRetencion.length > 3 ) {
        throw new AppError('La retención solo pertmite un máximo de 3 facturas por documento', 400, "service:validarPayloadRetencionIslr");
    }

    const fechaRegex = /^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/;
    const precioRegex = /^\d+(,\d{1,2})?$/;

    for (const ret of detRetencion) {
        // 8. Valida que el numero de factura no sea vacio o nulo
        if (ret.numeroDocumento.trim().length <= 0) {
            throw new AppError("El número de factura es requerido.", 400, "service:validarPayloadRetencionIslr");
        }

        // 9. Valida que el numero de factura no sea vacio o nulo
        if (ret.numeroControl.trim().length <= 0) {
            throw new AppError(`El número de control de la factura ${ret.numeroDocumento.trim()} es requerido.`, 400, "service:validarPayloadRetencionIslr");
        }

        // 10. Validar la Fceha de la Tasa del Día en formato ("DD-MM-YYYY" o "YYYY-MM-DD")
        if (!fechaRegex.test(ret.fecha.trim())) {
            throw new AppError(`La fecha de la factura ('${ret.numeroDocumento.trim()}') no tiene un formato válido (DD-MM-YYYY o YYYY-MM-DD).`, 400, "service:validarPayloadRetencionIslr");
        }

        // 11. Valida que el codigo de la retencion no sea vacio o nulo
        if (ret.codigo.trim().length <= 0) {
            throw new AppError(`El código de retención de la factura ${ret.numeroDocumento.trim()} es requerido.`, 400, "service:validarPayloadRetencionIslr");            
        }

        // 12. Valida que el nombre del producto no sea vacio o nulo
        if (ret.conceptoPago.trim().length <= 0) {
            throw new AppError(`El concepto del pago de la factura ${ret.numeroDocumento.trim()} es requerido.`, 400, "service:validarPayloadRetencionIslr");            
        }

        // 13. Valida que el monto de la factura sea valido y mantenga la coma como separador decimal
        if (ret.montoDocumento <= 0) {
            throw new AppError(`El monto total de la factura ${ret.numeroDocumento.trim()} es requerido.`, 400, "service:validarPayloadRetencionIslr");            
        }

        if (!precioRegex.test(ret.montoDocumento)) {
            throw new AppError(`El monto total de la factura ${ret.numeroDocumento.trim()} debe usar coma como separador decimal.`, 400, "service:validarPayloadRetencionIslr");
        }

        // 14. Valida que el monto de la base imponible sea valido y mantenga la coma como separador decimal
        if (ret.baseRetencion <= 0) {
            throw new AppError(`La base imponible de la factura ${ret.numeroDocumento.trim()} es requerida.`, 400, "service:validarPayloadRetencionIslr");            
        }

        if (!precioRegex.test(ret.baseRetencion)) {
            throw new AppError(`La base imponible de la factura ${ret.numeroDocumento.trim()} debe usar coma como separador decimal.`, 400, "service:validarPayloadRetencionIslr");
        }
        
        // 15. Valida que el monto del sustraendo sea valido y mantenga la coma como separador decimal
        if (ret.sustraendo > 0) {
            if (!precioRegex.test(ret.sustraendo)) {
                throw new AppError(`El sustraendo de la factura ${ret.numeroDocumento.trim()} debe usar coma como separador decimal.`, 400, "service:validarPayloadRetencionIslr");
            }
        }

        // 16. Valida que el monto de la retencion sea valido y mantenga la coma como separador decimal
        if (ret.montoRetenido <= 0) {
            throw new AppError(`El monto de la retencion de la factura ${ret.numeroDocumento.trim()} es requerida.`, 400, "service:validarPayloadRetencionIslr");            
        }

        if (!precioRegex.test(ret.montoRetenido)) {
            throw new AppError(`El monto de la retencion de la factura ${ret.numeroDocumento.trim()} debe usar coma como separador decimal.`, 400, "service:validarPayloadRetencionIslr");
        }

        // 17. Valida que el Id de la retencion no sea vacio o nulo
        if (ret.codigoRetencionIslr.trim().length <= 0) {
            throw new AppError(`El ID de la retención de la factura ${ret.numeroDocumento.trim()} es requerido.`, 400, "service:validarPayloadRetencionIslr");            
        }
    }
}

// ? VERIFICADA - 27-07-2026
async function validarPayloadRetencionIva(encRetencion: IRetencionIva, detRetencion: any[]): Promise<void> {
    // 1. Validar Documento de Identidad (V, E, P, J, G, C + min 5 dígitos)
    const rifRegex = /^[VEPJGC]\d{5,}$/i;
        
    if (!rifRegex.test(encRetencion.rif.trim())) {
        throw new AppError(`El documento de identidad ('${encRetencion.rif.trim()}') no cumple con el formato fiscal requerido.`, 400, "service:validarPayloadRetencionIva");
    }

    // 2. Valida que el nombre del cliente no sea vacio o nulo
    if (encRetencion.nomsujret.trim().length <= 0) {
        throw new AppError("El nombre de la razón social del cliente es requerido.", 400, "service:validarPayloadRetencionIva");
    }

    // 3. Validar Correo Electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(encRetencion.email.trim())) {
        throw new AppError(`El correo del cliente ('${encRetencion.email.trim()}') no posee un formato válido.`, 400, "service:validarPayloadRetencionIva");
    }

    // 4. Valida que la direccion del cliente no sea vacio o nulo
    if (encRetencion.dirsujret.trim().length <= 0) {
        throw new AppError("La dirección del Cliente es requerida.", 400, "service:validarPayloadRetencionIva");
    }

    // 5. Valida que el telefono del cliente no sea vacio o nulo
    if (encRetencion.telefono.trim().length <= 0) {
        throw new AppError("El número de teléfono del Cliente es requerido.", 400, "service:validarPayloadRetencionIva");
    }

    // 6. Validar Detalle
    if (!detRetencion || detRetencion.length === 0) {
        throw new AppError('La retención debe tener al menos una factura asociada.', 400, "service:validarPayloadRetencionIva");
    }

    // TODO: PASAR COMO PARAMETRO EL VALOR 3 A UNA BASE DE DATOS. (PASARLO A LAS VALIDACIONES)
    // 7. Verifico la cantidad de facturas asociadas a la retencion. No puede ser mayor a 3 facturas
    if (detRetencion.length > 3 ) {
        throw new AppError('La retención solo pertmite un máximo de 3 facturas por documento', 400, "service:validarPayloadRetencionIva");
    }

    const fechaRegex = /^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/;
    const precioRegex = /^\d+(,\d{1,2})?$/;

    for (const ret of detRetencion) {
        // 8. Valida que el numero de factura no sea vacio o nulo
        if (ret.numeroFactura.trim().length <= 0) {
            throw new AppError("El número de factura es requerido.", 400, "service:validarPayloadRetencionIva");
        }

        // 9. Validar la Fceha de la Tasa del Día en formato ("DD-MM-YYYY" o "YYYY-MM-DD")
        if (!fechaRegex.test(ret.fechaDeFactura.trim())) {
            throw new AppError(`La fecha de la factura ('${ret.numeroFactura.trim()}') no tiene un formato válido (DD-MM-YYYY o YYYY-MM-DD).`, 400, "service:validarPayloadRetencionIva");
        }

        // 10. Valida que el numero de factura no sea vacio o nulo
        if (ret.numeroControl.trim().length <= 0) {
            throw new AppError(`El número de control de la factura ${ret.numeroFactura.trim()} es requerido.`, 400, "service:validarPayloadRetencionIva");
        }

        // 11. Valida que el monto de la factura sea valido y mantenga la coma como separador decimal
        if (ret.totalDeCompraIncluyendoIva <= 0) {
            throw new AppError(`El monto total de la compra incluyendo iva de la factura ${ret.numeroFactura.trim()} es requerido.`, 400, "service:validarPayloadRetencionIva");            
        }

        if (!precioRegex.test(ret.totalDeCompraIncluyendoIva)) {
            throw new AppError(`El monto total de la compra incluyendo iva de la factura ${ret.numeroFactura.trim()} debe usar coma como separador decimal.`, 400, "service:validarPayloadRetencionIva");
        }

        // 12. Valida que el monto de la factura sea valido y mantenga la coma como separador decimal
        if (ret.compraSinDerechoACreditoFiscal <= 0) {
            throw new AppError(`El monto total de la compra sin derecho a credito fiscal de la factura ${ret.numeroFactura.trim()} es requerido.`, 400, "service:validarPayloadRetencionIva");            
        }

        if (!precioRegex.test(ret.compraSinDerechoACreditoFiscal)) {
            throw new AppError(`El monto total de la compra sin derecho a credito fiscal de la factura ${ret.numeroFactura.trim()} debe usar coma como separador decimal.`, 400, "service:validarPayloadRetencionIva");
        }

        // 13. Valida que el monto de la base imponible sea valido y mantenga la coma como separador decimal
        if (ret.baseImponible <= 0) {
            throw new AppError(`La base imponible de la factura ${ret.numeroFactura.trim()} es requerida.`, 400, "service:validarPayloadRetencionIva");            
        }

        if (!precioRegex.test(ret.baseImponible)) {
            throw new AppError(`La base imponible de la factura ${ret.numeroFactura.trim()} debe usar coma como separador decimal.`, 400, "service:validarPayloadRetencionIva");
        }

        // 14. Valida que el Porcentaje de retención no sea vacio o nulo
        if (ret.porcentaje_iva.trim().length <= 0) {
            throw new AppError(`El Porcentaje de retención de la retención de la factura ${ret.numeroFactura.trim()} es requerido.`, 400, "service:validarPayloadRetencionIva");            
        }

        // 15. Valida que el Porcentaje de retención no sea vacio o nulo
        if (ret.porcentaje.trim().length <= 0) {
            throw new AppError(`El Porcentaje de alícuota de IVA de la factura ${ret.numeroFactura.trim()} es requerido.`, 400, "service:validarPayloadRetencionIva");            
        }
    }
}