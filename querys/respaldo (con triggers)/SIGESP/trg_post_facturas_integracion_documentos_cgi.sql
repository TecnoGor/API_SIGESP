create trigger trg_post_facturas_integracion_documentos_cgi after
insert
    on
    public.cxc_factura for each row execute procedure fn_api_trg_post_integracion_documentos();