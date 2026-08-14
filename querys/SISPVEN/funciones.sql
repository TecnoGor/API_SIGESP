-- DROP FUNCTION public.fn_api_integracion_get_facturas_por_enviar();

CREATE OR REPLACE FUNCTION public.fn_api_integracion_get_facturas_por_enviar()
 RETURNS TABLE(codemp character varying, fecreg character varying, horareg character varying, usureg character varying, id_vend integer, tipperrif character varying, numpririf character varying, numterrif character varying, nombre_cliente character varying, cliente_abvr character varying, dircliente character varying, direntrega character varying, codpai character varying, codest character varying, codmun character varying, codpar character varying, codciu character varying, codpostal character varying, faxcliente character varying, telcliente character varying, emailcliente character varying, webcliente character varying, observcliente character varying, nombreresp character varying, cargoresp character varying, emailresp character varying, id_tipo_cliente integer, estclient character varying, id_clasif_cliente integer, id_zona integer, facturacion_id integer, codproceso character varying, id_transp integer, id_estfact integer, id_condpago integer, codmon character varying, tascam integer, tipopecont character varying, codcaj character varying, fecfact character varying, fecvenc character varying, subtot double precision, iva double precision, baseimp double precision, total double precision, codsuc character varying, descripfact character varying, comentadifact character varying, id_tipodetalle character varying, renglon integer, coddetalle character varying, codunimed character varying, codalm character varying, cantidad_detalle integer, precio_detalle double precision, porciva double precision, iva_detalle double precision, neto_detalle double precision, codproc character varying, canmay integer, precioneto_detalle double precision, comentario character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			-- DATOS GENERALES
			'0001'::varchar AS codemp,
			TO_CHAR(NOW(), 'YYYY-MM-DD')::varchar AS fecreg,
			TO_CHAR(NOW(), 'HH24:MI:SS')::varchar AS horareg,
			'ADMINISTRADOR'::varchar AS usureg,
			1::int AS id_vend,

			-- CLIENTE			
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
			7::int AS id_tipo_cliente, 
			'A'::varchar AS estclient,
			1::int AS id_clasif_cliente,
			1::int AS id_zona,

			-- FACTURA
			f.facturacion_id::int AS facturacion_id, 
			'FACTURA'::varchar AS codproceso,
			9::int AS id_transp,
			1::int AS id_estfact,
			12::int AS id_condpago,			
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
			'0001'::varchar AS codsuc,
			''::varchar AS descripfact,
			''::varchar AS comentadifact,

			-- DETALLE
			'SERVI'::varchar AS id_tipodetalle,					
			1::int AS renglon,												-- CORRELATIVO SIGESP POR CADA ITEM DEL DETALLE
			i.coddetalle::varchar,
			i.codunimed::varchar AS codunimed,			
			'0000000000'::varchar AS codalm,								
			1::int AS cantidad_detalle,										-- SIGESP CONTEO DE LA CANTIDAD DE ITEM DE LA FACTURA
			(f.monto_total - f.iva)::float AS precio_detalle,	
			16::float AS porciva,											-- ????? % DEBE VENIR DE SISPVEN - porciva float8 DEFAULT 0 NULL,	
			f.iva::float AS iva_detalle,
			f.monto_total::float AS neto_detalle,
			'FAC'::varchar AS codproc,
			1::int AS canmay,												-- SIGESP CONTEO DE LA CANTIDAD DE ITEM DE LA FACTURA
			(f.monto_total - f.iva)::float AS precioneto_detalle,
			''::varchar AS comentario
		FROM 
			public.facturaciones f
			INNER JOIN public.facturacion_detalles d ON f.facturacion_id = d.facturacion_detalle_id
			INNER JOIN public.api_integracion_servicios i ON i.servicio_id = d.servicio_id
		WHERE	
			f.monto_total > 0 
		AND f.enviado_sigesp = 0
		ORDER BY 
			f.facturacion_id LIMIT 1;
	END;
$function$
;