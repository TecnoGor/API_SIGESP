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

-- DROP FUNCTION public.fn_api_integracion_cxc_clientes(varchar, varchar, varchar, varchar, int4, varchar, varchar, int4, int4, int4, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, date, date, varchar, time);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_cxc_clientes(prm_codemp character varying, prm_tipperrif character varying, prm_numpririf character varying, prm_numterrif character varying, prm_id_tipo_cliente integer, prm_nombre_cliente character varying, prm_cliente_abvr character varying, prm_id_zona integer, prm_id_vend integer, prm_id_clasif_cliente integer, prm_dircliente character varying, prm_direntrega character varying, prm_codpai character varying, prm_codest character varying, prm_codmun character varying, prm_codpar character varying, prm_codciu character varying, prm_codpostal character varying, prm_faxcliente character varying, prm_telcliente character varying, prm_emailcliente character varying, prm_webcliente character varying, prm_observcliente character varying, prm_estclient character varying, prm_nombreresp character varying, prm_cargoresp character varying, prm_emailresp character varying, prm_fecregcliente date, prm_fecreg date, prm_usureg character varying, prm_horareg time without time zone)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_id_cliente 	integer;
		v_next_num   	integer;
		v_codcliente 	character varying(20);

	BEGIN
		-- 1. Buscamos si el cliente ya existe y obtenemos su ID
    	SELECT 	id_cliente 
		INTO 	v_id_cliente
    	FROM 	public.cxc_clientes
    	WHERE 	TRIM(numpririf) = TRIM(prm_numpririf)
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
	            (prm_codemp, v_codcliente, prm_tipperrif, prm_numpririf, prm_numterrif, prm_id_tipo_cliente, prm_nombre_cliente, prm_cliente_abvr,	
				prm_id_zona, prm_id_vend, prm_id_clasif_cliente, prm_dircliente, prm_direntrega, prm_codpai, prm_codest, prm_codmun, prm_codpar, prm_codciu,	
				prm_codpostal, prm_faxcliente, prm_telcliente, prm_emailcliente, prm_webcliente, prm_observcliente, prm_estclient, prm_nombreresp, 
				prm_cargoresp, prm_emailresp, prm_fecregcliente, prm_fecreg, prm_usureg, prm_horareg)
	        RETURNING id_cliente INTO v_id_cliente;			
		END IF;

		-- 3. Retornamos el id_cliente (existente o recién creado)
    	RETURN v_id_cliente;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_cxc_detalle(int4, varchar, varchar, int4, varchar, varchar, varchar, float8, float8, float8, float8, float8, varchar, varchar, float8, float8);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_cxc_detalle(prm_id_fact integer, prm_id_tipodetalle character varying, prm_codproceso character varying, prm_renglon integer, prm_coddetalle character varying, prm_codunimed character varying, prm_codalm character varying, prm_cantidad_detalle double precision, prm_precio_detalle double precision, prm_porciva double precision, prm_iva_detalle double precision, prm_neto_detalle double precision, prm_comentario character varying, prm_codproc character varying, prm_canmay double precision, prm_precioneto_detalle double precision)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		-- 1. Insertamos el registro
		INSERT INTO public.cxc_detalle
			(id_fact, id_tipodetalle, codproceso, renglon, coddetalle, codunimed, codalm, cantidad_detalle, 
			precio_detalle, porciva, iva_detalle, neto_detalle, comentario, codproc, canmay, precioneto_detalle)
		VALUES
			(prm_id_fact, prm_id_tipodetalle, prm_codproceso, prm_renglon, prm_coddetalle, prm_codunimed, prm_codalm, prm_cantidad_detalle,  
			prm_precio_detalle, prm_porciva, prm_iva_detalle, prm_neto_detalle, prm_comentario, prm_codproc, prm_canmay, prm_precioneto_detalle);
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_cxc_dt_cargos(varchar, int4, varchar, float8, float8, float8, int4);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_cxc_dt_cargos(prm_codemp character varying, prm_id_fact integer, prm_codproceso character varying, prm_monbasimp double precision, prm_monimp double precision, prm_montot double precision, prm_id_doc integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_codcar			bpchar(5);
		v_formula			varchar(254);
		v_porcar 			float8;
		v_scg_cuenta 		varchar(25);
		v_spicta 			varchar(25);

	BEGIN
		--
		v_codcar := '10091';
		
		SELECT	c.codcar, c.formula, c.porcar, c.scg_cuenta, c.spicta 
		INTO 	v_codcar, v_formula, v_porcar, v_scg_cuenta, v_spicta			
		FROM 	public.sigesp_cargos c
		WHERE 	c.codemp = prm_codemp
		AND		c.codcar = v_codcar
		AND		TRIM(c.dencar) = 'IVA';

		-- 1. Insertamos el registro
		INSERT INTO public.cxc_dt_cargos
			(codemp, id_fact, codproceso, codcar, formula, porcar, monbasimp, monimp, montot, scg_cuenta, spi_cuenta, id_doc)
		VALUES
			(prm_codemp, prm_id_fact, prm_codproceso, v_codcar, v_formula, v_porcar, prm_monbasimp, prm_monimp, prm_montot, v_scg_cuenta, v_spicta, prm_id_doc);
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_cxc_factura(varchar, varchar, int4, int4, int4, int4, int4, varchar, float8, varchar, varchar, date, date, float8, float8, float8, float8, float8, varchar, varchar, date, varchar, time, varchar);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_cxc_factura(prm_codemp character varying, prm_codproceso character varying, prm_id_cliente integer, prm_id_transp integer, prm_id_estfact integer, prm_id_condpago integer, prm_id_vend integer, prm_codmon character varying, prm_tascam double precision, prm_tipopecont character varying, prm_codcaj character varying, prm_fecfact date, prm_fecvenc date, prm_subtot double precision, prm_iva double precision, prm_otros double precision, prm_baseimp double precision, prm_total double precision, prm_descripfact character varying, prm_comentadifact character varying, prm_fecreg date, prm_usureg character varying, prm_horareg time without time zone, prm_codsuc character varying)
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
		v_numcont := '00-' || LPAD(v_next_numcont::text, 7, '0');

		-- 5. Insertamos el registro y capturamos el ID autoincremental
		INSERT INTO public.cxc_factura
			(codemp, codproceso, numfact, codfact, numcont, id_cliente, id_transp, id_estfact, id_condpago, id_vend, 
			codmon, tascam, tipopecont, codcaj, fecfact, fecvenc, subtot, iva, otros, baseimp, total,
			descripfact, comentadifact, fecreg, usureg, horareg, codsuc)
		VALUES
			(prm_codemp, prm_codproceso, v_next_numfact, v_codfact, v_numcont, prm_id_cliente, prm_id_transp, prm_id_estfact, prm_id_condpago, prm_id_vend,
		 	prm_codmon, prm_tascam, prm_tipopecont, prm_codcaj, prm_fecfact, prm_fecvenc, prm_subtot, prm_iva, prm_otros, prm_baseimp, prm_total,
			prm_descripfact, prm_comentadifact, prm_fecreg, prm_usureg, prm_horareg, prm_codsuc)		
		RETURNING id_fact INTO v_id_fact;

		-- 6. Retornamos el id_fact
    	RETURN v_id_fact;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_integracion_sigesp_cmp(varchar, varchar, float8, varchar, varchar);

CREATE OR REPLACE FUNCTION public.fn_api_integracion_sigesp_cmp(prm_codemp character varying, prm_ced_bene character varying, prm_total double precision, prm_codusu character varying, prm_proc_reg character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	DECLARE 
		v_procede 			bpchar(6);
		v_comprobante 		varchar(30);
		v_descripcion 		text;
		v_scg_cuenta 		varchar(25);
		v_spicta 			varchar(25);

	BEGIN


		-- 1. Insertamos el registro
		INSERT INTO public.cxc_dt_cargos
			(codemp, id_fact, codproceso, codcar, formula, porcar, monbasimp, monimp, montot, scg_cuenta, spi_cuenta, id_doc)
		VALUES
			(prm_codemp, prm_id_fact, prm_codproceso, v_codcar, v_formula, v_porcar, prm_monbasimp, prm_monimp, prm_montot, v_scg_cuenta, v_spicta, prm_id_doc);

/*
CREATE TABLE public.sigesp_cmp (
	codemp 				bpchar(4) NOT NULL,
	procede 			bpchar(6) NOT NULL,
	comprobante 		varchar(30) NOT NULL,
	fecha 				date NOT NULL,
	--codban 				bpchar(3) DEFAULT '---'::bpchar NOT NULL,
	-- ctaban 				bpchar(25) DEFAULT '-------------------------'::bpchar NOT NULL,
	descripcion 		text NOT NULL,
	tipo_comp 			int2 NOT NULL,
	tipo_destino 		varchar(1) NOT NULL,
	cod_pro 			bpchar(10) NOT NULL,
	ced_bene 			bpchar(10) NOT NULL,
	total 				float8 NOT NULL,
	-- numpolcon 			float8 DEFAULT 0::double precision NULL,
	-- esttrfcmp 			int2 DEFAULT 0 NULL,
	-- estrenfon 			bpchar(1) DEFAULT '0'::bpchar NULL,
	-- codfuefin 			bpchar(2) DEFAULT '--'::bpchar NULL,
	codusu 				bpchar(30) NULL,
	--proc_reg 			varchar(15) DEFAULT 'SISTEMA'::character varying NULL,
	--codcencos 			bpchar(3) DEFAULT '---'::bpchar NOT NULL,
	--numconcom 			bpchar(15) NULL,
);
		*/
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

-- DROP FUNCTION public.fn_api_post_integracion_documentos_fiscales(int4, int4, int4, varchar, varchar, text, bpchar);

CREATE OR REPLACE FUNCTION public.fn_api_post_integracion_documentos_fiscales(prm_id_fact integer, prm_numfact integer, prm_id_doc integer, prm_codtipdoc character varying, prm_num_control character varying, prm_url_pdf text, prm_codusu character)
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