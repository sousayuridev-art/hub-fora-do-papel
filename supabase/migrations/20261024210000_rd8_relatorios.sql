-- =====================================================================
-- Hub Fora do Papel · RD-8 · Relatórios redesenhados
-- Card: docs/cards/RD-redesenho-telas.md (RD-8)
-- Faixa de números com variação contra o período anterior e receita mês a mês
-- (6 meses recebidos + 2 previstos), tudo calculado no banco. Só leitura.
-- Período: o mesmo da RPC relatorios ('mes', '3meses', 'ano'). O período anterior tem o
-- mesmo tamanho, deslocado para trás (1 mês, 3 meses ou 1 ano), para comparar até o mesmo dia.
-- Dono validado por _tenant_do_dono() (que já exige sessão aal2).
-- =====================================================================

-- Variação entre dois valores: diferença e porcentagem (sem porcentagem quando o anterior é zero)
create or replace function public._variacao(p_atual numeric, p_anterior numeric)
returns jsonb language sql immutable as $$
  select jsonb_build_object('atual', p_atual, 'anterior', p_anterior, 'diferenca', p_atual - p_anterior,
    'pct', case when p_anterior > 0 then round((p_atual - p_anterior) * 100.0 / p_anterior) end);
$$;
revoke all on function public._variacao(numeric, numeric) from public, anon, authenticated;

create or replace function public.relatorios_resumo(p_periodo text default '3meses')
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono(); tz text; hoje date; mes date; ini date; fim date;
  passo interval; ant_ini date; ant_fim date; s public.pricing_settings; m date; i int;
  receita jsonb := '[]'::jsonb; valor bigint;
begin
  perform public._mensalidades_gerar(t);
  select timezone into tz from public.tenants where id = t;
  hoje := public._hoje(t); mes := public._mes_de(hoje); s := public._precos(t);
  ini := case coalesce(p_periodo, '3meses')
           when 'mes' then mes
           when 'ano' then date_trunc('year', hoje)::date
           else (mes - interval '2 months')::date end;
  fim := hoje;
  passo := case coalesce(p_periodo, '3meses') when 'mes' then interval '1 month'
                                              when 'ano' then interval '1 year'
                                              else interval '3 months' end;
  ant_ini := (ini - passo)::date; ant_fim := (fim - passo)::date;

  -- Receita: 6 meses recebidos (o atual até hoje) e 2 previstos (cobranças com data + mensalidades ativas ainda sem cobrança)
  for i in -5..2 loop
    m := (mes + make_interval(months => i))::date;
    if i <= 0 then
      select coalesce(sum(paid_cents), 0) into valor from public.charges
       where tenant_id = t and status = 'paga' and paid_at >= m and paid_at < (m + interval '1 month')::date;
    else
      select coalesce(sum(amount_cents), 0) into valor from public.charges
       where tenant_id = t and status = 'aberta' and due_date >= m and due_date < (m + interval '1 month')::date;
      valor := valor + (select coalesce(sum(x.amount_cents), 0) from public.subscriptions x
        where x.tenant_id = t and x.status = 'ativa' and x.start_month <= m and (x.ended_month is null or x.ended_month >= m)
          and not exists (select 1 from public.charges c where c.subscription_id = x.id and c.period = m)
          and not exists (select 1 from public.subscription_pauses z where z.subscription_id = x.id
                           and m >= z.from_month and (z.to_month is null or m <= z.to_month)));
    end if;
    receita := receita || jsonb_build_object('mes', m, 'tipo', case when i < 0 then 'passado' when i = 0 then 'atual' else 'previsto' end,
                                             'valor_cents', valor);
  end loop;

  return jsonb_build_object(
    'periodo', jsonb_build_object('id', coalesce(p_periodo, '3meses'), 'inicio', ini, 'fim', fim,
                                  'anterior_inicio', ant_ini, 'anterior_fim', ant_fim),
    'vendido', public._variacao(
        (select coalesce(sum(total_cents), 0) from public.proposals
          where tenant_id = t and status = 'aceita' and (accepted_at at time zone tz)::date between ini and fim),
        (select coalesce(sum(total_cents), 0) from public.proposals
          where tenant_id = t and status = 'aceita' and (accepted_at at time zone tz)::date between ant_ini and ant_fim))
      || jsonb_build_object('propostas', (select count(*) from public.proposals
          where tenant_id = t and status = 'aceita' and (accepted_at at time zone tz)::date between ini and fim)),
    'recebido', public._variacao(
        (select coalesce(sum(paid_cents), 0) from public.charges
          where tenant_id = t and status = 'paga' and paid_at between ini and fim),
        (select coalesce(sum(paid_cents), 0) from public.charges
          where tenant_id = t and status = 'paga' and paid_at between ant_ini and ant_fim)),
    'contatos', public._variacao(
        (select count(*) from public.clients where tenant_id = t and (created_at at time zone tz)::date between ini and fim),
        (select count(*) from public.clients where tenant_id = t and (created_at at time zone tz)::date between ant_ini and ant_fim)),
    -- Valor por hora médio dos projetos em andamento (real depois de 25% das horas, senão estimado), contra piso e alvo
    'valor_hora', (select jsonb_build_object('media_cents', round(avg(vh)), 'projetos', count(vh),
                          'abaixo_do_piso', count(*) filter (where vh < s.floor_cents),
                          'piso_cents', s.floor_cents, 'alvo_cents', s.hour_cents)
        from (select case when p.hours_estimated > 0 and u.h >= p.hours_estimated * 0.25 and u.h > 0
                          then p.value_cents / u.h
                          when p.hours_estimated > 0 then p.value_cents / p.hours_estimated end as vh
                from public.projects p
                cross join lateral (select coalesce(sum(minutes), 0) / 60.0 h from public.time_entries e where e.project_id = p.id) u
               where p.tenant_id = t and p.status = 'andamento') q),
    -- Lançamentos no período comparados com a data combinada
    'lancamentos', (select jsonb_build_object(
          'total', count(*) filter (where launch_date is not null),
          'no_prazo', count(*) filter (where launch_date is not null and (launched_at at time zone tz)::date <= launch_date),
          'maior_atraso_dias', coalesce(max((launched_at at time zone tz)::date - launch_date)
                                 filter (where (launched_at at time zone tz)::date > launch_date), 0),
          'sem_data', count(*) filter (where launch_date is null))
        from public.projects
       where tenant_id = t and launched_at is not null and (launched_at at time zone tz)::date between ini and fim),
    'receita_meses', receita
  );
end;
$$;
revoke all on function public.relatorios_resumo(text) from public, anon;
grant execute on function public.relatorios_resumo(text) to authenticated;
