CREATE TABLE public.cxc_factura (
	id_fact 		serial4 NOT NULL,			-- CORRELATIVO	
	-- codproceso 	varchar(10) NOT NULL,		-- FACTURA
	numfact 		int4 NOT NULL,				-- CORRELATIVO
	codfact 		varchar(25) NOT NULL,		-- CORRELATIVO
	numcont 		varchar(25) NOT NULL,		-- CORRELATIVO
	id_cliente 		int4 NOT NULL,				-- CLIENTE INSERTADO O BUSCADO PREVIAMENTE 
	-- id_transp 	int4 NOT NULL,				-- 10
	-- id_estfact 	int4 NOT NULL,				-- 4
	-- id_condpago 	int4 NOT NULL,				-- 7
	-- id_vend 		int4 	NOT NULL,			-- 1
	-- codmon 		varchar(4) NULL,			-- 001
	-- tascam 		float8 DEFAULT 				-- 1
	-- tipopecont 	varchar(3) NOT NULL,		-- DEV
	-- codcaj 		varchar(25) NOT NULL,		-- 0001
	-- fecfact 		date NULL,					-- NOW
	-- fecvenc 		date NULL,					-- NOW	
	-- subtot 			float8 DEFAULT 0 NULL,		-- VIENE DE SISPVEN
	-- iva 			float8 DEFAULT 0 NULL,		-- VIENE DE SISPVEN
	-- baseimp 		float8 DEFAULT 0 NULL,		-- VIENE DE SISPVEN
	-- total 			float8 DEFAULT 0 NULL,		-- VIENE DE SISPVEN	
	-- fecreg			date NULL,					-- NOW FORMATO YYYY-MM-DD
	--usureg 		varchar(45) NULL,			-- ADMINISTRADOR
	-- horareg 		time NULL,					-- NOW	FORMATO HH-MM-SS
	--codsuc 		varchar(50) NULL,			-- 0001	
);