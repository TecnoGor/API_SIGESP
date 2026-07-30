export interface IResponseNotaCreditoParcial {
    note_credit_number: string;
    invoice_number_affected: string;
    control_number: string;
    credit_note_pdf: string;  
    productos_acreditados_esta_nc: AcreditadosNC[];
    productos_disponibles_factura_original: DisponiblesFactura[];  
}

interface AcreditadosNC {    
    codigo: string,  
    descripcion: string,  
    cantidad_acreditada_esta_nc: number,  
    precio_unitario: number
}

interface DisponiblesFactura {    
    codigo: string,  
    descripcion: string, 
    cantidad_original: number,
    cantidad_acreditada_total: number,
    cantidad_disponible: number,
    precio_unitario: number
}