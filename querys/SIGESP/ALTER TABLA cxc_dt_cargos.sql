ALTER TABLE public.cxc_dt_cargos ADD api_modulo varchar DEFAULT 'SIGESP' NOT NULL;
COMMENT ON COLUMN public.cxc_dt_cargos.api_modulo IS '(Integracion) Indica de donde proviene la factura';

ALTER TABLE public.cxc_dt_cargos ADD api_id_fact_origen int4 NULL;
COMMENT ON COLUMN public.cxc_dt_cargos.api_id_fact_origen IS '(Integracion) Id de la factura en SISPVEN.';