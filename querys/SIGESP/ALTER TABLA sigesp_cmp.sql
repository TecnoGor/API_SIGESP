ALTER TABLE public.sigesp_cmp ADD api_modulo varchar DEFAULT 'SIGESP' NOT NULL;
COMMENT ON COLUMN public.sigesp_cmp.api_modulo IS '(Integracion) Indica de donde proviene la factura';

ALTER TABLE public.sigesp_cmp ADD api_id_fact_origen int4 NULL;
COMMENT ON COLUMN public.sigesp_cmp.api_id_fact_origen IS '(Integracion) Id de la factura en SISPVEN.';

ALTER TABLE public.sigesp_cmp ADD CONSTRAINT sigesp_cmp_unique UNIQUE (api_id_fact_origen);