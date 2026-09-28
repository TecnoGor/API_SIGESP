// ? LISTA: 17-09-2026
export interface INotaCreditoDetalle {
    numfact: string;
    id_doc: number;
    coddoc: string;
    numdoc: number;
    id_fact: number;
    motivo?: string | null;
    coddetalle: string;
    cantidad_detdoc: number;
    descripcion: string;
    num_control?: string | null;
    estado?: "ERROR" | "ENVIADO" | "RECHAZADO" | null;
    observacion?: string | null;
}
