-- =====================================================================
-- Hub Fora do Papel · RD2-8b · Situação do site (pedido do Yuri, 01/11)
-- Site de cliente que ainda não está no ar = "Em construção" (com ou sem projeto em andamento).
-- "Fora do ar" fica para site sem cliente que não está no ar.
-- =====================================================================
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.sites_resumo()'::regprocedure);
  novo := replace(d,
    $q$'situacao', case when b.no_ar then 'no_ar' when (b.proj).id is not null then 'construcao' else 'fora' end,$q$,
    $q$'situacao', case when b.no_ar then 'no_ar' when b.client_id is not null or (b.proj).id is not null then 'construcao' else 'fora' end,$q$);
  if novo = d then raise exception 'sites_resumo: regra da situação não encontrada'; end if;
  execute novo;
end $$;
