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
	-- porcdesc_detalle float8 DEFAULT 0 NULL,
	-- desc_detalle float8 DEFAULT 0 NULL,
	porciva float8 DEFAULT 0 NULL,							-- ????? % DEBE VENIR DE SISPVEN 
	iva_detalle float8 DEFAULT 0 NULL,						-- VIENE DE SISPVEN - f.iva::float AS iva_detalle,
	neto_detalle float8 DEFAULT 0 NULL,						-- VIENE DE SISPVEN - f.monto_total::float AS neto_detalle,
	-- otros_detalle float8 DEFAULT 0 NULL,
	-- coduniadm varchar(10) DEFAULT '----------'::bpchar NOT NULL,
	-- codestpro1 varchar(25) DEFAULT '-------------------------'::bpchar NOT NULL,
	-- codestpro2 varchar(25) DEFAULT '-------------------------'::bpchar NOT NULL,
	-- codestpro3 varchar(25) DEFAULT '-------------------------'::bpchar NOT NULL,
	-- codestpro4 varchar(25) DEFAULT '-------------------------'::bpchar NOT NULL,
	-- codestpro5 varchar(25) DEFAULT '-------------------------'::bpchar NOT NULL,
	-- estcla varchar(1) DEFAULT '-'::bpchar NOT NULL,
	-- codfuefin varchar(2) DEFAULT '--'::bpchar NOT NULL,
	-- comentario text NULL,
	-- cantidad_dev float8 DEFAULT 0 NULL,
	-- precio_dev float8 DEFAULT 0 NULL,
	-- porcdesc_dev float8 DEFAULT 0 NULL,
	-- desc_dev float8 DEFAULT 0 NULL,
	-- porciva_dev float8 DEFAULT 0 NULL,
	-- iva_dev float8 DEFAULT 0 NULL,
	-- neto_dev float8 DEFAULT 0 NULL,
	-- otros_dev float8 DEFAULT 0 NULL,
	-- comentdev text NULL,
	codproc varchar(3) DEFAULT 'FAC'::character varying NULL,	-- FIJO - FAC
	-- id_cotped int4 DEFAULT 0 NULL,
	-- renglon_cotped int4 DEFAULT 0 NULL,
	-- candet numeric(20, 4) DEFAULT 0 NULL,
	canmay numeric(20, 4) DEFAULT 0 NULL,						-- SIGESP CONTEO DE LA CANTIDAD DE ITEM DE LA FACTURA
	-- contauto int4 DEFAULT 0 NULL,
	precioneto_detalle float8 DEFAULT 0 NULL,					-- VIENE DE SISPVEN - (f.monto_total - f.iva)::float AS precioneto_detalle
	-- porcdescitem_detalle float8 DEFAULT 0 NULL,
	-- costprom float8 DEFAULT 0 NULL,
	-- precompra float8 DEFAULT 0 NULL,
	-- otroscost float8 DEFAULT 0 NULL,
	-- ultcosto float8 DEFAULT 0 NULL,
	-- descclia float8 DEFAULT 0 NULL,
	-- descclib float8 DEFAULT 0 NULL,
	-- descclic float8 DEFAULT 0 NULL,
	-- descclid float8 DEFAULT 0 NULL,
	-- prevena float8 DEFAULT 0 NULL,
	-- prevenb float8 DEFAULT 0 NULL,
	-- prevenc float8 DEFAULT 0 NULL,
	-- prevend float8 DEFAULT 0 NULL,
	-- preciocompraa float8 DEFAULT 0 NULL,
	-- preciocomprab float8 DEFAULT 0 NULL,
	-- preciocomprac float8 DEFAULT 0 NULL,
	-- preciocomprad float8 DEFAULT 0 NULL,
	-- cxcprecompa float8 DEFAULT 0 NULL,
	-- cxcprecompb float8 DEFAULT 0 NULL,
	-- cxcprecompc float8 DEFAULT 0 NULL,
	-- cxcprecompd float8 DEFAULT 0 NULL,
	-- cxcdesccosta float8 DEFAULT 0 NULL,
	-- cxcdesccostb float8 DEFAULT 0 NULL,
	-- cxcdesccostc float8 DEFAULT 0 NULL,
	-- cxcdesccostd float8 DEFAULT 0 NULL,
	-- cxcdescfacta float8 DEFAULT 0 NULL,
	-- cxcdescfactb float8 DEFAULT 0 NULL,
	-- cxcdescfactc float8 DEFAULT 0 NULL,
	-- cxcdescfactd float8 DEFAULT 0 NULL,
	-- canoritarser numeric(20, 4) DEFAULT 0 NULL
);