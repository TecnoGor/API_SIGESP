ALALTER TABLE public.scg_dt_cmp ADD api_modulo varchar DEFAULT 'SIGESP' NOT NULL;
COMMENT ON COLUMN public.scg_dt_cmp.api_modulo IS '(Integracion) Indica de donde proviene la factura';

ALTER TABLE public.scg_dt_cmp ADD api_id_fact_origen int4 NULL;
COMMENT ON COLUMN public.scg_dt_cmp.api_id_fact_origen IS '(Integracion) Id de la factura en SISPVEN.';

ALTER TABLE public.scg_dt_cmp ADD CONSTRAINT scg_dt_cmp_unique UNIQUE (api_id_fact_origen);