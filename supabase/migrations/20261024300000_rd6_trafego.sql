-- =====================================================================
-- Hub Fora do Papel · RD-6 · Tráfego pago (redesenho da tela)
-- Card: docs/cards/RD-redesenho-telas.md (RD-6)
-- Leitura nova, sem mudar tabelas: série de 8 semanas, variação contra o período anterior
-- e lançamentos paginados. Escrita continua nas RPCs do S5 (trafego_registrar etc.).
-- As regras de contagem são as mesmas de trafego_painel: contato de anúncio conta no dia
-- em que chegou (fuso da agência); diagnóstico vendido = último negócio com diagnóstico pago.
-- =====================================================================

-- Números de um trecho de datas (interno; só as RPCs abaixo chamam)
create or replace function public._trafego_numeros(p_tenant uuid, p_ini date, p_fim date)
returns jsonb language sql stable security definer set search_path = public as $$
  with
  contatos as (
    select coalesce(d.diagnostic_paid, false) as diag_pago
      from public.clients c
      join public.tenants tn on tn.id = c.tenant_id
      left join lateral (
        select x.diagnostic_paid from public.deals x
         where x.client_id = c.id order by x.created_at desc limit 1
      ) d on true
     where c.tenant_id = p_tenant and c.origin in ('anuncio_meta', 'anuncio_google')
       and (c.created_at at time zone tn.timezone)::date between p_ini and p_fim
  ),
  k as (select count(*) as contatos, count(*) filter (where diag_pago) as diagnosticos from contatos),
  inv as (
    select coalesce(sum(amount_cents), 0) as investido
      from public.ad_spend where tenant_id = p_tenant and spent_on between p_ini and p_fim
  )
  select jsonb_build_object(
    'inicio', p_ini, 'fim', p_fim,
    'investido_cents', inv.investido, 'contatos', k.contatos, 'diagnosticos', k.diagnosticos,
    'custo_contato_cents', case when k.contatos > 0 and inv.investido > 0
                                then round(inv.investido::numeric / k.contatos)::bigint end,
    'custo_diagnostico_cents', case when k.diagnosticos > 0 and inv.investido > 0
                                    then round(inv.investido::numeric / k.diagnosticos)::bigint end)
  from k, inv;
$$;
revoke all on function public._trafego_numeros(uuid, date, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Topo e gráficos: números do período com variação + 8 semanas
-- Período anterior = o mesmo trecho, deslocado: "Este mês" (1 a 22/10) compara com 1 a 22/09;
-- "3 meses" com os 3 meses de antes; "Ano" com o ano passado até a mesma data.
-- ---------------------------------------------------------------------
create or replace function public.trafego_tendencia(p_periodo text default 'mes')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  tz text; hoje date; mes_ini date; ini date; meses int; p_ini date; p_fim date;
  semana0 date;
  atual jsonb; anterior jsonb; semanas jsonb;
begin
  select timezone into tz from public.tenants where id = t;
  hoje := (now() at time zone tz)::date;
  mes_ini := date_trunc('month', hoje)::date;
  ini := case p_periodo when '3meses' then (mes_ini - interval '2 months')::date
                        when 'ano' then date_trunc('year', hoje)::date
                        else mes_ini end;
  meses := case p_periodo when '3meses' then 3 when 'ano' then 12 else 1 end;
  p_ini := (ini - make_interval(months => meses))::date;
  p_fim := least((hoje - make_interval(months => meses))::date, ini - 1);

  atual := public._trafego_numeros(t, ini, hoje);
  anterior := public._trafego_numeros(t, p_ini, p_fim);

  -- Semanas de segunda a domingo; a última é a semana corrente (até hoje)
  semana0 := (date_trunc('week', hoje)::date - 49);
  select jsonb_agg(jsonb_build_object(
           'inicio', s.inicio, 'fim', least(s.inicio + 6, hoje),
           'google_cents', s.google, 'meta_cents', s.meta, 'contatos', s.contatos,
           'custo_contato_cents', case when s.contatos > 0 and s.google + s.meta > 0
                                       then round((s.google + s.meta)::numeric / s.contatos)::bigint end)
           order by s.inicio)
    into semanas
    from (
      select w::date as inicio,
             (select coalesce(sum(sp.amount_cents), 0) from public.ad_spend sp
                join public.ad_campaigns ca on ca.id = sp.campaign_id
               where sp.tenant_id = t and ca.platform = 'google'
                 and sp.spent_on between w::date and least(w::date + 6, hoje)) as google,
             (select coalesce(sum(sp.amount_cents), 0) from public.ad_spend sp
                join public.ad_campaigns ca on ca.id = sp.campaign_id
               where sp.tenant_id = t and ca.platform = 'meta'
                 and sp.spent_on between w::date and least(w::date + 6, hoje)) as meta,
             (select count(*) from public.clients c
               where c.tenant_id = t and c.origin in ('anuncio_meta', 'anuncio_google')
                 and (c.created_at at time zone tz)::date between w::date and least(w::date + 6, hoje)) as contatos
        from generate_series(semana0, date_trunc('week', hoje)::date, interval '1 week') w
    ) s;

  return jsonb_build_object(
    'periodo', jsonb_build_object('id', coalesce(p_periodo, 'mes'), 'inicio', ini, 'fim', hoje),
    'atual', atual,
    'anterior', anterior,
    'variacao', jsonb_build_object(
      'contatos', (atual->>'contatos')::int - (anterior->>'contatos')::int,
      'custo_contato_cents', (atual->>'custo_contato_cents')::bigint - (anterior->>'custo_contato_cents')::bigint,
      'custo_diagnostico_cents', (atual->>'custo_diagnostico_cents')::bigint - (anterior->>'custo_diagnostico_cents')::bigint),
    'semanas', coalesce(semanas, '[]'::jsonb),
    -- Limite de custo por contato: ainda não há onde configurar; a tela só desenha a linha quando houver.
    'limite_custo_contato_cents', null
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Lançamentos do período, paginados (opcional: só de uma campanha)
-- ---------------------------------------------------------------------
create or replace function public.trafego_lancamentos(
  p_periodo text default 'mes', p_campanha uuid default null,
  p_pagina integer default 0, p_por_pagina integer default 20
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  tz text; hoje date; mes_ini date; ini date;
  pp int := least(greatest(coalesce(p_por_pagina, 20), 1), 100);
  pg int := greatest(coalesce(p_pagina, 0), 0);
  r jsonb;
begin
  select timezone into tz from public.tenants where id = t;
  hoje := (now() at time zone tz)::date;
  mes_ini := date_trunc('month', hoje)::date;
  ini := case p_periodo when '3meses' then (mes_ini - interval '2 months')::date
                        when 'ano' then date_trunc('year', hoje)::date
                        else mes_ini end;

  with base as (
    select s.id, s.spent_on, s.created_at, s.campaign_id, s.amount_cents, s.clicks, s.note,
           ca.name, ca.platform::text as plataforma
      from public.ad_spend s join public.ad_campaigns ca on ca.id = s.campaign_id
     where s.tenant_id = t and s.spent_on between ini and hoje
       and (p_campanha is null or s.campaign_id = p_campanha)
  ),
  pagina as (
    select * from base order by spent_on desc, created_at desc, id limit pp offset pg * pp
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'total_cents', (select coalesce(sum(amount_cents), 0) from base),
    'pagina', pg, 'por_pagina', pp,
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'data', spent_on, 'plataforma', plataforma, 'campanha_id', campaign_id,
        'campanha', name, 'valor_cents', amount_cents, 'cliques', clicks, 'nota', note)
        order by spent_on desc, created_at desc, id) from pagina), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;

revoke all on function public.trafego_tendencia(text) from public, anon;
revoke all on function public.trafego_lancamentos(text, uuid, integer, integer) from public, anon;
grant execute on function public.trafego_tendencia(text),
  public.trafego_lancamentos(text, uuid, integer, integer) to authenticated;
