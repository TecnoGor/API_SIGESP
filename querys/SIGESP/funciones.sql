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
 RETURNS TABLE(numfact integer, coddetalle character varying, "nombreProducto" character varying, "descripcionProducto" character varying, "tipoImpuesto" character varying, "cantidadAdquirida" numeric, "precioProducto" character varying, numpririf character varying, nombre_cliente character varying, emailcliente character varying, dircliente character varying, telcliente character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY
	
		SELECT
			f.numfact,
			
			d.coddetalle,
						
			UPPER(COALESCE(
				NULLIF(
					CASE 
						WHEN d.id_tipodetalle = 'SERVI' THEN s.denser 
						WHEN d.id_tipodetalle = 'ARTIC' THEN a.denart 
						WHEN d.id_tipodetalle = 'CONCE' THEN c.denconfac 
						ELSE '' 
					END, ''
				), 'Producto sin nombre'
			))::varchar AS "nombreProducto",
			
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
			        ), 'Producto sin nombre'
			    ),
			    NULLIF(d.comentario, '')
			))::varchar AS "descripcionProducto",
			
			(CASE 
			    WHEN d.porciva IS NULL THEN 'G'
			    WHEN d.porciva::INT = 16 THEN 'G'
			    WHEN d.porciva::INT = 8  THEN 'R'
			    WHEN d.porciva::INT = 31 THEN 'A'
			    ELSE 'E'
			END)::varchar AS "tipoImpuesto",
		
			COALESCE(d.cantidad_detalle, 1.00)::numeric(12,2) AS "cantidadAdquirida",
			TO_CHAR(COALESCE(d.precio_detalle, 0.00), 'FM999999990.00')::varchar AS "precioProducto",
			
			UPPER(COALESCE(NULLIF(cl.tipperrif, ''), 'V') || COALESCE(NULLIF(cl.numpririf, ''), '00000000'))::varchar AS numpririf,    
			UPPER(COALESCE(NULLIF(cl.nombre_cliente, ''), 'Cliente no especificado'))::varchar AS nombre_cliente,			
			UPPER(COALESCE(NULLIF(cl.emailcliente, ''), 'mail@gmail.com'))::varchar AS emailcliente,
			UPPER(COALESCE(NULLIF(cl.dircliente, ''), 'Dirección no especificada'))::varchar AS dircliente,
			COALESCE(NULLIF(cl.telcliente, ''), '0000000000')::varchar AS telcliente    
		FROM 
			cxc_detalle d 
			INNER JOIN cxc_factura f ON f.id_fact = d.id_fact AND f.codproceso = d.codproceso 
			INNER JOIN cxc_clientes cl ON cl.id_cliente = f.id_cliente 
			LEFT JOIN siv_articulo a ON a.codart=d.coddetalle AND f.codemp = a.codemp AND d.id_tipodetalle = 'ARTIC' 
			LEFT JOIN soc_servicios s ON s.codser=d.coddetalle AND d.id_tipodetalle = 'SERVI' 
			LEFT JOIN cxc_conceptofac c ON c.codconfac=d.coddetalle AND d.id_tipodetalle = 'CONCE'			 
		WHERE  
			d.codproceso='FACTURA' 
		AND d.id_fact=prm_id_fact
		ORDER BY 
			d.coddetalle;

	END;
$function$
;

-- DROP FUNCTION public.fn_api_get_nota_credito(int4);

CREATE OR REPLACE FUNCTION public.fn_api_get_nota_credito(prm_id_doc integer)
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

-- DROP FUNCTION public.fn_api_post_integracion_documentos(int4, int4, int4, varchar, varchar, text, bpchar);

CREATE OR REPLACE FUNCTION public.fn_api_post_integracion_documentos(prm_id_fact integer, prm_numfact integer, prm_id_doc integer, prm_codtipdoc character varying, prm_num_control character varying, prm_url_pdf text, prm_codusu character)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		INSERT INTO api_integracion_documentos_cgi 
			(id_fact, numfact, id_doc, codtipdoc, num_control, url_pdf, codusu) 
		VALUES 
			(prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_codusu);		
	END;
$function$
;