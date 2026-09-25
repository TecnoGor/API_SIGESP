export interface IFacturaDetalle {
    numfact: string;
    coddetalle: string;
    nombreProducto: string;
    descripcionProducto: string;
    tipoImpuesto: string;
    cantidadAdquirida: number;
    precioProducto: string;
    numpririf: string;
    nombre_cliente: string;
    emailcliente: string;
    dircliente: string;
    telcliente: string;   
    tasa_del_dia?: string | null;
    fecha_tasa?: string | null;
    num_control?: string | null;
    estado?: "PENDIENTE" | "ENVIADO" | "RECHAZADO" | null;
    observacion?: string | null;
}