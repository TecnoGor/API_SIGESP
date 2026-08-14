import { poolSigesp, poolSispven } from "../database/db.js";
import { AppError } from "../utils/appError.js";
import apiExternaClient from '../utils/apiExternaClient.js';

// ? VERIFICADA - 27-07-2026
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
        
        const mapaClientesId = new Map<string, number>();   // Key: RIF -> Value: id_cliente (SIGESP)
        const mapaFacturasId = new Map<number, number>();   // Key: facturacion_id (Origen) -> Value: id_fact (SIGESP)
        const mapaDetallesSet = new Set<string>();          // Key: "id_fact_SIGESP-numrenglon" (Evita renglones duplicados)
        const mapaDetalleCargoSet = new Set<string>();      // Key: "id_fact_SIGESP-numrenglon" (Evita renglones duplicados)

        for (const fila of filasPlanas) {
            // ---------------------------------------------------------------------
            // PASO 2: Procesar Clientes Únicos y guardar id_cliente en un Mapa (RIF -> id_cliente)
            // ---------------------------------------------------------------------            
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

            // ---------------------------------------------------------------------
            // PASO 3: Agrupar la data plana por Factura (Encabezado + Detalles)
            // ---------------------------------------------------------------------                        
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
            // PASO 4: Verificar y Registrar DETALLE FACTURA
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

            // ---------------------------------------------------------------------
            // PASO 5: Verificar y Registrar DETALLE FACTURA
            // ---------------------------------------------------------------------
            // Clave única para el detalle: ID_FACTURA_SIGESP + NUMERO_RENGLON
            const claveDetalleCargo = `${fila.codemp}-${fila.codproceso}-${idFactSigesp}-10091`;

            if (!mapaDetalleCargoSet.has(claveDetalleCargo)) {
                const queryDetalleCargo = `SELECT public.fn_api_integracion_cxc_dt_cargos($1, $2, $3, $4, $5, $6, $7);`;

                // Reemplaza o ajusta estos campos según lo que pide tu función fn_api_integracion_cxc_dt_factura
                const valuesDetalleCargo = [
                    fila.codemp,
                    idFactSigesp,                     
                    fila.codproceso,                    
                    fila.precio_detalle,
                    fila.iva_detalle,
                    fila.neto_detalle,
                    0
                ];

                await clientSigesp.query(queryDetalleCargo, valuesDetalleCargo);

                // Marcamos el detalle como insertado
                mapaDetalleCargoSet.add(claveDetalleCargo);
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

/*
// ? VERIFICADA - 27-07-2026
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