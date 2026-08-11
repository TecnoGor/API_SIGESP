ALTER TABLE public.facturaciones ADD enviado_sigesp int4 DEFAULT 0 NOT NULL;
ALTER TABLE public.facturaciones ALTER COLUMN enviado_sigesp SET STORAGE PLAIN;