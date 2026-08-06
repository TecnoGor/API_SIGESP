create trigger trg_post_notas_credito_integracion_documentos_cgi after
insert
    on
    public.cxc_documento for each row execute procedure fn_api_trg_post_integracion_documentos();