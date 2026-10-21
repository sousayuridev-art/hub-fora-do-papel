-- CX-5 · Ajuste fiel ao canvas aprovado (21/10): o destaque do "Precisa de você" mostra o que conferir,
-- escrito pelo Yuri ao pedir a aprovação (approvals.description).
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.portal_inicio(uuid)'::regprocedure);
  novo := replace(d,
    'select jsonb_build_object(''tipo'', ''aprovacao'', ''id'', a.id, ''titulo'', a.title, ''quando'', a.sent_at,',
    'select jsonb_build_object(''tipo'', ''aprovacao'', ''id'', a.id, ''titulo'', a.title, ''detalhe'', a.description, ''quando'', a.sent_at,');
  if novo = d then raise exception 'portal_inicio: ponto de troca não encontrado'; end if;
  execute novo;
end $$;
