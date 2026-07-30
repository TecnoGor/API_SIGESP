-- DROP FUNCTION public.fn_api_contingencia_documentos_enviados(int4, varchar, varchar, varchar, text, timestamptz);

CREATE OR REPLACE FUNCTION public.fn_api_contingencia_documentos_enviados(prm_numfact integer, prm_coddoc character varying, prm_codtipdoc character varying, prm_num_control character varying, prm_url_pdf text, prm_fecreg timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	DECLARE
	    -- 1. Se deben declarar las variables locales antes del BEGIN
	    VAR_ID_FACT INTEGER;
	    VAR_ID_DOC  INTEGER;
	    VAR_NUMFACT INTEGER;
	    VAR_COUNT   INTEGER;

	BEGIN
	    IF (prm_codtipdoc = 'FACTURA') THEN
			-- Busca el id de la factura en la tabla cxc_factura
			SELECT f.id_fact INTO VAR_ID_FACT FROM cxc_factura f WHERE f.numfact = prm_numfact;

			-- Busca el id de la factura en la tabla cxc_factura
			SELECT COUNT(*) INTO VAR_COUNT FROM api_integracion_documentos_cgi i WHERE i.id_fact = VAR_ID_FACT AND i.numfact = prm_numfact AND i.codtipdoc = prm_codtipdoc;

		    IF (VAR_COUNT <= 0 ) THEN
				INSERT INTO api_integracion_documentos_cgi (id_fact, numfact, id_doc, codtipdoc, num_control, url_pdf, fecreg) 
				VALUES (VAR_ID_FACT, prm_numfact, null, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_fecreg);		
			END IF;
		ELSE
			-- Busca el id de la note de credito en la tabla cxc_documento
			SELECT 	d.id_fact, d.id_doc, f.numfact 
			INTO 	VAR_ID_FACT, VAR_ID_DOC, VAR_NUMFACT 
			FROM 	cxc_documento d 
					INNER JOIN cxc_factura f ON d.id_fact = f.id_fact 
			WHERE 	d.coddoc = prm_coddoc;

			-- Busca el id de la factura en la tabla cxc_factura
			SELECT COUNT(*) INTO VAR_COUNT FROM api_integracion_documentos_cgi i WHERE i.id_fact = VAR_ID_FACT AND i.id_doc = VAR_ID_DOC AND i.codtipdoc = prm_codtipdoc;

			IF (VAR_COUNT <= 0 ) THEN
				INSERT INTO api_integracion_documentos_cgi (id_fact, numfact, id_doc, codtipdoc, num_control, url_pdf, fecreg) 
				VALUES (VAR_ID_FACT, VAR_NUMFACT, VAR_ID_DOC, prm_codtipdoc, prm_num_control, prm_url_pdf, prm_fecreg);		
			END IF;	
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

-- DROP FUNCTION public.fn_api_patch_configuracion_cgi(text, text, varchar, bool);

CREATE OR REPLACE FUNCTION public.fn_api_patch_configuracion_cgi(prm_id_cliente text, prm_key text, prm_aplicacion character varying, prm_activo boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.api_configuracion_cgi 
    SET 
        id_cliente = COALESCE(NULLIF(prm_id_cliente, ''), id_cliente),        
        "key" = COALESCE(NULLIF(prm_key, ''), "key"),
		aplicacion = COALESCE(NULLIF(prm_aplicacion, ''), aplicacion),
		activo = COALESCE(prm_activo, activo);
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

-- DROP FUNCTION public.fn_api_post_integracion_documentos(int4, int4, int4, varchar, varchar, text);

CREATE OR REPLACE FUNCTION public.fn_api_post_integracion_documentos(prm_id_fact integer, prm_numfact integer, prm_id_doc integer, prm_codtipdoc character varying, prm_num_control character varying, prm_url_pdf text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		INSERT INTO api_integracion_documentos_cgi (id_fact, numfact, id_doc, codtipdoc, num_control, url_pdf) 
		VALUES (prm_id_fact, prm_numfact, prm_id_doc, prm_codtipdoc, prm_num_control, prm_url_pdf);		
	END;
$function$
;