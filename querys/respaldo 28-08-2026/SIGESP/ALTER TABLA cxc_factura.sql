ALTER TABLE public.cxc_factura ADD api_modulo varchar DEFAULT 'SIGESP' NOT NULL;
COMMENT ON COLUMN public.cxc_factura.api_modulo IS '(Integracion) Indica de donde proviene la factura';

ALTER TABLE public.cxc_factura ADD api_id_fact_origen int4 NULL;
COMMENT ON COLUMN public.cxc_factura.api_id_fact_origen IS '(Integracion) Id de la factura en SISPVEN.';

ALTER TABLE public.cxc_factura ADD CONSTRAINT cxc_factura_unique UNIQUE (api_id_fact_origen);