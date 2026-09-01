-- DROP FUNCTION public.fn_api_contingencia_documentos_enviados(int4, varchar, varchar, varchar, text, timestamptz, bpchar);

CREATE OR REPLACE FUNCTION public.fn_api_contingencia_documentos_enviados(prm_numfact integer, prm_coddoc character varying, prm_codtipdoc character varying, prm_num_control character varying, prm_url_pdf text, prm_fecreg timestamp with time zone, prm_codusu character)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	DECLARE
	    -- 1. Se deben declarar las variables locales antes del BEGIN
	    VAR_ID_FACT INTEGER;
	    VAR_ID_DOC  INTEGER;
	    VAR_NUMFACT INTEGER;
	BEGIN
	    IF (prm_codtipdoc = 'FACTURA') THEN
			-- 1. Busca el id_fact de la factura
			SELECT f.id_fact INTO VAR_ID_FACT FROM cxc_factura f WHERE f.numfact = prm_numfact;
			
			-- 2. Inserta atómicamente ignorando duplicados
	        INSERT INTO api_integracion_documentos_cgi 
				(id_fact, numfact, id_doc, codtipdoc, num_control, url_pdf, fecreg, codusu) 
	        VALUES 
				(VAR_ID_FACT, prm_numfact, null, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_fecreg, prm_codusu)
	        ON CONFLICT 
				(id_fact, codtipdoc, numfact) WHERE codtipdoc = 'FACTURA'
	        DO NOTHING;
		ELSE
			-- 1. Busca los datos de la note de credito
			SELECT 	d.id_fact, d.id_doc, f.numfact 
			INTO 	VAR_ID_FACT, VAR_ID_DOC, VAR_NUMFACT 
			FROM 	cxc_documento d 
					INNER JOIN cxc_factura f ON d.id_fact = f.id_fact 
			WHERE 	d.coddoc = prm_coddoc;			
			
			-- 2. Inserta atómicamente ignorando duplicados
	        INSERT INTO api_integracion_documentos_cgi 
	            (id_fact, numfact, id_doc, codtipdoc, num_control, url_pdf, fecreg, codusu) 
	        VALUES 
	            (VAR_ID_FACT, VAR_NUMFACT, VAR_ID_DOC, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_fecreg, prm_codusu)
	        ON CONFLICT 
				(id_fact, codtipdoc, id_doc) WHERE codtipdoc = 'NC'
	        DO NOTHING;
			END IF;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_delete_configuracion();

CREATE OR REPLACE FUNCTION public.fn_api_delete_configuracion()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		DELETE FROM public.api_configuracion;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_delete_configuracion_cgi();

CREATE OR REPLACE FUNCTION public.fn_api_delete_configuracion_cgi()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		DELETE FROM public.api_configuracion_cgi;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_get_configuracion();

CREATE OR REPLACE FUNCTION public.fn_api_get_configuracion()
 RETURNS TABLE(id_cliente text, key text, token text)
 LANGUAGE plpgsql
AS $function$
	BEGIN
		RETURN QUERY
		
		SELECT 
	        c.id_cliente,
			c.key,
	        c.token
	    FROM 
	        public.api_configuracion c
	    LIMIT 1;
		END;
$function$
;

-- DROP FUNCTION public.fn_api_get_configuracion_cgi();

CREATE OR REPLACE FUNCTION public.fn_api_get_configuracion_cgi()
 RETURNS TABLE(id_cliente text, key text, aplicacion character varying, activo boolean, token text)
 LANGUAGE plpgsql
AS $function$
	BEGIN
		RETURN QUERY
		
		SELECT 
	        c.id_cliente,
			c.key,
			c.aplicacion,
			c.activo,
	        c.token
	    FROM 
	        public.api_configuracion_cgi c
	    LIMIT 1;
		END;
$function$
;

-- DROP FUNCTION public.fn_api_get_factura_anular(int4);

CREATE OR REPLACE FUNCTION public.fn_api_get_factura_anular(prm_id_fact integer)
 RETURNS TABLE(numfact integer, num_control character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY
	
		SELECT
			i.numfact,			
			i.num_control    
		FROM 
			api_integracion_documentos_cgi as i			 
		WHERE  
			i.codtipdoc = 'FACTURA'
		AND	i.id_fact=prm_id_fact;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_get_factura_detalle(int4);

CREATE OR REPLACE FUNCTION public.fn_api_get_factura_detalle(prm_id_fact integer)
 RETURNS TABLE(numfact character varying, coddetalle character varying, "nombreProducto" character varying, "descripcionProducto" character varying, "tipoImpuesto" character varying, "cantidadAdquirida" numeric, "precioProducto" character varying, numpririf character varying, nombre_cliente character varying, emailcliente character varying, dircliente character varying, telcliente character varying, tasa_del_dia double precision, fecha_tasa character varying, num_control character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY
	
		SELECT
			-- 1. Formateo de número de factura a 7 ceros (ej. '0000011')
        	LPAD(f.numfact::text, 7, '0')::varchar AS numfact,
			
			-- 2. Código recortado a 13 caracteres máximo (Regla API)
        	SUBSTRING(TRIM(d.coddetalle), 1, 13)::varchar AS coddetalle,
			
			-- 3. Nombre del producto en Mayúsculas y recortado a 70 caracteres
	        SUBSTRING(
	            UPPER(COALESCE(
	                NULLIF(
	                    CASE 
	                        WHEN d.id_tipodetalle = 'SERVI' THEN s.denser 
	                        WHEN d.id_tipodetalle = 'ARTIC' THEN a.denart 
	                        WHEN d.id_tipodetalle = 'CONCE' THEN c.denconfac 
	                        ELSE '' 
	                    END, ''
	                ), 'PRODUCTO SIN NOMBRE'
	            )), 1, 70
	        )::varchar AS "nombreProducto",

			-- 4. Descripción del producto recortada a 70 caracteres
	        SUBSTRING(
	            UPPER(CONCAT_WS(
	                ' - ',
	                COALESCE(
	                    NULLIF(
	                        CASE 
	                            WHEN d.id_tipodetalle = 'SERVI' THEN s.denser 
	                            WHEN d.id_tipodetalle = 'ARTIC' THEN a.denart 
	                            WHEN d.id_tipodetalle = 'CONCE' THEN c.denconfac 
	                            ELSE '' 
	                        END, ''
	                    ), 'PRODUCTO SIN NOMBRE'
	                ),
	                NULLIF(d.comentario, '')
	            )), 1, 70
	        )::varchar AS "descripcionProducto",

			-- 5. Mapeo de alícuotas del IVA
	        (CASE 
	            WHEN d.porciva IS NULL OR d.porciva::INT = 0 THEN 'E'
	            WHEN d.porciva::INT = 16 THEN 'G'
	            WHEN d.porciva::INT = 8  THEN 'R'
	            WHEN d.porciva::INT = 31 THEN 'A'
	            ELSE 'E'
	        END)::varchar AS "tipoImpuesto",
		
			-- 6. Cantidad adquirida con 2 decimales
        	COALESCE(d.cantidad_detalle, 1.00)::numeric(12,2) AS "cantidadAdquirida",

			-- 7. Precio con COMA como separador decimal (Ej: "1,55")
        	REPLACE(TO_CHAR(COALESCE(d.precio_detalle, 0.00), 'FM999999990.00'), '.', ',')::varchar AS "precioProducto",
			-- REPLACE(TO_CHAR(COALESCE(d.neto_detalle, 0.00), 'FM999999990.00'), '.', ',')::varchar AS "precioProducto",
			
			-- 8. Documento RIF sin espacios
        	UPPER(TRIM(COALESCE(NULLIF(cl.tipperrif, ''), 'V') || TRIM(COALESCE(NULLIF(cl.numpririf, ''), '00000000')) || COALESCE(NULLIF(cl.numterrif, ''), '')))::varchar AS numpririf,
			
			-- 9. Datos del cliente sanitizados
	        UPPER(TRIM(COALESCE(NULLIF(cl.nombre_cliente, ''), 'CLIENTE NO ESPECIFICADO')))::varchar AS nombre_cliente,			
	        UPPER(TRIM(COALESCE(cl.emailcliente, '')))::varchar AS emailcliente,
	        UPPER(TRIM(COALESCE(NULLIF(cl.dircliente, ''), 'DIRECCIÓN NO ESPECIFICADA')))::varchar AS dircliente, 
	        TRIM(COALESCE(cl.telcliente, '00000000000'))::varchar AS telcliente,
			p.tasa_del_dia:: float AS tasa_del_dia,
 			TO_CHAR(p.fecha_tasa, 'YYYY-MM-DD')::varchar AS fecha_tasa,

			-- 10. Numero de Control sin espacios
			TRIM(idc.num_control)::varchar AS num_control
		FROM 
			cxc_detalle d 
			INNER JOIN cxc_factura f ON f.id_fact = d.id_fact AND f.codproceso = d.codproceso 
			INNER JOIN cxc_clientes cl ON cl.id_cliente = f.id_cliente 
			LEFT JOIN siv_articulo a ON a.codart=d.coddetalle AND f.codemp = a.codemp AND d.id_tipodetalle = 'ARTIC' 
			LEFT JOIN soc_servicios s ON s.codser=d.coddetalle AND d.id_tipodetalle = 'SERVI' 
			LEFT JOIN cxc_conceptofac c ON c.codconfac=d.coddetalle AND d.id_tipodetalle = 'CONCE'
			LEFT JOIN api_integracion_documentos_cgi idc ON idc.numfact = f.numfact AND idc.id_fact = f.id_fact AND idc.codtipdoc = 'FACTURA',
			public.api_integracion_parametros p
		WHERE  
			d.codproceso='FACTURA' 
		AND d.id_fact=prm_id_fact
		ORDER BY 
			d.coddetalle;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_get_integracion_parametros();

CREATE OR REPLACE FUNCTION public.fn_api_get_integracion_parametros()
 RETURNS TABLE(codcar character varying, cuenta_x_cobrar character varying, cuenta_ingreso character varying, cuenta_x_pagar_iva character varying, cuenta_partida_ingreso character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
		RETURN QUERY
		
		SELECT 
	        p.codcar::varchar AS codcar,
			p.cuenta_x_cobrar::varchar AS cuenta_x_cobrar,
			p.cuenta_ingreso::varchar AS cuenta_ingreso,
			p.cuenta_x_pagar_iva::varchar AS cuenta_x_pagar_iva,
			p.cuenta_partida_ingreso::varchar AS cuenta_partida_ingreso
	    FROM 
	        public.api_integracion_parametros p;
		END;
$function$
;

-- DROP FUNCTION public.fn_api_get_nota_credito_detalle(int4);

CREATE OR REPLACE FUNCTION public.fn_api_get_nota_credito_detalle(prm_id_doc integer)
 RETURNS TABLE(numfact integer, id_doc integer, coddoc character varying, numdoc integer, id_fact integer, coddetalle character varying, cantidad_detdoc numeric, "descripcionProducto" character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			f.numfact, 
			doc.id_doc,
			doc.coddoc,
		    doc.numdoc,
		    doc.id_fact,
		    dtn.coddetalle,
		    dtn.cantidad_detdoc,

			UPPER(CONCAT_WS(
			    ' - ',
			    	COALESCE(
			        NULLIF(
			            CASE 
			                WHEN dtn.id_tipodetalle = 'SERVI' THEN s.denser 
							WHEN dtn.id_tipodetalle = 'ARTIC' THEN a.denart
			                ELSE '' 
			            END, ''
			        ), 'Producto sin nombre'
			    ),
			    NULLIF(dtn.comentdoc, '')
			))::varchar AS "descripcionProducto"
		FROM 
			cxc_documento doc
			INNER JOIN cxc_dt_documento dtn ON doc.id_doc = dtn.id_doc
			INNER JOIN cxc_factura f ON doc.id_fact = f.id_fact
			LEFT JOIN siv_articulo a ON dtn.coddetalle = a.codart
			LEFT JOIN soc_servicios s ON dtn.coddetalle = s.codser
		WHERE 
		    doc.codemp = '0001'
		AND	doc.id_doc = prm_id_doc;		
	END;
$function$
;

-- DROP FUNCTION public.fn_api_get_retencion_islr(bpchar);

CREATE OR REPLACE FUNCTION public.fn_api_get_retencion_islr(prm_numcom character)
 RETURNS TABLE(rif character varying, nomsujret character varying, email character varying, dirsujret character varying, telefono character varying, numfac character varying, num_control character varying, fecfac character varying, cmp_codret character varying, consol text, totcmp_con_iva character varying, basimp character varying, sustraendo character varying, porded character varying, cmp_monret character varying, numsol character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			UPPER(regexp_replace(cmp.rif, '[^a-zA-Z0-9]', '', 'g'))::varchar AS rif,

			UPPER(cmp.nomsujret)::varchar AS nomsujret, 	
			
			UPPER(
				COALESCE(
					NULLIF(
						CASE 
							WHEN sol.tipproben = 'P' THEN p.email
							WHEN sol.tipproben = 'B' THEN b.email
							ELSE '' 
						END, ''
					), 'mail@gmail.com'
			))::varchar AS email,
			
			UPPER(cmp.dirsujret)::varchar AS dirsujret,

			COALESCE(
			    LPAD(
			        RIGHT(
			            regexp_replace(
			                CASE 
			                    WHEN sol.tipproben = 'P' THEN p.telpro
			                    WHEN sol.tipproben = 'B' THEN b.telbene
			                    ELSE '' 
			                END, 
			                '[^0-9]', '', 'g'
			            ), 
			            11
			        ), 
			        11, '0'
			    ),
			    '00000000000'
			)::varchar AS telefono,
			
			dt.numfac,			 
			idc.num_control::varchar AS num_control,
			to_char(dt.fecfac, 'YYYY-MM-DD')::varchar AS fecfac,
			dt.cmp_codret,
			UPPER(sol.consol)::text AS consol,	
			replace(to_char(dt.totcmp_con_iva, 'FM999999999990.00'), '.', ',')::varchar AS totcmp_con_iva,			
			replace(to_char(dt.basimp, 'FM999999999990.00'), '.', ',')::varchar AS basimp,
			replace(to_char(d.monded, 'FM999999999990.00'), '.', ',')::varchar AS sustraendo,
			concat(d.porded, '%')::varchar AS porded,
			replace(to_char(dt.cmp_monret, 'FM999999999990.00'), '.', ',')::varchar AS cmp_monret,
			--cmp.codret::varchar AS codret 
			--sol.numsol::varchar AS numsol
			'001'::varchar AS numsol 
		FROM 	
			scb_cmp_ret cmp
			INNER JOIN scb_dt_cmp_ret dt ON cmp.codemp = dt.codemp AND cmp.codret = dt.codret AND cmp.numcom = dt.numcom AND cmp.tipsolpag = dt.tipsolpag
			INNER JOIN cxp_solicitudes sol ON dt.codemp = sol.codemp AND dt.numsop = sol.numsol
			INNER JOIN sigesp_deducciones d ON dt.cmp_codret = d.codded and dt.codemp = d.codemp	
			INNER JOIN api_integracion_documentos_cgi idc ON idc.numfact = dt.numfac::int AND idc.codtipdoc = 'FACTURA'	
			LEFT JOIN rpc_proveedor p ON sol.tipproben = 'P' AND sol.codemp = p.codemp AND sol.cod_pro = p.cod_pro
			LEFT JOIN rpc_beneficiario b ON sol.tipproben = 'B' AND sol.codemp = b.codemp AND sol.ced_bene = b.ced_bene
		WHERE 
			cmp.codemp='0001'
		AND	cmp.codret='0000000006'
		AND	cmp.estcmpret=1		
		AND	cmp.numcom = prm_numcom
		ORDER BY 
			cmp.numcom, 
			dt.numope;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_get_retencion_iva(bpchar);

CREATE OR REPLACE FUNCTION public.fn_api_get_retencion_iva(prm_numcom character)
 RETURNS TABLE(rif character varying, nomsujret character varying, email character varying, dirsujret character varying, telefono character varying, fecfac character varying, numfac character varying, num_control character varying, nota_credito character varying, nota_debito character varying, factura_afectada character varying, totcmp_con_iva character varying, compsinderiva character varying, basimp character varying, porimp character varying, porded character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			UPPER(regexp_replace(cmp.rif, '[^a-zA-Z0-9]', '', 'g'))::varchar AS rif,

			UPPER(cmp.nomsujret)::varchar AS nomsujret, 	
			
			UPPER(
				COALESCE(
					NULLIF(
						CASE 
							WHEN sol.tipproben = 'P' THEN p.email
							WHEN sol.tipproben = 'B' THEN b.email
							ELSE '' 
						END, ''
					), 'mail@gmail.com'
			))::varchar AS email,
			
			UPPER(cmp.dirsujret)::varchar AS dirsujret,

			COALESCE(
			    LPAD(
			        RIGHT(
			            regexp_replace(
			                CASE 
			                    WHEN sol.tipproben = 'P' THEN p.telpro
			                    WHEN sol.tipproben = 'B' THEN b.telbene
			                    ELSE '' 
			                END, 
			                '[^0-9]', '', 'g'
			            ), 
			            11
			        ), 
			        11, '0'
			    ),
			    '00000000000'
			)::varchar AS telefono,		

			to_char(dt.fecfac, 'YYYY-MM-DD')::varchar AS fecfac,
			dt.numfac,			 
			idc.num_control::varchar AS num_control,
			'N/A'::varchar AS nota_credito,
			'N/A'::varchar AS nota_debito,
			'N/A'::varchar AS factura_afectada,
			
			replace(to_char(dt.totcmp_con_iva, 'FM999999999990.00'), '.', ',')::varchar AS totcmp_con_iva,		
			replace(to_char(0.00, 'FM999999999990.00'), '.', ',')::varchar AS compsinderiva,
			replace(to_char(dt.basimp, 'FM999999999990.00'), '.', ',')::varchar AS basimp,
			(replace(to_char(dt.porimp, 'FM999999999990.00'), '.', ',')|| '%')::varchar AS porimp,
			concat(d.porded, '%')::varchar AS porded
		FROM 	
			scb_cmp_ret cmp
			INNER JOIN scb_dt_cmp_ret dt ON cmp.codemp = dt.codemp AND cmp.codret = dt.codret AND cmp.numcom = dt.numcom AND cmp.tipsolpag = dt.tipsolpag
			INNER JOIN cxp_solicitudes sol ON dt.codemp = sol.codemp AND dt.numsop = sol.numsol
			INNER JOIN sigesp_deducciones d ON dt.cmp_codret = d.codded and dt.codemp = d.codemp
			INNER JOIN api_integracion_documentos_cgi idc ON idc.numfact = dt.numfac::int AND idc.codtipdoc = 'FACTURA'
			LEFT JOIN rpc_proveedor p ON sol.tipproben = 'P' AND sol.codemp = p.codemp AND sol.cod_pro = p.cod_pro
			LEFT JOIN rpc_beneficiario b ON sol.tipproben = 'B' AND sol.codemp = b.codemp AND sol.ced_bene = b.ced_bene
		WHERE 
			cmp.codemp='0001'
		AND	cmp.codret='0000000001'
		AND	cmp.estcmpret=1
		AND	cmp.numcom = prm_numcom
		ORDER BY 
			cmp.numcom, 
			dt.numope;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_cxc_clientes(varchar, varchar, varchar, varchar, varchar);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_cxc_clientes(prm_rif character varying, prm_nombre character varying, prm_direccion character varying, prm_telefono character varying, prm_email character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_id_cliente 	integer;
		v_next_num   	integer;
		v_codcliente 	character varying(20);
		v_rif			character varying(25);
		v_tipperrif 	character varying(1);
		v_numpririf 	character varying(20);		
		v_numterrif 	character varying(1);
	BEGIN
		-- Limpia guiones, puntos y espacios del RIF
    	v_rif := regexp_replace(prm_rif, '[^a-zA-Z0-9]', '', 'g');

		v_tipperrif := LEFT(v_rif, 1);
		v_numpririf := SUBSTRING(v_rif FROM 2 FOR LENGTH(v_rif) - 2);		
		v_numterrif := RIGHT(v_rif, 1);

		-- 1. Buscamos si el cliente ya existe y obtenemos su ID
    	SELECT 	id_cliente 
		INTO 	v_id_cliente
    	FROM 	public.cxc_clientes
    	WHERE 	TRIM(numpririf) = TRIM(v_numpririf)
    	LIMIT 	1;

		-- 2. Si no existe, 
    	IF v_id_cliente IS NULL THEN
			-- Obtenemos el número máximo actual de codcliente y lo incrementamos en 1
	        SELECT 	COALESCE(MAX(NULLIF(regexp_replace(codcliente, '\D', '', 'g'), '')::integer), 0) + 1 
	        INTO 	v_next_num
	        FROM 	public.cxc_clientes;

			-- Convertimos el número a string formateado con 6 ceros
        	v_codcliente := LPAD(v_next_num::text, 6, '0');

			-- Insertamos el registro y capturamos el ID autoincremental
			INSERT INTO public.cxc_clientes 
            	(codemp, codcliente, tipperrif, numpririf, numterrif, id_tipo_cliente, nombre_cliente, cliente_abvr, 
				id_zona, id_vend, id_clasif_cliente, dircliente, direntrega, codpai, codest, codmun, codpar, codciu, 
				codpostal, faxcliente, telcliente, emailcliente, webcliente, observcliente, estclient, nombreresp, 
				cargoresp, emailresp, fecregcliente, fecreg, usureg, horareg) 
	        VALUES 
	            ('0001', v_codcliente, v_tipperrif, v_numpririf, v_numterrif, 7, prm_nombre, '',	
				1, 1, 1, prm_direccion, '', '058', '001', '001', '001', '001',	
				'1060', '', prm_telefono, prm_email, '', '', 'A', '', 
				'', '', CURRENT_DATE, CURRENT_DATE,'ADMINISTRADOR', CURRENT_TIME)
	        RETURNING id_cliente INTO v_id_cliente;			
		END IF;

		-- 3. Retornamos el id_cliente (existente o recién creado)
    	RETURN v_id_cliente;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_cxc_detalle(int4, int4, varchar, varchar, float8, float8, float8, float8, float8, varchar);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_cxc_detalle(prm_id_fact integer, prm_renglon integer, prm_coddetalle character varying, prm_codunimed character varying, prm_precio double precision, prm_cantidad double precision, prm_porc_iva double precision, prm_iva double precision, prm_total double precision, prm_comentario character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		-- 2. Insertamos el registro
		INSERT INTO public.cxc_detalle
			(id_fact, id_tipodetalle, codproceso, renglon, coddetalle, codunimed, codalm, cantidad_detalle, 
			precio_detalle, porciva, iva_detalle, neto_detalle, comentario, codproc, canmay, precioneto_detalle)
		VALUES
			(prm_id_fact, 'SERVI', 'FACTURA', prm_renglon, prm_coddetalle, prm_codunimed, '0000000000', prm_cantidad,  
			prm_precio, prm_porc_iva, prm_iva, prm_total, prm_comentario, 'FAC', 1, prm_precio);
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_cxc_dt_cargos(int4, int4, varchar, float8, float8, float8);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_cxc_dt_cargos(prm_idfacturaorigen integer, prm_id_fact integer, prm_codcar character varying, prm_base_imp double precision, prm_iva double precision, prm_total double precision)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_formula			varchar(254);
		v_porcar 			float8;
		v_scg_cuenta 		varchar(25);
		v_spicta 			varchar(25);

	BEGIN
		--		
		SELECT	c.formula, c.porcar, c.scg_cuenta, c.spicta 
		INTO 	v_formula, v_porcar, v_scg_cuenta, v_spicta			
		FROM 	public.sigesp_cargos c
		WHERE 	c.codemp = '0001'
		AND		c.codcar = prm_codcar;

		-- 1. Insertamos el registro
		INSERT INTO public.cxc_dt_cargos
			(codemp, id_fact, codproceso, codcar, formula, porcar, monbasimp, monimp, montot, scg_cuenta, spi_cuenta, id_doc, api_modulo, api_id_fact_origen)
		VALUES
			('0001', prm_id_fact, 'FACTURA', prm_codcar, v_formula, v_porcar, prm_base_imp, prm_iva, prm_total, v_scg_cuenta, v_spicta, 0, 'SISPVEN', prm_idfacturaorigen);	
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_cxc_factura(in int4, in int4, in float8, in float8, in float8, in float8, in varchar, in timestamp, out int4, out int4);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_cxc_factura(prm_id_cliente integer, prm_idfacturaorigen integer, prm_subtot double precision, prm_baseimp double precision, prm_iva double precision, prm_total double precision, prm_descripfact character varying, prm_fecha_fact timestamp without time zone, OUT out_id_fact integer, OUT out_numfact integer)
 RETURNS record
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_next_numcont		integer;
		v_codfact 			character varying(25);
		v_numcont			character varying(25);

	BEGIN
		-- 1. Obtenemos el número máximo actual de numfact y lo incrementamos en 1
		SELECT 	COALESCE(MAX(numfact), 0) + 1 
		INTO 	out_numfact
		FROM 	public.cxc_factura;

		-- 2. Convertimos el número a string para obtener codfact
        v_codfact := out_numfact::text;

		-- 3. Obtenemos el número máximo actual de numcont y lo incrementamos en 1
		SELECT 	COALESCE(MAX(NULLIF(regexp_replace(split_part(numcont, '-', 2), '\D', '', 'g'), '')::integer),0) + 1 
		INTO 	v_next_numcont
		FROM 	public.cxc_factura;	

		-- 4. Reconstruimos el numcont con el formato '00-XXXXXXX' (7 dígitos)
		-- OJO OJO OJO - HAY QUE ESPECIFICAR CON ROBERT DE DONDE DE VA A SACAR EL NUMERO DE COMPROBANTE PARA LA FACTURA
		-- SI DEL TALONARIO, POR SUCURSAL O POR AÑO
		v_numcont := '00-' || LPAD(v_next_numcont::text, 7, '0');

		-- 5. Insertamos el registro y capturamos el ID autoincremental
		INSERT INTO public.cxc_factura
			(codemp, codproceso, numfact, codfact, numcont, id_cliente, id_transp, id_estfact, id_condpago, id_vend, 
			codmon, tascam, tipopecont, codcaj, fecfact, fecvenc, subtot, iva, otros, baseimp, total,
			descripfact, comentadifact, fecreg, usureg, horareg, codsuc, api_modulo, api_id_fact_origen)
		VALUES
			('0001', 'FACTURA', out_numfact, v_codfact, v_numcont, prm_id_cliente, 9, 1, 12, 1,
		 	'001', 1, 'DEV', '0001', prm_fecha_fact::date, prm_fecha_fact::date, prm_subtot, prm_iva, 0, prm_baseimp, prm_total,
			prm_descripfact, '', prm_fecha_fact::date, 'ADMINISTRADOR', prm_fecha_fact::time, '0001', 'SISPVEN', prm_idfacturaorigen)		
		RETURNING id_fact INTO out_id_fact;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_rpc_beneficiario(varchar, varchar, varchar, varchar, varchar);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_rpc_beneficiario(prm_rif character varying, prm_nombre character varying, prm_direccion character varying, prm_telefono character varying, prm_email character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_sc_cuenta	character 	varying(25);
		v_count					integer;		
	BEGIN
		-- OJO OJO OJO - BUSCAR EL NUMERO DE CUENTA
    	v_sc_cuenta := '2110199050001';

		-- 1. Buscamos si el beneficiario ya existe
    	SELECT 	COUNT(*) 
		INTO 	v_count
    	FROM 	public.rpc_beneficiario
    	WHERE 	TRIM(ced_bene) = TRIM(prm_rif)
    	LIMIT 	1;

		-- 2. Si no existe, 
    	IF v_count <= 0 THEN
			-- Insertamos el registro y capturamos el ID autoincremental
			INSERT INTO public.rpc_beneficiario
				(codemp, ced_bene, codpai, codest, codmun, codpar, nombene, dirbene, telbene, email, sc_cuenta, codbansig)
			VALUES
				('0001', prm_rif, '058', '001', '001', '001', prm_nombre, prm_direccion, prm_telefono, prm_email, v_sc_cuenta, '---');
		END IF;		
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_scg_dt_cmp(int4, varchar, varchar, varchar, varchar, timestamp, varchar, float8, float8, float8);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_scg_dt_cmp(prm_idfacturaorigen integer, prm_comprobante character varying, prm_cuenta_x_cobrar character varying, prm_cuenta_ingreso character varying, prm_cuenta_x_pagar_iva character varying, prm_fecha_fact timestamp without time zone, prm_descripcion character varying, prm_sub_total double precision, prm_iva double precision, prm_total double precision)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		-- 1. Insertamos el registro Contable - Cuenta por Cobrar (Débito)
		INSERT INTO public.scg_dt_cmp
			(codemp, procede, comprobante, fecha, sc_cuenta, procede_doc, documento, debhab, descripcion, monto, orden, api_modulo, api_id_fact_origen)
		VALUES
			('0001', 'CXCFAC', prm_comprobante, prm_fecha_fact::date, prm_cuenta_x_cobrar, 'CXCFAC', prm_comprobante, 'D', prm_descripcion, prm_total, 0, 'SISPVEN', prm_idfacturaorigen);

		-- 2. Insertamos el registro Contable - Cuenta de Ingreso (Crédito)
		INSERT INTO public.scg_dt_cmp
			(codemp, procede, comprobante, fecha, sc_cuenta, procede_doc, documento, debhab, descripcion, monto, orden, api_modulo, api_id_fact_origen)
		VALUES
			('0001', 'CXCFAC', prm_comprobante, prm_fecha_fact::date, prm_cuenta_ingreso, 'CXCFAC', prm_comprobante, 'H', prm_descripcion, prm_sub_total, 1, 'SISPVEN', prm_idfacturaorigen);

		-- 3. Insertamos el registro Contable - Cuenta IVA por Pagar (Crédito)
		INSERT INTO public.scg_dt_cmp
			(codemp, procede, comprobante, fecha, sc_cuenta, procede_doc, documento, debhab, descripcion, monto, orden, api_modulo, api_id_fact_origen)
		VALUES
			('0001', 'CXCFAC', prm_comprobante, prm_fecha_fact::date, prm_cuenta_x_pagar_iva, 'CXCFAC', prm_comprobante, 'H', prm_descripcion || ' - IVA', prm_iva, 2, 'SISPVEN', prm_idfacturaorigen);
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_servicios();

CREATE OR REPLACE FUNCTION public.fn_api_integracion_servicios()
 RETURNS TABLE(servicio_id integer, coddetalle character varying, nombre character varying, codunimed character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
		RETURN QUERY
		
		SELECT 
	        s.servicio_id::integer as servicio_id,
			s.coddetalle,
			s.nombre,
			s.codunimed
	    FROM 
	        public.api_integracion_servicios s;
		END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_sigesp_cmp(int4, varchar, timestamp, varchar, varchar, float8);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_sigesp_cmp(prm_idfacturaorigen integer, prm_comprobante character varying, prm_fecha_fact timestamp without time zone, prm_descripcion character varying, prm_rif character varying, prm_total double precision)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_comprobante 		varchar(30);
		v_descripcion 		text;
		v_scg_cuenta 		varchar(25);
		v_spicta 			varchar(25);

	BEGIN
		-- 1. Insertamos el registro
		INSERT INTO public.sigesp_cmp
			(codemp, procede, comprobante, fecha, descripcion, tipo_comp, tipo_destino, cod_pro, ced_bene, total, codusu, api_modulo, api_id_fact_origen)
		VALUES
			('0001', 'CXCFAC', prm_comprobante, prm_fecha_fact::date, prm_descripcion, 1, 'B', '----------', prm_rif, prm_total, 'ADMINISTRADOR', 'SISPVEN', prm_idfacturaorigen);	
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_spi_dt_cmp(int4, varchar, varchar, timestamp, varchar, float8);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_spi_dt_cmp(prm_idfacturaorigen integer, prm_comprobante character varying, prm_spi_cuenta character varying, prm_fecha_fact timestamp without time zone, prm_descripcion character varying, prm_sub_total double precision)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		-- 1. Insertamos el registro
		INSERT INTO public.spi_dt_cmp
			(codemp, procede, comprobante, fecha, spi_cuenta, procede_doc, documento, operacion, descripcion, monto, orden, api_modulo, api_id_fact_origen)
		VALUES
			('0001', 'CXCFAC', prm_comprobante, prm_fecha_fact::date, prm_spi_cuenta, 'CXCFAC', prm_comprobante, 'DEV', prm_descripcion, prm_sub_total, 1, 'SISPVEN', prm_idfacturaorigen);	
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_verifica_factura_enviada(int4);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_verifica_factura_enviada(prm_id_fact integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	DECLARE
		v_enviada boolean;
	BEGIN
		SELECT EXISTS (
			SELECT 	1 
			FROM 	public.api_integracion_documentos_cgi 
			WHERE 	id_fact = prm_id_fact
			AND		codtipdoc = 'FACTURA'
		) INTO v_enviada;
		
		RETURN v_enviada;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_verifica_factura_origen(int4);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_verifica_factura_origen(prm_id_fact_origen integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	DECLARE
		v_existe boolean;
	BEGIN
		SELECT EXISTS (
			SELECT 	1 
			FROM 	public.cxc_factura 
			WHERE 	api_id_fact_origen = prm_id_fact_origen
		) INTO v_existe;
		
		RETURN v_existe;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_verifica_nc_enviada(int4);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_verifica_nc_enviada(prm_id_doc integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	DECLARE
		v_enviada boolean;
	BEGIN
		SELECT EXISTS (
			SELECT 	1 
			FROM 	public.api_integracion_documentos_cgi 
			WHERE 	id_doc = prm_id_doc
			AND		codtipdoc = 'NC'
		) INTO v_enviada;
		
		RETURN v_enviada;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_patch_configuracion(text, text);

CREATE OR REPLACE FUNCTION public.fn_api_patch_configuracion(prm_id_cliente text, prm_key text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.api_configuracion 
    SET 
        -- Si prm_id_cliente viene vacío o null, mantiene el valor actual de la columna
        id_cliente = COALESCE(NULLIF(prm_id_cliente, ''), id_cliente),
        
        -- Si prm_key viene vacío o null, mantiene el valor actual de la columna
        "key" = COALESCE(NULLIF(prm_key, ''), "key");
END;
$function$
;

-- DROP FUNCTION public.fn_api_patch_configuracion_cgi(text, text, varchar, bool, text);

CREATE OR REPLACE FUNCTION public.fn_api_patch_configuracion_cgi(prm_id_cliente text, prm_key text, prm_aplicacion character varying, prm_activo boolean, prm_token text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.api_configuracion_cgi 
    SET 
        id_cliente = COALESCE(NULLIF(prm_id_cliente, ''), id_cliente),        
        "key" = COALESCE(NULLIF(prm_key, ''), "key"),
		aplicacion = COALESCE(NULLIF(prm_aplicacion, ''), aplicacion),
		activo = COALESCE(prm_activo, activo),
		token = COALESCE(NULLIF(prm_token, ''), token);
END;
$function$
;

-- DROP FUNCTION public.fn_api_post_configuracion(text, text);

CREATE OR REPLACE FUNCTION public.fn_api_post_configuracion(prm_id_cliente text, prm_key text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		INSERT INTO public.api_configuracion (id_cliente, key, token) 
		VALUES(prm_id_cliente, prm_key, null);

	END;
$function$
;

-- DROP FUNCTION public.fn_api_post_configuracion_cgi(text, text, varchar, bool);

CREATE OR REPLACE FUNCTION public.fn_api_post_configuracion_cgi(prm_id_cliente text, prm_key text, prm_aplicacion character varying, prm_activo boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		INSERT INTO public.api_configuracion_cgi (id_cliente, key, aplicacion, activo, token) 
		VALUES(prm_id_cliente, prm_key, prm_aplicacion, prm_activo, null);

	END;
$function$
;

-- DROP FUNCTION public.fn_api_post_integracion_documentos_fiscales(int4, int4, int4, varchar, varchar, text, varchar, varchar, int4);

CREATE OR REPLACE FUNCTION public.fn_api_post_integracion_documentos_fiscales(prm_id_fact integer, prm_numfact integer, prm_id_doc integer, prm_codtipdoc character varying, prm_num_control character varying, prm_url_pdf text, prm_codusu character varying, prm_modulo character varying, prm_id_fact_origen integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		INSERT INTO api_integracion_documentos_cgi 
			(id_fact, numfact, id_doc, codtipdoc, num_control, url_pdf, codusu, api_modulo, api_id_fact_origen) 
		VALUES 
			(prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu, prm_modulo, prm_id_fact_origen);
	END;
$function$
;

-- DROP FUNCTION public.fn_api_post_integracion_parametros(float8, timestamp);

CREATE OR REPLACE FUNCTION public.fn_api_post_integracion_parametros(prm_tasa_del_dia double precision, prm_fecha_tasa timestamp without time zone)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE 	public.api_integracion_parametros 
    SET		tasa_del_dia = prm_tasa_del_dia,        
        	fecha_tasa = prm_fecha_tasa::date;
END;
$function$
;

-- DROP FUNCTION public.fn_respaldo_api_integracion_cxc_factura(int4, int4, float8, float8, float8, float8, varchar, varchar);

CREATE OR REPLACE FUNCTION public.fn_respaldo_api_integracion_cxc_factura(prm_id_cliente integer, prm_idfacturaorigen integer, prm_subtot double precision, prm_baseimp double precision, prm_iva double precision, prm_total double precision, prm_descripfact character varying, prm_fecha_fact character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_id_fact			integer;
		v_next_numfact  	integer;
		v_next_numcont		integer;
		v_codfact 			character varying(25);
		v_numcont			character varying(25);

	BEGIN
		-- 1. Obtenemos el número máximo actual de numfact y lo incrementamos en 1
		SELECT 	COALESCE(MAX(numfact), 0) + 1 
		INTO 	v_next_numfact
		FROM 	public.cxc_factura;

		-- 2. Convertimos el número a string para obtener codfact
        v_codfact := v_next_numfact::text;

		-- 3. Obtenemos el número máximo actual de numcont y lo incrementamos en 1
		SELECT 	COALESCE(MAX(NULLIF(regexp_replace(split_part(numcont, '-', 2), '\D', '', 'g'), '')::integer),0) + 1 
		INTO 	v_next_numcont
		FROM 	public.cxc_factura;	

		-- 4. Reconstruimos el numcont con el formato '00-XXXXXXX' (7 dígitos)
		-- OJO OJO OJO - HAY QUE ESPECIFICAR CON ROBERT DE DONDE DE VA A SACAR EL NUMERO DE COMPROBANTE PARA LA FACTURA
		-- SI DEL TALONARIO, POR SUCURSAL O POR AÑO
		v_numcont := '00-' || LPAD(v_next_numcont::text, 7, '0');

		-- 5. Insertamos el registro y capturamos el ID autoincremental
		INSERT INTO public.cxc_factura
			(codemp, codproceso, numfact, codfact, numcont, id_cliente, id_transp, id_estfact, id_condpago, id_vend, 
			codmon, tascam, tipopecont, codcaj, fecfact, fecvenc, subtot, iva, otros, baseimp, total,
			descripfact, comentadifact, fecreg, usureg, horareg, codsuc)
		VALUES
			('0001', 'FACTURA', v_next_numfact, v_codfact, v_numcont, prm_id_cliente, 9, 1, 12, 1,
		 	'001', 1, 'DEV', '0001', prm_fecha_fact, prm_fecha_fact, prm_subtot, prm_iva, 0, prm_baseimp, prm_total,
			prm_descripfact, '', TO_CHAR(NOW(), 'YYYY-MM-DD'), 'ADMINISTRADOR', TO_CHAR(NOW(), 'HH24:MI:SS'), '0001')		
		RETURNING id_fact INTO v_id_fact;
	
		-- 6. Retornamos el id_fact
    	RETURN v_id_fact;
	END;
$function$
;