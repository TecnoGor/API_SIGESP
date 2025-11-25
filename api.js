const express = require('express');
const fs = require('fs');
const { Pool } = require('pg');
// const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
// const tokenManager = require('tokenManager');
require('dotenv').config({ path: '.env.development' });

const app = express();
const port = process.env.REACT_APP_API_PORT;

const SECRET_KEY = process.env.REACT_APP_API_KEY;
const corsOptions = {
    origin: [
        process.env.REACT_APP_ORIGIN_URL,
        process.env.REACT_APP_ORIGIN_LOCAL,
        process.env.REACT_APP_ORIGIN_HOST
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

class TokenManager {
    constructor() {
        this.currentToken = null;
        this.tokenExpiry = null;
        this.refreshTimeout = null;
        this.authToken = '$2y$10$GjO8QVu3WNlOFv5MFMOrluVZF.x0U0Rff7zMtwyDn.WtUjZRyRqbS';
        this.userName = 'gerenciadesarrollo.ipostel@gmail.com'; // ← REEMPLAZA
        this.userPassword = '$2y$10$AnbhDNIdVG7I9th3FnoLDO32a1zmfx8B95aD0veIO72zQknLdGMXO'; // ← REEMPLAZA
        this.host = 'https://calidad.cgimprenta.digital/'; // ← REEMPLAZA
    }

    async getToken() {
        if (this.currentToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.currentToken;
        }
        return await this.refreshToken();
    }

    async refreshToken() {
        try {
            console.log('🔄 Solicitando nuevo token...');
            
            const response = await fetch(`${this.host}/api/Invoice/create_token_authenticator`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    userName: this.userName,
                    userPassword: this.userPassword
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.token) {
                this.currentToken = data.token;
                this.tokenExpiry = Date.now() + (50 * 60 * 1000); // 50 minutos
                this.scheduleTokenRefresh();
                console.log('✅ Token renovado exitosamente');
                return this.currentToken;
            } else {
                throw new Error('No se pudo obtener el token: ' + data.message);
            }

        } catch (error) {
            console.error('❌ Error renovando token:', error.message);
            throw error;
        }
    }

    scheduleTokenRefresh() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        this.refreshTimeout = setTimeout(() => {
            console.log('⏰ Renovando token automáticamente...');
            this.refreshToken().catch(err => {
                console.error('Error en renovación automática:', err);
            });
        }, 45 * 60 * 1000); // 45 minutos
    }

    async forceRefresh() {
        return await this.refreshToken();
    }

    getTokenStatus() {
        if (!this.currentToken) {
            return { hasToken: false, status: 'No hay token' };
        }

        const timeUntilExpiry = this.tokenExpiry - Date.now();
        const minutesLeft = Math.floor(timeUntilExpiry / 60000);

        return {
            hasToken: true,
            token: this.currentToken.substring(0, 20) + '...',
            expiresIn: `${minutesLeft} minutos`,
            isExpired: timeUntilExpiry <= 0
        };
    }
}

// Crear instancia del TokenManager
const tokenManager = new TokenManager();

async function initializeApp() {
    try {
        console.log('🚀 Inicializando Token Manager...');
        await tokenManager.refreshToken();
        console.log('✅ Aplicación inicializada con token válido');
    } catch (error) {
        console.error('❌ Error inicializando token:', error.message);
        // La aplicación puede continuar, el token se intentará renovar cuando sea necesario
    }
}


app.use(bodyParser.json());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb', extended: true }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const pool = new Pool({
    user: process.env.REACT_APP_DB_USER,
    host: process.env.REACT_APP_DB_HOST,
    database: process.env.REACT_APP_DB_NAME,
    password: process.env.REACT_APP_DB_PASSWORD,
    port: process.env.REACT_APP_DB_PORT,
});

// Función para encriptar la contraseña en SHA-256
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function procesarFacturaParaAPI(id_fact) {
    try {
        // 1. Consultar los detalles de la factura
        const result = await pool.query(
            `SELECT
                CASE WHEN d.id_tipodetalle = 'SERVI'
                THEN s.denser WHEN d.id_tipodetalle = 'ARTIC'
                THEN a.denart WHEN d.id_tipodetalle = 'CONCE' 
                THEN c.denconfac ELSE '' END AS dendetalle, d.* , nomfisalm, u.denunimed, u.uniabrv, f.numfact, f.fecfact, a.spi_cuenta, s.spg_cuenta,comentario, 
                c.denconfac, c.scg_cuenta as scg_cuenta_conc, a.codtipcont,a.canuni,a.ctlcaja, a.codtipcont, cont.denart as dencontvac,a.codcontvac,a.contvacio,
                ucont.codunimed AS codunimedcont, ucont.denunimed as denunimedcont, COALESCE(aacont.existencia,0) AS existenciacont FROM cxc_detalle d 
            INNER JOIN cxc_factura f ON f.id_fact = d.id_fact AND f.codproceso = d.codproceso INNER JOIN cxc_clientes cl ON cl.id_cliente = f.id_cliente 
                LEFT JOIN siv_articulo a ON a.codart=d.coddetalle AND f.codemp = a.codemp AND d.id_tipodetalle = 'ARTIC' 
                LEFT JOIN soc_servicios s ON s.codser=d.coddetalle AND d.id_tipodetalle = 'SERVI' 
                LEFT JOIN cxc_conceptofac c ON c.codconfac=d.coddetalle AND d.id_tipodetalle = 'CONCE' 
                LEFT JOIN soc_tiposervicio ts ON s.codtipser=ts.codtipser LEFT JOIN siv_unidadmedida u ON u.codunimed = d.codunimed 
                LEFT JOIN siv_producto p ON p.codprod = a.codmil AND p.codemp = a.codemp LEFT JOIN siv_articuloalmacen aa ON aa.codart = a.codart 
            AND aa.codemp = a.codemp AND d.codalm = aa.codalm LEFT JOIN siv_almacen al ON al.codalm = aa.codalm AND al.codemp = aa.codemp 
                LEFT JOIN siv_articulo cont ON cont.codemp = cont.codemp AND cont.codart = a.codcontvac AND cont.contvacio = 1 
                LEFT JOIN siv_unidadmedida ucont ON ucont.codunimed = cont.codunimed LEFT JOIN siv_articuloalmacen aacont ON aacont.codart = a.codart 
            AND aacont.codemp = a.codemp AND al.codalm = aacont.codalm WHERE  d.codproceso='FACTURA' AND d.id_fact=$1 ORDER BY coddetalle;`,
            [id_fact]
        );

        // 2. Consultar datos adicionales del cliente y factura (necesitarás ajustar esta consulta según tu estructura)
        const facturaData = await pool.query(
            `SELECT f.*, c.nombre_cliente, c.numpririf, c.dircliente, c.telcliente, c.emailcliente
             FROM cxc_factura f 
             LEFT JOIN cxc_clientes c ON c.id_cliente = f.id_cliente 
             WHERE f.id_fact = $1`,
            [id_fact]
        );

        if (result.rows.length === 0 || facturaData.rows.length === 0) {
            throw new Error('Factura no encontrada');
        }

        const detalles = result.rows;
        const factura = facturaData.rows[0];

        // 3. Transformar los datos al formato requerido
         const productosTransformados = detalles.map((detalle, index) => {
            console.log(`Detalle ${index}:`, detalle); // ← Para ver cada detalle
            
            return {
                codigoProducto: detalle.coddetalle || `COD-${detalle.coddetalle || '000'}`,
                nombreProducto: detalle.dendetalle || 'Producto sin nombre',
                descripcionProducto: detalle.comentario || detalle.dendetalle || 'Descripción del producto',
                tipoImpuesto: "G", // ← VERIFICA SI DEBE SER "G" O OTRO VALOR
                cantidadAdquirida: detalle.candetalle ? parseFloat(detalle.candetalle).toFixed(2) : "1.00",
                precioProducto: detalle.precio_detalle ? parseFloat(detalle.precio_detalle).toFixed(2) : "0.00",
                rifTercero: "",
                nombreRifTercero: ""
            };
        })

        // 4. Construir el objeto final para el endpoint
        const datosParaEnviar = {
            numeroSerie: "A",
            cantidadFactura: 1,
            facturas: [
                {
                    numeroFactura: factura.numfact ? factura.numfact.toString().padStart(6, '0') : "000000",
                    documentoIdentidadCliente: "V" + factura.numpririf || "V00000000",
                    nombreRazonSocialCliente: factura.nombre_cliente || "Cliente no especificado",
                    correoCliente: factura.emailcliente || "cliente@ejemplo.com",
                    direccionCliente: factura.dircliente || "Dirección no especificada",
                    telefonoCliente: factura.telcliente || "0000000000",
                    descripcionFactura: `Factura ${factura.numfact} generada desde sistema`,
                    productos: productosTransformados,
                    tasa_del_dia: "199.1072", // ← MANTENIENDO EL VALOR QUE TIENES
                    order_payment_methods: [],
                    dualidad_de_moneda: 0
                }
            ]
        };
        
        console.log("📤 ENVIANDO DATOS COMPLETOS:");
        console.log(JSON.stringify(datosParaEnviar, null, 2));

        // VERIFICAR PRODUCTOS INDIVIDUALMENTE
        console.log("🔍 PRODUCTOS DETALLADOS:");
        datosParaEnviar.facturas[0].productos.forEach((producto, index) => {
            console.log(`Producto ${index + 1}:`, JSON.stringify(producto, null, 2));
        });

        const bearerToken = await tokenManager.getToken();
        //const BEARER_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJGYWN0dXJhY2lcdTAwZjNuIENHIiwiaWF0IjoxNzY0MDkyOTQ3LCJleHAiOjE3NjQwOTY1NDcsIm5iZiI6MTc2NDA5Mjk0NywiY2xpZW50X2lkIjoiWm9URFBNMTluOVYrbmRGVkZtRTJkQT09IiwiY2xpZW50X25hbWUiOiJJTlNUSVRVVE8gUE9TVEFMIFRFTEVHUkFGSUNPIERFIFZFTkVaVUVMQSIsImNsaWVudF90eXBlX2RvY3VtZW50X3JpZiI6IlE1MCtUZUhmXC9Zcm5MSTlPdDc4a0JnPT0iLCJjbGllbnRfcmlmIjoiQUVVSjdISHNsVDU5bzFuZHJiZFd3QT09In0.F5jOu83t8jJxkBHluTjhNRwUXExM_npSEMDGcPjfa-o';

        const response = await fetch(`${tokenManager.host}/api/Invoice/add_list_invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            },
            body: JSON.stringify(datosParaEnviar)
        });

        const responseText = await response.text();
        console.log("📥 RESPUESTA DEL API DESTINO:");
        console.log("Status:", response.status);
        console.log("Status Text:", response.statusText);
        console.log("Headers:", response.headers);
        console.log("Body:", responseText);

        if (!response.ok) {
            // Intentar parsear el error como JSON si es posible
            if (response.status === 401) {
                console.log('🔄 Token expirado, renovando...');
                const newToken = await tokenManager.forceRefresh();
                
                // Reintentar con nuevo token
                const retryResponse = await fetch(`${tokenManager.host}/api/Invoice/add_list_invoice`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${newToken}`
                    },
                    body: JSON.stringify(datosParaEnviar)
                });
                
                const retryText = await retryResponse.text();
                
                if (!retryResponse.ok) {
                    throw new Error(`Error después de renovar token: ${retryResponse.status} - ${retryText}`);
                }
                
                return JSON.parse(retryText);
            }
            
            throw new Error(`Error en API destino: ${response.status} - ${responseText}`);
        }

        const resultadoAPI = JSON.parse(responseText);
        console.log("✅ RESPUESTA EXITOSA:", resultadoAPI);
        return resultadoAPI;

    } catch (error) {
        console.error('❌ ERROR COMPLETO AL PROCESAR FACTURA:');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

app.get('/api/testConnection', async (req, res) => {
    try {
        console.log("🔍 Probando conectividad básica...");
        
        // Probar con una API pública primero
        const testResponse = await fetch('https://.org/get', {
            timeout: 10000
        });
        
        if (testResponse.ok) {
            console.log("✅ Conexión a internet: OK");
        } else {
            console.log("❌ Conexión a internet: FALLÓ");
        }

        // Ahora probar con tu API específica
        console.log("🔍 Probando conexión a tu API destino...");
        
        const BEARER_TOKEN = "tu_token_real_aqui";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const yourApiResponse = await fetch('https://calidad.cgimprenta.digital/api/Invoice/add_list_invoice', {
                method: 'GET', // Solo probar conexión, no POST
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log("✅ Conexión a tu API: OK - Status:", yourApiResponse.status);
            const responseText = await yourApiResponse.text();
            console.log("🎯 TEST SIMPLE - Respuesta:");
            console.log("Status:", responseText.status);
            console.log("Body:", responseText);
            
            res.json({
                internet: 'OK',
                your_api: `OK - Status ${yourApiResponse.status}`,
                message: 'Conexiones funcionando'
            });
            
        } catch (apiError) {
            clearTimeout(timeoutId);
            console.log("❌ Conexión a tu API: FALLÓ -", apiError.message);
            
            res.json({
                internet: 'OK',
                your_api: `FALLÓ - ${apiError.message}`,
                message: 'Problema específico con tu API'
            });
        }

    } catch (error) {
        console.error('❌ Error en test de conexión:', error.message);
        res.status(500).json({ 
            error: 'Error general: ' + error.message 
        });
    }
});

app.get('/api/token/status', async (req, res) => {
    try {
        const status = tokenManager.getTokenStatus();
        res.json({
            success: true,
            tokenStatus: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/token/refresh', async (req, res) => {
    try {
        const newToken = await tokenManager.forceRefresh();
        const status = tokenManager.getTokenStatus();
        
        res.json({
            success: true,
            message: 'Token renovado manualmente',
            tokenStatus: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error renovando token: ' + error.message
        });
    }
});

app.get('/api/testSimple/:id_fact', async (req, res) => {
    try {
        const { id_fact } = req.params;
        
        // Datos MUY básicos para probar
        const datosParaEnviar = {
            numeroSerie: 'A',
            cantidadFactura: 1,
            facturas: [
                {
                    numeroFactura: '000176',
                    documentoIdentidadCliente: 'V12747667',
                    nombreRazonSocialCliente: 'JUDITH',
                    correoCliente: 'client@ejemplo.com',
                    direccionCliente: 'CUA CUA CUA',
                    telefonoCliente: '0414-2361078',
                    descripcionFactura: 'Factura de prueba simple',
                    productos: [
                        {
                            codigoProducto: "test-001",
                            nombreProducto: "Producto de Prueba",
                            descripcionProducto: "Descripción de prueba",
                            tipoImpuesto: "G",
                            cantidadAdquirida: "1.00",
                            precioProducto: "100.00",
                            rifTercero: "",
                            nombreRifTercero: ""
                        }
                    ],
                    tasa_del_dia: '199.1072',
                    order_payment_methods: [],
                    dualidad_de_moneda: 0
                }
            ]
        };

        console.log("🎯 TEST SIMPLE - Datos a enviar:");
        console.log(JSON.stringify(datosParaEnviar, null, 2));

        const BEARER_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJGYWN0dXJhY2lcdTAwZjNuIENHIiwiaWF0IjoxNzY0MDkyOTQ3LCJleHAiOjE3NjQwOTY1NDcsIm5iZiI6MTc2NDA5Mjk0NywiY2xpZW50X2lkIjoiWm9URFBNMTluOVYrbmRGVkZtRTJkQT09IiwiY2xpZW50X25hbWUiOiJJTlNUSVRVVE8gUE9TVEFMIFRFTEVHUkFGSUNPIERFIFZFTkVaVUVMQSIsImNsaWVudF90eXBlX2RvY3VtZW50X3JpZiI6IlE1MCtUZUhmXC9Zcm5MSTlPdDc4a0JnPT0iLCJjbGllbnRfcmlmIjoiQUVVSjdISHNsVDU5bzFuZHJiZFd3QT09In0.F5jOu83t8jJxkBHluTjhNRwUXExM_npSEMDGcPjfa-o"; // ← ¡REEMPLAZA!
        
        // AGREGAR MÁS CONFIGURACIÓN A FETCH
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        console.log("🔗 Intentando conectar a la API destino...");
        
        const response = await fetch('https://calidad.cgimprenta.digital/api/Invoice/add_list_invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'User-Agent': 'NodeJS-API/1.0'
            },
            body: JSON.stringify(datosParaEnviar),
            signal: controller.signal,
            // Agregar opciones para evitar problemas de SSL en desarrollo
            agent: null // Esto deshabilita la verificación SSL (solo para desarrollo)
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        console.log("🎯 TEST SIMPLE - Respuesta:");
        console.log("Status:", response.status);
        console.log("Body:", responseText);

        if (!response.ok) {
            return res.status(400).json({
                error: `API destino respondió con error ${response.status}`,
                details: responseText
            });
        }

        const resultado = JSON.parse(responseText);
        res.json({ success: true, response: resultado });

    } catch (error) {
        console.error('❌ ERROR EN TEST SIMPLE:');
        console.error('Tipo de error:', error.name);
        console.error('Mensaje:', error.message);
        console.error('Código:', error.code);
        
        if (error.name === 'AbortError') {
            return res.status(408).json({ 
                error: 'Timeout: La conexión tardó demasiado tiempo' 
            });
        }
        
        res.status(500).json({ 
            error: 'Error de conexión: ' + error.message,
            type: error.name,
            code: error.code
        });
    }
});

app.get('/api/facturaTransformada/:id_fact', async (req, res) => {
    const { id_fact } = req.params;
    
    try {
        const datosTransformados = await procesarFacturaParaAPI(id_fact);
        res.json(datosTransformados);
    } catch (err) {
        console.error('Error al transformar factura:', err);
        res.status(500).json({ error: 'Error al transformar la factura' });
    }
});

app.get('/api/procesarFactura/:id_fact', async (req, res) => {
    const { id_fact } = req.params;
    
    try {
        // Procesar y enviar factura al endpoint destino
        const resultadoAPI = await procesarFacturaParaAPI(id_fact);
        
        res.json(resultadoAPI);

    } catch (err) {
        console.error('Error al procesar factura:', err);
        res.status(500).json({ 
            success: false,
            error: 'Error al procesar la factura',
            detalle: err.message 
        });
    }
});

app.get('/api/facturaDP/:id_fact', async (req, res) => {
    const { id_fact } = req.params;
    try {
        const result = await pool.query(
            `SELECT 
                c.id_cliente, c.codemp, c.codcliente, c.tipperrif, c.numpririf, c.numterrif, c.nitcli, c.id_tipo_cliente, c.nombre_cliente,
                c.cliente_abvr, c.id_zona, c.id_clasif_cliente, c.dircliente, c.direntrega, c.codpai, c.codest, c.codmun, c.codpar, c.codciu,
                c.codpostal, c.faxcliente, c.telcliente, c.emailcliente, c.webcliente, c.observcliente, c.estclient, c.limitecred, c.diascred,
                c.descglob, c.cedularesp, c.nombreresp, c.cargoresp, c.emailresp, c.sc_cuenta as scg_cliente, cdoc.codcliente as codcliente_doc,
                cdoc.nombre_cliente as nombre_cliente_doc,t.*, '('||succl.codsuccli||') - '||succl.nomsuccli AS descsuccli, ( SELECT COALESCE(SUM(doc.total_doc),0) 
            FROM cxc_documento doc
                WHERE doc.id_fact = f.id_fact AND codtipdoc = 'NC' AND anulado_doc = '0' ) AS total_cre, ( SELECT COALESCE(SUM(doc.total_doc),0) 
                FROM cxc_documento doc WHERE doc.id_fact = f.id_fact AND codtipdoc = 'ND' AND anulado_doc = '0' ) AS total_deb, ( f.total - ( SELECT COALESCE(SUM(doc.total_doc),0) 
                FROM cxc_documento doc WHERE doc.id_fact = f.id_fact AND codtipdoc = 'NC' AND anulado_doc = '0' ) + ( SELECT COALESCE(SUM(doc.total_doc),0) FROM cxc_documento doc 
                WHERE doc.id_fact = f.id_fact AND codtipdoc = 'ND' AND anulado_doc = '0' ) ) AS total_act, ( f.subtot - ( SELECT COALESCE(SUM(doc.subtot_doc),0) FROM cxc_documento doc 
                WHERE doc.id_fact = f.id_fact AND codtipdoc = 'NC' AND anulado_doc = '0' ) + ( SELECT COALESCE(SUM(doc.subtot_doc),0) FROM cxc_documento doc 
                WHERE doc.id_fact = f.id_fact AND codtipdoc = 'ND' AND anulado_doc = '0' ) ) AS subtot_act, ( f.iva - ( SELECT COALESCE(SUM(doc.iva_doc),0) 
                FROM cxc_documento doc WHERE doc.id_fact = f.id_fact AND codtipdoc = 'NC' AND anulado_doc = '0' ) + ( SELECT COALESCE(SUM(doc.iva_doc),0) 
                FROM cxc_documento doc WHERE doc.id_fact = f.id_fact AND codtipdoc = 'ND' AND anulado_doc = '0' ) ) AS iva_act FROM cxc_factura f 
                LEFT JOIN cxc_sucursales suc ON suc.codemp = f.codemp AND suc.codsuc = f.codsuc 
            LEFT JOIN cxc_cajas caj ON caj.codemp = f.codemp 
                AND caj.codsuc = f.codsuc AND caj.codcaj = f.codcaj 
                LEFT JOIN cxc_clientes c ON c.id_cliente = f.id_cliente 
                LEFT JOIN cxc_vendedores v ON v.id_vend = f.id_vend LEFT JOIN cxc_transporte t ON t.id_transp = f.id_transp 
                LEFT JOIN sigesp_moneda mo ON f.codmon = mo.codmon LEFT JOIN cxc_condiciones_pago cp ON cp.id_condpago = f.id_condpago 
                LEFT JOIN cxc_estatus_factura es ON es.id_estfact = f.id_estfact LEFT JOIN cxc_tipo_clientes tc ON tc.id_tipo_cliente = c.id_tipo_cliente 
                LEFT JOIN cxc_zonas z ON z.id_zona = c.id_zona LEFT JOIN cxc_clasif_clientes cc ON cc.id_clasif_cliente = c.id_clasif_cliente 
                LEFT JOIN cxc_vendedores vc ON vc.id_vend = c.id_vend LEFT JOIN scg_cuentas cu ON cu.codemp = c.codemp AND cu.sc_cuenta = c.sc_cuenta 
                AND status='C' LEFT JOIN sigesp_pais p ON p.codpai = c.codpai LEFT JOIN sigesp_estados e ON e.codpai = c.codpai AND e.codest = c.codest 
                LEFT JOIN sigesp_municipio m ON m.codpai = c.codpai AND m.codest = c.codest AND m.codmun = c.codmun 
                LEFT JOIN sigesp_parroquia pa ON pa.codpai = c.codpai AND pa.codest = c.codest AND pa.codmun = c.codmun AND pa.codpar = c.codpar 
                LEFT JOIN cxc_clientes cdoc ON cdoc.id_cliente = f.id_cliente_doc LEFT JOIN cxc_sucursales_clientes succl ON succl.id_cliente = f.id_cliente 
                AND succl.codsuccli = f.codsuccli WHERE f.codemp = '0001' AND f.codproceso='FACTURA' 
            AND f.id_fact=$1`,
            [parseInt(id_fact)] // ID del rol médico (ajusta según tu base de datos)
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener la factura:', err);
        res.status(500).json({ error: 'Error al obtener la factura' });
    }
});

app.get('/api/facturaD/:id_fact', async (req, res) => {
    const { id_fact } = req.params;
    try {
        const result = await pool .query(
            `SELECT
                CASE WHEN d.id_tipodetalle = 'SERVI'
                THEN s.denser WHEN d.id_tipodetalle = 'ARTIC'
                THEN a.denart WHEN d.id_tipodetalle = 'CONCE' 
                THEN c.denconfac ELSE '' END AS dendetalle, d.* , nomfisalm, u.denunimed, u.uniabrv, f.numfact, f.fecfact, a.spi_cuenta, s.spg_cuenta,comentario, 
                c.denconfac, c.scg_cuenta as scg_cuenta_conc, a.codtipcont,a.canuni,a.ctlcaja, a.codtipcont, cont.denart as dencontvac,a.codcontvac,a.contvacio,
                ucont.codunimed AS codunimedcont, ucont.denunimed as denunimedcont, COALESCE(aacont.existencia,0) AS existenciacont FROM cxc_detalle d 
            INNER JOIN cxc_factura f ON f.id_fact = d.id_fact AND f.codproceso = d.codproceso INNER JOIN cxc_clientes cl ON cl.id_cliente = f.id_cliente 
                LEFT JOIN siv_articulo a ON a.codart=d.coddetalle AND f.codemp = a.codemp AND d.id_tipodetalle = 'ARTIC' 
                LEFT JOIN soc_servicios s ON s.codser=d.coddetalle AND d.id_tipodetalle = 'SERVI' 
                LEFT JOIN cxc_conceptofac c ON c.codconfac=d.coddetalle AND d.id_tipodetalle = 'CONCE' 
                LEFT JOIN soc_tiposervicio ts ON s.codtipser=ts.codtipser LEFT JOIN siv_unidadmedida u ON u.codunimed = d.codunimed 
                LEFT JOIN siv_producto p ON p.codprod = a.codmil AND p.codemp = a.codemp LEFT JOIN siv_articuloalmacen aa ON aa.codart = a.codart 
            AND aa.codemp = a.codemp AND d.codalm = aa.codalm LEFT JOIN siv_almacen al ON al.codalm = aa.codalm AND al.codemp = aa.codemp 
                LEFT JOIN siv_articulo cont ON cont.codemp = cont.codemp AND cont.codart = a.codcontvac AND cont.contvacio = 1 
                LEFT JOIN siv_unidadmedida ucont ON ucont.codunimed = cont.codunimed LEFT JOIN siv_articuloalmacen aacont ON aacont.codart = a.codart 
            AND aacont.codemp = a.codemp AND al.codalm = aacont.codalm WHERE  d.codproceso='FACTURA' AND d.id_fact=$1 ORDER BY coddetalle;`,
            [id_fact] // ID del rol médico (ajusta según tu base de datos)
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener médicos:', err);
        res.status(500).json({ error: 'Error al obtener la lista de médicos' });
    }
});

app.post('/api/regFactura', async (req, res) => {
    const {
        id_fact,
        codemp,
        codproceso,
        numfact,
        codfact,
        numcont,
        id_cliente,
        id_transp,
        id_estfact,
        id_condpago,
        id_vend,
        codmon,
        tascam,
        tipopecont,
        codcaj,
        fecfact,
        fecvenc,
        porcdesc,
        montodesc,
        saldo,
        subtot,
        iva,
        otros,
        baseimp,
        total,
        descripfact,
        comentadifact,
        nummov,
        numorddes,
        codestpro1,
        codestpro2,
        codestpro3,
        codestpro4,
        codestpro5,
        estcla,
        devengado,
        cobrado,
        contabilizado,
        anulado,
        fecconta,
        feccob,
        fecanula,
        conanula,
        fecreg,
        usureg,
        horareg,
        fecmod,
        usumod,
        horamod,
        codunieje,
        codsuc,
        fecciecxc,
        cxchist,
        estdesp,
        id_cliente_doc,
        procefac,
        impresofac,
        gencomision,
        genpromocion,
        codsuccli,
        noafecfact
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO public.cxc_factura
                (id_fact, codemp, codproceso, numfact, codfact, numcont, id_cliente, id_transp, id_estfact, id_condpago, id_vend,
                codmon, tascam, tipopecont, codcaj, fecfact, fecvenc, porcdesc, montodesc, saldo, subtot, iva, otros, baseimp, total,
                descripfact, comentadifact, nummov, numorddes, codestpro1, codestpro2, codestpro3, codestpro4, codestpro5, estcla,
                devengado, cobrado, contabilizado, anulado, fecconta, feccob, fecanula, conanula, fecreg, usureg, horareg, fecmod,
                usumod, horamod, codunieje, codsuc, fecciecxc, cxchist, estdesp, id_cliente_doc, procefac, impresofac, gencomision,
                genpromocion, codsuccli, noafecfact)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
                $26, $27, $28, $29, $30, $31, $32, $33, $34, $35,
                $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47,
                $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61);`,
            [
                id_fact, codemp, codproceso, numfact, codfact, numcont, id_cliente, id_transp, id_estfact, id_condpago, id_vend,
                codmon, tascam, tipopecont, codcaj, fecfact, fecvenc, porcdesc, montodesc, saldo, subtot, iva, otros, baseimp, total,
                descripfact, comentadifact, nummov, numorddes, codestpro1, codestpro2, codestpro3, codestpro4, codestpro5, estcla,
                devengado, cobrado, contabilizado, anulado, fecconta, feccob, fecanula, conanula, fecreg, usureg, horareg, fecmod,
                usumod, horamod, codunieje, codsuc, fecciecxc, cxchist, estdesp, id_cliente_doc, procefac, impresofac, gencomision,
                genpromocion, codsuccli, noafecfact
            ]
        );
        res.status(201).json({
            success: true,
            message: "Consulta registrada exitosamente",
            data: result.rows[0]
        })
    } catch (err) {
        console.error('Error al obtener:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.post('/api/regCargos', async (req, res) => {
    const {
        codemp, id_fact, codproceso, codcar, formula, porcar, monbasimp, monimp, montot,
        scg_cuenta, spi_cuenta, codestpro1, codestpro2, codestpro3, codestpro4, codestpro5,
        estcla, id_doc
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO public.cxc_factura
                (id_fact, codemp, codproceso, numfact, codfact, numcont, id_cliente, id_transp, id_estfact, id_condpago, id_vend,
                codmon, tascam, tipopecont, codcaj, fecfact, fecvenc, porcdesc, montodesc, saldo, subtot, iva, otros, baseimp, total,
                descripfact, comentadifact, nummov, numorddes, codestpro1, codestpro2, codestpro3, codestpro4, codestpro5, estcla,
                devengado, cobrado, contabilizado, anulado, fecconta, feccob, fecanula, conanula, fecreg, usureg, horareg, fecmod,
                usumod, horamod, codunieje, codsuc, fecciecxc, cxchist, estdesp, id_cliente_doc, procefac, impresofac, gencomision,
                genpromocion, codsuccli, noafecfact)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
                $10, $11, $12, $13, $14, $15, $16, 
                $17, $18)`,
            [
                codemp, id_fact, codproceso, codcar, formula, porcar, monbasimp, monimp, montot,
                scg_cuenta, spi_cuenta, codestpro1, codestpro2, codestpro3, codestpro4, codestpro5,
                estcla, id_doc
            ]
        );
        res.status(201).json({
            success: true,
            message: "Consulta registrada exitosamente",
            data: result.rows[0]
        })
    } catch (err) {
        console.error('Error al obtener:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.post('/api/regComprobante', async (req, res) => {
    const {
        codemp, procede, comprobante, fecha, descripcion, tipo_comp, tipo_destino, cod_pro, 
        ced_bene, total, codban, ctaban, estrenfon, codfuefin, codusu
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO sigesp_cmp 
                (codemp, procede, comprobante, fecha, descripcion, tipo_comp, tipo_destino, cod_pro, ced_bene, total, codban, ctaban, estrenfon, codfuefin, codusu) 
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,
            [
                codemp, procede, comprobante, fecha, descripcion, tipo_comp, tipo_destino, cod_pro, ced_bene, total, codban, ctaban, estrenfon, codfuefin, codusu
            ]
        );
        res.status(201).json({
            success: true,
            message: "Consulta registrada exitosamente",
            data: result.rows[0]
        })
    } catch (err) {
        console.error('Error al obtener:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.post('/api/regAfectacion', async (req, res) => {
    const {
        codemp, procede, comprobante, fecha, spi_cuenta, procede_doc, documento, operacion,
        descripcion, monto, orden, codban, ctaban, estcla, codestpro1, codestpro2,
        codestpro3, codestpro4, codestpro5
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO spi_dt_cmp 
                (codemp, procede, comprobante, fecha, spi_cuenta, procede_doc, documento, operacion, 
                descripcion, monto, orden, codban, ctaban, estcla, codestpro1, codestpro2, 
                codestpro3, codestpro4, codestpro5) 
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, 
                $9, $10, $11, $12, $13, $14, $15, $16, 
                $17, $18, $19);`,
            [
                codemp, procede, comprobante, fecha, spi_cuenta, procede_doc, documento, operacion,
                descripcion, monto, orden, codban, ctaban, estcla, codestpro1, codestpro2,
                codestpro3, codestpro4, codestpro5
            ]
        );
        res.status(201).json({
            success: true,
            message: "Consulta registrada exitosamente",
            data: result.rows[0]
        })
    } catch (err) {
        console.error('Error al obtener:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.post('/api/regDetalleContable', async (req, res) => {
    const {
        codemp, procede, comprobante, fecha, sc_cuenta, procede_doc, documento, debhab,
        descripcion, monto, orden, codban, ctaban
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO scg_dt_cmp 
                (codemp, procede, comprobante, fecha, sc_cuenta, procede_doc, documento, debhab, 
                descripcion, monto, orden, codban, ctaban) 
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, 
                $9, $10, $11, $12, $13);`,
            [
                codemp, procede, comprobante, fecha, sc_cuenta, procede_doc, documento, debhab,
                descripcion, monto, orden, codban, ctaban
            ]
        );
        res.status(201).json({
            success: true,
            message: "Consulta registrada exitosamente",
            data: result.rows[0]
        })
    } catch (err) {
        console.error('Error al obtener:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Llamar la inicialización
initializeApp();