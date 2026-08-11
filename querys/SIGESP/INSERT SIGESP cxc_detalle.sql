CREATE TABLE public.cxc_detalle (
	id_fact 					int4 NOT NULL,						-- CORRELATIVO
	-- id_tipodetalle 			varchar(5) NOT NULL,			-- SERVI
	-- codproceso 				varchar(10) NOT NULL,			-- FACTURA
	renglon 					int4 NOT NULL,						-- CORRELATIVO DEPENDE DE LA CANTIDAD DE ITEM EN LA FACTURA
	coddetalle 					varchar(20) NOT NULL,				-- buscar el nombre del servicio en SIGESP si no existe crear
	-- codunimed 				varchar(6) NOT NULL,			-- 0002
	-- cantidad_detalle 		numeric(20, 4) DEFAULT 0 NULL,	-- 1 
	-- precio_detalle 			float8 DEFAULT 0 NULL,			-- VIENE DE SISPVEN misma informacion del encabezado
	-- porciva 					float8 DEFAULT 0 NULL,				-- ?????
	-- iva_detalle 				float8 DEFAULT 0 NULL,				-- VIENE DE SISPVEN misma informacion del encabezado
	-- neto_detalle 			float8 DEFAULT 0 NULL,			-- VIENE DE SISPVEN misma informacion del encabezado	
	-- canmay 					numeric(20, 4) DEFAULT 0 NULL,	-- 1
	-- precioneto_detalle 		float8 DEFAULT 0 NULL,			-- VIENE DE SISPVEN misma informacion del encabezado
);