import pkgjson from "../../package.json" with { type: "json" };

// ? Especificación OpenAPI 3.0 - Solo endpoints ACTIVOS (marcados "? LISTA" en las rutas)
// ? Los endpoints comentados ("! NO APLICA") NO se incluyen en la documentación.

const openApiSpec = {
    openapi: "3.0.3",
    info: {
        title: `${pkgjson.name} - Documentación`,
        version: pkgjson.version,
        description:
            "API REST de integración con SIGESP para la generación de documentos fiscales " +
            "(facturas, notas de crédito y retenciones) y carga en contingencia.\n\n" +
            "**Autenticación:** Los endpoints de generación de documentos requieren un Bearer JWT " +
            "obtenido previamente en `POST /auth/token`.\n\n" +
            "> Solo se documentan los endpoints activos en producción.",
        "x-Autor": pkgjson.author,
    },
    servers: [
        {
            url: "/api",
            description: "Ruta base de la API",
        },
    ],
    tags: [
        { name: "Auth", description: "Autenticación y obtención de token de acceso" },
        { name: "Factura", description: "Emisión de facturas electrónicas" },
        { name: "Nota de Crédito", description: "Emisión de notas de crédito (total y parcial)" },
        { name: "Retención", description: "Emisión de retenciones ISLR e IVA" },
        { name: "Contingencia", description: "Carga de datos en modo contingencia (Administrador)" },
    ],
    paths: {
        "/auth/token": {
            post: {
                tags: ["Auth"],
                summary: "Obtener token de acceso",
                description:
                    "Valida las credenciales del cliente (`id_cliente` + `key`) y devuelve un Bearer Token JWT " +
                    "con vigencia de 1 hora, necesario para consumir los endpoints de documentos fiscales.\n\n" +
                    "**Rate limit:** máximo 15 peticiones por minuto por IP.",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SolicitudToken" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Token de acceso generado",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RespuestaToken" },
                            },
                        },
                    },
                    "400": {
                        description: "Cuerpo inválido: campos faltantes, tipos incorrectos o JSON malformado",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                                example: {
                                    error: true,
                                    status: 400,
                                    message: "El campo [id_cliente] es requerido.",
                                    path: "/api/auth/token",
                                    method: "POST",
                                    location: "middleware:valPostBodyAuth",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Credenciales incorrectas",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                                example: {
                                    error: true,
                                    status: 401,
                                    message: "Acceso Denegado. Credenciales Incorrectas",
                                    path: "/api/auth/token",
                                    method: "POST",
                                    location: "service:postTokenService",
                                },
                            },
                        },
                    },
                    "429": {
                        description: "Demasiados intentos desde la misma IP (rate limit 15 req/min)",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Error interno del servidor",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/factura/{id_fact}": {
            post: {
                tags: ["Factura"],
                summary: "Emitir factura electrónica",
                description:
                    "Genera la factura fiscal correspondiente a la factura interna indicada y la envía a la imprenta digital. " +
                    "Devuelve el número de factura, número de control y el PDF.",
                parameters: [
                    { $ref: "#/components/parameters/IdFact" },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SolicitudCodigoUsuario" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Factura creada correctamente",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RespuestaFactura" },
                            },
                        },
                    },
                    "400": {
                        description: "Validación fallida: parámetro o cuerpo inválido",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Token ausente, inválido o expirado",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                                example: {
                                    error: true,
                                    status: 401,
                                    message: "El token de acceso ha caducado",
                                    path: "/api/factura/1",
                                    method: "POST",
                                    location: "middleware:verificaToken",
                                },
                            },
                        },
                    },
                    "404": {
                        description: "Documento no encontrado",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "409": {
                        description: "El documento ya fue enviado exitosamente a la imprenta digital",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Error interno del servidor",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/nota-credito/{id_doc}": {
            post: {
                tags: ["Nota de Crédito"],
                summary: "Emitir nota de crédito total",
                description:
                    "Genera una nota de crédito por el total del documento indicado y la envía a la imprenta digital.",
                parameters: [
                    { $ref: "#/components/parameters/IdDoc" },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SolicitudCodigoUsuario" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Nota de crédito creada correctamente",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RespuestaNotaCredito" },
                            },
                        },
                    },
                    "400": {
                        description: "Validación fallida: parámetro o cuerpo inválido",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Token ausente, inválido o expirado",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "409": {
                        description: "El documento ya fue enviado exitosamente a la imprenta digital",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Error interno del servidor",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/nota-credito/parcial/{id_doc}": {
            post: {
                tags: ["Nota de Crédito"],
                summary: "Emitir nota de crédito parcial",
                description:
                    "Genera una nota de crédito parcial por los totales indicados en el documento fuente y la envía a la imprenta digital.",
                parameters: [
                    { $ref: "#/components/parameters/IdDoc" },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SolicitudCodigoUsuario" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Nota de crédito parcial creada correctamente",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RespuestaNotaCreditoParcial" },
                            },
                        },
                    },
                    "400": {
                        description: "Validación fallida: parámetro o cuerpo inválido",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Token ausente, inválido o expirado",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "409": {
                        description: "El documento ya fue enviado exitosamente a la imprenta digital",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Error interno del servidor",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/retencion/isrl/{numcom}": {
            post: {
                tags: ["Retención"],
                summary: "Emitir retención ISLR",
                description:
                    "Genera la retención de Impuesto Sobre la Renta correspondiente al comprobante indicado y la envía a la imprenta digital.",
                parameters: [
                    { $ref: "#/components/parameters/NumCom" },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SolicitudCodigoUsuario" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Retención creada correctamente",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RespuestaRetencion" },
                            },
                        },
                    },
                    "400": {
                        description: "Validación fallida: parámetro o cuerpo inválido",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Token ausente, inválido o expirado",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "409": {
                        description: "El documento ya fue enviado exitosamente a la imprenta digital",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Error interno del servidor",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/retencion/iva/{numcom}": {
            post: {
                tags: ["Retención"],
                summary: "Emitir retención de IVA",
                description:
                    "Genera la retención de IVA correspondiente al comprobante indicado y la envía a la imprenta digital.",
                parameters: [
                    { $ref: "#/components/parameters/NumCom" },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SolicitudCodigoUsuario" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Retención creada correctamente",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RespuestaRetencion" },
                            },
                        },
                    },
                    "400": {
                        description: "Validación fallida: parámetro o cuerpo inválido",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Token ausente, inválido o expirado",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "409": {
                        description: "El documento ya fue enviado exitosamente a la imprenta digital",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Error interno del servidor",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/contingencia/carga-documentos-enviados": {
            post: {
                tags: ["Contingencia"],
                summary: "Cargar documentos enviados",
                description:
                    "Carga en lote los documentos fiscales enviados a la imprenta digital (modo contingencia). " +
                    "No requiere token, solo `codigo_usuario`.",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SolicitudCodigoUsuario" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Documentos cargados correctamente",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RespuestaContingencia" },
                                example: {
                                    error: false,
                                    status: 201,
                                    message: "Se cargaron los documentos fiscales correctamente",
                                    data: null,
                                    pagination: null,
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Validación fallida del cuerpo",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Error interno del servidor",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/contingencia/carga-codigos-retencion-islr": {
            post: {
                tags: ["Contingencia"],
                summary: "Cargar códigos de retención ISLR",
                description:
                    "Carga en lote los códigos de retención de ISLR (modo contingencia). " +
                    "No requiere token, solo `codigo_usuario`.",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SolicitudCodigoUsuario" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Códigos cargados correctamente",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RespuestaContingencia" },
                                example: {
                                    error: false,
                                    status: 201,
                                    message: "Se cargaron los codigos de retencion de islr correctamente",
                                    data: null,
                                    pagination: null,
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Validación fallida del cuerpo",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Error interno del servidor",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Token JWT obtenido en `POST /auth/token`",
            },
        },
        parameters: {
            IdFact: {
                name: "id_fact",
                in: "path",
                required: true,
                description: "Identificador numérico de la factura (entero mayor a 0)",
                schema: {
                    type: "integer",
                    minimum: 1,
                },
                example: 12345,
            },
            IdDoc: {
                name: "id_doc",
                in: "path",
                required: true,
                description: "Identificador numérico del documento (entero mayor a 0)",
                schema: {
                    type: "integer",
                    minimum: 1,
                },
                example: 12345,
            },
            NumCom: {
                name: "numcom",
                in: "path",
                required: true,
                description: "Número de comprobante (string, máximo 15 caracteres)",
                schema: {
                    type: "string",
                    maxLength: 15,
                },
                example: "000012345678901",
            },
        },
        schemas: {
            SolicitudToken: {
                type: "object",
                description: "Credenciales del cliente",
                additionalProperties: false,
                required: ["id_cliente", "key"],
                properties: {
                    id_cliente: {
                        type: "string",
                        maxLength: 250,
                        description: "Identificador del cliente",
                        example: "cliente-prueba",
                    },
                    key: {
                        type: "string",
                        description: "Clave secreta del cliente",
                        example: "secreto123",
                    },
                },
            },
            SolicitudCodigoUsuario: {
                type: "object",
                description: "Cuerpo estándar para la emisión de documentos y contingencia",
                additionalProperties: false,
                required: ["codigo_usuario"],
                properties: {
                    codigo_usuario: {
                        type: "string",
                        maxLength: 60,
                        description: "Código del usuario que procesa la solicitud",
                        example: "USR001",
                    },
                },
            },
            RespuestaToken: {
                type: "object",
                properties: {
                    error: { type: "boolean", example: false },
                    status: { type: "integer", example: 200 },
                    message: { type: "string", example: "Token de Acceso" },
                    data: {
                        type: "string",
                        description: "Bearer Token JWT (vigencia de 1 hora)",
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    },
                    pagination: { nullable: true },
                },
            },
            RespuestaFactura: {
                type: "object",
                properties: {
                    error: { type: "boolean", example: false },
                    status: { type: "integer", example: 201 },
                    message: { type: "string", example: "Factura creada correctamente" },
                    data: { $ref: "#/components/schemas/DatosFactura" },
                    pagination: { nullable: true },
                },
            },
            DatosFactura: {
                type: "object",
                properties: {
                    invoice_number: { type: "string", example: "00-00001234" },
                    control_number: { type: "string", example: "00-00001234" },
                    invoice_pdf: {
                        type: "string",
                        description: "Ruta o URL del PDF de la factura",
                        example: "/documentos/factura_1234.pdf",
                    },
                },
            },
            RespuestaNotaCredito: {
                type: "object",
                properties: {
                    error: { type: "boolean", example: false },
                    status: { type: "integer", example: 201 },
                    message: { type: "string", example: "Nota de Crédito creada correctamente" },
                    data: { $ref: "#/components/schemas/DatosNotaCredito" },
                    pagination: { nullable: true },
                },
            },
            DatosNotaCredito: {
                type: "object",
                properties: {
                    invoice_number_affected: {
                        type: "string",
                        description: "Número de la factura afectada",
                        example: "00-00001234",
                    },
                    control_number: { type: "string", example: "00-00001234" },
                    credit_note_pdf: {
                        type: "string",
                        description: "Ruta o URL del PDF de la nota de crédito",
                        example: "/documentos/nota_credito_1234.pdf",
                    },
                },
            },
            RespuestaNotaCreditoParcial: {
                type: "object",
                properties: {
                    error: { type: "boolean", example: false },
                    status: { type: "integer", example: 201 },
                    message: { type: "string", example: "Nota de Crédito Parcial creada correctamente" },
                    data: { $ref: "#/components/schemas/DatosNotaCreditoParcial" },
                    pagination: { nullable: true },
                },
            },
            DatosNotaCreditoParcial: {
                type: "object",
                properties: {
                    note_credit_number: {
                        type: "string",
                        description: "Número de la nota de crédito",
                        example: "00-00001234",
                    },
                    invoice_number_affected: {
                        type: "string",
                        description: "Número de la factura afectada",
                        example: "00-00001234",
                    },
                    control_number: { type: "string", example: "00-00001234" },
                    credit_note_pdf: {
                        type: "string",
                        description: "Ruta o URL del PDF de la nota de crédito",
                        example: "/documentos/nota_credito_parcial_1234.pdf",
                    },
                },
            },
            RespuestaRetencion: {
                type: "object",
                properties: {
                    error: { type: "boolean", example: false },
                    status: { type: "integer", example: 201 },
                    message: { type: "string", example: "Retención creada correctamente" },
                    data: { $ref: "#/components/schemas/DatosRetencion" },
                    pagination: { nullable: true },
                },
            },
            DatosRetencion: {
                type: "object",
                properties: {
                    control_number: { type: "string", example: "00-00001234" },
                    retention_pdf: {
                        type: "string",
                        description: "Ruta o URL del PDF del comprobante de retención",
                        example: "/documentos/retencion_1234.pdf",
                    },
                },
            },
            RespuestaContingencia: {
                type: "object",
                properties: {
                    error: { type: "boolean", example: false },
                    status: { type: "integer", example: 201 },
                    message: { type: "string", example: "Se cargaron los documentos fiscales correctamente" },
                    data: { nullable: true },
                    pagination: { nullable: true },
                },
            },
            Error: {
                type: "object",
                description: "Respuesta de error estandarizada",
                properties: {
                    error: { type: "boolean", example: true },
                    status: { type: "integer", example: 400 },
                    message: { type: "string", example: "Descripción del error" },
                    path: { type: "string", example: "/api/factura/1" },
                    method: { type: "string", example: "POST" },
                    location: {
                        type: "string",
                        description: "Origen del error (oculto en producción para errores 500)",
                        example: "middleware:valPathParamIdFact",
                    },
                },
            },
        },
    },
};

export default openApiSpec;
