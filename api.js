const express = require('express');
const fs = require('fs');
const { Pool } = require('pg');
// const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
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

app.get('/api/facturaDP/:id_fact', async (req, res) => {
    const { id_fact } = req.params;
    try {
        const result = await pool .query(
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