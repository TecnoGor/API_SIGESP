export interface IKeyRedis {
    estatusEnvioRedis: number;
    id_fact?: number | null;
    numfact?: number | null;
    id_doc?: number | null;
    numcom?: string | null;
    numsol?: string | null;
    codtipdoc: string;
    estado: "ERROR" | "ENVIADO" | "RECHAZADO";
    num_control?: string | null;
    url_pdf?: string | null;
    observacion: string;
    codusu: string;
    api_modulo: string;
    api_id_origen?: number | null;
}
