CREATE TABLE public.cxc_factura (
	id_fact serial4 NOT NULL,			-- CORRELATIVO SIGESP
	codemp varchar(4) NOT NULL,			-- FIJO - 0001
	codproceso varchar(10) NOT NULL,	-- FIJO - FACTURA 
	numfact int4 NOT NULL,				-- CORRELATIVO SIGESP
	codfact varchar(25) NOT NULL,		-- CORRELATIVO SIGESP
	numcont varchar(25) NOT NULL,		-- CORRELATIVO SIGESP - N° CONTROL INTERNO
	id_cliente int4 NOT NULL,			-- ID CLIENTE INSERTADO O BUSCADO PREVIAMENTE 
	id_transp int4 NOT NULL,			--  9 - DESPACHO POR PEDIDO
	id_estfact int4 NOT NULL,			--  1 - ESTATUS FACTURADO
	id_condpago int4 NOT NULL,			-- 12 - CREDITO 1 DIA
	id_vend int4 NOT NULL,				--  1 - VENDEDOR POR DEFECTO
	codmon varchar(4) NULL,				-- FIJO - 001
	tascam float8 DEFAULT 0::double precision NULL,	-- FIJO - 1
	tipopecont varchar(3) NOT NULL,		-- FIJO - DEV
	codcaj varchar(25) NOT NULL,		-- FIJO - 0001
	fecfact date NULL,					-- VIENE DE SISPVEN - TO_CHAR(f.created_at, 'YYYY-MM-DD')::varchar AS fecfact,
	fecvenc date NULL,					-- VIENE DE SISPVEN - TO_CHAR(f.created_at, 'YYYY-MM-DD')::varchar AS fecvenc,
	subtot float8 DEFAULT 0 NULL,		-- VIENE DE SISPVEN - (f.monto_total - f.iva)::float AS subtot,
	iva float8 DEFAULT 0 NULL,			-- VIENE DE SISPVEN - f.iva::float AS iva,
	otros float8 DEFAULT 0 NULL,		-- VIENE DE SISPVEN - f.iva::float AS iva,
	baseimp float8 DEFAULT 0 NULL,		-- VIENE DE SISPVEN - (f.monto_total - f.iva)::float AS baseimp,
	total float8 DEFAULT 0 NULL,		-- VIENE DE SISPVEN - f.monto_total::float AS total,
	fecreg date NULL,					-- FIJO - TO_CHAR(NOW(), 'YYYY-MM-DD')::varchar AS fecreg,
	usureg varchar(45) NULL,			-- FIJO - ADMINISTRADOR 
	horareg time NULL,					-- FIJO - TO_CHAR(NOW(), 'HH24:MI:SS')::varchar AS horareg,
	codsuc varchar(50) NULL,			-- FIJO - 0001
	
);


-- 3. Obtenemos el número máximo de la parte derecha de numcont (ej: '00-0922544' -> '0922544' -> 922544)
