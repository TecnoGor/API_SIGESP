export interface IResponseIntegracion {
    id_fact: number;
    numfact: number;
    id_doc?: number | null;
    codtipdoc: string;
    api_id_fact_origen: number;
    status_sigesp: boolean;
    status_cgid: boolean;
    observacion?: string | null;
    control_number?: string | null;
    url_pdf?: string | null;
}