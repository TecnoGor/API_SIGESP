-- COMPROBANTE ISLR
SELECT 	cmp.codret, dt.cmp_codret, cmp.*, dt.*
FROM 	scb_cmp_ret cmp 
		INNER JOIN scb_dt_cmp_ret dt ON cmp.codemp = dt.codemp AND cmp.codret = dt.codret AND cmp.numcom = dt.numcom AND cmp.tipsolpag = dt.tipsolpag 
		INNER JOIN cxp_solicitudes sol ON dt.codemp = sol.codemp AND dt.numsop = sol.numsol
WHERE 	cmp.codemp='0001'
AND 	cmp.codret='0000000006' 		-- TIPO ISLR
AND 	cmp.numcom='20260400000061' 	-- NUMERO DE COMPROBANTE
ORDER BY dt.codret, dt.numcom, dt.numope; 

-- COMPROBANTE IVA
select	numcom, codret, fecrep, perfiscal, codsujret, nomsujret, rif, dirsujret, estcmpret,
 		(SELECT telpro 
 		FROM 	rpc_proveedor 
 		WHERE 	rpc_proveedor.codemp=scb_cmp_ret.codemp 
 		AND 	rpc_proveedor.cod_pro=scb_cmp_ret.codsujret) AS telpro 
FROM 	scb_cmp_ret 
where	codemp ='0001'
and		codret ='0000000001' 		-- TIPO DE RETENCION
and		numcom='20260400000061';	-- NUMERO DE COMPROBANTE

-- DETALLE IVA
select	max(codret) as codret, max(numcom) as numcom, max(numope) as numope, max(fecfac) as fecfac, max(numfac) as numfac, 
		max(numcon) as numcon, max(numnd) as numnd, max(numnc) as numnc, max(tiptrans) as tiptrans, SUM(totcmp_sin_iva) as totcmp_sin_iva ,
 		max(totcmp_con_iva) as totcmp_con_iva, SUM(basimp) as basimp, porimp, SUM(totimp) as totimp,
	  	SUM(iva_ret) as iva_ret, max(desope) as desope, max(cmp_porcret) as cmp_porcret, max(numsop) as numsop, max(codban) as codban,
	   	max(ctaban) as ctaban, max(numdoc) as numdoc, max(codope) as codope, 
		(SELECT MAX(nomban) 
	   	FROM 	scb_banco,cxp_sol_banco,cxp_solicitudes 
	   	WHERE 	cxp_sol_banco.codemp=cxp_solicitudes.codemp 
	   	and		cxp_sol_banco.numsol=cxp_solicitudes.numsol 
	   	AND 	cxp_sol_banco.codban=scb_banco.codban
	   	AND 	scb_dt_cmp_ret.codemp=cxp_solicitudes.codemp 
	   	AND 	scb_dt_cmp_ret.numsop=cxp_solicitudes.numsol
	   	GROUP BY cxp_sol_banco.numsol) AS nomban, 
	   	(SELECT MAX(fecmov) 
	   	FROM 	scb_movbco,cxp_sol_banco,cxp_solicitudes
	   	WHERE 	cxp_sol_banco.codemp=cxp_solicitudes.codemp 
	   	AND 	cxp_sol_banco.numsol=cxp_solicitudes.numsol 
		AND 	cxp_sol_banco.codemp=scb_movbco.codemp 
		AND 	cxp_sol_banco.codban=scb_movbco.codban 
	    AND 	cxp_sol_banco.ctaban=scb_movbco.ctaban 
	    AND 	cxp_sol_banco.numdoc=scb_movbco.numdoc 
	    AND 	cxp_sol_banco.codope=scb_movbco.codope 
	    AND 	cxp_sol_banco.estmov=scb_movbco.estmov 
	    AND 	scb_dt_cmp_ret.codemp=cxp_solicitudes.codemp 
	    AND 	scb_dt_cmp_ret.numsop=cxp_solicitudes.numsol 
	    GROUP BY cxp_sol_banco.numsol) AS fecmov, 
		(SELECT MAX(monto) 
		FROM 	cxp_sol_banco,cxp_solicitudes
		WHERE 	cxp_sol_banco.codemp=cxp_solicitudes.codemp 
		AND 	cxp_sol_banco.numsol=cxp_solicitudes.numsol 
	    AND 	scb_dt_cmp_ret.codemp=cxp_solicitudes.codemp 
	    AND 	scb_dt_cmp_ret.numsop=cxp_solicitudes.numsol
		GROUP BY cxp_sol_banco.numsol) AS montopag, 
	    (SELECT MAX(numdoc) 
	    FROM 	cxp_sol_banco,cxp_solicitudes 
		WHERE 	cxp_sol_banco.codemp=cxp_solicitudes.codemp 
		AND 	cxp_sol_banco.numsol=cxp_solicitudes.numsol
        AND 	scb_dt_cmp_ret.codemp=cxp_solicitudes.codemp 
        AND 	scb_dt_cmp_ret.numsop=cxp_solicitudes.numsol 
        GROUP BY cxp_sol_banco.numsol) AS numdocpag, 
        max(tipsolpag) as tipsolpag 
FROM	scb_dt_cmp_ret 
WHERE 	codemp='0001' 
AND 	codret='0000000001'  		-- TIPO DE RETENCION
AND 	numcom='20260400000061'		-- NUMERO DE COMPROBANTE
GROUP BY codemp, numfac, porimp, numnd, numnc, numsop 
ORDER BY numope; 

-- COMPROBANTE MUNICIPAL
select	numcom, codret, fecrep, perfiscal, codsujret, nomsujret, rif,nit, dirsujret, estcmpret, numlic 
FROM 	scb_cmp_ret 
WHERE 	codemp='0001' 
AND 	codret='0000000003' 		-- TIPO DE RETENCION MUNICIPAL
AND 	numcom='20260400000061' 	-- NUMERO DE COMPROBANTE
AND 	fecrep>='2026-01-01' 
AND 	fecrep<='2026-01-31';

-- DETALLE MUNICIPAL
select	max(codret) as codret, max(numcom) as numcom,max(numcon) as numcon, max(numope) as numope, max(fecfac) as fecfac, 
		max(numfac) as numfac, max(numnd) as numnd, max(numnc) as numnc, max(tiptrans) as tiptrans, SUM(totcmp_sin_iva) as totcmp_sin_iva , 
		max(totcmp_con_iva) as totcmp_con_iva, SUM(basimp) as basimp, porimp, 
		SUM(totimp) as totimp, SUM(iva_ret) as iva_ret, max(desope) as desope, max(numsop) as numsop,
 		max(codban) as codban, max(ctaban) as ctaban, max(numdoc) as numdoc, max(codope) as codope,
  		(SELECT fecemisol 
  		FROM 	cxp_solicitudes 
  		WHERE 	scb_dt_cmp_ret.codemp=cxp_solicitudes.codemp 
  		AND MAX(scb_dt_cmp_ret.numsop)=cxp_solicitudes.numsol) AS fecemisol 
FROM 	scb_dt_cmp_ret 
WHERE 	codemp='0001' 
AND 	codret='0000000003' 		-- TIPO DE COMPROBANTE
AND 	numcom='20260400000061 ' 	-- NUMERO DE COMPROBANTE
GROUP BY codemp, numfac, porimp, numnd, numnc 
ORDER BY numope;

-- COMPROBANTE 1X100
SELECT 	numcom, codret, fecrep, perfiscal, codsujret, nomsujret, rif,nit, dirsujret, estcmpret, numlic FROM scb_cmp_ret 
WHERE 	codemp='0001' 
AND 	codret='0000000005'  		-- TIPO DE RETENCION
AND 	numcom='20260400000061 '  	-- NUMERO DE COMPROBANTE
AND 	perfiscal='202601';

-- DETALLE 1X100
select	max(codret) as codret, max(numcom) as numcom,max(numcon) as numcon, max(numope) as numope, max(fecfac) as fecfac, 
		max(numfac) as numfac, max(numnd) as numnd, max(numnc) as numnc, max(tiptrans) as tiptrans, SUM(totcmp_sin_iva) as totcmp_sin_iva , 
		max(totcmp_con_iva) as totcmp_con_iva, SUM(basimp) as basimp, porimp,cmp_porcret, SUM(totimp) as totimp, SUM(iva_ret) as iva_ret,
 		max(desope) as desope, numsop, max(codban) as codban, max(ctaban) as ctaban, max(numdoc) as numdoc, max(codope) as codope
FROM 	scb_dt_cmp_ret 
WHERE 	codemp='0001' 
AND 	codret='0000000005' 		-- TIPO DE RETENCION
AND 	numcom='20260400000061 ' 	-- NUMERO DE COMPROBANTE
GROUP BY codemp, numfac, porimp, cmp_porcret, numnd, numnc, numsop 
ORDER BY numope;

-- COMPROBANTE OTROS
SELECT 	numcom, codret, fecrep, perfiscal, codsujret, nomsujret, rif, nit, dirsujret, estcmpret, numlic 
FROM 	scb_cmp_ret 
WHERE 	codemp='0001' 
AND 	codret='0000000007'  			-- TIPO DE RETENCION
AND 	numcom=trim('20260400000061')  	-- NUMERO DE COMPROBANTE
AND 	perfiscal='202601';

-- DETALLE OTROS
SELECT 	max(r.codret) as codret, max(r.numcom) as numcom,max(r.numcon) as numcon, max(r.numope) as numope, max(r.fecfac) as fecfac, 
		max(r.numfac) as numfac, max(r.numnd) as numnd, max(r.numnc) as numnc, max(r.tiptrans) as tiptrans, 
		SUM(r.totcmp_sin_iva) as totcmp_sin_iva , max(r.totcmp_con_iva) as totcmp_con_iva, SUM(r.basimp) as basimp, 
		r.porimp, SUM(r.totimp) as totimp, SUM(r.iva_ret) as iva_ret, max(r.desope) as desope, numsop, max(r.codban) as codban,
 		max(r.ctaban) as ctaban, max(r.numdoc) as numdoc, max(r.codope) as codope, max(r.cmp_porcret) as cmp_porcret, 
 		MAX(d.dended) AS dended 
FROM 	scb_dt_cmp_ret r 
		INNER JOIN sigesp_deducciones d ON r.cmp_codret = d.codded 
WHERE 	r.codemp='0001' 
AND 	r.codret='0000000007' 		-- TIPO DE RETENCION
AND 	r.numcom='20260400000061 ' 	-- COMPROBANTE
GROUP BY r.codemp, r.numfac, r.porimp, r.numnd, r.numnc, r.numsop, r.numope 
ORDER BY r.numope;