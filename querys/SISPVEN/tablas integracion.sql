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