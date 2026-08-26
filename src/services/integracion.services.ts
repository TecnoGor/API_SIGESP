import { poolSigesp /*, poolSispven*/ } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from '../utils/apiExternaClient.js';
import type { IRequestIntegracionFactura } from "../types/IRequestIntegracionFactura.js";
import type { IServiciosIntegrados } from "../types/IServiciosIntegrados.js";
import type { IParametrosApi } from "../types/IParametrosApi.js";
import type { IResponseIntegracion } from "../types/IResponseIntegracion.js";
import type { IFacturaDetalle } from "../types/IFacturaDetalle.js";

// // ! QUITAR SOLO POR PRUEBAS
// export async function yyyyService(): Promise<IRequestIntegracionFactura> {
//     // PASO 1: Ejecutamos el Stored Procedure / Función para obtener la data (Clientes + Encabezado + Detalle) (Servidor SYSPVEN)
//     const query = 'SELECT * FROM fn_api_integracion_get_facturas_por_enviar()';
//     const result = await poolSispven.query<any>(query);
//     const datos = result.rows[0];

//      // Datos del detalle
//     const detalle = result.rows.map((row: any) => {
//         return {
//             id_detalle:  Number(row.id_detalle), 
// 			renglon: Number(row.renglon), 
// 			id_servicio: Number(row.id_servicio), 
// 			precio: Number(row.precio), 
// 			cantidad:  Number(row.cantidad), 
// 			porc_iva:  Number(row.porc_iva), 
//             tipo_impuesto: row.tipo_impuesto.trim(),
// 			iva_detalle:  Number(row.iva_detalle), 
// 			total_detalle:  Number(row.total_detalle), 
// 			comentario: row.comentario.trim(),
//         }
//     });

//     const resultado = {
//         cliente: {
//             "rif": datos.rif,
// 			"nombre": datos.nombre,
// 			"direccion": datos.direccion,
// 			"telefono": datos.telefono,
// 			"email": datos.email
//         },
//         factura: {
//             "id_factura": datos.id_factura,
// 			"sub_total": datos.sub_total,
// 			"base_imp": datos.base_imp,
// 			"iva": datos.iva,
// 			"total": datos.total,
// 			"descripcion": datos.descripcion,
//             "fecha_fact": datos.fecha_fact
//         },
//         detalle: detalle
//     }

//     return resultado;
// }

// ? VERIFICADA - 27-07-2026
export async function postIntegracionFacturaService(data: IRequestIntegracionFactura): Promise<void> {
    const { cliente, factura, detalle } = data;

    // Obtenemos una conexión dedicada del pool (Servidor SIGESP)
    const clientSigesp = await poolSigesp.connect();

    try {
        // ---------------------------------------------------------------------
        // PASO 1: Verifico si la factura origen de SISPVEN fue registrada anteriormente
        // ---------------------------------------------------------------------       
        // Ejecutamos el Stored Procedure / Función para verificar si existe la factura 
        const queryVerifica = `SELECT public.fn_api_integracion_verifica_factura_origen($1) AS existe;`;

        const respVerifica = await clientSigesp.query(queryVerifica, [factura.id_factura]);

        const existeFactura = respVerifica.rows[0].existe;

        if (existeFactura) {
            throw new AppError('Factura Registrada Anteriormente', 401, "service:postIntegracionFacturaService");
        }

        // ---------------------------------------------------------------------
        // PASO 2: Obtengo los Codigo de Servicios integrados
        // ---------------------------------------------------------------------       
        // Ejecutamos el Stored Procedure / Función para verificar si existe la factura 
        const queryServicios = `SELECT * FROM public.fn_api_integracion_servicios();`;

        const respServicio = await clientSigesp.query<IServiciosIntegrados>(queryServicios);

        if (respServicio.rows.length === 0) {
            throw new AppError('No existen servicios integrados registrados', 400, "service:postIntegracionFacturaService");
        }

        // Creamos el Map: [Clave (servicio_id), Valor (Objeto con los 3 datos)]
        const serviciosIntegrados = new Map<number, IServiciosIntegrados>(
            respServicio.rows.map(row => [
                Number(row.servicio_id), 
                {
                    servicio_id: Number(row.servicio_id),
                    coddetalle: row.coddetalle.trim(),
                    nombre: row.nombre.trim(),
                    codunimed: row.codunimed.trim()
                }
            ])
        );

        // ---------------------------------------------------------------------
        // PASO 3: Obtengo los Parametros de la Api
        // ---------------------------------------------------------------------       
        // Ejecutamos el Stored Procedure / Función para verificar si existe la factura 
        const queryParametros = `SELECT * FROM public.fn_api_integracion_parametros();`;

        const respParametros = await clientSigesp.query<IParametrosApi>(queryParametros);

        if (respParametros.rows.length === 0) {
            throw new AppError('No existen parametros integrados registrados', 400, "service:postIntegracionFacturaService");
        }

        // Extraer directamente la primera (y única) fila
        const row = respParametros.rows[0];

        const parametrosIntegrados: IParametrosApi = {
            codcar: row.codcar.trim(),
            cuenta_x_cobrar: row.cuenta_x_cobrar.trim(),
            cuenta_ingreso: row.cuenta_ingreso.trim(),
            cuenta_x_pagar_iva: row.cuenta_x_pagar_iva.trim(),
            cuenta_partida_ingreso: row.cuenta_partida_ingreso.trim()
        };

        // ------------------------------------------------------------------------
        // INICIO DE LA TRANSACCIÓN (Servidor SIGESP)
        // ------------------------------------------------------------------------
        await clientSigesp.query('BEGIN');

        // ---------------------------------------------------------------------
        // PASO 4: Agregar Clientes
        // ---------------------------------------------------------------------            
        const rif = cliente.rif.trim()

        const queryCliente = `SELECT public.fn_api_integracion_cxc_clientes($1, $2, $3, $4, $5) AS id_cliente;`;

        // Construimos el array de parametros para clientes
        const valuesCliente = [
            rif.trim(),
            cliente.nombre.trim(),
            cliente.direccion.trim(),
            cliente.telefono.trim(),
            cliente.email.trim()
        ];

        // Ejecutamos el Stored Procedure / Función para registrar los datos del cliente (Servidor SIGESP)
        const resCliente = await clientSigesp.query(queryCliente, valuesCliente);
        const idClienteObtenido = resCliente.rows[0].id_cliente;

        // ---------------------------------------------------------------------
        // PASO 5: Agregar Beneficiario
        // ---------------------------------------------------------------------            
        const queryBeneficiario = `SELECT public.fn_api_integracion_rpc_beneficiario($1, $2, $3, $4, $5);`;

        // Construimos el array de parametros para beneficiario
        const valuesBeneficiario = [
            rif.trim(),
            cliente.nombre.trim(),
            cliente.direccion.trim(),
            cliente.telefono.trim(),
            cliente.email.trim()
        ];

        // Ejecutamos el Stored Procedure / Función para registrar los datos del Beneficiario (Servidor SIGESP)
        await clientSigesp.query(queryBeneficiario, valuesBeneficiario);

        // ---------------------------------------------------------------------
        // PASO 6: Agregar Factura Encabezado
        // ---------------------------------------------------------------------    
        const queryFactura = `SELECT out_id_fact, out_numfact FROM public.fn_api_integracion_cxc_factura($1, $2, $3, $4, $5, $6, $7, $8);`;

        // Construimos el array de parametros
        const valuesFactura = [
            idClienteObtenido,
            factura.id_factura,
            factura.sub_total,
            factura.base_imp,
            factura.iva,
            factura.total,
            factura.descripcion?.trim(),
            factura.fecha_fact
        ];

        // Ejecutamos el Stored Procedure / Función para registrar los datos del Encabezado de la Factura (Servidor SIGESP)
        const resFactura = await clientSigesp.query(queryFactura, valuesFactura);

        const id_fact_sigesp = resFactura.rows[0].out_id_fact;
        const numfact_sigesp= resFactura.rows[0].out_numfact;

        // ---------------------------------------------------------------------
        // PASO 7: Agregar Factura Detalle
        // ---------------------------------------------------------------------
        // Recorro el array de detalles
        for (const fila of detalle) {            
            // 1. Buscamos el servicio en el Map por su servicio_id
            const servicio = serviciosIntegrados.get(Number(fila.id_servicio));

            if (!servicio) {
                throw new AppError(`El servicio con ID [${fila.id_servicio}] no se encuentra integrado en el sistema.`, 400, "service:postIntegracionFacturaService");
            }

            //if (!mapaDetallesSet.has(claveDetalle)) {
            const queryDetalle = `SELECT public.fn_api_integracion_cxc_detalle($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`;

            // Reemplaza o ajusta estos campos según lo que pide tu función fn_api_integracion_cxc_dt_factura
            const valuesDetalle = [
                id_fact_sigesp, 
                fila.renglon,
                servicio.coddetalle.trim(),
                servicio.codunimed.trim(),
                fila.precio,
                fila.cantidad,
                fila.porc_iva,
                fila.iva_detalle,
                fila.total_detalle,
                fila.comentario?.trim()                    
            ];

            await clientSigesp.query(queryDetalle, valuesDetalle);            
        }

        // ---------------------------------------------------------------------
        // PASO 8: Agregar Cargos
        // ---------------------------------------------------------------------
        // TODO: OJO OJO OJO - PREGUNTAR SI LA TABLA DE CARGOS VA POR CADA DETALLE QUE EXISTA EN LA FACTURA
        // Clave única para el Cargo
        const queryCargo = `SELECT public.fn_api_integracion_cxc_dt_cargos($1, $2, $3, $4, $5, $6);`;
        
        // Valore para la funcion función fn_api_integracion_cxc_dt_cargos
        const valuesCargo = [
            factura.id_factura,
            id_fact_sigesp,
            parametrosIntegrados.codcar.trim(),            
            factura.base_imp,
            factura.iva,
            factura.total
        ];

        await clientSigesp.query(queryCargo, valuesCargo);

        // ---------------------------------------------------------------------
        // PASO 9: Agregar Comprobanmte Principal
        // ---------------------------------------------------------------------
        // 1. GENERAR NÚMERO DE COMPROBANTE
        const comprobante = `F-0001-${numfact_sigesp.toString().padStart(13, '0')}`;

		// 2. GENERAR DESCRIPCION DE COMPROBANTE
		const descripcion = `FACTURA N° ${numfact_sigesp.toString()} ${factura.descripcion?.trim()}`;

        const queryComprobantePrincipal = `SELECT public.fn_api_integracion_sigesp_cmp($1, $2, $3, $4, $5, $6);`;

        // Valore para la funcion función fn_api_integracion_sigesp_cmp
        const valuesComprobantePrincipal = [
            factura.id_factura,
            comprobante.trim(),
            factura.fecha_fact,
            descripcion.trim(),
            rif.trim(),
            factura.total
        ];

        await clientSigesp.query(queryComprobantePrincipal, valuesComprobantePrincipal);

        // ---------------------------------------------------------------------
        // PASO 10: Agregar Detalle Comprobanmte Presupuesto
        // ---------------------------------------------------------------------
        const queryCompPresupuesto = `SELECT public.fn_api_integracion_spi_dt_cmp($1, $2, $3, $4, $5, $6);`;

        // Valore para la funcion función fn_api_integracion_spi_dt_cmp
        const valuesCompPresupuesto = [
            factura.id_factura,
            comprobante.trim(),
            parametrosIntegrados.cuenta_partida_ingreso.trim(),  
            factura.fecha_fact,
            descripcion.trim(),
            factura.sub_total
        ];

        await clientSigesp.query(queryCompPresupuesto, valuesCompPresupuesto);        

        // ---------------------------------------------------------------------
        // PASO 11: Agregar Contabilidad - Cuenta por Cobrar (Débito), Cuenta de Ingreso (Crédito) y IVA por Pagar (Crédito)
        // ---------------------------------------------------------------------
        const queryCompContable = `SELECT public.fn_api_integracion_scg_dt_cmp($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`;

        // Valore para la funcion función fn_api_integracion_scg_dt_cmp
        const valuesCompContable = [
            factura.id_factura,
            comprobante.trim(),
            parametrosIntegrados.cuenta_x_cobrar.trim(),
            parametrosIntegrados.cuenta_ingreso.trim(),
            parametrosIntegrados.cuenta_x_pagar_iva.trim(),
            factura.fecha_fact,
            descripcion.trim(),
            factura.sub_total,
            factura.iva,
            factura.total
        ];

        await clientSigesp.query(queryCompContable, valuesCompContable);

        // =========================================================================
        // PASO 12: Si todo pasó correctamente, hacemos COMMIT
        // =========================================================================
        await clientSigesp.query('COMMIT');

        // =========================================================================
        // TODO: PASO 13: Actualizar Objeto de Respuesta de SIGESP
        // =========================================================================
        const xxx:IResponseIntegracion =  {
            id_fact: id_fact_sigesp,
            numfact: numfact_sigesp,
            // id_doc?: number;
            codtipdoc: 'FACTURA',
            api_id_fact_origen: factura.id_factura,
            status_sigesp: true,
            status_cgid: false,
            // observacion: '',
            // control_number: '',
            // url_pdf: ''
        }

        // =========================================================================
        // PASO 14: Contruimos la data que se enviara a la Imprenta Digital 
        // =========================================================================
        // Datos del detalle
        const detalleFactura = detalle.map(row => {
            // 1. Buscamos el servicio en el Map por su servicio_id
            const servicio = serviciosIntegrados.get(Number(row.id_servicio));

            return {
                codigoProducto: servicio?.coddetalle.trim(),            
                nombreProducto: servicio?.nombre.trim(),                
                descripcionProducto: servicio?.nombre.trim(),           
                tipoImpuesto: row.tipo_impuesto.trim(),                 
                cantidadAdquirida: Number(row.cantidad),                
                precioProducto: row.precio                              
            }
        });

        // Construir objeto para enviar
        const payLoad = {
            numeroSerie: "A",
            cantidadFactura: 1,
            facturas: [
                {
                    numeroFactura: numfact_sigesp,                      
                    documentoIdentidadCliente: cliente.rif.trim(),      
                    nombreRazonSocialCliente: cliente.nombre.trim(),    
                    correoCliente: cliente.email.trim(),
                    descripcionFactura: factura.descripcion?.trim(),      
                    direccionCliente: cliente.direccion.trim(),         
                    telefonoCliente: cliente.telefono.trim(),           
                    productos: detalleFactura,       
                    tasa_del_dia: 342.8633,     // TODO: BUSCAR LA TASA DEL DIA
			        fecha_tasa: "2026-08-08",   // TODO: BUSCAR LA FECHA DE LA TASA
                    order_payment_methods: []
                }
            ]
        };

        // =========================================================================
        // PASO 15: ✅ EJECUTAMOS LA PETICIÓN A LA API EXTERNA IMPRENTA DIGITAL 
        // =========================================================================
        // Nota como no le pasamos headers, ni baseURL, ni Authorization.
        // El interceptor hace todo eso antes de salir de tu backend.
        const response = await apiExternaClient.post('/api/Invoice/add_list_invoice', payLoad);

        if (response.data.invoice_errors && response.data.invoice_errors.length > 0) {
            throw new AppError(`${response.data.message.trim()} ${response.data.invoice_errors[0]}`, 409, "service:postIntegracionFacturaService");
        }

        // =========================================================================
        // PASO 16: Registrar Respuesta de la Imprenta Digital (num_control, url_pdf)
        // =========================================================================
        // Guarda los datos del documento enviado
        const prm_id_fact = id_fact_sigesp;
        const prm_numfact = numfact_sigesp;
        const prm_id_doc = null;
        const prm_codtipdoc = 'FACTURA';
        const prm_num_control = response.data.invoice_list_success[0].control_number;
        const prm_url_pdf = response.data.invoice_list_success[0].invoice_pdf;
        const prm_codusu = 'ADMINISTRADOR';
        const prm_modulo = 'SISPVEN';
        const prm_id_fact_origen = factura.id_factura;

        // 👇 NUEVO: Envolvemos SOLO la base de datos en un try-catch independiente
        try {
            // Elimina los datos de la configuracion Local
            const query1 = 'SELECT * FROM fn_api_post_integracion_documentos($1, $2, $3, $4, $5, $6, $7, $8, $9)';
            await poolSigesp.query(query1, [prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu, prm_modulo, prm_id_fact_origen]);

        } catch (dbError) {
            // 🚨 LOG CRÍTICO: La factura existe en el ente externo, pero no se guardó localmente.
            // Aquí usamos console.error, pero idealmente deberías usar una librería como Winston 
            // o guardar este error en un archivo de texto para no perder el rastro.
            console.error(`🚨 CRÍTICO: Factura ${prm_numfact} creada en CGI, pero falló guardado local:`, dbError);
            
            // ¡MUY IMPORTANTE! NO hacemos 'throw' aquí. 
            // Dejamos que el código continúe para que el cliente reciba su respuesta de éxito.
        }

        // =========================================================================
        // TODO: PASO 17: Actualizar Objeto de Respuesta de SIGESP
        // =========================================================================
        xxx.status_cgid = true;
        xxx.control_number = response.data.invoice_list_success[0].control_number;
        xxx.url_pdf = response.data.invoice_list_success[0].invoice_pdf;

        // retornamos la respuesta
        return xxx as any;
        
    } catch (error: any) {
        console.log('*************************************')
        console.log(error)
        console.log('*************************************')

        // En caso de cualquier error, descalcula e ignora todo
        await clientSigesp.query('ROLLBACK');

        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postIntegracionFacturaService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postIntegracionFacturaService");
    } finally {
        // Siempre liberamos el cliente al pool
        clientSigesp.release();
    }
}

// ? RESPALDO 2
/*
export async function postIntegracionFacturaService(data: IRequestIntegracionFactura): Promise<void> {
    const { cliente, factura, detalle } = data;

    // Obtenemos una conexión dedicada del pool (Servidor SIGESP)
    const clientSigesp = await poolSigesp.connect();

    try {
        // PASO 1: Ejecutamos el Stored Procedure / Función para obtener la data (Clientes + Encabezado + Detalle) (Servidor SYSPVEN)
        // const queryFacturas = 'SELECT * FROM fn_api_integracion_get_facturas_por_enviar()';
        // const result = await poolSispven.query(queryFacturas);
        // const filasPlanas = result.rows;

        // if (!filasPlanas || filasPlanas.length === 0) {
        //     console.log('No hay registros para procesar.');
        //     return;
        // }

        // ------------------------------------------------------------------------
        // INICIO DE LA TRANSACCIÓN (Servidor SIGESP)
        // ------------------------------------------------------------------------
        await clientSigesp.query('BEGIN');
        
        const mapaClientesId = new Map<string, number>();           // Key: RIF -> Value: id_cliente (SIGESP)
        const mapaFacturasId = new Map<number, { id_fact: number; numfact: number }>();
        const mapaDetallesSet = new Set<string>();                  // Key: "id_fact_SIGESP-numrenglon" (Evita renglones duplicados)
        const mapaCargoSet = new Set<string>();                     // Key: "id_fact_SIGESP-numrenglon" (Evita renglones duplicados)
        const mapaCompPrincipal = new Set<string>();                // Key: "id_fact_SIGESP-numrenglon" (Evita renglones duplicados)
        const mapaCompPresupuesto = new Set<string>();              // Key: "id_fact_SIGESP-numrenglon" (Evita renglones duplicados)
        const mapaCompContable = new Set<string>();                 // Key: "id_fact_SIGESP-numrenglon" (Evita renglones duplicados)

        // ---------------------------------------------------------------------
        // PASO 1: Agregar Clientes
        // ---------------------------------------------------------------------            
        const rif = cliente.rif.trim()

        if (!mapaClientesId.has(rif)) {
            
            const queryCliente = `SELECT public.fn_api_integracion_cxc_clientes($1, $2, $3, $4, $5) AS id_cliente;`;

            // Construimos el array de parametros para clientes
            const valuesCliente = [
                rif,
                cliente.nombre.trim(),
                cliente.direccion.trim(),
                cliente.telefono.trim(),
                cliente.email.trim()
            ];

            // Ejecutamos el Stored Procedure / Función para registrar los datos del cliente (Servidor SIGESP)
            const resCliente = await clientSigesp.query(queryCliente, valuesCliente);
            const idClienteObtenido = resCliente.rows[0].id_cliente;

            // Guarda id_cliente en un Mapa (RIF -> id_cliente)
            mapaClientesId.set(cliente.rif.trim(), idClienteObtenido);
        }

        // ---------------------------------------------------------------------
        // PASO 2: Agregar Factura Encabezado
        // ---------------------------------------------------------------------    
        const idFacturaOrigen = factura.id_factura;
        const idCliente = mapaClientesId.get(rif);

        // 1. Si la factura aún no está en el mapa, armamos el objeto Encabezado
        if (!mapaFacturasId.has(idFacturaOrigen)) {
            
            const queryFactura = `SELECT out_id_fact, out_numfact FROM public.fn_api_integracion_cxc_factura($1, $2, $3, $4, $5, $6, $7, $8;`;

            // Construimos el array de parametros
            const valuesFactura = [
                idCliente,
                idFacturaOrigen,
                factura.sub_total,
                factura.base_imp,
                factura.iva,
                factura.total,
                factura.descripcion?.trim(),
                factura.fecha_fact.trim()
            ];

            // Ejecutamos el Stored Procedure / Función para registrar los datos del Encabezado de la Factura (Servidor SIGESP)
            const resFactura = await clientSigesp.query(queryFactura, valuesFactura);
            const idFacturaObtenido = resFactura.rows[0].id_fact;
            const numFacturaObtenido = resFactura.rows[0].out_numfact;

            // mapaFacturasId.set(idFacturaOrigen, idFacturaObtenido);

            mapaFacturasId.set(idFacturaOrigen, { id_fact: idFacturaObtenido, numfact: numFacturaObtenido});
        }

        // ---------------------------------------------------------------------
        // PASO 3: Agregar Factura Detalle
        // ---------------------------------------------------------------------
        // Obtienes el objeto completo
        const facturaSigesp = mapaFacturasId.get(idFacturaOrigen)!;

        // Accedes a cada valor de forma individual
        const idFactSigesp = facturaSigesp.id_fact;

        // Recorro el array de detalles
        for (const fila of detalle) {            
            // Clave única para el detalle
            const claveDetalle = `${idFactSigesp}-FACTURA-${fila.renglon}`;

            if (!mapaDetallesSet.has(claveDetalle)) {
                const queryDetalle = `SELECT public.fn_api_integracion_cxc_detalle($1, $2, $3, $4, $5, $6, $7, $8, $9);`;

                // Reemplaza o ajusta estos campos según lo que pide tu función fn_api_integracion_cxc_dt_factura
                const valuesDetalle = [
                    idFactSigesp, 
                    fila.renglon,
                    fila.id_servicio,
                    fila.precio,
                    fila.cantidad,
                    fila.porc_iva,
                    fila.iva_detalle,
                    fila.total_detalle,
                    fila.comentario?.trim()                    
                ];

                await clientSigesp.query(queryDetalle, valuesDetalle);

                // Marcamos el detalle como insertado
                mapaDetallesSet.add(claveDetalle);
            }
        }
        
        // ---------------------------------------------------------------------
        // PASO 4: Agregar Cargos
        // ---------------------------------------------------------------------
        // TODO: OJO OJO OJO - PREGUNTAR SI LA TABLA DE CARGOS VA POR CADA DETALLE QUE EXISTA EN LA FACTURA
        // TODO: OJO OJO OJO HAY QUE BUSCAR EN UNA TABLA DE CONFIGURACION ESTE CODIGO 10091
        // Clave única para el Cargo
        const claveCargo = `0001-FACTURA-${idFactSigesp}-10091`;

        if (!mapaCargoSet.has(claveCargo)) {
            const queryCargo = `SELECT public.fn_api_integracion_cxc_dt_cargos($1, $2, $3, $4);`;

            // Valore para la funcion función fn_api_integracion_cxc_dt_cargos
            const valuesCargo = [
                idFactSigesp,
                factura.base_imp,
                factura.iva,
                factura.total
            ];

            await clientSigesp.query(queryCargo, valuesCargo);

            // Marcamos el detalle como insertado
            mapaCargoSet.add(claveCargo);
        }

        // ---------------------------------------------------------------------
        // PASO 5: Agregar Comprobanmte Principal
        // ---------------------------------------------------------------------
        // Accedes a cada valor de forma individual
        const numFactSigesp = facturaSigesp.numfact;

        // 1. GENERAR NÚMERO DE COMPROBANTE
        const comprobante = `F-0001- ${numFactSigesp.toString().padStart(13, '0')}`;

		// 2. GENERAR DESCRIPCION DE COMPROBANTE
		const descripcion = `FACTURA N° ${numFactSigesp.toString()} ${factura.descripcion?.trim()}`;

        // Clave única para el Comprobanmte Principal
        const claveCompPrincipal = `0001-CXCFAC-${comprobante}`;

        if (!mapaCompPrincipal.has(claveCompPrincipal)) {
            const queryCompPrincipal = `SELECT public.fn_api_integracion_sigesp_cmp($1, $2, $3, $4, $5);`;

            // Valore para la funcion función fn_api_integracion_sigesp_cmp
            const valuesCompPrincipal = [
                comprobante.trim(),
                factura.fecha_fact.trim(),
                descripcion.trim(),
                rif.trim(),
                factura.total
            ];

            await clientSigesp.query(queryCompPrincipal, valuesCompPrincipal);

            // Marcamos el detalle como insertado
            mapaCompPrincipal.add(claveCompPrincipal);
        }

        // ---------------------------------------------------------------------
        // PASO 5: Agregar Detalle Comprobanmte Presupuesto
        // ---------------------------------------------------------------------
        // Clave única para el Comprobanmte Presupuesto
        const claveCompPresupuesto = `0001-CXCFAC-${comprobante}`;

        // FACTURA N° 138146

        if (!mapaCompPresupuesto.has(claveCompPresupuesto)) {
            const queryCompPresupuesto = `SELECT public.fn_api_integracion_spi_dt_cmp($1, $2, $3, $4);`;

            // Valore para la funcion función fn_api_integracion_spi_dt_cmp
            const valuesCompPresupuesto = [
                comprobante.trim(),
                factura.fecha_fact.trim(),
                descripcion.trim(),
                factura.sub_total
            ];

            await clientSigesp.query(queryCompPresupuesto, valuesCompPresupuesto);

            // Marcamos el detalle como insertado
            mapaCompPresupuesto.add(claveCompPresupuesto);
        }

        // ---------------------------------------------------------------------
        // PASO 6: Agregar Contabilidad - Cuenta por Cobrar (Débito), Cuenta de Ingreso (Crédito) y IVA por Pagar (Crédito)
        // ---------------------------------------------------------------------
        // Clave única para el Comprobanmte Contable
        const claveCompContable = `0001-CXCFAC-${comprobante}`;

        if (!mapaCompContable.has(claveCompContable)) {
            const queryCompContable = `SELECT public.fn_api_integracion_scg_dt_cmp($1, $2, $3, $4, $5, $6);`;

            // Valore para la funcion función fn_api_integracion_scg_dt_cmp
            const valuesCompContable = [
                comprobante.trim(),
                factura.fecha_fact.trim(),
                descripcion.trim(),
                factura.sub_total,
                factura.iva,
                factura.total
            ];

            await clientSigesp.query(queryCompContable, valuesCompContable);

            // Marcamos el detalle como insertado
            mapaCompContable.add(claveCompContable);
        }

        // retornamos las filas
        //return filasPlanas as any;
        
        // =========================================================================
        // PASO ????: Si todo el bucle pasó correctamente, hacemos COMMIT
        // =========================================================================
        await clientSigesp.query('COMMIT');

        console.log('Integración completada exitosamente.');
        
    } catch (error: any) {
        console.log('*************************************')
        console.log(error)
        console.log('*************************************')

        // En caso de cualquier error, descalcula e ignora todo
        await clientSigesp.query('ROLLBACK');

        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postIntegracionFacturaService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postIntegracionFacturaService");
    } finally {
        // Siempre liberamos el cliente al pool
        clientSigesp.release();
    }
}
*/

// ? RESPALDO 1
/*
export async function postXxxService(codigo_usuario: string): Promise<void> {
    // Obtenemos una conexión dedicada del pool (Servidor SIGESP)
    const clientSigesp = await poolSigesp.connect();

    try {
        // PASO 1: Ejecutamos el Stored Procedure / Función para obtener la data (Clientes + Encabezado + Detalle) (Servidor SYSPVEN)
        const queryFacturas = 'SELECT * FROM fn_api_integracion_get_facturas_por_enviar()';
        const result = await poolSispven.query(queryFacturas);
        const filasPlanas = result.rows;

        if (!filasPlanas || filasPlanas.length === 0) {
            console.log('No hay registros para procesar.');
            return;
        }

        // ------------------------------------------------------------------------
        // INICIO DE LA TRANSACCIÓN (Servidor SIGESP)
        // ------------------------------------------------------------------------
        await clientSigesp.query('BEGIN');
        
        const mapaClientesId = new Map<string, number>();  // Key: RIF -> Value: id_cliente (SIGESP)
        const mapaFacturasId = new Map<number, number>();  // Key: facturacion_id (Origen) -> Value: id_fact (SIGESP)
        const mapaDetallesSet = new Set<string>();         // Key: "id_fact_SIGESP-numrenglon" (Evita renglones duplicados)

        for (const fila of filasPlanas) {
            // PASO 2: Procesar Clientes Únicos y guardar id_cliente en un Mapa (RIF -> id_cliente)
            const rif = String(fila.numpririf || '').trim();
            const idFacturaOrigen = Number(fila.facturacion_id);

            if (rif && !mapaClientesId.has(rif)) {
                
                const queryCliente = `
                    SELECT public.fn_api_integracion_cxc_clientes(
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 
                        $31
                    ) AS id_cliente;
                `;

                // Construimos el array de parametros para clientes
                const valuesCliente = [
                    fila.codemp,
                    fila.tipperrif,
                    fila.numpririf,
                    fila.numterrif,
                    fila.id_tipo_cliente,
                    fila.nombre_cliente,
                    fila.cliente_abvr,
                    fila.id_zona,
                    fila.id_vend,
                    fila.id_clasif_cliente,
                    fila.dircliente,
                    fila.direntrega,
                    fila.codpai, 
                    fila.codest, 
                    fila.codmun, 
                    fila.codpar, 
                    fila.codciu, 
                    fila.codpostal,
                    fila.faxcliente, 
                    fila.telcliente, 
                    fila.emailcliente, 
                    fila.webcliente, 
                    fila.observcliente,
                    fila.estclient,	
                    fila.nombreresp, 
                    fila.cargoresp, 
                    fila.emailresp,                    
                    fila.fecreg, 
                    fila.fecreg, 
                    fila.usureg,
                    fila.horareg
                ];

                // Ejecutamos el Stored Procedure / Función para registrar los datos del cliente (Servidor SIGESP)
                const resCliente = await clientSigesp.query(queryCliente, valuesCliente);
                const idClienteObtenido = resCliente.rows[0].id_cliente;

                mapaClientesId.set(rif, idClienteObtenido);
            }

            // Obtenemos el id_cliente que ya guardamos/buscamos en el Paso 2
            const idCliente = mapaClientesId.get(rif);

            // PASO 3: Agrupar la data plana por Factura (Encabezado + Detalles)
            // 1. Si la factura aún no está en el mapa, armamos el objeto Encabezado
            if (!mapaFacturasId.has(idFacturaOrigen)) {
                
                const queryFactura = `
                    SELECT public.fn_api_integracion_cxc_factura(
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) AS id_fact;
                `;

                // Construimos el array de parametros
                const valuesFactura = [
                    fila.codemp,
                    fila.codproceso,
                    idCliente,
                    fila.id_transp, 
                    fila.id_estfact,
                    fila.id_condpago, 
                    fila.id_vend, 
                    fila.codmon,
                    fila.tascam, 
                    fila.tipopecont,
                    fila.codcaj,
                    fila.fecfact,
                    fila.fecvenc,
                    fila.subtot,
                    fila.iva,
	                fila.otros,
	                fila.baseimp,
	                fila.total,
                    fila.descripfact,
                    fila.comentadifact,
                    fila.fecreg,
                    fila.usureg,
                    fila.horareg,
                    fila.codsuc
                ];

                // Ejecutamos el Stored Procedure / Función para registrar los datos del Encabezado de la Factura (Servidor SIGESP)
                const resFactura = await clientSigesp.query(queryFactura, valuesFactura);
                const idFacturaObtenido = resFactura.rows[0].id_fact;

                mapaFacturasId.set(idFacturaOrigen, idFacturaObtenido);
            }

            // Obtenemos el id_fact de la factura asegurada en SIGESP
            const idFactSigesp = mapaFacturasId.get(idFacturaOrigen)!;

            // ---------------------------------------------------------------------
            // PASO 5: Verificar y Registrar DETALLE FACTURA
            // ---------------------------------------------------------------------
            // Clave única para el detalle: ID_FACTURA_SIGESP + NUMERO_RENGLON
            const claveDetalle = `${idFactSigesp}-${fila.codproceso}-${fila.renglon}`;

            if (!mapaDetallesSet.has(claveDetalle)) {
                const queryDetalle = `SELECT public.fn_api_integracion_cxc_detalle($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);`;

                // Reemplaza o ajusta estos campos según lo que pide tu función fn_api_integracion_cxc_dt_factura
                const valuesDetalle = [
                    idFactSigesp, 
                    fila.id_tipodetalle,
                    fila.codproceso,
                    fila.renglon, 
                    fila.coddetalle,
                    fila.codunimed,
                    fila.codalm,
                    fila.cantidad_detalle,
                    fila.precio_detalle,
                    fila.porciva,
                    fila.iva_detalle,
                    fila.neto_detalle,
                    fila.comentario,
                    fila.codproc,
                    fila.canmay,
                    fila.precioneto_detalle
                ];

                await clientSigesp.query(queryDetalle, valuesDetalle);

                // Marcamos el detalle como insertado
                mapaDetallesSet.add(claveDetalle);
            }
        }

        // retornamos las filas
        //return filasPlanas as any;
        
        // =========================================================================
        // PASO 6: Si todo el bucle pasó correctamente, hacemos COMMIT
        // =========================================================================
        await clientSigesp.query('COMMIT');

        console.log('Integración completada exitosamente.');
        
    } catch (error: any) {
        // En caso de cualquier error, descalcula e ignora todo
        await clientSigesp.query('ROLLBACK');

        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        if (error?.response?.data) {
            throw new AppError(error.response.data.message.trim(), error.response.status, "service:postCrearNCService");    
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "service:postCrearNCService");
    } finally {
        // Siempre liberamos el cliente al pool
        clientSigesp.release();
    }
}
*/