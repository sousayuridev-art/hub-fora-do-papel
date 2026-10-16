-- =====================================================================
-- Hub Fora do Papel · S5 · Tráfego pago (lançamento manual)
-- Card: docs/cards/S5-trafego-pago.md
-- Investimento lançado à mão; contatos, diagnósticos e fechamentos vêm do funil
-- (origem Anúncio + "Qual anúncio" = nome da campanha). Contas só no banco.
-- =====================================================================

create type public.ad_platform as enum ('google', 'meta');

create table public.ad_budgets (
  tenant_id       uuid primary key references public.tenants (id) on delete cascade,
  monthly_cents   integer not null check (monthly_cents between 0 and 100000000),
  google_cents    integer not null check (google_cents between 0 and 100000000),
  meta_cents      integer not null check (meta_cents between 0 and 100000000),
  updated_at      timestamptz not null default now()
);

create table public.ad_campaigns (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  platform    public.ad_platform not null,
  name        text not null check (length(trim(name)) between 2 and 80),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index ad_campaigns_nome_unico on public.ad_campaigns (tenant_id, lower(trim(name)));
create trigger ad_campaigns_touch before update on public.ad_campaigns
  for each row execute function public.touch_updated_at();

create table public.ad_spend (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  campaign_id  uuid not null references public.ad_campaigns (id) on delete cascade,
  spent_on     date not null,
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  clicks       integer check (clicks is null or clicks between 0 and 10000000),
  note         text check (note is null or length(note) <= 300),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index ad_spend_tenant_data_idx on public.ad_spend (tenant_id, spent_on);
create index ad_spend_campanha_idx on public.ad_spend (campaign_id);

create or replace function public.ad_spend_check_tenant()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.ad_campaigns c where c.id = new.campaign_id and c.tenant_id = new.tenant_id) then
    raise exception 'campanha_de_outro_tenant' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger ad_spend_tenant_guard before insert or update of tenant_id, campaign_id on public.ad_spend
  for each row execute function public.ad_spend_check_tenant();

-- Para ligar o contato à campanha pelo nome
create index clients_tenant_anuncio_idx on public.clients (tenant_id, lower(trim(ad_name)))
  where origin in ('anuncio_meta', 'anuncio_google');

-- RLS: só o dono lê; escrita só por RPC; anon nada
alter table public.ad_budgets   enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_spend     enable row level security;
create policy ad_budgets_owner_select on public.ad_budgets for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy ad_campaigns_owner_select on public.ad_campaigns for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy ad_spend_owner_select on public.ad_spend for select to authenticated using (public.is_tenant_owner(tenant_id));
revoke all on public.ad_budgets, public.ad_campaigns, public.ad_spend from anon;
revoke insert, update, delete, truncate on public.ad_budgets, public.ad_campaigns, public.ad_spend from authenticated;

-- Orçamento inicial: R$ 500/mês (Google R$ 300 · Instagram e Facebook R$ 200), do canvas da proposta 2
create or replace function public._orcamento(p_tenant uuid)
returns public.ad_budgets language plpgsql security definer set search_path = public as $$
declare o public.ad_budgets;
begin
  insert into public.ad_budgets (tenant_id, monthly_cents, google_cents, meta_cents)
  values (p_tenant, 50000, 30000, 20000) on conflict (tenant_id) do nothing;
  select * into o from public.ad_budgets where tenant_id = p_tenant;
  return o;
end;
$$;
revoke all on function public._orcamento(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Escrita
-- ---------------------------------------------------------------------
create or replace function public.trafego_campanha_salvar(
  p_id uuid, p_nome text, p_plataforma public.ad_platform, p_ativa boolean default true
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); c public.ad_campaigns;
begin
  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'nome_da_campanha' using errcode = '22023';
  end if;
  begin
    if p_id is null then
      insert into public.ad_campaigns (tenant_id, platform, name, active)
      values (t, p_plataforma, left(trim(p_nome), 80), coalesce(p_ativa, true)) returning * into c;
    else
      update public.ad_campaigns set platform = p_plataforma, name = left(trim(p_nome), 80),
        active = coalesce(p_ativa, active)
      where id = p_id and tenant_id = t returning * into c;
      if c.id is null then raise exception 'campanha_inexistente' using errcode = 'P0002'; end if;
    end if;
  exception when unique_violation then
    raise exception 'campanha_repetida' using errcode = '22023';
  end;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'trafego.campanha_salva', jsonb_build_object('campanha_id', c.id, 'nome', c.name, 'ativa', c.active));
  return to_jsonb(c) - 'tenant_id';
end;
$$;

create or replace function public.trafego_registrar(
  p_campanha uuid, p_data date, p_valor_cents integer, p_cliques integer default null, p_nota text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.ad_spend;
begin
  if not exists (select 1 from public.ad_campaigns where id = p_campanha and tenant_id = t) then
    raise exception 'campanha_inexistente' using errcode = 'P0002';
  end if;
  if p_valor_cents is null or p_valor_cents <= 0 then
    raise exception 'valor_invalido' using errcode = '22023';
  end if;
  if p_data is null or p_data > current_date + 1 then
    raise exception 'data_invalida' using errcode = '22023';
  end if;
  insert into public.ad_spend (tenant_id, campaign_id, spent_on, amount_cents, clicks, note, created_by)
  values (t, p_campanha, p_data, p_valor_cents, p_cliques, nullif(left(trim(coalesce(p_nota, '')), 300), ''), auth.uid())
  returning * into s;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'trafego.investimento_registrado', jsonb_build_object('id', s.id, 'campanha_id', s.campaign_id,
          'data', s.spent_on, 'valor_cents', s.amount_cents));
  return to_jsonb(s) - 'tenant_id';
end;
$$;

create or replace function public.trafego_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.ad_spend;
begin
  delete from public.ad_spend where id = p_id and tenant_id = t returning * into s;
  if s.id is null then raise exception 'investimento_inexistente' using errcode = 'P0002'; end if;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'trafego.investimento_removido', jsonb_build_object('id', s.id, 'valor_cents', s.amount_cents));
  return to_jsonb(s) - 'tenant_id';
end;
$$;

create or replace function public.trafego_orcamento_salvar(p_google_cents integer, p_meta_cents integer)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); o public.ad_budgets := public._orcamento(t);
begin
  if coalesce(p_google_cents, -1) < 0 or coalesce(p_meta_cents, -1) < 0 then
    raise exception 'valor_invalido' using errcode = '22023';
  end if;
  update public.ad_budgets set google_cents = p_google_cents, meta_cents = p_meta_cents,
    monthly_cents = p_google_cents + p_meta_cents, updated_at = now()
  where tenant_id = t returning * into o;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'trafego.orcamento_salvo', jsonb_build_object('mensal_cents', o.monthly_cents));
  return to_jsonb(o) - 'tenant_id';
end;
$$;

-- ---------------------------------------------------------------------
-- Leitura: tudo o que a tela mostra, num pacote só
-- ---------------------------------------------------------------------
create or replace function public.trafego_painel(p_periodo text default 'mes')
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  tz text; hoje date; ini date; mes_ini date; dias_mes int; dia int;
  o public.ad_budgets := public._orcamento(t);
  pr public.pricing_settings := public._precos(t);
  r jsonb;
begin
  select timezone into tz from public.tenants where id = t;
  hoje := (now() at time zone tz)::date;
  mes_ini := date_trunc('month', hoje)::date;
  ini := case p_periodo when '3meses' then (mes_ini - interval '2 months')::date
                        when 'ano' then date_trunc('year', hoje)::date
                        else mes_ini end;
  dias_mes := extract(day from (mes_ini + interval '1 month - 1 day'))::int;
  dia := extract(day from hoje)::int;

  with
  contatos as (
    select c.id, c.created_at,
           date_trunc('month', (c.created_at at time zone tz))::date as mes,
           case c.origin when 'anuncio_google' then 'google' else 'meta' end as plataforma,
           nullif(lower(trim(coalesce(c.ad_name, ''))), '') as chave,
           coalesce(d.diagnostic_paid, false) as diag_pago,
           d.diagnostic_tier,
           coalesce(d.stage in ('proposta', 'fechado')
                    or exists (select 1 from public.proposals p where p.deal_id = d.id and p.sent_at is not null), false) as proposta,
           coalesce(d.stage = 'fechado', false) as fechado,
           case when d.stage = 'fechado' then coalesce(d.value_cents, 0) else 0 end as valor_fechado
      from public.clients c
      left join lateral (select * from public.deals x where x.client_id = c.id order by x.created_at desc limit 1) d on true
     where c.tenant_id = t and c.origin in ('anuncio_meta', 'anuncio_google')
       and (c.created_at at time zone tz)::date between ini and hoje
  ),
  gastos as (
    select s.*, ca.platform::text as plataforma, lower(trim(ca.name)) as chave,
           date_trunc('month', s.spent_on)::date as mes
      from public.ad_spend s join public.ad_campaigns ca on ca.id = s.campaign_id
     where s.tenant_id = t and s.spent_on between ini and hoje
  ),
  tot as (
    select (select coalesce(sum(amount_cents), 0) from gastos) as investido,
           (select sum(clicks) from gastos) as cliques,
           (select count(*) from contatos) as contatos,
           (select count(*) from contatos where diag_pago) as diagnosticos,
           (select count(*) from contatos where proposta) as propostas,
           (select count(*) from contatos where fechado) as fechados,
           (select coalesce(sum(valor_fechado), 0) from contatos) as valor_fechado,
           (select coalesce(sum(case diagnostic_tier when 'essencial' then pr.diag_essencial_cents
                                                     when 'ampliado' then pr.diag_ampliado_cents else 0 end), 0)
              from contatos where diag_pago) as receita_diag
  ),
  por_plat as (
    select pl as plataforma,
           (select coalesce(sum(amount_cents), 0) from gastos g where g.plataforma = pl) as investido,
           (select count(*) from contatos k where k.plataforma = pl) as contatos,
           (select count(*) from contatos k where k.plataforma = pl and k.diag_pago) as diagnosticos
      from unnest(array['google', 'meta']) pl
  ),
  mes_atual as (
    select ca.platform::text as plataforma, coalesce(sum(s.amount_cents), 0) as gasto
      from public.ad_spend s join public.ad_campaigns ca on ca.id = s.campaign_id
     where s.tenant_id = t and s.spent_on between mes_ini and hoje
     group by ca.platform
  ),
  camp as (
    select ca.id, ca.name, ca.platform::text as plataforma, ca.active,
           (select coalesce(sum(amount_cents), 0) from gastos g where g.campaign_id = ca.id) as investido,
           (select count(*) from contatos k where k.chave = lower(trim(ca.name))) as contatos,
           (select count(*) from contatos k where k.chave = lower(trim(ca.name)) and k.diag_pago) as diagnosticos,
           (select count(*) from contatos k where k.chave = lower(trim(ca.name)) and k.fechado) as fechados
      from public.ad_campaigns ca where ca.tenant_id = t
  ),
  sem_camp as (
    select count(*) as contatos, count(*) filter (where diag_pago) as diagnosticos, count(*) filter (where fechado) as fechados
      from contatos k
     where k.chave is null or not exists (select 1 from public.ad_campaigns ca where ca.tenant_id = t and lower(trim(ca.name)) = k.chave)
  ),
  meses as (
    select m::date as mes from generate_series(ini, mes_ini, interval '1 month') m
  ),
  retorno as (
    select me.mes,
           (select coalesce(sum(amount_cents), 0) from gastos g where g.mes = me.mes) as investido,
           (select count(*) from contatos k where k.mes = me.mes) as contatos,
           (select count(*) from contatos k where k.mes = me.mes and k.fechado) as fechados,
           (select coalesce(sum(valor_fechado), 0) from contatos k where k.mes = me.mes) as valor_fechado
      from meses me
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('id', coalesce(p_periodo, 'mes'), 'inicio', ini, 'fim', hoje),
    'orcamento', jsonb_build_object(
       'mensal_cents', o.monthly_cents, 'google_cents', o.google_cents, 'meta_cents', o.meta_cents,
       'gasto_cents', (select coalesce(sum(gasto), 0) from mes_atual),
       'gasto_google_cents', (select coalesce(sum(gasto), 0) from mes_atual where plataforma = 'google'),
       'gasto_meta_cents', (select coalesce(sum(gasto), 0) from mes_atual where plataforma = 'meta'),
       'dia', dia, 'dias_no_mes', dias_mes, 'mes', mes_ini),
    'indicadores', (select jsonb_build_object(
       'investido_cents', investido, 'cliques', cliques, 'contatos', contatos,
       'diagnosticos', diagnosticos, 'propostas', propostas, 'fechados', fechados,
       'valor_fechado_cents', valor_fechado, 'receita_diagnosticos_cents', receita_diag,
       'custo_contato_cents', case when contatos > 0 and investido > 0 then round(investido::numeric / contatos)::bigint end,
       'custo_diagnostico_cents', case when diagnosticos > 0 and investido > 0 then round(investido::numeric / diagnosticos)::bigint end,
       'retorno', case when investido > 0 then round(valor_fechado::numeric / investido, 1) end)
       from tot),
    'por_plataforma', (select jsonb_agg(jsonb_build_object(
       'plataforma', plataforma, 'investido_cents', investido, 'contatos', contatos, 'diagnosticos', diagnosticos,
       'custo_contato_cents', case when contatos > 0 and investido > 0 then round(investido::numeric / contatos)::bigint end,
       'custo_diagnostico_cents', case when diagnosticos > 0 and investido > 0 then round(investido::numeric / diagnosticos)::bigint end)
       order by plataforma) from por_plat),
    'campanhas', coalesce((select jsonb_agg(jsonb_build_object(
       'id', id, 'nome', name, 'plataforma', plataforma, 'ativa', active, 'investido_cents', investido,
       'contatos', contatos, 'diagnosticos', diagnosticos, 'fechados', fechados,
       'custo_contato_cents', case when contatos > 0 and investido > 0 then round(investido::numeric / contatos)::bigint end,
       'pct_diagnostico', case when contatos > 0 then round(100.0 * diagnosticos / contatos)::int end)
       order by active desc, investido desc, name) from camp), '[]'::jsonb),
    'sem_campanha', (select to_jsonb(sem_camp) from sem_camp),
    'retorno', (select jsonb_agg(jsonb_build_object(
       'mes', mes, 'investido_cents', investido, 'contatos', contatos, 'fechados', fechados,
       'valor_fechado_cents', valor_fechado,
       'retorno', case when investido > 0 then round(valor_fechado::numeric / investido, 1) end) order by mes)
       from retorno),
    'investimentos', coalesce((select jsonb_agg(jsonb_build_object(
       'id', g.id, 'data', g.spent_on, 'plataforma', g.plataforma, 'campanha_id', g.campaign_id,
       'campanha', (select name from public.ad_campaigns where id = g.campaign_id),
       'valor_cents', g.amount_cents, 'cliques', g.clicks, 'nota', g.note) order by g.spent_on desc, g.created_at desc)
       from gastos g), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;

revoke all on function public.trafego_campanha_salvar(uuid, text, public.ad_platform, boolean) from public, anon;
revoke all on function public.trafego_registrar(uuid, date, integer, integer, text) from public, anon;
revoke all on function public.trafego_remover(uuid) from public, anon;
revoke all on function public.trafego_orcamento_salvar(integer, integer) from public, anon;
revoke all on function public.trafego_painel(text) from public, anon;
grant execute on function public.trafego_campanha_salvar(uuid, text, public.ad_platform, boolean),
  public.trafego_registrar(uuid, date, integer, integer, text), public.trafego_remover(uuid),
  public.trafego_orcamento_salvar(integer, integer), public.trafego_painel(text) to authenticated;
