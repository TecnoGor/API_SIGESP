// ? VERIFICADA - 27-07-2026
export interface IRequestIntegracionFactura {
    cliente: ClienteDTO;
    factura: FacturaDTO;
    detalle: DetalleFacturaDTO[];
}

export interface ClienteDTO {
    rif: string;
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
}

export interface FacturaDTO {
    id_factura: number;
    sub_total: number;
    base_imp: number;
    iva: number;
    total: number;
    descripcion?: string;
    fecha_fact: string;
}

export interface DetalleFacturaDTO {
    id_detalle: number;
    renglon: number;
    id_servicio: number;
    precio: number;
    cantidad: number;
    porc_iva: number;
    iva_detalle: number;
    total_detalle: number;
    comentario?: string;
}