const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API SIGESP - Sistema Integrado de Gestión de Facturación',
            version: '1.0.0',
            description: 'API para gestión de facturas, notas de crédito, retenciones y contabilidad SIGESP. Integra con sistema CG (calidad.cgimprenta.digital) para procesamiento de facturación electrónica.',
            contact: {
                name: 'Equipo de Desarrollo',
                email: 'gerenciadesarrollo.ipostel@gmail.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Servidor de Desarrollo'
            }
        ],
        tags: [
            {
                name: 'Facturas',
                description: 'Endpoints para registro y procesamiento de facturas'
            },
            {
                name: 'Notas de Crédito',
                description: 'Endpoints para procesamiento de notas de crédito'
            },
            {
                name: 'Anulaciones',
                description: 'Endpoints para anulación de facturas en CG'
            },
            {
                name: 'Retenciones',
                description: 'Endpoints para registro y consulta de retenciones (ISLR e IVA)'
            },
            {
                name: 'Consultas',
                description: 'Endpoints para consulta de datos de facturas'
            },
            {
                name: 'CRUD Básico',
                description: 'Endpoints de registro directo de componentes contables'
            },
            {
                name: 'Sistema',
                description: 'Endpoints de utilidad y diagnóstico'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'Authorization',
                    description: 'Token de autenticación de la API externa CG (Bearer token)'
                }
            },
            schemas: {
                RegistrarFactura: {
                    type: 'object',
                    required: ['cod_cliente', 'fecha_factura', 'hora', 'subtot', 'iva', 'tot', 'base_imp', 'usuario'],
                    properties: {
                        cod_cliente: { type: 'string', description: 'Cédula/RIF del cliente', example: 'V12345678' },
                        fecha_factura: { type: 'string', format: 'date', description: 'Fecha (YYYY-MM-DD)', example: '2025-01-15' },
                        hora: { type: 'string', description: 'Hora (HH:MM:SS)', example: '14:30:00' },
                        subtot: { type: 'number', description: 'Subtotal', example: 1000.00 },
                        iva: { type: 'number', description: 'Monto IVA', example: 160.00 },
                        tot: { type: 'number', description: 'Total factura', example: 1160.00 },
                        base_imp: { type: 'number', description: 'Base imponible', example: 1000.00 },
                        usuario: { type: 'string', description: 'Usuario registra', example: 'admin' },
                        nombre_cliente: { type: 'string', description: 'Nombre cliente (requerido si no existe)', example: 'Empresa ABC C.A.' },
                        cliente_abvr: { type: 'string', description: 'Nombre abreviado', example: 'EMP ABC' },
                        direccion_cliente: { type: 'string', example: 'Av. Principal, Caracas' },
                        telefono_cliente: { type: 'string', example: '0212-1234567' },
                        email_cliente: { type: 'string', example: 'cliente@empresa.com' },
                        tipo_contribuyente: { type: 'string', enum: ['J', 'V', 'E'], description: 'J=Jurídico, V=Venezolano, E=Extranjero', example: 'J' },
                        porcentaje_iva: { type: 'number', description: 'Porcentaje IVA (16, 8, 31)', example: 16 },
                        cuenta_iva: { type: 'string', example: '2149901010002' },
                        cuenta_cobrar: { type: 'string', example: '1120301000001' },
                        cuenta_ingreso: { type: 'string', example: '304990100' },
                        partida_ingreso: { type: 'string', example: '304990100' },
                        descripcion_adicional: { type: 'string', example: 'Factura por servicios' },
                        cod_detalle: { type: 'string', example: '001' },
                        cantidad: { type: 'number', example: 1 },
                        precio_unitario: { type: 'number', example: 1000.00 },
                        descripcion_producto: { type: 'string', example: 'Servicio de consultoría' }
                    }
                },
                RegistrarFacturaResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Factura registrada exitosamente' },
                        data: {
                            type: 'object',
                            properties: {
                                factura: {
                                    type: 'object',
                                    properties: {
                                        id_fact: { type: 'integer', example: 1234 },
                                        id_doc: { type: 'integer', example: 5678 },
                                        codfact: { type: 'string', example: '000123' },
                                        numcont: { type: 'string', example: '25-0000001' },
                                        comprobante_sigesp: { type: 'string', example: 'F-1234-000123' },
                                        link_factura: { type: 'string', nullable: true }
                                    }
                                },
                                cliente: {
                                    type: 'object',
                                    properties: {
                                        id_cliente: { type: 'integer', example: 100 },
                                        nuevo: { type: 'boolean', example: false },
                                        cedula: { type: 'string', example: 'V12345678' }
                                    }
                                },
                                detalles: {
                                    type: 'object',
                                    properties: {
                                        monto_bruto: { type: 'number', example: 1000.00 },
                                        iva: { type: 'number', example: 160.00 },
                                        total: { type: 'number', example: 1160.00 },
                                        cantidad: { type: 'number', example: 1 },
                                        precio_unitario: { type: 'number', example: 1000.00 }
                                    }
                                }
                            }
                        }
                    }
                },
                AnularFactura: {
                    type: 'object',
                    required: ['numero_factura'],
                    properties: {
                        numero_factura: { type: 'string', description: 'Número factura en CG', example: '000123' },
                        id_fact_local: { type: 'integer', description: 'ID local para actualizar estado', example: 1234 }
                    }
                },
                ProcesarNotaCreditoParcial: {
                    type: 'object',
                    required: ['numfactura', 'id_doc'],
                    properties: {
                        numfactura: { type: 'string', description: 'Número de factura a afectar', example: '000123' },
                        id_doc: { type: 'string', description: 'ID documento nota de crédito', example: '5678' }
                    }
                },
                RegFactura: {
                    type: 'object',
                    required: ['id_fact', 'codemp', 'codproceso', 'numfact', 'fecfact', 'id_cliente'],
                    properties: {
                        id_fact: { type: 'integer', example: 1234 },
                        codemp: { type: 'string', example: '0001' },
                        codproceso: { type: 'string', example: 'FACTURA' },
                        numfact: { type: 'string', example: '000123' },
                        codfact: { type: 'string', example: '000123' },
                        numcont: { type: 'string', example: '25-0000001' },
                        id_cliente: { type: 'integer', example: 100 },
                        id_transp: { type: 'string', example: '10' },
                        id_estfact: { type: 'string', example: '4' },
                        id_condpago: { type: 'string', example: '7' },
                        id_vend: { type: 'string', example: '1' },
                        codmon: { type: 'string', example: '001' },
                        tascam: { type: 'string', example: '1' },
                        tipopecont: { type: 'string', example: 'DEV' },
                        codcaj: { type: 'string', example: '0001' },
                        fecfact: { type: 'string', format: 'date', example: '2025-01-15' },
                        fecvenc: { type: 'string', format: 'date', example: '2025-02-15' },
                        porcdesc: { type: 'string', example: '0' },
                        montodesc: { type: 'string', example: '0' },
                        saldo: { type: 'string', example: '0' },
                        subtot: { type: 'string', example: '1000' },
                        iva: { type: 'string', example: '160' },
                        otros: { type: 'string', example: '0' },
                        baseimp: { type: 'string', example: '1000' },
                        total: { type: 'string', example: '1160' },
                        descripfact: { type: 'string', example: '' },
                        comentadifact: { type: 'string', example: '' },
                        nummov: { type: 'string', example: '' },
                        numorddes: { type: 'string', example: '' },
                        codestpro1: { type: 'string', example: '-------------------------' },
                        codestpro2: { type: 'string', example: '-------------------------' },
                        codestpro3: { type: 'string', example: '-------------------------' },
                        codestpro4: { type: 'string', example: '-------------------------' },
                        codestpro5: { type: 'string', example: '-------------------------' },
                        estcla: { type: 'string', example: '-' },
                        devengado: { type: 'string', example: '1' },
                        cobrado: { type: 'string', example: '1' },
                        contabilizado: { type: 'string', example: '0' },
                        anulado: { type: 'string', example: '0' },
                        fecconta: { type: 'string', format: 'date', nullable: true },
                        feccob: { type: 'string', format: 'date', nullable: true },
                        fecanula: { type: 'string', format: 'date', nullable: true },
                        conanula: { type: 'string', nullable: true },
                        fecreg: { type: 'string', format: 'date', example: '2025-01-15' },
                        usureg: { type: 'string', example: 'SIGESP' },
                        horareg: { type: 'string', example: '14:30:00' },
                        fecmod: { type: 'string', format: 'date', nullable: true },
                        usumod: { type: 'string', nullable: true },
                        horamod: { type: 'string', nullable: true },
                        codunieje: { type: 'string', example: '----------' },
                        codsuc: { type: 'string', example: '0001' },
                        fecciecxc: { type: 'string', format: 'date', example: '2025-01-15' },
                        cxchist: { type: 'string', example: '0' },
                        estdesp: { type: 'string', example: 'PEND' },
                        id_cliente_doc: { type: 'string', example: '0' },
                        procefac: { type: 'string', example: 'CXCFAC' },
                        impresofac: { type: 'string', example: '0' },
                        gencomision: { type: 'string', example: '0' },
                        genpromocion: { type: 'string', example: '0' },
                        codsuccli: { type: 'string', example: '' },
                        noafecfact: { type: 'string', example: '0' }
                    }
                },
                RegCargos: {
                    type: 'object',
                    properties: {
                        codemp: { type: 'string', example: '0001' },
                        id_fact: { type: 'integer', example: 1234 },
                        codproceso: { type: 'string', example: 'FACTURA' },
                        codcar: { type: 'string', example: '00079' },
                        formula: { type: 'string', example: '$LD_MONTO*0.16' },
                        porcar: { type: 'number', example: 16 },
                        monbasimp: { type: 'number', example: 1000 },
                        monimp: { type: 'number', example: 160 },
                        montot: { type: 'number', example: 1160 },
                        scg_cuenta: { type: 'string', example: '2149901010002' },
                        spi_cuenta: { type: 'string', example: '' },
                        codestpro1: { type: 'string', example: '-------------------------' },
                        codestpro2: { type: 'string', example: '-------------------------' },
                        codestpro3: { type: 'string', example: '-------------------------' },
                        codestpro4: { type: 'string', example: '-------------------------' },
                        codestpro5: { type: 'string', example: '-------------------------' },
                        estcla: { type: 'string', example: '-' },
                        id_doc: { type: 'integer', example: 0 }
                    }
                },
                RegComprobante: {
                    type: 'object',
                    properties: {
                        codemp: { type: 'string', example: '0001' },
                        procede: { type: 'string', example: 'CXCFAC' },
                        comprobante: { type: 'string', example: 'F-1234-000123' },
                        fecha: { type: 'string', format: 'date', example: '2025-01-15' },
                        descripcion: { type: 'string', example: 'FACTURA N 1234' },
                        tipo_comp: { type: 'integer', example: 1 },
                        tipo_destino: { type: 'string', example: 'B' },
                        cod_pro: { type: 'string', example: '----------' },
                        ced_bene: { type: 'string', example: 'J404864717' },
                        total: { type: 'number', example: 1160 },
                        codban: { type: 'string', example: '0' },
                        ctaban: { type: 'string', example: '---' },
                        estrenfon: { type: 'string', example: '-------------------------' },
                        codfuefin: { type: 'string', example: '0' },
                        codusu: { type: 'string', example: 'SIGESP' }
                    }
                },
                RegAfectacion: {
                    type: 'object',
                    properties: {
                        codemp: { type: 'string', example: '0001' },
                        procede: { type: 'string', example: 'CXCFAC' },
                        comprobante: { type: 'string', example: 'F-1234-000123' },
                        fecha: { type: 'string', format: 'date', example: '2025-01-15' },
                        spi_cuenta: { type: 'string', example: '304990100' },
                        procede_doc: { type: 'string', example: 'CXCFAC' },
                        documento: { type: 'string', example: 'F-1234-000123' },
                        operacion: { type: 'string', example: 'DEV' },
                        descripcion: { type: 'string', example: 'FACTURA N 1234' },
                        monto: { type: 'number', example: 1000 },
                        orden: { type: 'integer', example: 1 },
                        codban: { type: 'string', example: '---' },
                        ctaban: { type: 'string', example: '-------------------------' },
                        estcla: { type: 'string', example: '-' },
                        codestpro1: { type: 'string', example: '-------------------------' },
                        codestpro2: { type: 'string', example: '-------------------------' },
                        codestpro3: { type: 'string', example: '-------------------------' },
                        codestpro4: { type: 'string', example: '-------------------------' },
                        codestpro5: { type: 'string', example: '-------------------------' }
                    }
                },
                RegDetalleContable: {
                    type: 'object',
                    properties: {
                        codemp: { type: 'string', example: '0001' },
                        procede: { type: 'string', example: 'CXCFAC' },
                        comprobante: { type: 'string', example: 'F-1234-000123' },
                        fecha: { type: 'string', format: 'date', example: '2025-01-15' },
                        sc_cuenta: { type: 'string', example: '1120301000001' },
                        procede_doc: { type: 'string', example: 'CXCFAC' },
                        documento: { type: 'string', example: 'F-1234-000123' },
                        debhab: { type: 'string', enum: ['D', 'H'], description: 'D=Debito, H=Credito', example: 'D' },
                        descripcion: { type: 'string', example: 'FACTURA N 1234' },
                        monto: { type: 'number', example: 1160 },
                        orden: { type: 'integer', example: 0 },
                        codban: { type: 'string', example: '---' },
                        ctaban: { type: 'string', example: '-------------------------' }
                    }
                },
                RetencionISLR: {
                    type: 'object',
                    required: ['documentoIdentidadCliente', 'nombreRazonSocialCliente', 'correoCliente', 'direccionCliente', 'telefonoCliente', 'numeroDocumento', 'numeroControl', 'fecha', 'conceptoPago', 'montoDocumento', 'baseRetencion', 'porcentaje', 'montoRetenido', 'codigoRetencionIslr'],
                    properties: {
                        documentoIdentidadCliente: { type: 'string', description: 'RIF/Cédula formato V882759467', example: 'V12345678' },
                        nombreRazonSocialCliente: { type: 'string', example: 'Empresa ABC C.A.' },
                        correoCliente: { type: 'string', example: 'cliente@empresa.com' },
                        direccionCliente: { type: 'string', example: 'Av. Principal, Caracas' },
                        telefonoCliente: { type: 'string', example: '0212-1234567' },
                        numeroDocumento: { type: 'string', description: 'Número del documento', example: '000001' },
                        numeroControl: { type: 'string', description: 'Número de control', example: '00-00000001' },
                        fecha: { type: 'string', format: 'date', example: '2025-01-15' },
                        codigo: { type: 'string', description: 'Código de retención', example: '01' },
                        conceptoPago: { type: 'string', description: 'Concepto del pago', example: 'Servicios profesionales' },
                        montoDocumento: { type: 'number', description: 'Monto total del documento', example: 1160.00 },
                        baseRetencion: { type: 'number', description: 'Base imponible para retención', example: 1000.00 },
                        sustraendo: { type: 'number', description: 'Sustraendo', example: 0 },
                        porcentaje: { type: 'number', description: 'Porcentaje de retención', example: 34 },
                        montoRetenido: { type: 'number', description: 'Monto retenido', example: 340.00 },
                        codigoRetencionIslr: { type: 'string', description: 'Código de retención ISLR', example: '01' }
                    }
                },
                RetencionIVA: {
                    type: 'object',
                    required: ['documentoIdentidadCliente', 'nombreRazonSocialCliente', 'correoCliente', 'direccionCliente', 'telefonoCliente', 'fechaDeFactura', 'numeroFactura', 'numeroControl', 'totalDeCompraIncluyendoIva', 'baseImponible', 'porcentaje_iva', 'porcentaje'],
                    properties: {
                        documentoIdentidadCliente: { type: 'string', description: 'RIF/Cédula formato V882759467', example: 'V12345678' },
                        nombreRazonSocialCliente: { type: 'string', example: 'Empresa ABC C.A.' },
                        correoCliente: { type: 'string', example: 'cliente@empresa.com' },
                        direccionCliente: { type: 'string', example: 'Av. Principal, Caracas' },
                        telefonoCliente: { type: 'string', example: '0212-1234567' },
                        fechaDeFactura: { type: 'string', format: 'date', description: 'Fecha de la factura', example: '2025-01-15' },
                        numeroFactura: { type: 'string', description: 'Número de factura', example: '000123' },
                        numeroControl: { type: 'string', description: 'Número de control', example: '00-00000001' },
                        numeroNotaDeCredito: { type: 'string', description: 'Número nota de crédito (opcional)', example: '' },
                        numeroNotaDeDebito: { type: 'string', description: 'Número nota de débito (opcional)', example: '' },
                        numeroFacturaAfectada: { type: 'string', description: 'Factura afectada (opcional)', example: '' },
                        totalDeCompraIncluyendoIva: { type: 'number', description: 'Total compra incluyendo IVA', example: 1160.00 },
                        compraSinDerechoACreditoFiscal: { type: 'number', description: 'Compra sin derecho a crédito fiscal', example: 0 },
                        baseImponible: { type: 'number', description: 'Base imponible', example: 1000.00 },
                        porcentaje_iva: { type: 'number', description: 'Porcentaje IVA', example: 16 },
                        porcentaje: { type: 'number', description: 'Porcentaje de retención', example: 100 }
                    }
                },
                AnularRetencion: {
                    type: 'object',
                    required: ['numero_comprobante', 'numero_control', 'tipo_documento'],
                    properties: {
                        numero_comprobante: { type: 'string', description: 'Número del comprobante de retención', example: '000001' },
                        numero_control: { type: 'string', description: 'Número de control', example: '00-00000001' },
                        tipo_documento: { type: 'string', description: 'Tipo de documento (ISLR o IVA)', example: 'ISLR' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string' },
                        detalle: { type: 'string' }
                    }
                }
            }
        }
    },
    apis: ['./api.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
