-- public.api_configuracion definition

-- Drop table

-- DROP TABLE public.api_configuracion;

CREATE TABLE public.api_configuracion (
	id_cliente text NOT NULL,
	"key" text NOT NULL,
	"token" text NULL,
	CONSTRAINT api_configuracion_pkey PRIMARY KEY (id_cliente),
	CONSTRAINT api_configuracion_unique UNIQUE (key)
);


-- public.api_configuracion_cgi definition

-- Drop table

-- DROP TABLE public.api_configuracion_cgi;

CREATE TABLE public.api_configuracion_cgi (
	id_cliente text NOT NULL,
	"key" text NOT NULL,
	aplicacion varchar(100) NOT NULL,
	activo bool DEFAULT false NULL,
	"token" text NULL,
	CONSTRAINT api_configuracion_cgi_pkey PRIMARY KEY (id_cliente),
	CONSTRAINT api_configuracion_cgi_unique UNIQUE (aplicacion)
);


-- public.api_integracion_documentos_cgi definition

-- Drop table

-- DROP TABLE public.api_integracion_documentos_cgi;

CREATE TABLE public.api_integracion_documentos_cgi (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	id_fact int4 NOT NULL,
	id_doc int4 NULL,
	numfact int4 NOT NULL,
	codtipdoc varchar(10) NOT NULL,
	num_control varchar(25) NULL,
	url_pdf text NULL,
	observacion text NULL,
	fecreg timestamptz DEFAULT now() NOT NULL,
	fecreg_cgi timestamptz NULL,
	CONSTRAINT api_integracion_documentos_cgi_pkey PRIMARY KEY (id)
);