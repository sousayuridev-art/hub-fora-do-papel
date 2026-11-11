-- =====================================================================
-- Hub Fora do Papel · REV-6 · Números honestos em Vendas
-- Card: docs/cards/REV-6-revisao-geral.md
-- A taxa de ganho só aparece com pelo menos 5 oportunidades decididas em 90 dias: a tela precisa
-- saber quantas foram. Troca pontual no texto da função, como nas revisões anteriores.
-- =====================================================================
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.funil_resumo(text)'::regprocedure);
  novo := replace(d, '''taxa_ganho_90'', (select case',
                     '''decididos_90'', (select ganhos + perdidos from noventa),
    ''taxa_ganho_90'', (select case');
  if novo = d then raise exception 'funil_resumo: ponto de troca não encontrado'; end if;
  execute novo;
end $$;
