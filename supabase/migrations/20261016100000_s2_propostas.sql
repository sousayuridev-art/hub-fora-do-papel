-- =====================================================================
-- Hub Fora do Papel · S2 · Propostas com aceite pelo link
-- Card: docs/cards/S2-propostas-com-aceite.md
-- A conta da proposta mora aqui (_proposta_calcular). O cliente (anon) só
-- chega pelas RPCs do link; nenhuma tabela é legível por anon.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Preços da agência
-- ---------------------------------------------------------------------
create table public.pricing_settings (
  tenant_id             uuid primary key references public.tenants (id) on delete cascade,
  hour_cents            integer not null check (hour_cents between 1000 and 10000000),
  floor_cents           integer not null check (floor_cents between 1000 and 10000000),
  diag_essencial_cents  integer not null check (diag_essencial_cents between 0 and 100000000),
  diag_essencial_hours  numeric(5,1) not null check (diag_essencial_hours between 0 and 999),
  diag_ampliado_cents   integer not null check (diag_ampliado_cents between 0 and 100000000),
  diag_ampliado_hours   numeric(5,1) not null check (diag_ampliado_hours between 0 and 999),
  diag_credit_days      integer not null default 30 check (diag_credit_days between 0 and 365),
  split_threshold_cents integer not null default 1000000 check (split_threshold_cents > 0),
  pay_pix               boolean not null default true,
  pay_boleto            boolean not null default true,
  pay_card              boolean not null default true,
  late_fee_pct          numeric(4,2) not null default 2 check (late_fee_pct between 0 and 2),
  interest_pct          numeric(4,2) not null default 1 check (interest_pct between 0 and 10),
  validity_days         integer not null default 15 check (validity_days between 1 and 90),
  adjustment_index      text not null default 'IPCA' check (adjustment_index in ('IPCA', 'IGP-M', 'nenhum')),
  infra_at_cost         boolean not null default true,
  updated_at            timestamptz not null default now(),
  constraint pricing_piso_abaixo_da_hora check (floor_cents <= hour_cents)
);

create table public.pricing_plans (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  name         text not null check (length(trim(name)) between 2 and 40),
  hours_month  numeric(4,1) not null check (hours_month between 0 and 200),
  price_cents  integer not null check (price_cents between 0 and 100000000),
  min_months   integer not null check (min_months between 1 and 60),
  position     smallint not null default 0,
  active       boolean not null default true,
  unique (tenant_id, name)
);
create index pricing_plans_tenant_idx on public.pricing_plans (tenant_id, position);

-- Valores iniciais: canvas "proposta 2" (16/10). Editáveis em Configurações › Preços.
create or replace function public._precos(p_tenant uuid)
returns public.pricing_settings language plpgsql security definer set search_path = public as $$
declare s public.pricing_settings;
begin
  select * into s from public.pricing_settings where tenant_id = p_tenant;
  if s.tenant_id is null then
    insert into public.pricing_settings (tenant_id, hour_cents, floor_cents,
      diag_essencial_cents, diag_essencial_hours, diag_ampliado_cents, diag_ampliado_hours)
    values (p_tenant, 30000, 25000, 200000, 7, 450000, 15)
    on conflict (tenant_id) do nothing;
    insert into public.pricing_plans (tenant_id, name, hours_month, price_cents, min_months, position)
    values (p_tenant, 'Essencial', 1.5, 40000, 6, 1),
           (p_tenant, 'Evolução', 4.5, 120000, 6, 2),
           (p_tenant, 'Parceria', 11, 300000, 12, 3)
    on conflict (tenant_id, name) do nothing;
    select * into s from public.pricing_settings where tenant_id = p_tenant;
  end if;
  return s;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Diagnóstico pago: quando
-- ---------------------------------------------------------------------
alter table public.deals add column diagnostic_paid_at timestamptz;
update public.deals set diagnostic_paid_at = updated_at where diagnostic_paid and diagnostic_paid_at is null;

create or replace function public.deals_marca_diagnostico_pago()
returns trigger language plpgsql as $$
begin
  if new.diagnostic_paid and not coalesce(old.diagnostic_paid, false) then
    new.diagnostic_paid_at := now();
  elsif not new.diagnostic_paid then
    new.diagnostic_paid_at := null;
  end if;
  return new;
end;
$$;
create trigger deals_diagnostico_pago before insert or update of diagnostic_paid on public.deals
  for each row execute function public.deals_marca_diagnostico_pago();

-- ---------------------------------------------------------------------
-- 3. Linha do tempo: novos tipos e origem "cliente"
-- ---------------------------------------------------------------------
alter table public.deal_events drop constraint deal_events_kind_check;
alter table public.deal_events add constraint deal_events_kind_check check (kind in (
  'contato_criado', 'contato_repetido', 'etapa_alterada', 'oportunidade_atualizada',
  'arquivada', 'desarquivada', 'cliente_atualizado', 'pedido_do_site',
  'proposta_criada', 'proposta_enviada', 'proposta_vista', 'proposta_aceita',
  'proposta_recusada', 'proposta_reaberta'));
alter table public.deal_events drop constraint deal_events_source_check;
alter table public.deal_events add constraint deal_events_source_check
  check (source in ('hub', 'site', 'cliente'));

-- ---------------------------------------------------------------------
-- 4. Propostas
-- ---------------------------------------------------------------------
create type public.proposal_status as enum ('rascunho', 'enviada', 'aceita', 'recusada');

create table public.proposals (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  client_id         uuid not null references public.clients (id) on delete cascade,
  deal_id           uuid not null references public.deals (id) on delete cascade,
  status            public.proposal_status not null default 'rascunho',
  version           integer not null default 1,
  project_type      text check (project_type is null or length(project_type) <= 80),
  title             text check (title is null or length(title) <= 160),
  intro             text check (intro is null or length(intro) <= 1200),
  heard             jsonb not null default '[]'::jsonb check (jsonb_typeof(heard) = 'array'),
  heard_summary     text check (heard_summary is null or length(heard_summary) <= 600),
  items             jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  exclusions        jsonb not null default '[]'::jsonb check (jsonb_typeof(exclusions) = 'array'),
  phases            jsonb not null default '[]'::jsonb check (jsonb_typeof(phases) = 'array'),
  launch_date       date,
  complexity        numeric(3,2) not null default 1 check (complexity in (1.00, 1.15, 1.30)),
  contingency_pct   smallint not null default 10 check (contingency_pct in (10, 15, 20)),
  discount_cents    integer not null default 0 check (discount_cents between 0 and 100000000),
  discount_reason   text check (discount_reason is null or length(discount_reason) <= 400),
  plan_id           uuid references public.pricing_plans (id) on delete set null,
  infra_cents       integer check (infra_cents is null or infra_cents between 0 and 10000000),
  checks            jsonb not null default '{}'::jsonb check (jsonb_typeof(checks) = 'object'),
  total_cents       integer,
  hours_total       numeric(6,1),
  token             text unique check (token is null or token ~ '^[0-9a-f]{64}$'),
  sent_at           timestamptz,
  expires_at        timestamptz,
  viewed_at         timestamptz,
  accepted_at       timestamptz,
  refused_at        timestamptz,
  refused_reason    text check (refused_reason is null or length(refused_reason) <= 600),
  accept_data       jsonb,
  snapshot          jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint proposals_enviada_tem_link check (status = 'rascunho' or (token is not null and snapshot is not null)),
  constraint proposals_aceita_tem_dados check (status <> 'aceita' or (accepted_at is not null and accept_data is not null))
);
create index proposals_tenant_status_idx on public.proposals (tenant_id, status, updated_at desc);
create index proposals_client_idx on public.proposals (client_id);
-- Uma proposta em andamento por oportunidade
create unique index proposals_uma_aberta_por_oportunidade on public.proposals (deal_id)
  where status in ('rascunho', 'enviada');

create trigger proposals_touch before update on public.proposals
  for each row execute function public.touch_updated_at();

create or replace function public.proposals_check_tenant()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.deals d where d.id = new.deal_id
                  and d.tenant_id = new.tenant_id and d.client_id = new.client_id) then
    raise exception 'oportunidade_de_outro_cliente' using errcode = '23514';
  end if;
  if new.plan_id is not null and not exists (
       select 1 from public.pricing_plans p where p.id = new.plan_id and p.tenant_id = new.tenant_id) then
    raise exception 'plano_de_outro_tenant' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger proposals_tenant_guard before insert or update of tenant_id, client_id, deal_id, plan_id
  on public.proposals for each row execute function public.proposals_check_tenant();

-- ---------------------------------------------------------------------
-- 5. RLS: só o dono lê; escrita só por RPC; anon não lê nada
-- ---------------------------------------------------------------------
alter table public.pricing_settings enable row level security;
alter table public.pricing_plans    enable row level security;
alter table public.proposals        enable row level security;

create policy pricing_settings_owner_select on public.pricing_settings
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy pricing_plans_owner_select on public.pricing_plans
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy proposals_owner_select on public.proposals
  for select to authenticated using (public.is_tenant_owner(tenant_id));

revoke all on public.pricing_settings, public.pricing_plans, public.proposals from anon;
revoke insert, update, delete, truncate on public.pricing_settings, public.pricing_plans, public.proposals from authenticated;

-- ---------------------------------------------------------------------
-- 6. Apoio
-- ---------------------------------------------------------------------

-- CPF (11) ou CNPJ (14) com dígitos verificadores
create or replace function public._documento_valido(p_digitos text)
returns boolean language plpgsql immutable as $$
declare
  d int[]; s int; r int; i int; n int := length(coalesce(p_digitos, ''));
  pesos1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  pesos2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
begin
  if p_digitos !~ '^\d+$' or n not in (11, 14) or p_digitos ~ '^(\d)\1+$' then
    return false;
  end if;
  d := (select array_agg(substr(p_digitos, k, 1)::int order by k) from generate_series(1, n) k);
  if n = 11 then
    s := 0; for i in 1..9 loop s := s + d[i] * (11 - i); end loop;
    r := (s * 10) % 11; if r = 10 then r := 0; end if;
    if r <> d[10] then return false; end if;
    s := 0; for i in 1..10 loop s := s + d[i] * (12 - i); end loop;
    r := (s * 10) % 11; if r = 10 then r := 0; end if;
    return r = d[11];
  end if;
  s := 0; for i in 1..12 loop s := s + d[i] * pesos1[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> d[13] then return false; end if;
  s := 0; for i in 1..13 loop s := s + d[i] * pesos2[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = d[14];
end;
$$;

-- A conta da proposta. Dinheiro em centavos; arredonda para cima a cada R$ 500.
create or replace function public._proposta_calcular(p public.proposals)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  s public.pricing_settings := public._precos(p.tenant_id);
  d public.deals;
  pl public.pricing_plans;
  v_horas numeric := 0;
  v_itens_ok boolean := true;
  v_base numeric; v_comp numeric; v_cont numeric; v_bruto numeric; v_arred bigint;
  v_diag bigint := 0; v_diag_tier text := null;
  v_total bigint; v_vh bigint; v_partes jsonb; v_pcts numeric[]; v_quando text[];
  v_acum bigint := 0; v_parte bigint; i int;
  v_motivo_ok boolean; v_abaixo boolean; v_pend jsonb := '[]'::jsonb;
  v_ref timestamptz := coalesce(p.sent_at, now());
begin
  select coalesce(sum(greatest(0, coalesce((it->>'horas')::numeric, 0))), 0),
         coalesce(bool_and(nullif(trim(coalesce(it->>'nome', '')), '') is not null
                           and coalesce((it->>'horas')::numeric, 0) > 0), false)
    into v_horas, v_itens_ok
    from jsonb_array_elements(p.items) it;

  v_base := v_horas * s.hour_cents;
  v_comp := v_base * p.complexity;
  v_cont := v_comp * p.contingency_pct / 100.0;
  v_bruto := v_comp + v_cont;
  v_arred := (ceil(v_bruto / 50000.0) * 50000)::bigint;

  select * into d from public.deals where id = p.deal_id;
  if d.diagnostic_paid and d.diagnostic_tier is not null and s.diag_credit_days > 0
     and d.diagnostic_paid_at >= v_ref - make_interval(days => s.diag_credit_days) then
    v_diag_tier := d.diagnostic_tier::text;
    v_diag := case d.diagnostic_tier when 'essencial' then s.diag_essencial_cents else s.diag_ampliado_cents end;
  end if;

  v_total := greatest(0, v_arred - v_diag - p.discount_cents);
  v_vh := case when v_horas > 0 then round((v_total + v_diag) / v_horas)::bigint else 0 end;
  v_abaixo := v_horas > 0 and v_vh < s.floor_cents;
  v_motivo_ok := length(trim(coalesce(p.discount_reason, ''))) >= 15;

  if v_total > s.split_threshold_cents then
    v_pcts := array[0.4, 0.3, 0.3];
    v_quando := array['no aceite', 'na entrega de um ciclo', 'na entrega final'];
  else
    v_pcts := array[0.5, 0.5];
    v_quando := array['no aceite', 'na entrega'];
  end if;
  v_partes := '[]'::jsonb;
  for i in 1..array_length(v_pcts, 1) loop
    v_parte := case when i = array_length(v_pcts, 1) then v_total - v_acum else round(v_total * v_pcts[i])::bigint end;
    v_acum := v_acum + v_parte;
    v_partes := v_partes || jsonb_build_object('pct', (v_pcts[i] * 100)::int, 'quando', v_quando[i], 'cents', v_parte);
  end loop;

  select * into pl from public.pricing_plans where id = p.plan_id;

  if nullif(trim(coalesce(p.project_type, '')), '') is null or nullif(trim(coalesce(p.title, '')), '') is null then
    v_pend := v_pend || jsonb_build_object('chave', 'textos', 'acao', 'dar tipo de projeto e título');
  end if;
  if not (v_horas > 0 and v_itens_ok) then
    v_pend := v_pend || jsonb_build_object('chave', 'itens', 'acao', 'dar nome e horas a todos os itens');
  end if;
  if jsonb_array_length(p.exclusions) = 0 then
    v_pend := v_pend || jsonb_build_object('chave', 'fora', 'acao', 'preencher o que não está incluído');
  end if;
  if v_horas = 0 or (v_abaixo and not v_motivo_ok) then
    v_pend := v_pend || jsonb_build_object('chave', 'valor_hora', 'acao', 'registrar o motivo do valor abaixo do piso');
  end if;
  if pl.id is null then
    v_pend := v_pend || jsonb_build_object('chave', 'plano', 'acao', 'escolher a mensalidade');
  end if;
  if not coalesce((p.checks->>'escopo')::boolean, false) then
    v_pend := v_pend || jsonb_build_object('chave', 'escopo', 'acao', 'conferir os itens com o pedido do cliente');
  end if;
  if not coalesce((p.checks->>'prazo')::boolean, false) then
    v_pend := v_pend || jsonb_build_object('chave', 'prazo', 'acao', 'conferir o prazo de lançamento');
  end if;
  if not coalesce((p.checks->>'contato')::boolean, false) then
    v_pend := v_pend || jsonb_build_object('chave', 'contato', 'acao', 'conferir os dados do cliente');
  end if;

  return jsonb_build_object(
    'horas', v_horas,
    'hora_cents', s.hour_cents,
    'base_cents', round(v_base)::bigint,
    'complexidade', p.complexity,
    'complexidade_cents', round(v_comp - v_base)::bigint,
    'contingencia_pct', p.contingency_pct,
    'contingencia_cents', round(v_cont)::bigint,
    'arredondamento_cents', (v_arred - round(v_bruto))::bigint,
    'projeto_cents', v_arred,
    'diagnostico', case when v_diag_tier is null then null
                   else jsonb_build_object('tipo', v_diag_tier, 'cents', v_diag, 'pago_em', d.diagnostic_paid_at) end,
    'desconto_cents', p.discount_cents,
    'total_cents', v_total,
    'valor_hora_cents', v_vh,
    'piso_cents', s.floor_cents,
    'alvo_cents', s.hour_cents,
    'abaixo_do_piso', v_abaixo,
    'parcelas', v_partes,
    'plano', case when pl.id is null then null else jsonb_build_object(
               'id', pl.id, 'nome', pl.name, 'cents', pl.price_cents,
               'horas_mes', pl.hours_month, 'minimo_meses', pl.min_months) end,
    'pendencias', v_pend,
    'pronto', jsonb_array_length(v_pend) = 0
  );
end;
$$;

-- O que o cliente vê (sem horas internas, sem desconto separado)
create or replace function public._proposta_documento(p public.proposals, c jsonb)
returns jsonb language sql volatile security definer set search_path = public as $$
  select jsonb_build_object(
    'agencia', t.name,
    'empresa', cl.company_name,
    'contato', cl.contact_name,
    'cargo', cl.contact_role,
    'responsavel', coalesce((select coalesce(nullif(trim(pr.full_name), ''),
                                             nullif(trim(u.raw_user_meta_data->>'full_name'), ''))
                               from public.memberships m
                               join auth.users u on u.id = m.user_id
                               left join public.profiles pr on pr.id = m.user_id
                              where m.tenant_id = p.tenant_id and m.role = 'owner'
                              order by m.created_at limit 1), t.name),
    'versao', p.version,
    'tipo', p.project_type,
    'titulo', p.title,
    'apresentacao', p.intro,
    'ouvimos', p.heard,
    'ouvimos_conclusao', p.heard_summary,
    'itens', (select coalesce(jsonb_agg(jsonb_build_object(
                 'nome', it->>'nome', 'descricao', it->>'descricao',
                 'destaque', coalesce((it->>'destaque')::boolean, false))), '[]'::jsonb)
               from jsonb_array_elements(p.items) it),
    'fora', p.exclusions,
    'fases', p.phases,
    'lancamento', p.launch_date,
    'investimento', jsonb_build_object(
       'projeto_cents', (c->>'projeto_cents')::bigint - (c->>'desconto_cents')::bigint,
       'diagnostico', c->'diagnostico',
       'total_cents', (c->>'total_cents')::bigint,
       'parcelas', c->'parcelas'),
    'mensalidade', case when c->'plano' is null or c->'plano' = 'null'::jsonb then null else
       (c->'plano') - 'id' || jsonb_build_object('infra_cents', p.infra_cents, 'infra_pelo_custo', s.infra_at_cost) end,
    'condicoes', jsonb_build_object(
       'pix', s.pay_pix, 'boleto', s.pay_boleto, 'cartao', s.pay_card,
       'multa_pct', s.late_fee_pct, 'juros_pct', s.interest_pct, 'reajuste', s.adjustment_index)
  )
  from public.tenants t
  join public.clients cl on cl.id = p.client_id
  cross join lateral public._precos(p.tenant_id) s
  where t.id = p.tenant_id;
$$;

create or replace function public._proposta_travar(p_id uuid, p_versao timestamptz)
returns public.proposals language plpgsql security definer set search_path = public as $$
declare p public.proposals;
begin
  select * into p from public.proposals where id = p_id for update;
  if p.id is null or not public.is_tenant_owner(p.tenant_id) then
    raise exception 'proposta_inexistente' using errcode = 'P0002';
  end if;
  if p_versao is not null and date_trunc('milliseconds', p.updated_at) <> date_trunc('milliseconds', p_versao) then
    raise exception 'versao_desatualizada' using errcode = 'PT409';
  end if;
  return p;
end;
$$;

-- Leitura dos cabeçalhos da requisição (aceite: navegador e endereço)
create or replace function public._cabecalho(p_nome text)
returns text language sql stable as $$
  select left(nullif(current_setting('request.headers', true), '')::jsonb ->> p_nome, 300);
$$;

revoke all on function public._precos(uuid) from public, anon, authenticated;
revoke all on function public._proposta_calcular(public.proposals) from public, anon, authenticated;
revoke all on function public._proposta_documento(public.proposals, jsonb) from public, anon, authenticated;
revoke all on function public._proposta_travar(uuid, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. RPCs do dono
-- ---------------------------------------------------------------------

create or replace function public.precos_ler()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.pricing_settings := public._precos(t);
begin
  return jsonb_build_object(
    'precos', to_jsonb(s) - 'tenant_id',
    'planos', (select coalesce(jsonb_agg(to_jsonb(p) - 'tenant_id' order by p.position), '[]'::jsonb)
                 from public.pricing_plans p where p.tenant_id = t));
end;
$$;

-- p_campos: colunas de pricing_settings; p_planos: [{id, hours_month, price_cents, min_months, active}]
create or replace function public.precos_salvar(p_campos jsonb, p_planos jsonb default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.pricing_settings := public._precos(t); pl jsonb;
begin
  s := jsonb_populate_record(s, coalesce(p_campos, '{}'::jsonb) - 'tenant_id' - 'updated_at');
  update public.pricing_settings set
    hour_cents = s.hour_cents, floor_cents = s.floor_cents,
    diag_essencial_cents = s.diag_essencial_cents, diag_essencial_hours = s.diag_essencial_hours,
    diag_ampliado_cents = s.diag_ampliado_cents, diag_ampliado_hours = s.diag_ampliado_hours,
    diag_credit_days = s.diag_credit_days, split_threshold_cents = s.split_threshold_cents,
    pay_pix = s.pay_pix, pay_boleto = s.pay_boleto, pay_card = s.pay_card,
    late_fee_pct = s.late_fee_pct, interest_pct = s.interest_pct,
    validity_days = s.validity_days, adjustment_index = s.adjustment_index,
    infra_at_cost = s.infra_at_cost, updated_at = now()
  where tenant_id = t;
  if not (s.pay_pix or s.pay_boleto or s.pay_card) then
    raise exception 'uma_forma_de_pagamento' using errcode = '22023';
  end if;
  for pl in select * from jsonb_array_elements(coalesce(p_planos, '[]'::jsonb)) loop
    update public.pricing_plans set
      hours_month = coalesce((pl->>'hours_month')::numeric, hours_month),
      price_cents = coalesce((pl->>'price_cents')::int, price_cents),
      min_months  = coalesce((pl->>'min_months')::int, min_months),
      active      = coalesce((pl->>'active')::boolean, active)
    where id = (pl->>'id')::uuid and tenant_id = t;
  end loop;
  insert into public.event_outbox (tenant_id, event, payload) values (t, 'precos.atualizados', '{}'::jsonb);
  return public.precos_ler();
end;
$$;

create or replace function public.proposta_criar(p_deal uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare d public.deals; p public.proposals;
begin
  select * into d from public.deals where id = p_deal for update;
  if d.id is null or not public.is_tenant_owner(d.tenant_id) then
    raise exception 'oportunidade_inexistente' using errcode = 'P0002';
  end if;
  select * into p from public.proposals where deal_id = p_deal and status in ('rascunho', 'enviada');
  if p.id is not null then
    return jsonb_build_object('id', p.id, 'reaproveitada', true);
  end if;
  if d.archived_at is not null or d.stage = 'fechado' then
    raise exception 'oportunidade_encerrada' using errcode = '22023';
  end if;
  perform public._precos(d.tenant_id);
  insert into public.proposals (tenant_id, client_id, deal_id, phases)
  values (d.tenant_id, d.client_id, d.id, jsonb_build_array(
    jsonb_build_object('nome', 'Diagnóstico', 'quando', ''),
    jsonb_build_object('nome', 'Proposta', 'quando', 'Agora'),
    jsonb_build_object('nome', 'Design', 'quando', ''),
    jsonb_build_object('nome', 'Construção', 'quando', ''),
    jsonb_build_object('nome', 'Revisão final', 'quando', ''),
    jsonb_build_object('nome', 'Lançamento', 'quando', '')))
  returning * into p;
  perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'proposta_criada', null, null,
    jsonb_build_object('proposta_id', p.id), 'hub', null);
  return jsonb_build_object('id', p.id, 'reaproveitada', false);
end;
$$;

-- Tudo o que o editor precisa: proposta, conta, cliente, oportunidade e planos
create or replace function public.proposta_detalhe(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals; c jsonb;
begin
  select * into p from public.proposals where id = p_id;
  if p.id is null or not public.is_tenant_owner(p.tenant_id) then
    raise exception 'proposta_inexistente' using errcode = 'P0002';
  end if;
  c := public._proposta_calcular(p);
  return jsonb_build_object(
    'proposta', to_jsonb(p) - 'tenant_id' - 'accept_data' || jsonb_build_object('aceite', p.accept_data),
    'calculo', c,
    'cliente', (select jsonb_build_object('id', cl.id, 'empresa', cl.company_name, 'contato', cl.contact_name,
                  'whatsapp', cl.whatsapp, 'email', cl.email) from public.clients cl where cl.id = p.client_id),
    'oportunidade', (select jsonb_build_object('id', d.id, 'etapa', d.stage, 'proximo_passo', d.next_step,
                  'proximo_passo_em', d.next_step_at, 'diagnostico', d.diagnostic_tier,
                  'diagnostico_pago', d.diagnostic_paid) from public.deals d where d.id = p.deal_id),
    'planos', (select coalesce(jsonb_agg(jsonb_build_object('id', pl.id, 'nome', pl.name, 'cents', pl.price_cents,
                  'horas_mes', pl.hours_month, 'minimo_meses', pl.min_months) order by pl.position), '[]'::jsonb)
                 from public.pricing_plans pl where pl.tenant_id = p.tenant_id and pl.active),
    'validade_dias', (public._precos(p.tenant_id)).validity_days);
end;
$$;

-- Salvamento automático do rascunho. Só mexe nas chaves enviadas.
-- Chaves: tipo, titulo, apresentacao, ouvimos (texto[] até 3), ouvimos_conclusao,
--   itens [{nome, descricao, horas, destaque}], fora [{item, motivo}], fases [{nome, quando}],
--   lancamento (AAAA-MM-DD|null), complexidade, contingencia, desconto_cents, desconto_motivo,
--   plano_id, infra_cents, conferencias {escopo, prazo, contato}
create or replace function public.proposta_salvar(p_id uuid, p_versao timestamptz, p_doc jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals := public._proposta_travar(p_id, p_versao); c jsonb; j jsonb := coalesce(p_doc, '{}'::jsonb);
begin
  if p.status <> 'rascunho' then
    raise exception 'proposta_nao_e_rascunho' using errcode = '22023';
  end if;
  if j ? 'tipo' then p.project_type := nullif(left(trim(coalesce(j->>'tipo', '')), 80), ''); end if;
  if j ? 'titulo' then p.title := nullif(left(trim(coalesce(j->>'titulo', '')), 160), ''); end if;
  if j ? 'apresentacao' then p.intro := nullif(left(trim(coalesce(j->>'apresentacao', '')), 1200), ''); end if;
  if j ? 'ouvimos_conclusao' then p.heard_summary := nullif(left(trim(coalesce(j->>'ouvimos_conclusao', '')), 600), ''); end if;
  if j ? 'ouvimos' then
    p.heard := (select coalesce(jsonb_agg(left(trim(x), 240)), '[]'::jsonb)
                  from (select jsonb_array_elements_text(j->'ouvimos') x limit 3) q where trim(x) <> '');
  end if;
  if j ? 'itens' then
    if jsonb_array_length(j->'itens') > 40 then raise exception 'itens_demais' using errcode = '22023'; end if;
    p.items := (select coalesce(jsonb_agg(jsonb_build_object(
                   'nome', left(trim(coalesce(it->>'nome', '')), 120),
                   'descricao', left(trim(coalesce(it->>'descricao', '')), 400),
                   'horas', least(999, greatest(0, coalesce(nullif(it->>'horas', '')::numeric, 0))),
                   'destaque', coalesce((it->>'destaque')::boolean, false))), '[]'::jsonb)
                  from jsonb_array_elements(j->'itens') it);
  end if;
  if j ? 'fora' then
    if jsonb_array_length(j->'fora') > 20 then raise exception 'itens_demais' using errcode = '22023'; end if;
    p.exclusions := (select coalesce(jsonb_agg(jsonb_build_object(
                   'item', left(trim(it->>'item'), 120), 'motivo', left(trim(coalesce(it->>'motivo', '')), 300))), '[]'::jsonb)
                  from jsonb_array_elements(j->'fora') it where trim(coalesce(it->>'item', '')) <> '');
  end if;
  if j ? 'fases' then
    if jsonb_array_length(j->'fases') > 10 then raise exception 'itens_demais' using errcode = '22023'; end if;
    p.phases := (select coalesce(jsonb_agg(jsonb_build_object(
                   'nome', left(trim(it->>'nome'), 40), 'quando', left(trim(coalesce(it->>'quando', '')), 40))), '[]'::jsonb)
                  from jsonb_array_elements(j->'fases') it where trim(coalesce(it->>'nome', '')) <> '');
  end if;
  if j ? 'lancamento' then p.launch_date := nullif(j->>'lancamento', '')::date; end if;
  if j ? 'complexidade' then p.complexity := (j->>'complexidade')::numeric; end if;
  if j ? 'contingencia' then p.contingency_pct := (j->>'contingencia')::smallint; end if;
  if j ? 'desconto_cents' then p.discount_cents := coalesce(nullif(j->>'desconto_cents', '')::int, 0); end if;
  if j ? 'desconto_motivo' then p.discount_reason := nullif(left(trim(coalesce(j->>'desconto_motivo', '')), 400), ''); end if;
  if j ? 'plano_id' then p.plan_id := nullif(j->>'plano_id', '')::uuid; end if;
  if j ? 'infra_cents' then p.infra_cents := nullif(j->>'infra_cents', '')::int; end if;
  if j ? 'conferencias' then
    p.checks := jsonb_build_object(
      'escopo', coalesce((j->'conferencias'->>'escopo')::boolean, false),
      'prazo', coalesce((j->'conferencias'->>'prazo')::boolean, false),
      'contato', coalesce((j->'conferencias'->>'contato')::boolean, false));
  end if;

  c := public._proposta_calcular(p);
  update public.proposals set
    project_type = p.project_type, title = p.title, intro = p.intro, heard = p.heard,
    heard_summary = p.heard_summary, items = p.items, exclusions = p.exclusions, phases = p.phases,
    launch_date = p.launch_date, complexity = p.complexity, contingency_pct = p.contingency_pct,
    discount_cents = p.discount_cents, discount_reason = p.discount_reason, plan_id = p.plan_id,
    infra_cents = p.infra_cents, checks = p.checks,
    total_cents = (c->>'total_cents')::int, hours_total = (c->>'horas')::numeric
  where id = p.id
  returning * into p;
  return jsonb_build_object('versao', p.updated_at, 'calculo', c);
end;
$$;

create or replace function public.proposta_enviar(p_id uuid, p_versao timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  p public.proposals := public._proposta_travar(p_id, p_versao);
  d public.deals; c jsonb; s public.pricing_settings; v_tz text; v_de public.deal_stage;
begin
  if p.status <> 'rascunho' then
    raise exception 'proposta_nao_e_rascunho' using errcode = '22023';
  end if;
  select * into d from public.deals where id = p.deal_id for update;
  if d.archived_at is not null or d.stage = 'fechado' then
    raise exception 'oportunidade_encerrada' using errcode = '22023';
  end if;
  p.sent_at := now();
  c := public._proposta_calcular(p);
  if not (c->>'pronto')::boolean then
    raise exception 'proposta_com_pendencias' using errcode = '22023',
      detail = (select string_agg(x->>'acao', '; ') from jsonb_array_elements(c->'pendencias') x);
  end if;
  s := public._precos(p.tenant_id);
  select timezone into v_tz from public.tenants where id = p.tenant_id;

  update public.proposals set
    status = 'enviada', sent_at = p.sent_at,
    expires_at = (((now() at time zone v_tz)::date + s.validity_days + 1)::timestamp at time zone v_tz),
    token = coalesce(token, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
    viewed_at = null, refused_at = null, refused_reason = null,
    total_cents = (c->>'total_cents')::int, hours_total = (c->>'horas')::numeric,
    snapshot = public._proposta_documento(p, c) || jsonb_build_object('enviada_em', p.sent_at)
  where id = p.id
  returning * into p;
  update public.proposals set snapshot = snapshot || jsonb_build_object('vence_em', p.expires_at)
  where id = p.id returning * into p;

  v_de := d.stage;
  update public.deals set
    value_cents = p.total_cents,
    stage = case when stage in ('contato', 'diagnostico', 'mapeamento') then 'proposta'::public.deal_stage else stage end,
    stage_changed_at = case when stage <> 'proposta' then now() else stage_changed_at end,
    next_step = 'Retorno da proposta',
    next_step_at = public._no_fuso(tenant_id, (now() at time zone v_tz)::date + 3, null),
    next_step_has_time = false
  where id = d.id
  returning * into d;

  if v_de <> d.stage then
    perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'etapa_alterada', v_de, d.stage,
      '{}'::jsonb, 'hub', 'oportunidade.etapa_alterada');
  end if;
  perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'proposta_enviada', null, null,
    jsonb_build_object('proposta_id', p.id, 'versao', p.version, 'total_cents', p.total_cents,
                       'link', '/proposta/' || p.token, 'vence_em', p.expires_at),
    'hub', 'proposta.enviada');
  return jsonb_build_object('token', p.token, 'vence_em', p.expires_at, 'total_cents', p.total_cents);
end;
$$;

-- Volta a enviada (ou recusada) para rascunho, como nova versão. O link continua o mesmo.
create or replace function public.proposta_reabrir(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals := public._proposta_travar(p_id, null);
begin
  if p.status not in ('enviada', 'recusada') then
    raise exception 'proposta_nao_pode_reabrir' using errcode = '22023';
  end if;
  if p.status = 'recusada' and exists (select 1 from public.proposals o where o.deal_id = p.deal_id
                                         and o.id <> p.id and o.status in ('rascunho', 'enviada')) then
    raise exception 'ja_existe_proposta_aberta' using errcode = '22023';
  end if;
  update public.proposals set status = 'rascunho', version = version + 1,
    sent_at = null, expires_at = null, viewed_at = null
  where id = p.id returning * into p;
  perform public._funil_registrar(p.tenant_id, p.client_id, p.deal_id, 'proposta_reaberta', null, null,
    jsonb_build_object('proposta_id', p.id, 'versao', p.version), 'hub', null);
  return jsonb_build_object('id', p.id, 'versao', p.updated_at);
end;
$$;

create or replace function public.proposta_marcar_recusada(p_id uuid, p_motivo text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals := public._proposta_travar(p_id, null);
begin
  if p.status <> 'enviada' then
    raise exception 'proposta_nao_enviada' using errcode = '22023';
  end if;
  update public.proposals set status = 'recusada', refused_at = now(),
    refused_reason = nullif(left(trim(coalesce(p_motivo, '')), 600), '')
  where id = p.id returning * into p;
  perform public._funil_registrar(p.tenant_id, p.client_id, p.deal_id, 'proposta_recusada', null, null,
    jsonb_build_object('proposta_id', p.id, 'motivo', p.refused_reason, 'por', 'hub'), 'hub', 'proposta.recusada');
  return jsonb_build_object('id', p.id);
end;
$$;

-- "Ver como o cliente vê": o mesmo documento do link, montado na hora (sem gravar nada)
create or replace function public.proposta_previa(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals; c jsonb; s public.pricing_settings;
begin
  select * into p from public.proposals where id = p_id;
  if p.id is null or not public.is_tenant_owner(p.tenant_id) then
    raise exception 'proposta_inexistente' using errcode = 'P0002';
  end if;
  if p.status <> 'rascunho' and p.snapshot is not null then
    return jsonb_build_object('estado', p.status, 'documento', p.snapshot, 'aceite', null, 'recusada_em', p.refused_at);
  end if;
  s := public._precos(p.tenant_id);
  c := public._proposta_calcular(p);
  return jsonb_build_object('estado', 'enviada', 'aceite', null, 'recusada_em', null,
    'documento', public._proposta_documento(p, c) || jsonb_build_object(
      'enviada_em', now(), 'vence_em', now() + make_interval(days => s.validity_days)));
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Lista e resumo
-- ---------------------------------------------------------------------
create view public.v_propostas with (security_invoker = true) as
select p.id, p.client_id, p.deal_id, p.version, p.project_type, p.title, p.total_cents, p.hours_total,
       p.sent_at, p.expires_at, p.viewed_at, p.accepted_at, p.refused_at, p.refused_reason,
       p.created_at, p.updated_at, p.token,
       case when p.status = 'enviada' and p.expires_at < now() then 'vencida' else p.status::text end as situacao,
       p.status, c.company_name, c.contact_name, c.whatsapp, c.email,
       d.next_step, d.next_step_at
  from public.proposals p
  join public.clients c on c.id = p.client_id
  join public.deals d on d.id = p.deal_id;

revoke all on public.v_propostas from anon;
grant select on public.v_propostas to authenticated;

create or replace function public.proposta_resumo()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'rascunho', count(*) filter (where status = 'rascunho'),
    'enviada', count(*) filter (where status = 'enviada'),
    'aceita', count(*) filter (where status = 'aceita'),
    'recusada', count(*) filter (where status = 'recusada'),
    'vencidas', count(*) filter (where situacao = 'vencida'),
    'em_negociacao_cents', coalesce(sum(total_cents) filter (where status = 'enviada' and situacao <> 'vencida'), 0),
    'aceitas_no_ano', count(*) filter (where status = 'aceita'
                         and date_trunc('year', accepted_at) = date_trunc('year', now())),
    'oportunidades_sem_proposta', (select count(*) from public.deals d
        where d.archived_at is null and d.stage <> 'fechado'
          and not exists (select 1 from public.proposals x where x.deal_id = d.id and x.status in ('rascunho', 'enviada'))))
  from public.v_propostas;
$$;

-- ---------------------------------------------------------------------
-- 9. Link do cliente (anon)
-- ---------------------------------------------------------------------
create or replace function public.proposta_publica(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('estado', 'invalido');
  end if;
  select * into p from public.proposals where token = p_token;
  if p.id is null then
    return jsonb_build_object('estado', 'invalido');
  end if;
  if p.status = 'rascunho' then
    return jsonb_build_object('estado', 'atualizando',
      'empresa', p.snapshot->>'empresa', 'responsavel', p.snapshot->>'responsavel');
  end if;
  if p.status = 'enviada' and p.expires_at < now() then
    return jsonb_build_object('estado', 'vencida', 'vence_em', p.expires_at,
      'empresa', p.snapshot->>'empresa', 'responsavel', p.snapshot->>'responsavel');
  end if;
  if p.status = 'enviada' and p.viewed_at is null then
    update public.proposals set viewed_at = now() where id = p.id;
    perform public._funil_registrar(p.tenant_id, p.client_id, p.deal_id, 'proposta_vista', null, null,
      jsonb_build_object('proposta_id', p.id, 'versao', p.version), 'cliente', 'proposta.vista');
  end if;
  return jsonb_build_object(
    'estado', p.status,
    'documento', p.snapshot,
    'aceite', case when p.status = 'aceita' then jsonb_build_object(
       'nome', p.accept_data->>'nome', 'razao_social', p.accept_data->>'razao_social',
       'documento_tipo', p.accept_data->>'documento_tipo', 'aceita_em', p.accepted_at) end,
    'recusada_em', p.refused_at);
end;
$$;

create or replace function public.proposta_aceitar(
  p_token           text,
  p_nome            text,
  p_email           text,
  p_documento       text,
  p_razao_social    text,
  p_endereco        text,
  p_email_cobranca  text default null,
  p_responsavel     text default null,
  p_concordo        boolean default false
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  p public.proposals; d public.deals; v_de public.deal_stage;
  v_doc text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cobranca text := lower(trim(coalesce(nullif(trim(p_email_cobranca), ''), p_email, '')));
  v_reg text := '^[^@\s]+@[^@\s]+\.[^@\s]+$';
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'link_invalido' using errcode = 'P0002';
  end if;
  select * into p from public.proposals where token = p_token for update;
  if p.id is null then
    raise exception 'link_invalido' using errcode = 'P0002';
  end if;
  if p.status = 'aceita' then
    return jsonb_build_object('aceita_em', p.accepted_at, 'nome', p.accept_data->>'nome', 'repetido', true);
  end if;
  if p.status <> 'enviada' then
    raise exception 'proposta_indisponivel' using errcode = '22023';
  end if;
  if p.expires_at < now() then
    raise exception 'proposta_vencida' using errcode = '22023';
  end if;
  if not coalesce(p_concordo, false) then
    raise exception 'concordo_obrigatorio' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_nome, ''))) < 3 then raise exception 'nome_invalido' using errcode = '22023'; end if;
  if v_email !~ v_reg or v_cobranca !~ v_reg then raise exception 'email_invalido' using errcode = '22023'; end if;
  if not public._documento_valido(v_doc) then raise exception 'documento_invalido' using errcode = '22023'; end if;
  if length(trim(coalesce(p_razao_social, ''))) < 3 then raise exception 'razao_social_invalida' using errcode = '22023'; end if;
  if length(trim(coalesce(p_endereco, ''))) < 8 then raise exception 'endereco_invalido' using errcode = '22023'; end if;

  update public.proposals set
    status = 'aceita', accepted_at = now(),
    accept_data = jsonb_build_object(
      'nome', left(trim(p_nome), 120), 'email', left(v_email, 160),
      'documento_tipo', case when length(v_doc) = 11 then 'cpf' else 'cnpj' end, 'documento', v_doc,
      'razao_social', left(trim(p_razao_social), 160), 'endereco', left(trim(p_endereco), 300),
      'email_cobranca', left(v_cobranca, 160),
      'responsavel', left(trim(coalesce(nullif(trim(p_responsavel), ''), p_nome)), 120),
      'versao', p.version, 'total_cents', p.total_cents,
      'navegador', public._cabecalho('user-agent'),
      'endereco_ip', split_part(coalesce(public._cabecalho('x-forwarded-for'), ''), ',', 1))
  where id = p.id returning * into p;

  update public.clients set
    document_type = p.accept_data->>'documento_tipo', document_number = v_doc,
    legal_name = p.accept_data->>'razao_social', address = p.accept_data->>'endereco',
    billing_email = p.accept_data->>'email_cobranca', legal_responsible = p.accept_data->>'responsavel',
    email = coalesce(email, v_email), client_since = coalesce(client_since, current_date)
  where id = p.client_id;

  select * into d from public.deals where id = p.deal_id for update;
  v_de := d.stage;
  update public.deals set stage = 'fechado', closed_at = now(), stage_changed_at = now(),
    value_cents = p.total_cents, archived_at = null, archived_from_stage = null,
    lost_reason = null, lost_note = null
  where id = d.id returning * into d;

  if v_de <> 'fechado' then
    perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'etapa_alterada', v_de, 'fechado',
      '{}'::jsonb, 'cliente', 'oportunidade.etapa_alterada');
  end if;
  perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'proposta_aceita', null, null,
    jsonb_build_object('proposta_id', p.id, 'versao', p.version, 'total_cents', p.total_cents,
                       'nome', p.accept_data->>'nome'), 'cliente', 'proposta.aceita');
  return jsonb_build_object('aceita_em', p.accepted_at, 'nome', p.accept_data->>'nome', 'repetido', false);
end;
$$;

create or replace function public.proposta_recusar(p_token text, p_motivo text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'link_invalido' using errcode = 'P0002';
  end if;
  select * into p from public.proposals where token = p_token for update;
  if p.id is null then raise exception 'link_invalido' using errcode = 'P0002'; end if;
  if p.status = 'recusada' then return jsonb_build_object('recusada_em', p.refused_at, 'repetido', true); end if;
  if p.status <> 'enviada' then raise exception 'proposta_indisponivel' using errcode = '22023'; end if;
  update public.proposals set status = 'recusada', refused_at = now(),
    refused_reason = nullif(left(trim(coalesce(p_motivo, '')), 600), '')
  where id = p.id returning * into p;
  perform public._funil_registrar(p.tenant_id, p.client_id, p.deal_id, 'proposta_recusada', null, null,
    jsonb_build_object('proposta_id', p.id, 'motivo', p.refused_reason, 'por', 'cliente'), 'cliente', 'proposta.recusada');
  return jsonb_build_object('recusada_em', p.refused_at, 'repetido', false);
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Permissões das RPCs
-- ---------------------------------------------------------------------
revoke all on function public.precos_ler() from public, anon;
revoke all on function public.precos_salvar(jsonb, jsonb) from public, anon;
revoke all on function public.proposta_criar(uuid) from public, anon;
revoke all on function public.proposta_detalhe(uuid) from public, anon;
revoke all on function public.proposta_salvar(uuid, timestamptz, jsonb) from public, anon;
revoke all on function public.proposta_enviar(uuid, timestamptz) from public, anon;
revoke all on function public.proposta_reabrir(uuid) from public, anon;
revoke all on function public.proposta_marcar_recusada(uuid, text) from public, anon;
revoke all on function public.proposta_resumo() from public, anon;
revoke all on function public.proposta_previa(uuid) from public, anon;
grant execute on function public.precos_ler(), public.precos_salvar(jsonb, jsonb),
  public.proposta_criar(uuid), public.proposta_detalhe(uuid),
  public.proposta_salvar(uuid, timestamptz, jsonb), public.proposta_enviar(uuid, timestamptz),
  public.proposta_reabrir(uuid), public.proposta_marcar_recusada(uuid, text),
  public.proposta_resumo(), public.proposta_previa(uuid) to authenticated;

revoke all on function public.proposta_publica(text) from public;
revoke all on function public.proposta_aceitar(text, text, text, text, text, text, text, text, boolean) from public;
revoke all on function public.proposta_recusar(text, text) from public;
grant execute on function public.proposta_publica(text),
  public.proposta_aceitar(text, text, text, text, text, text, text, text, boolean),
  public.proposta_recusar(text, text) to anon, authenticated;

-- Preços do tenant que já existe
do $$
declare t uuid;
begin
  for t in select id from public.tenants loop
    perform public._precos(t);
  end loop;
end $$;
