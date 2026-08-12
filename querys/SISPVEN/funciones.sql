-- DROP FUNCTION public.fn_api_integracion_get_cliente(varchar);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_get_cliente(prm_rif character varying)
 RETURNS TABLE(tipperrif character varying, numpririf character varying, numterrif character varying, nombre_cliente character varying, dircliente character varying, codpai character varying, codest character varying, codmun character varying, codpar character varying, codciu character varying, codpostal character varying, telcliente character varying, emailcliente character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			UPPER(c.tipo_documento)::varchar AS tipperrif,
			LEFT(c.numero_documento::text, LENGTH(c.numero_documento::text) - 1)::varchar AS numpririf,	
			RIGHT(c.numero_documento::varchar, 1)::varchar AS numterrif,
			
			UPPER(
			    CASE 
			        WHEN c.apellido IS NULL OR TRIM(c.apellido) = '' OR UPPER(TRIM(c.apellido)) = 'N/A' THEN TRIM(c.nombre)
			        ELSE CONCAT_WS(' ', TRIM(c.apellido), TRIM(c.nombre))
			    END
			)::varchar AS nombre_cliente,
			
			'SIN DIRECCION' AS dircliente,  
			'058' AS codpai,
			'001' AS codest,
			'001' AS codmun,
			'001' AS codpar,
			'001' AS codciu,
			'1060' AS codpostal,
			
			c.telefono::varchar AS telcliente,
			UPPER(c.correo)::varchar AS emailcliente			
		FROM
			clientes c 
		WHERE
			--c.cliente_id = prm_cliente_id
			c.numero_documento = prm_rif::integer
		
		UNION
		
		SELECT
			UPPER(cc.tipo_documento)::varchar AS tipperrif,
			LEFT(cc.numero_documento::text, LENGTH(cc.numero_documento::text) - 1)::varchar AS numpririf,
			RIGHT(cc.numero_documento::varchar, 1)::varchar AS numterrif,
			
			UPPER(cc.razon_social)::varchar AS nombre_cliente,	
			UPPER(cc.direccion)::varchar AS dircliente,  
			'058'::varchar AS codpai,	
			UPPER(COALESCE(NULLIF(e.nombre, ''), '001'))::varchar AS codest,
			UPPER(COALESCE(NULLIF(m.nombre, ''), '001'))::varchar AS codmun,
			UPPER(COALESCE(NULLIF(p.nombre, ''), '001'))::varchar AS codpar,
			'001'::varchar AS codciu,
			cc.codigo_postal::varchar AS codpostal,
			
			cc.telefono::varchar AS telcliente,
			UPPER(cc.correo)::varchar AS emailcliente
		FROM
			clientes_corporativos cc
			LEFT JOIN estados e ON cc.estado_id = e.estado_id
			LEFT JOIN municipios m ON cc.municipio_id = m.municipio_id
			LEFT JOIN parroquias p ON cc.parroquia_id = p.parroquia_id
		WHERE
			--cc.cliente_id = prm_cliente_id;
			cc.numero_documento = prm_rif;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_get_facturas_por_enviar();

CREATE OR REPLACE FUNCTION public.fn_api_integracion_get_facturas_por_enviar()
 RETURNS TABLE(codemp character varying, tipperrif character varying, numpririf character varying, numterrif character varying, nombre_cliente character varying, cliente_abvr character varying, dircliente character varying, direntrega character varying, codpai character varying, codest character varying, codmun character varying, codpar character varying, codciu character varying, codpostal character varying, faxcliente character varying, telcliente character varying, emailcliente character varying, webcliente character varying, observcliente character varying, nombreresp character varying, cargoresp character varying, emailresp character varying, id_fact integer, codproceso character varying, numfact integer, codfact character varying, numcont character varying, id_cliente integer, id_transp integer, id_estfact integer, id_condpago integer, id_vend integer, codmon character varying, tascam integer, tipopecont character varying, codcaj character varying, fecfact character varying, fecvenc character varying, subtot double precision, iva double precision, baseimp double precision, total double precision, fecreg character varying, horareg character varying, usureg character varying, codsuc character varying, id_tipodetalle character varying, renglon integer, coddetalle character varying, codunimed character varying, codalm character varying, cantidad_detalle integer, precio_detalle double precision, porciva double precision, iva_detalle double precision, neto_detalle double precision, codproc character varying, canmay integer, precioneto_detalle double precision)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			-- CLIENTE
			'0001'::varchar AS codemp,
			UPPER(f.tipo_documento)::varchar AS tipperrif,
			LEFT(f.documento::text, LENGTH(f.documento::text) - 1)::varchar AS numpririf,	
			RIGHT(f.documento::varchar, 1)::varchar AS numterrif,
			
			UPPER(
			    CASE 
			        WHEN f.apellido IS NULL OR TRIM(f.apellido) = '' OR UPPER(TRIM(f.apellido)) = 'N/A' THEN TRIM(f.nombre)
			        ELSE CONCAT_WS(' ', TRIM(f.apellido), TRIM(f.nombre))
			    END
			)::varchar AS nombre_cliente,
		
			''::varchar AS cliente_abvr,			
			UPPER(f.direccion)::varchar AS dircliente,
			''::varchar AS direntrega,	  
			'058'::varchar AS codpai,
			'001'::varchar AS codest,
			'001'::varchar AS codmun,
			'001'::varchar AS codpar,
			'001'::varchar AS codciu,
			'1060'::varchar AS codpostal,
			''::varchar AS faxcliente,
			'0000000000'::varchar AS telcliente,
			UPPER('mail@gmail.com')::varchar AS emailcliente,
			''::varchar AS webcliente,
			''::varchar AS observcliente,
			''::varchar AS nombreresp,
			''::varchar AS cargoresp,
			''::varchar AS emailresp,
			
			-- FACTURA
			0::int AS id_fact, 						-- CORRELATIVO SIGESP - id_fact serial4 NOT NULL,	
			'FACTURA'::varchar AS codproceso,
			0::int AS numfact,						-- CORRELATIVO SIGESP -  numfact int4 NOT NULL,	
			'0'::varchar AS codfact,				-- CORRELATIVO SIGESP - codfact varchar(25) NOT NULL,
			'00-00000001'::varchar AS numcont,		-- CORRELATIVO SIGESP - N° CONTROL INTERNO numcont varchar(25) NOT NULL,
			0::int AS id_cliente,					-- ID CLIENTE INSERTADO O BUSCADO PREVIAMENTE - id_cliente int4 NOT NULL,
			9::int AS id_transp,
			1::int AS id_estfact,
			12::int AS id_condpago,
			1::int AS id_vend,
			'001'::varchar AS codmon,
			1::int AS tascam,		
			'DEV'::varchar AS tipopecont,
			'0001'::varchar AS codcaj,
			TO_CHAR(f.created_at, 'YYYY-MM-DD')::varchar AS fecfact,
			TO_CHAR(f.created_at, 'YYYY-MM-DD')::varchar AS fecvenc,
			(f.monto_total - f.iva)::float AS subtot,
			f.iva::float AS iva,
			(f.monto_total - f.iva)::float AS baseimp,
			f.monto_total::float AS total,		
			TO_CHAR(NOW(), 'YYYY-MM-DD')::varchar AS fecreg,
			TO_CHAR(NOW(), 'HH24:MI:SS')::varchar AS horareg,
			'ADMINISTRADOR'::varchar AS usureg,
			'0001'::varchar AS codsuc,			
		
			-- DETALLE
			-- id_fact int4 NOT NULL,										-- CORRELATIVO SIGESP GENERADO EN EL ENCABEZADO	
			'SERVI'::varchar AS id_tipodetalle,					
			1::int AS renglon,												-- CORRELATIVO SIGESP POR CADA ITEM DEL DETALLE
			i.coddetalle::varchar,
			i.codunimed::varchar AS codunimed,			
			'0000000000'::varchar AS codalm,								-- FIJO - 0000000000	codalm varchar(10) NULL,
			1::int AS cantidad_detalle,										-- SIGESP CONTEO DE LA CANTIDAD DE ITEM DE LA FACTURA
			(f.monto_total - f.iva)::float AS precio_detalle,	
			16::float AS porciva,											-- ????? % DEBE VENIR DE SISPVEN - porciva float8 DEFAULT 0 NULL,	
			f.iva::float AS iva_detalle,
			f.monto_total::float AS neto_detalle,
			'FAC'::varchar AS codproc,
			1::int AS canmay,												-- SIGESP CONTEO DE LA CANTIDAD DE ITEM DE LA FACTURA
			(f.monto_total - f.iva)::float AS precioneto_detalle
		FROM 
			public.facturaciones f
			INNER JOIN public.facturacion_detalles d ON f.facturacion_id = d.facturacion_detalle_id
			INNER JOIN public.api_integracion_servicios i ON i.servicio_id = d.servicio_id
		WHERE	
			f.monto_total > 0 
		AND f.enviado_sigesp = 0
		ORDER BY 
			f.facturacion_id;	
				
	END;
$function$
;