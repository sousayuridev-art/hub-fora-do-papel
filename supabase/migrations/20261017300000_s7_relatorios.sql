-- =====================================================================
-- Hub Fora do Papel · S7 · Relatórios
-- Card: docs/cards/S7-relatorios.md
-- Uma RPC só, tudo calculado no banco, com a mesma base do Painel e do Financeiro.
-- Período: 'mes' (mês atual), '3meses' (mês atual e os 2 anteriores), 'ano' (ano atual).
-- =====================================================================

create or replace function public._ordem_etapa(e public.deal_stage)
returns int language sql immutable as $$
  select case e when 'contato' then 1 when 'diagnostico' then 2 when 'mapeamento' then 3
                when 'proposta' then 4 when 'fechado' then 5 end;
$$;
revoke all on function public._ordem_etapa(public.deal_stage) from public, anon, authenticated;

create or replace function public.relatorios(p_periodo text default '3meses')
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono(); tz text; hoje date; ini date; fim date; mes date;
  s public.pricing_settings; r jsonb;
begin
  perform public._mensalidades_gerar(t);
  select timezone into tz from public.tenants where id = t;
  hoje := public._hoje(t); mes := date_trunc('month', hoje)::date; s := public._precos(t);
  ini := case coalesce(p_periodo, '3meses')
           when 'mes' then mes
           when 'ano' then date_trunc('year', hoje)::date
           else (mes - interval '2 months')::date end;
  fim := hoje;

  with contatos as (
    select c.id, c.origin, d.id as deal_id, d.stage, d.archived_at, d.archived_from_stage, d.diagnostic_paid,
           d.value_cents, d.closed_at,
           public._ordem_etapa(coalesce(d.archived_from_stage, d.stage)) as alcancou
      from public.clients c
      left join lateral (select * from public.deals x where x.client_id = c.id order by x.created_at desc limit 1) d on true
     where c.tenant_id = t and (c.created_at at time zone tz)::date between ini and fim
  ), etapas as (
    select e.id as etapa, e.ord,
           (select count(*) from contatos where alcancou >= e.ord) as chegaram,
           (select count(*) from public.deals d where d.tenant_id = t and d.archived_at is null
              and d.stage = e.id::public.deal_stage) as hoje_no_funil
      from (values ('contato', 1), ('diagnostico', 2), ('mapeamento', 3), ('proposta', 4), ('fechado', 5)) e(id, ord)
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('id', coalesce(p_periodo, '3meses'), 'inicio', ini, 'fim', fim),
    'vendas', jsonb_build_object(
      'funil', (select jsonb_agg(jsonb_build_object('etapa', etapa, 'chegaram', chegaram, 'hoje', hoje_no_funil,
                  'passaram_pct', case when anterior > 0 then round(chegaram * 100.0 / anterior) end)
                 order by ord)
                  from (select *, lag(chegaram) over (order by ord) as anterior from etapas) e2),
      'maior_perda', (select etapa from (select etapa, chegaram * 100.0 / nullif(lag(chegaram) over (order by ord), 0) as pct
                                           from etapas) e3
                       where pct is not null order by pct, etapa limit 1),
      'contatos', (select count(*) from contatos),
      'por_origem', coalesce((select jsonb_agg(x order by (x->>'contatos')::int desc) from (
          select jsonb_build_object('origem', origin, 'contatos', count(*),
                   'diagnosticos', count(*) filter (where diagnostic_paid),
                   'fechados', count(*) filter (where stage = 'fechado'),
                   'conversao_pct', round(count(*) filter (where stage = 'fechado') * 100.0 / nullif(count(*), 0), 1),
                   'receita_cents', coalesce(sum(value_cents) filter (where stage = 'fechado'), 0)
                                   + coalesce((select sum(ch.paid_cents) from public.charges ch
                                                where ch.kind = 'diagnostico' and ch.status = 'paga'
                                                  and ch.paid_at between ini and fim
                                                  and ch.deal_id in (select deal_id from contatos c2 where c2.origin = contatos.origin)), 0)) x
            from contatos group by origin) q), '[]'::jsonb),
      'perdas', coalesce((select jsonb_agg(jsonb_build_object('motivo', lost_reason, 'quantidade', n) order by n desc)
          from (select lost_reason, count(*) n from public.deals
                 where tenant_id = t and archived_at is not null and (archived_at at time zone tz)::date between ini and fim
                 group by lost_reason) q), '[]'::jsonb),
      'dias_ate_aceite', (select round(avg(extract(epoch from (p.accepted_at - c.created_at)) / 86400))
          from public.proposals p join public.clients c on c.id = p.client_id
         where p.tenant_id = t and p.status = 'aceita' and (p.accepted_at at time zone tz)::date between ini and fim
           and p.accepted_at >= c.created_at),
      'anuncios_cents', (select coalesce(sum(amount_cents), 0) from public.ad_spend
                          where tenant_id = t and spent_on between ini and fim),
      'diagnosticos_por_anuncio', (select count(*) from contatos
                                   where diagnostic_paid and origin in ('anuncio_meta', 'anuncio_google'))
    ),
    'receita', jsonb_build_object(
      'fechado_cents', (select coalesce(sum(total_cents), 0) from public.proposals
                         where tenant_id = t and status = 'aceita' and (accepted_at at time zone tz)::date between ini and fim),
      'fechados', (select count(*) from public.proposals
                    where tenant_id = t and status = 'aceita' and (accepted_at at time zone tz)::date between ini and fim),
      'diagnosticos_cents', (select coalesce(sum(paid_cents), 0) from public.charges
                              where tenant_id = t and kind = 'diagnostico' and status = 'paga' and paid_at between ini and fim),
      'diagnosticos', (select count(*) from public.charges
                        where tenant_id = t and kind = 'diagnostico' and status = 'paga' and paid_at between ini and fim),
      'recebido_cents', (select coalesce(sum(paid_cents), 0) from public.charges
                          where tenant_id = t and status = 'paga' and paid_at between ini and fim),
      'mrr_cents', (select coalesce(sum(amount_cents), 0) from public.subscriptions where tenant_id = t and status = 'ativa'),
      'mensalidades_ativas', (select count(*) from public.subscriptions where tenant_id = t and status = 'ativa'),
      'mensalidades_novas', (select count(*) from public.subscriptions where tenant_id = t and start_month between ini and fim),
      'mensalidades_encerradas', (select count(*) from public.subscriptions
                                   where tenant_id = t and status = 'encerrada' and ended_month between ini and fim),
      'churn_pct', (select round(count(*) filter (where status = 'encerrada' and ended_month between ini and fim) * 100.0
                                 / nullif(count(*) filter (where start_month < ini), 0), 1)
                      from public.subscriptions where tenant_id = t),
      'a_receber_30_cents', (select coalesce(sum(amount_cents), 0) from public.charges
                              where tenant_id = t and status = 'aberta' and due_date between hoje and hoje + 30),
      'em_atraso_cents', (select coalesce(sum(amount_cents), 0) from public.charges
                           where tenant_id = t and status = 'aberta' and due_date < hoje),
      'proximas', coalesce((select jsonb_agg(jsonb_build_object('empresa', cl.company_name, 'descricao', ch.description,
                      'valor_cents', ch.amount_cents, 'vencimento', ch.due_date, 'tipo', ch.kind) order by ch.due_date)
          from (select * from public.charges where tenant_id = t and status = 'aberta' and due_date >= hoje
                 order by due_date limit 6) ch join public.clients cl on cl.id = ch.client_id), '[]'::jsonb)
    ),
    'margem', jsonb_build_object(
      'piso_cents', s.floor_cents, 'alvo_cents', s.hour_cents,
      'projetos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.name, 'empresa', cl.company_name,
                      'valor_cents', p.value_cents, 'horas_estimadas', p.hours_estimated, 'horas_usadas', round(u.h, 1),
                      'vh_estimado_cents', case when p.hours_estimated > 0 then round(p.value_cents / p.hours_estimated) end,
                      'vh_real_cents', case when p.hours_estimated > 0 and u.h >= p.hours_estimated * 0.25 and u.h > 0
                                            then round(p.value_cents / u.h) end,
                      'folga_horas', case when s.floor_cents > 0 then round(p.value_cents::numeric / s.floor_cents - u.h, 1) end)
                    order by cl.company_name)
          from public.projects p join public.clients cl on cl.id = p.client_id
          cross join lateral (select coalesce(sum(minutes), 0) / 60.0 h from public.time_entries e where e.project_id = p.id) u
         where p.tenant_id = t and p.status = 'andamento'), '[]'::jsonb)
    ),
    'entrega', jsonb_build_object(
      'aprovacao_media_dias', (select round(avg(extract(epoch from (decided_at - sent_at)) / 86400)::numeric, 1)
          from public.approvals where tenant_id = t and status in ('aprovada', 'ajuste')
           and (decided_at at time zone tz)::date between ini and fim),
      'aprovacoes_decididas', (select count(*) from public.approvals where tenant_id = t and status in ('aprovada', 'ajuste')
           and (decided_at at time zone tz)::date between ini and fim),
      'ajustes_pct', (select round(count(*) filter (where status = 'ajuste') * 100.0 / nullif(count(*), 0))
          from public.approvals where tenant_id = t and status in ('aprovada', 'ajuste')
           and (decided_at at time zone tz)::date between ini and fim),
      'aprovacoes_abertas', coalesce((select jsonb_agg(jsonb_build_object('titulo', a.title, 'empresa', cl.company_name,
                      'project_id', a.project_id, 'dias', hoje - (a.sent_at at time zone tz)::date) order by a.sent_at)
          from public.approvals a join public.clients cl on cl.id = a.client_id
         where a.tenant_id = t and a.status = 'aguardando'), '[]'::jsonb),
      'pedidos', (select jsonb_build_object('total', count(*),
                    'escopo', count(*) filter (where classification = 'escopo'),
                    'mensalidade', count(*) filter (where classification = 'mensalidade'),
                    'adicional', count(*) filter (where classification = 'adicional'),
                    'sem_classificacao', count(*) filter (where classification is null))
          from public.requests where tenant_id = t and (created_at at time zone tz)::date between ini and fim),
      'adicionais_aprovados', (select jsonb_build_object('quantidade', count(*), 'valor_cents', coalesce(sum(value_cents), 0))
          from public.requests where tenant_id = t and client_decision = 'aprovado'
           and (decided_at at time zone tz)::date between ini and fim),
      'mensalidade_horas', coalesce((select jsonb_agg(jsonb_build_object('empresa', cl.company_name, 'plano', x.plan_name,
                      'horas_plano', pp.hours_month,
                      'horas_usadas', (select coalesce(sum(r.hours_estimated), 0) from public.requests r
                                        where r.client_id = x.client_id and r.classification = 'mensalidade'
                                          and (r.created_at at time zone tz)::date >= mes))
                    order by cl.company_name)
          from public.subscriptions x join public.clients cl on cl.id = x.client_id
          left join public.pricing_plans pp on pp.tenant_id = t and pp.name = x.plan_name
         where x.tenant_id = t and x.status = 'ativa'), '[]'::jsonb)
    )
  ) into r;
  return r;
end;
$$;
revoke all on function public.relatorios(text) from public, anon;
grant execute on function public.relatorios(text) to authenticated;
