ALTER TABLE public.cxc_documento ADD api_modulo varchar DEFAULT 'SIGESP' NOT NULL;
COMMENT ON COLUMN public.cxc_documento.api_modulo IS '(Integracion) Indica de donde proviene la nota de credito';

ALTER TABLE public.cxc_documento ADD api_id_doc_origen int4 NULL;
COMMENT ON COLUMN public.cxc_documento.api_id_doc_origen IS '(Integracion) Id de la nota de credito en SISPVEN.';