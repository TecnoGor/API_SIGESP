select * from public.fn_api_get_retencion_iva('20260300000048');

select
	sol.numsol,
	cmp.numcom,
	cmp.codemp, 
	cmp.codret, 
	cmp.tipsolpag,
	dt.cmp_codret,
	
	
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
			), 'prueba@prueba.com'
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
	dt.numcon::varchar AS num_control, -- OJO OJO OJO - PREGUNTAR SI ESTE DEBE SER EL NUMERO DE CONTROL GENERADO POR LA IMPRENTA DIGITAL
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
	INNER JOIN sigesp_deducciones d ON dt.cmp_codret = d.codded and dt.codemp = d.codemp	
	INNER JOIN cxp_solicitudes sol ON dt.codemp = sol.codemp AND dt.numsop = sol.numsol
	LEFT JOIN public.rpc_proveedor p ON sol.tipproben = 'P' AND sol.codemp = p.codemp AND sol.cod_pro = p.cod_pro
	LEFT JOIN public.rpc_beneficiario b ON sol.tipproben = 'B' AND sol.codemp = b.codemp AND sol.ced_bene = b.ced_bene
WHERE 
	cmp.codemp='0001'
AND	cmp.codret='0000000001'
AND	cmp.estcmpret=1
--AND	sol.numsol = prm_numsol
-- AND 	cmp.numcom='20260100000001 ' 	-- NUMERO DE COMPROBANTE
ORDER BY 
	dt.fecfac desc,
	sol.numsol DESC,
	cmp.numcom,
	dt.numope;
	
	