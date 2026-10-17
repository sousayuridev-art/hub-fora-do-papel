-- =====================================================================
-- Hub Fora do Papel · REV-2 · Saúde das entregas
-- Card: docs/cards/REV-2-revisao-projetos-pedidos.md
-- Cada projeto em andamento ganha um sinal (ok, atenção, risco) com os motivos,
-- calculado no banco. O Painel lista as entregas que pedem atenção.
-- =====================================================================

create or replace function public._projeto_saude(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  p public.projects; hoje date; usados numeric; pct int; m jsonb := '[]'::jsonb; risco boolean := false;
  feitos int; total int; n int; a record;
begin
  select * into p from public.projects where id = p_id;
  if p.id is null or p.status <> 'andamento' then
    return jsonb_build_object('nivel', 'ok', 'motivos', '[]'::jsonb);
  end if;
  hoje := public._hoje(p.tenant_id);

  if p.launch_date is null then
    m := m || jsonb_build_object('chave', 'sem_data', 'texto', 'Sem data de lançamento');
  elsif p.launch_date < hoje then
    risco := true;
    m := m || jsonb_build_object('chave', 'lancamento_atrasado',
      'texto', 'Lançamento atrasado ' || (hoje - p.launch_date) || case when hoje - p.launch_date = 1 then ' dia' else ' dias' end);
  else
    select count(*) filter (where done), count(*) into feitos, total from public.launch_items where project_id = p.id;
    if p.launch_date - hoje <= 7 and feitos < total then
      m := m || jsonb_build_object('chave', 'checklist',
        'texto', 'Lança em ' || (p.launch_date - hoje) || ' dias com checklist ' || feitos || ' de ' || total);
    end if;
  end if;

  if p.hours_estimated > 0 then
    select coalesce(sum(minutes), 0) / 60.0 into usados from public.time_entries where project_id = p.id;
    pct := round(usados / p.hours_estimated * 100);
    if pct >= 100 then
      risco := true;
      m := m || jsonb_build_object('chave', 'horas', 'texto', 'Horas acima do estimado (' || pct || '%)');
    elsif pct >= 80 then
      m := m || jsonb_build_object('chave', 'horas', 'texto', 'Horas em ' || pct || '% do estimado');
    end if;
  end if;

  select count(*) into n from public.client_tasks where project_id = p.id and status = 'aberta' and due_date < hoje;
  if n > 0 then
    m := m || jsonb_build_object('chave', 'pendencia_atrasada',
      'texto', n || case when n = 1 then ' pendência do cliente atrasada' else ' pendências do cliente atrasadas' end);
  end if;

  select title, (hoje - (sent_at at time zone (select timezone from public.tenants where id = p.tenant_id))::date) as dias
    into a from public.approvals
   where project_id = p.id and status = 'aguardando' order by sent_at limit 1;
  if a.dias is not null and a.dias >= 3 then
    m := m || jsonb_build_object('chave', 'aprovacao_parada',
      'texto', 'Aprovação parada há ' || a.dias || ' dias: ' || a.title);
  end if;

  -- Ajuste pedido pelo cliente e ainda sem nova versão enviada
  select x.title into a from public.approvals x
   where x.project_id = p.id and x.status = 'ajuste'
     and not exists (select 1 from public.approvals y where y.project_id = p.id and y.sent_at > x.decided_at)
   order by x.decided_at desc limit 1;
  if a.title is not null then
    m := m || jsonb_build_object('chave', 'ajuste', 'texto', 'Cliente pediu ajuste: ' || a.title);
  end if;

  return jsonb_build_object(
    'nivel', case when risco then 'risco' when jsonb_array_length(m) > 0 then 'atencao' else 'ok' end,
    'motivos', m);
end;
$$;
revoke all on function public._projeto_saude(uuid) from public, anon, authenticated;

-- A lista e o detalhe passam a trazer a saúde (troca pontual, sem reescrever as funções)
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.projetos_lista(public.project_status)'::regprocedure);
  novo := replace(d, '''lancado_em'', p.launched_at)', '''lancado_em'', p.launched_at, ''saude'', public._projeto_saude(p.id))');
  if novo = d then raise exception 'projetos_lista: ponto de troca não encontrado'; end if;
  execute novo;

  d := pg_get_functiondef('public.projeto_detalhe(uuid)'::regprocedure);
  novo := replace(d, '''hoje'', hoje,', '''hoje'', hoje, ''saude'', public._projeto_saude(p.id),');
  if novo = d then raise exception 'projeto_detalhe: ponto de troca não encontrado'; end if;
  execute novo;
end $$;

-- Painel: entregas que pedem atenção (risco primeiro)
create or replace function public.painel_entregas()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  return coalesce((
    select jsonb_agg(x order by (x->'saude'->>'nivel') = 'risco' desc, x->>'lancamento' nulls last)
      from (select jsonb_build_object('id', p.id, 'nome', p.name, 'empresa', c.company_name,
                     'lancamento', p.launch_date, 'saude', public._projeto_saude(p.id)) x
              from public.projects p join public.clients c on c.id = p.client_id
             where p.tenant_id = t and p.status = 'andamento') q
     where x->'saude'->>'nivel' <> 'ok'), '[]'::jsonb);
end;
$$;
revoke all on function public.painel_entregas() from public, anon;
grant execute on function public.painel_entregas() to authenticated;
