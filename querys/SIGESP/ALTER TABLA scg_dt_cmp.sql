ALTER TABLE public.scg_dt_cmp ADD api_modulo varchar DEFAULT 'SIGESP' NOT NULL;
COMMENT ON COLUMN public.scg_dt_cmp.api_modulo IS '(Integracion) Indica de donde proviene el asiento';