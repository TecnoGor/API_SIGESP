-- DROP FUNCTION public.fn_api_sigesp_get_factura_anular(int4);

CREATE OR REPLACE FUNCTION public.fn_api_sigesp_get_factura_anular(prm_id_fact integer)
 RETURNS TABLE(numfact integer, num_control character varying)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY
	
		SELECT
			i.numfact,			
			i.num_control    
		FROM 
			api_integracion_documentos_fiscales as i			 
		WHERE  
			i.codtipdoc = 'FACTURA'
		AND	i.id_fact=prm_id_fact;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_sigesp_get_factura_detalle(int4);

CREATE OR REPLACE FUNCTION public.fn_api_sigesp_get_factura_detalle(prm_id_fact integer)
 RETURNS TABLE(numero_serie character varying, numfact character varying, coddetalle character varying, "nombreProducto" character varying, "descripcionProducto" character varying, "tipoImpuesto" character varying, "cantidadAdquirida" numeric, "precioProducto" character varying, numpririf character varying, nombre_cliente character varying, emailcliente character varying, dircliente character varying, telcliente character varying, tasa_del_dia character varying, fecha_tasa character varying, num_control character varying, estado character varying, observacion text)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY
	
		SELECT
			'A'::varchar AS numero_serie, 

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
			
			-- 8. Documento RIF sin espacios
			UPPER(TRIM(COALESCE(NULLIF(cl.tipperrif, ''), 'V') || TRIM(COALESCE(NULLIF(cl.numpririf, ''), '00000000')) || COALESCE(NULLIF(cl.numterrif, ''), '')))::varchar AS numpririf,
			
			-- 9. Datos del cliente sanitizados
		    UPPER(TRIM(COALESCE(NULLIF(cl.nombre_cliente, ''), 'CLIENTE NO ESPECIFICADO')))::varchar AS nombre_cliente,			
		    UPPER(TRIM(COALESCE(cl.emailcliente, '')))::varchar AS emailcliente,
		    UPPER(TRIM(COALESCE(NULLIF(cl.dircliente, ''), 'DIRECCIÓN NO ESPECIFICADA')))::varchar AS dircliente,
			SUBSTRING(regexp_replace(TRIM(COALESCE(cl.telcliente, '00000000000')), '[^a-zA-Z0-9]', '', 'g'), 1, 11) ::varchar AS telcliente,
			
			-- 10. Datos de la tasa de las divisas
			TO_CHAR(ph.valor_nuevo::numeric, 'FM000.0000')::varchar AS tasa_del_dia,
			TO_CHAR(ph.fecha_cambio, 'YYYY-MM-DD')::varchar AS fecha_tasa,	
		
			-- 11. Numero de Control sin espacios
			TRIM(idc.num_control)::varchar AS num_control,

			UPPER(TRIM(COALESCE(idc.estado, '')))::varchar AS estado,
			UPPER(TRIM(COALESCE(idc.observacion, '')))::text AS observacion	
		FROM 
			cxc_detalle d 
			INNER JOIN cxc_factura f ON f.id_fact = d.id_fact AND f.codproceso = d.codproceso 
			INNER JOIN cxc_clientes cl ON cl.id_cliente = f.id_cliente 
			LEFT JOIN siv_articulo a ON a.codart=d.coddetalle AND f.codemp = a.codemp AND d.id_tipodetalle = 'ARTIC' 
			LEFT JOIN soc_servicios s ON s.codser=d.coddetalle AND d.id_tipodetalle = 'SERVI' 
			LEFT JOIN cxc_conceptofac c ON c.codconfac=d.coddetalle AND d.id_tipodetalle = 'CONCE'
			LEFT JOIN api_integracion_documentos_fiscales idc ON idc.numfact = f.numfact AND idc.id_fact = f.id_fact AND idc.codtipdoc = 'FACTURA'
			LEFT JOIN parametro p ON p.codigo_iso = 'USD'
			LEFT JOIN public.parametros_historicos ph ON ph.parametro_id = p.parametro_id AND (ph.fecha_cambio::date) = (f.fecfact::date)
		WHERE  
			f.codproceso='FACTURA' 
		AND f.id_fact=prm_id_fact		
		ORDER BY 
			d.coddetalle;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_sigesp_get_nota_credito_detalle(int4);

CREATE OR REPLACE FUNCTION public.fn_api_sigesp_get_nota_credito_detalle(prm_id_doc integer)
 RETURNS TABLE(numfact character varying, id_doc integer, coddoc character varying, numdoc integer, id_fact integer, motivo character varying, coddetalle character varying, cantidad_detdoc numeric, descripcion character varying, num_control character varying, estado character varying, observacion text)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			-- 1. Número de Factura (Solo dígitos, formateado y recortado a 19 chars)
			SUBSTRING(regexp_replace(LPAD(f.numfact::text, 7, '0'), '\D', '', 'g'), 1, 19)::varchar AS numfact,
			
			doc.id_doc,
		
			-- 2. Código recortado a 19 caracteres máximo (Regla API)
			SUBSTRING(regexp_replace(TRIM(doc.coddoc), '\D', '', 'g'), 1, 19)::varchar AS coddoc,
		
		    doc.numdoc,
		    doc.id_fact,
		    
		    -- 3. Motivo de la Nota d Credito (Recortar a 50)
			SUBSTRING(UPPER(COALESCE(TRIM(NULLIF(doc.descripdoc, '')), null)), 1, 50)::varchar AS motivo,    
		    
		    dtn.coddetalle,
		    dtn.cantidad_detdoc,
		
		    -- 4. Descripción (Asegurar valor por defecto si viene vacío y recortar a 50)
			SUBSTRING(
			    UPPER(COALESCE(
			        NULLIF(
			            CONCAT_WS(
			                ' - ',
			                NULLIF(
			                    CASE 
			                        WHEN dtn.id_tipodetalle = 'SERVI' THEN s.denser 
			                        WHEN dtn.id_tipodetalle = 'ARTIC' THEN a.denart
			                        ELSE '' 
			                    END, ''
			                ),
			                NULLIF(dtn.comentdoc, '')
			            ), ''
			        ), 'Producto sin nombre'
			    )), 1, 50
			)::varchar AS descripcion,
			
			-- 5. Numero de Control sin espacios
			TRIM(idc.num_control)::varchar AS num_control,

			UPPER(TRIM(COALESCE(idc.estado, '')))::varchar AS estado,
			UPPER(TRIM(COALESCE(idc.observacion, '')))::text AS observacion	
		FROM 
			cxc_documento doc
			INNER JOIN cxc_dt_documento dtn ON doc.id_doc = dtn.id_doc
			INNER JOIN cxc_factura f ON doc.id_fact = f.id_fact
			LEFT JOIN siv_articulo a ON dtn.coddetalle = a.codart
			LEFT JOIN soc_servicios s ON dtn.coddetalle = s.codser
			LEFT JOIN api_integracion_documentos_fiscales idc ON idc.numfact = f.numfact AND idc.id_fact = f.id_fact AND idc.id_doc = doc.id_doc AND idc.codtipdoc = 'NC'
		WHERE 
		    doc.codemp = '0001'
		AND	doc.id_doc = prm_id_doc;		
	END;
$function$
;

-- DROP FUNCTION public.fn_api_sigesp_get_retencion_islr_detalle(bpchar);

CREATE OR REPLACE FUNCTION public.fn_api_sigesp_get_retencion_islr_detalle(prm_numcom character)
 RETURNS TABLE(numcom character varying, numsol character varying, numope character varying, numfac character varying, numcon character varying, fecfac character varying, cmp_codret character varying, consol text, totcmp_con_iva character varying, basimp character varying, sustraendo character varying, porded character varying, cmp_monret character varying, rif character varying, nomsujret character varying, email character varying, dirsujret character varying, telefono character varying, id_codigo_ret character varying, num_control character varying, cantidad_doc_ret integer, estado character varying, observacion text)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			UPPER(TRIM(cmp.numcom))::varchar as numcom,
			UPPER(TRIM(sol.numsol))::varchar as numsol,	
			UPPER(TRIM(dt.numope))::varchar as numope,
			TRIM(dt.numfac)::varchar AS numfac,
			TRIM(dt.numcon)::varchar AS numcon,	
			TO_CHAR(dt.fecfac, 'YYYY-MM-DD')::varchar AS fecfac,
			TRIM(dt.cmp_codret)::varchar AS cmp_codret,
			UPPER(TRIM(sol.consol))::text AS consol,	
			REPLACE(TO_CHAR(COALESCE(dt.totcmp_con_iva, 0.00), 'FM999999990.00'), '.', ',')::varchar AS totcmp_con_iva,
		  	REPLACE(TO_CHAR(COALESCE(dt.basimp, 0.00), 'FM999999990.00'), '.', ',')::varchar AS basimp,
		  	
		  	-- 1 SUSTRAENDO CONDICIONAL: 0 para Jurídicas (J, G, C), d.monded para Naturales (V, E, P)
		  	CASE 
		  		WHEN UPPER(LEFT(regexp_replace(cmp.rif, '[^a-zA-Z0-9]', '', 'g'), 1)) IN ('J', 'G', 'C') THEN '0,00'
		  		ELSE REPLACE(TO_CHAR(COALESCE(d.monded, 0.00), 'FM999999990.00'), '.', ',')
		  	END::varchar AS sustraendo,
		  	
		  	CONCAT(d.porded, '%')::varchar AS porded,
		  	REPLACE(TO_CHAR(COALESCE(dt.cmp_monret, 0.00), 'FM999999990.00'), '.', ',')::varchar AS cmp_monret,
			
		  	-- 2. RIF sanitizado (Elimina caracteres especiales)
			UPPER(regexp_replace(cmp.rif, '[^a-zA-Z0-9]', '', 'g'))::varchar AS rif,
			
			UPPER(TRIM(COALESCE(NULLIF(cmp.nomsujret, ''), 'CLIENTE NO ESPECIFICADO')))::varchar AS nomsujret,		
		
			UPPER(
				TRIM(
					COALESCE(
						NULLIF(
							CASE 
								WHEN sol.tipproben = 'P' THEN pro.email
								WHEN sol.tipproben = 'B' THEN ben.email
								ELSE '' 
							END, ''
						), ''
					)
				)
			)::varchar AS email,	
			
			UPPER(TRIM(COALESCE(NULLIF(cmp.dirsujret, ''), 'DIRECCIÓN NO ESPECIFICADA')))::varchar AS dirsujret,
				
			SUBSTRING(
				regexp_replace(
					TRIM(
						COALESCE(
							CASE 
				                WHEN sol.tipproben = 'P' THEN pro.telpro
				                WHEN sol.tipproben = 'B' THEN ben.telbene
				                ELSE '' 
				            END, '00000000000'
						)
					), '[^a-zA-Z0-9]', '', 'g'
				), 1, 11
			) ::varchar AS telefono,
			
			icr.codigo::varchar AS id_codigo_ret,
		
			-- 3. Numero de Control sin espacios
			TRIM(idr.num_control)::varchar AS num_control,
			
			p.cantidad_doc_ret,

			UPPER(TRIM(COALESCE(idr.estado, '')))::varchar AS estado,
			UPPER(TRIM(COALESCE(idr.observacion, '')))::text AS observacion	
		FROM 	
			scb_cmp_ret cmp
			INNER JOIN scb_dt_cmp_ret dt ON cmp.codemp = dt.codemp AND cmp.codret = dt.codret AND cmp.numcom = dt.numcom AND cmp.tipsolpag = dt.tipsolpag
			INNER JOIN cxp_solicitudes sol ON dt.codemp = sol.codemp AND dt.numsop = sol.numsol
			INNER JOIN sigesp_deducciones d ON dt.cmp_codret = d.codded and dt.codemp = d.codemp	
			LEFT JOIN api_integracion_documentos_retenciones idr ON idr.numcom = dt.numcom AND idr.numsol = dt.numsop AND idr.codtipdoc = 'ISLR'	
			LEFT JOIN api_integracion_codigos_ret_islr icr ON icr.cmp_codret = dt.cmp_codret
			LEFT JOIN api_integracion_parametros p ON TRUE	
			LEFT JOIN rpc_proveedor pro ON sol.tipproben = 'P' AND sol.codemp = pro.codemp AND sol.cod_pro = pro.cod_pro
			LEFT JOIN rpc_beneficiario ben ON sol.tipproben = 'B' AND sol.codemp = ben.codemp AND sol.ced_bene = ben.ced_bene	
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

-- DROP FUNCTION public.fn_api_sigesp_get_retencion_iva_detalle(bpchar);

CREATE OR REPLACE FUNCTION public.fn_api_sigesp_get_retencion_iva_detalle(prm_numcom character)
 RETURNS TABLE(numcom character varying, numsol character varying, numope character varying, numfac character varying, numcon character varying, fecfac character varying, nota_credito character varying, nota_debito character varying, factura_afectada character varying, totcmp_con_iva character varying, compsinderiva character varying, basimp character varying, porimp character varying, porded character varying, rif character varying, nomsujret character varying, email character varying, dirsujret character varying, telefono character varying, num_control character varying, cantidad_doc_ret integer, estado character varying, observacion text)
 LANGUAGE plpgsql
AS $function$
	BEGIN
	    RETURN QUERY

		SELECT
			UPPER(TRIM(cmp.numcom))::varchar as numcom,
			UPPER(TRIM(sol.numsol))::varchar as numsol,	
			UPPER(TRIM(dt.numope))::varchar as numope,
			TRIM(dt.numfac)::varchar AS numfac,
			TRIM(dt.numcon)::varchar AS numcon,	
			TO_CHAR(dt.fecfac, 'YYYY-MM-DD')::varchar AS fecfac,	
			'N/A'::varchar AS nota_credito,
			'N/A'::varchar AS nota_debito,
			'N/A'::varchar AS factura_afectada,
			REPLACE(TO_CHAR(COALESCE(dt.totcmp_con_iva, 0.00), 'FM999999990.00'), '.', ',')::varchar AS totcmp_con_iva,
			REPLACE(TO_CHAR(COALESCE(0.00, 0.00), 'FM999999990.00'), '.', ',')::varchar AS compsinderiva,
			REPLACE(TO_CHAR(COALESCE(dt.basimp, 0.00), 'FM999999990.00'), '.', ',')::varchar AS basimp,	
			concat(REPLACE(TO_CHAR(COALESCE(dt.porimp, 0.00), 'FM999999990.00'), '.', ','), '%')::varchar AS porimp,
			CONCAT(d.porded, '%')::varchar AS porded,
			
			-- 1. RIF sanitizado (Elimina caracteres especiales)
			UPPER(regexp_replace(cmp.rif, '[^a-zA-Z0-9]', '', 'g'))::varchar AS rif,
			
			
			UPPER(TRIM(COALESCE(NULLIF(cmp.nomsujret, ''), 'CLIENTE NO ESPECIFICADO')))::varchar AS nomsujret, 	
			
			UPPER(
				TRIM(
					COALESCE(
						NULLIF(
							CASE 
								WHEN sol.tipproben = 'P' THEN pro.email
								WHEN sol.tipproben = 'B' THEN ben.email
								ELSE '' 
							END, ''
						), ''
					)
				)
			)::varchar AS email,
			
			UPPER(TRIM(COALESCE(NULLIF(cmp.dirsujret, ''), 'DIRECCIÓN NO ESPECIFICADA')))::varchar AS dirsujret,
		
			SUBSTRING(
				regexp_replace(
					TRIM(
						COALESCE(
							CASE 
				                WHEN sol.tipproben = 'P' THEN pro.telpro
				                WHEN sol.tipproben = 'B' THEN ben.telbene
				                ELSE '' 
				            END, '00000000000'
						)
					), '[^a-zA-Z0-9]', '', 'g'
				), 1, 11
			) ::varchar AS telefono,
			
			-- 2. Numero de Control sin espacios
			TRIM(idr.num_control)::varchar AS num_control,
			
			p.cantidad_doc_ret,

			UPPER(TRIM(COALESCE(idr.estado, '')))::varchar AS estado,
			UPPER(TRIM(COALESCE(idr.observacion, '')))::text AS observacion	
		FROM 	
			scb_cmp_ret cmp
			INNER JOIN scb_dt_cmp_ret dt ON cmp.codemp = dt.codemp AND cmp.codret = dt.codret AND cmp.numcom = dt.numcom AND cmp.tipsolpag = dt.tipsolpag
			INNER JOIN cxp_solicitudes sol ON dt.codemp = sol.codemp AND dt.numsop = sol.numsol
			INNER JOIN sigesp_deducciones d ON dt.cmp_codret = d.codded and dt.codemp = d.codemp
			LEFT JOIN api_integracion_documentos_retenciones idr ON idr.numcom = dt.numcom AND idr.numsol = dt.numsop AND idr.codtipdoc = 'IVA'
			LEFT JOIN api_integracion_parametros p ON TRUE	
			LEFT JOIN rpc_proveedor pro ON sol.tipproben = 'P' AND sol.codemp = pro.codemp AND sol.cod_pro = pro.cod_pro
			LEFT JOIN rpc_beneficiario ben ON sol.tipproben = 'B' AND sol.codemp = ben.codemp AND sol.ced_bene = ben.ced_bene
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

-- DROP FUNCTION public.fn_api_sigesp_get_verifica_factura_enviada(int4);

CREATE OR REPLACE FUNCTION public.fn_api_sigesp_get_verifica_factura_enviada(prm_id_fact integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	DECLARE
		v_enviada boolean;
	BEGIN
		SELECT EXISTS (
			SELECT 	1 
			FROM 	public.api_integracion_documentos_fiscales 
			WHERE 	id_fact = prm_id_fact
			AND		codtipdoc = 'FACTURA'
		) INTO v_enviada;
		
		RETURN v_enviada;
	END;
$function$
;

-- DROP FUNCTION public.fn_api_sigesp_post_contingencia_codigos_retenciones_islr(jsonb);

CREATE OR REPLACE FUNCTION public.fn_api_sigesp_post_contingencia_codigos_retenciones_islr(prm_codigos jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
	-- -------------------------------------------------------------------------
	-- 1. LIMPIA LA BASE DE DATOS
	-- -------------------------------------------------------------------------
	TRUNCATE TABLE api_integracion_codigos_ret_islr;

	-- -------------------------------------------------------------------------
	-- 2. INSERCIÓN MASIVA DE FACTURAS
	-- -------------------------------------------------------------------------
    INSERT INTO api_integracion_codigos_ret_islr (
        codigo, 
        concepto_de_retencion
    )
    SELECT 
        TRIM(j.codigo),
        TRIM(j.concepto_de_retencion)
    FROM jsonb_to_recordset(prm_codigos) AS j(
        codigo varchar,
        concepto_de_retencion varchar
    )
    ON CONFLICT (codigo)
   DO UPDATE SET concepto_de_retencion = EXCLUDED.concepto_de_retencion;
END;
$function$
;

-- DROP FUNCTION public.fn_api_sigesp_post_contingencia_documentos_fiscales_enviados(jsonb);

CREATE OR REPLACE FUNCTION public.fn_api_sigesp_post_contingencia_documentos_fiscales_enviados(prm_documentos jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
	-- -------------------------------------------------------------------------
	-- 1. LIMPIA LA BASE DE DATOS
	-- -------------------------------------------------------------------------
	TRUNCATE TABLE api_integracion_documentos_fiscales;

	-- -------------------------------------------------------------------------
	-- 2. INSERCIÓN MASIVA DE FACTURAS
	-- -------------------------------------------------------------------------
	INSERT INTO api_integracion_documentos_fiscales (
        id_fact, 
        numfact, 
        id_doc, 
        codtipdoc, 
		estado,
        num_control, 
        url_pdf, 
		observacion,
        fecreg, 
        codusu, 
        api_modulo, 
        api_id_origen
    )
    SELECT 
        f.id_fact,
        j.numfact,
        NULL,
        UPPER(TRIM(j.codtipdoc)),
		UPPER(TRIM(j.estado)),
        TRIM(j.num_control),
        TRIM(j.url_pdf),
		TRIM(j.observacion),
        j.fecreg,
        TRIM(j.codusu),
        UPPER(TRIM(COALESCE(NULLIF(f.api_modulo, ''), 'SIGESP'))),
        f.api_id_fact_origen
    FROM jsonb_to_recordset(prm_documentos) AS j(
        numfact integer,
        coddoc varchar,
        codtipdoc varchar,
        num_control varchar,
        url_pdf text,
        fecreg timestamp,
        codusu varchar,
		estado varchar,
		observacion text
    )
    INNER JOIN cxc_factura f ON f.numfact = j.numfact
    WHERE UPPER(TRIM(j.codtipdoc)) = 'FACTURA'
    ON CONFLICT (id_fact, codtipdoc, numfact) WHERE codtipdoc = 'FACTURA'
    DO NOTHING;

	-- -------------------------------------------------------------------------
	-- 3. INSERCIÓN MASIVA DE NOTAS DE CRÉDITO (NC)
	-- -------------------------------------------------------------------------
    INSERT INTO api_integracion_documentos_fiscales (
        id_fact, 
        numfact, 
        id_doc, 
        codtipdoc, 
		estado,
        num_control, 
        url_pdf, 
		observacion,
        fecreg, 
        codusu, 
        api_modulo, 
        api_id_origen
    )
    SELECT 
        d.id_fact,
        f.numfact,
        d.id_doc,
        UPPER(TRIM(j.codtipdoc)),
		UPPER(TRIM(j.estado)),
        TRIM(j.num_control),
        TRIM(j.url_pdf),
		TRIM(j.observacion),
        j.fecreg,
        TRIM(j.codusu),
        UPPER(TRIM(COALESCE(NULLIF(d.api_modulo, ''), 'SIGESP'))),
        d.api_id_doc_origen
    FROM jsonb_to_recordset(prm_documentos) AS j(
        numfact integer,
        coddoc varchar,
        codtipdoc varchar,
        num_control varchar,
        url_pdf text,
        fecreg timestamp,
        codusu varchar,
		estado varchar,
		observacion text
    )
    INNER JOIN cxc_documento d ON d.coddoc = j.coddoc
    INNER JOIN cxc_factura f ON d.id_fact = f.id_fact
    WHERE UPPER(TRIM(j.codtipdoc)) <> 'FACTURA'
    ON CONFLICT (id_fact, codtipdoc, id_doc) WHERE codtipdoc = 'NC'
    DO NOTHING;

END;
$function$
;