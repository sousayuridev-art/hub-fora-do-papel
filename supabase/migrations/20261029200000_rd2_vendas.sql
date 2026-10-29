-- =====================================================================
-- RD2-2 · Vendas (docs/cards/RD2-redesenho-areas.md)
-- O quadro mostra só o que está em negociação; Fechado sai do quadro.
-- v_funil ganha a situação da proposta e "serviço adicional"; funil_resumo
-- ganha os números do topo (em negociação, propostas sem resposta, ganho no
-- mês, taxa de ganho em 90 dias) e os filtros novos.
-- =====================================================================

-- Colunas novas no fim (create or replace view só aceita acrescentar no fim)
create or replace view public.v_funil with (security_invoker = true) as
select
  d.id, d.client_id, d.stage, d.value_cents, d.diagnostic_tier, d.diagnostic_paid,
  d.next_step, d.next_step_at, d.next_step_has_time, d.requested_slot_at,
  d.archived_at, d.lost_reason, d.lost_note, d.stage_changed_at, d.closed_at,
  d.position, d.created_at, d.updated_at,
  c.company_name, c.contact_name, c.whatsapp, c.email, c.origin, c.ad_name,
  (d.next_step_at at time zone t.timezone)::date as next_step_date,
  (now() at time zone t.timezone)::date as hoje,
  (d.archived_at is null and d.stage <> 'fechado'
     and (d.next_step_at at time zone t.timezone)::date < (now() at time zone t.timezone)::date) as vencido,
  (d.archived_at is null and d.stage <> 'fechado'
     and (d.next_step_at at time zone t.timezone)::date = (now() at time zone t.timezone)::date) as para_hoje,
  (date_trunc('month', d.created_at at time zone t.timezone) = date_trunc('month', now() at time zone t.timezone)) as deste_mes,
  d.service_line as frente,
  -- Serviço adicional: a empresa já fechou outra oportunidade antes desta
  exists (select 1 from public.deals x
           where x.client_id = d.client_id and x.id <> d.id and x.stage = 'fechado'
             and x.closed_at < coalesce(d.closed_at, 'infinity'::timestamptz)) as adicional,
  pr.status as proposta_status,
  pr.version as proposta_versao,
  pr.sent_at as proposta_enviada_em,
  pr.viewed_at as proposta_vista_em
from public.deals d
join public.clients c on c.id = d.client_id
join public.tenants t on t.id = d.tenant_id
left join lateral (
  select p.status, p.version, p.sent_at, p.viewed_at
    from public.proposals p
   where p.deal_id = d.id
   order by p.created_at desc
   limit 1
) pr on true;

revoke insert, update, delete, truncate on public.v_funil from authenticated;

-- Filtros: todos | novos | adicionais | vencidos | este_mes | fechados | arquivados
create or replace function public.funil_resumo(p_filtro text default 'todos')
returns jsonb language sql stable security invoker set search_path = public as $$
  with base as (select * from public.v_funil),
  abertas as (select * from base where archived_at is null and stage <> 'fechado'),
  filtrado as (
    select * from base where
      case p_filtro
        when 'arquivados' then archived_at is not null
        when 'fechados'   then archived_at is null and stage = 'fechado'
        when 'vencidos'   then vencido
        when 'este_mes'   then archived_at is null and stage <> 'fechado' and deste_mes
        when 'novos'      then archived_at is null and stage <> 'fechado' and not adicional
        when 'adicionais' then archived_at is null and stage <> 'fechado' and adicional
        else archived_at is null and stage <> 'fechado'
      end
  ),
  mes as (select (date_trunc('month', now() at time zone t.timezone)::timestamp at time zone t.timezone) as ini
            from public.tenants t order by t.created_at limit 1),
  noventa as (
    select
      count(*) filter (where b.stage = 'fechado' and b.archived_at is null
                         and b.closed_at >= now() - interval '90 days') as ganhos,
      count(*) filter (where b.archived_at >= now() - interval '90 days') as perdidos
    from base b
  )
  select jsonb_build_object(
    'ativos',              (select count(*) from abertas),
    'vencidos',            (select count(*) from base where vencido),
    'em_negociacao_cents', (select coalesce(sum(value_cents), 0) from abertas),
    'abertas',             (select count(*) from abertas),
    'propostas_sem_resposta', (select count(*) from abertas
                                where proposta_status = 'enviada' and proposta_enviada_em < now() - interval '3 days'),
    'ganho_mes', (select jsonb_build_object('quantidade', count(*), 'soma_cents', coalesce(sum(value_cents), 0))
                    from base, mes where stage = 'fechado' and archived_at is null and closed_at >= mes.ini),
    'perdidos_mes', (select count(*) from base, mes where archived_at >= mes.ini),
    'taxa_ganho_90', (select case when ganhos + perdidos = 0 then null
                             else round(100.0 * ganhos / (ganhos + perdidos)) end from noventa),
    'filtros', jsonb_build_object(
      'todos',      (select count(*) from abertas),
      'novos',      (select count(*) from abertas where not adicional),
      'adicionais', (select count(*) from abertas where adicional),
      'vencidos',   (select count(*) from base where vencido),
      'este_mes',   (select count(*) from abertas where deste_mes),
      'fechados',   (select count(*) from base where archived_at is null and stage = 'fechado'),
      'arquivados', (select count(*) from base where archived_at is not null)),
    'etapas', (select coalesce(jsonb_object_agg(s.stage, jsonb_build_object(
                 'quantidade', (select count(*) from filtrado f where f.stage = s.stage),
                 'soma_cents', (select coalesce(sum(value_cents), 0) from filtrado f where f.stage = s.stage))), '{}'::jsonb)
               from unnest(enum_range(null::public.deal_stage)) as s(stage))
  );
$$;

revoke all on function public.funil_resumo(text) from public, anon;
grant execute on function public.funil_resumo(text) to authenticated;
