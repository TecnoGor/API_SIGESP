-- public.parametro definition

-- Drop table

-- DROP TABLE public.parametro;

CREATE TABLE public.parametro (
	parametro_id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	codigo_iso varchar(15) NOT NULL,
	nombre varchar(255) NOT NULL,
	valor float8 NOT NULL,
	activo bool DEFAULT true NOT NULL,
	fecha_cambio timestamp(0) NOT NULL,
	created_at timestamp(0) NULL,
	updated_at timestamp(0) NULL,
	CONSTRAINT parametro_pkey PRIMARY KEY (parametro_id),
	CONSTRAINT parametro_unique UNIQUE (codigo_iso)
);


-- public.parametros_historicos definition

-- Drop table

-- DROP TABLE public.parametros_historicos;

CREATE TABLE public.parametros_historicos (
	parametro_historico_id bigserial NOT NULL,
	parametro_id int8 NOT NULL,
	valor_anterior float8 NULL,
	valor_nuevo float8 NOT NULL,
	usuario_id int8 NULL,
	fecha_cambio timestamp(0) NOT NULL,
	created_at timestamp(0) NULL,
	updated_at timestamp(0) NULL,
	CONSTRAINT parametros_historicos_pkey PRIMARY KEY (parametro_historico_id),
	CONSTRAINT parametros_historicos_parametro_id_foreign FOREIGN KEY (parametro_id) REFERENCES public.parametro(parametro_id)
);
CREATE INDEX parametros_historicos_parametro_id_fecha_cambio_index ON public.parametros_historicos USING btree (parametro_id, fecha_cambio);