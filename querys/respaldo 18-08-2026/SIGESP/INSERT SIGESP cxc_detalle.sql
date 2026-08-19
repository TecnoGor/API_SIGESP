CREATE TABLE public.cxc_detalle (
	id_fact int4 NOT NULL,									-- CORRELATIVO SIGESP	
	id_tipodetalle varchar(5) NOT NULL,						-- FIJO - SERVI
	codproceso varchar(10) NOT NULL,						-- FIJO - FACTURA
	renglon int4 NOT NULL,									-- CORRELATIVO SIGESP POR CADA ITEM DEL DETALLE
	coddetalle varchar(20) NOT NULL,						-- ID DEL SERVICIO -  VIENE DE SISPVEN DE LA TABLA DE INTERGARCION
	codunimed varchar(6) NOT NULL,							-- FIJO - 0002
	codalm varchar(10) NULL,								-- FIJO - 0000000000
	cantidad_detalle numeric(20, 4) DEFAULT 0 NULL,			-- SIGESP CONTEO DE LA CANTIDAD DE ITEM DE LA FACTURA
	precio_detalle float8 DEFAULT 0 NULL,					-- VIENE DE SISPVEN - (f.monto_total - f.iva)::float AS precio_detalle,
	porciva float8 DEFAULT 0 NULL,							-- ????? % DEBE VENIR DE SISPVEN 
	iva_detalle float8 DEFAULT 0 NULL,						-- VIENE DE SISPVEN - f.iva::float AS iva_detalle,
	neto_detalle float8 DEFAULT 0 NULL,						-- VIENE DE SISPVEN - f.monto_total::float AS neto_detalle,	
	codproc varchar(3) DEFAULT 'FAC'::character varying NULL,	-- FIJO - FAC	
	canmay numeric(20, 4) DEFAULT 0 NULL,						-- SIGESP CONTEO DE LA CANTIDAD DE ITEM DE LA FACTURA
	precioneto_detalle float8 DEFAULT 0 NULL,					-- VIENE DE SISPVEN - (f.monto_total - f.iva)::float AS precioneto_detalle
);