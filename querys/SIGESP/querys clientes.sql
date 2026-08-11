-- select * from public.fn_api_integracion_get_cliente('200000325')


-- clientes corporativos
select count(*) from public.clientes_corporativos cc;
select count(*), cc.numero_documento  from public.clientes_corporativos cc group by cc.numero_documento having count(*) > 1;
select * from public.clientes_corporativos cc where cc.numero_documento in ('200071613', '000723060');
select * from public.facturaciones f where f.documento = '200071613';
select * from public.facturaciones f where f.documento = '000723060';

-- clientes
select count(*) from public.clientes cc;
select count(*), cc.numero_documento  from public.clientes cc group by cc.numero_documento having count(*) > 1;
select * from public.clientes cc where cc.numero_documento in ('200003056');