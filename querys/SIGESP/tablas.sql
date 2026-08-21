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
	numfact int4 NOT NULL,
	id_doc int4 NULL,
	codtipdoc varchar(10) NOT NULL,
	num_control varchar(25) NOT NULL,
	url_pdf text NOT NULL,
	fecreg timestamptz DEFAULT now() NOT NULL,
	codusu bpchar(30) NULL,
	CONSTRAINT api_integracion_documentos_cgi_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX idx_uniq_api_factura ON public.api_integracion_documentos_cgi USING btree (id_fact, codtipdoc, numfact) WHERE ((codtipdoc)::text = 'FACTURA'::text);
CREATE UNIQUE INDEX idx_uniq_api_nota_credito ON public.api_integracion_documentos_cgi USING btree (id_fact, codtipdoc, id_doc) WHERE ((codtipdoc)::text = 'NC'::text);


-- public.api_integracion_parametros definition

-- Drop table

-- DROP TABLE public.api_integracion_parametros;

CREATE TABLE public.api_integracion_parametros (
	codcar varchar(25) NOT NULL,
	cuenta_x_cobrar varchar(25) NOT NULL,
	cuenta_ingreso varchar(25) NOT NULL,
	cuenta_x_pagar_iva varchar(25) NOT NULL,
	cuenta_partida_ingreso varchar(25) NOT NULL
);


-- public.api_integracion_servicios definition

-- Drop table

-- DROP TABLE public.api_integracion_servicios;

CREATE TABLE public.api_integracion_servicios (
	servicio_id bigserial NOT NULL,
	coddetalle varchar(20) NOT NULL,
	nombre varchar(254) NOT NULL,
	codunimed varchar(4) NOT NULL,
	CONSTRAINT pk_api_integracion_servicios PRIMARY KEY (servicio_id, coddetalle, nombre, codunimed)
);