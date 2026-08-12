CREATE TABLE public.cxc_clientes (
	id_cliente 			serial4 NOT NULL,									-- CORRELATIVO
	-- codemp 			varchar(4) NOT NULL,								-- 0001
	codcliente 			varchar(25) NOT NULL,								-- CORRELATIVO	
	
	-- tipperrif 			varchar(2) NULL,								-- VIENE DE SIPVEN V, J, G, E
	-- numpririf 			varchar(15) NULL,								-- VIENE DE SIPVEN
	-- numterrif 			varchar(5) NULL,								-- VIENE DE SIPVEN
	-- nombre_cliente 		varchar(254) NOT NULL,							-- VIENE DE SIPVEN 
	-- cliente_abvr 		varchar(100) NOT NULL,							-- ''
	-- dircliente 			varchar(254) NOT NULL,							-- VIENE DE SIPVEN 
	-- direntrega 			varchar(254) NOT NULL,							-- ''	
	-- codpai 				varchar(10) DEFAULT '000' NOT NULL,				-- 058
	-- codest 				varchar(10) DEFAULT '0000000000' NOT NULL,		-- 001
	-- codmun 				varchar(10) DEFAULT '0000000000' NOT NULL,		-- 001
	-- codpar 				varchar(10) DEFAULT '0000000000' NOT NULL,		-- 001
	-- codciu 				varchar(10) DEFAULT '0000000000' NOT NULL,		-- 001
	-- codpostal 			varchar(40) NOT NULL,							-- 1060	
	-- faxcliente 			varchar(60) NOT NULL,							-- ''
	-- telcliente 			varchar(60) NOT NULL,							-- 0000000000	
	-- emailcliente 		varchar(60) NOT NULL,							-- mail@gmail.com
	-- webcliente 			varchar(60) NOT NULL,							-- ''
	-- observcliente 		varchar(254) NOT NULL,							-- ''
	-- nombreresp 			varchar(254) NOT NULL,							-- ''
	-- cargoresp 			varchar(100) NOT NULL,							-- ''
	-- emailresp 			varchar(40) NOT NULL,							-- ''
	-- fecregcliente 		date NULL,										-- NOW() FORMATO YYYY-MM-DD
	-- fecreg 				date NULL,										-- NOW() FORMATO YYYY-MM-DD
	-- usureg 				varchar(45) NULL,								-- ADMINISTRADOR
	-- horareg 			time NULL,											-- NOW() FORMATO HH-MM-SS
);



