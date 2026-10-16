-- =====================================================================
-- S1 · Funil de vendas, Clientes e Ficha do cliente (card S1, versão 3)
-- Leitura: só o dono do tenant (RLS). Escrita: só por RPC security definer,
-- que valida tenant e versão e grava linha do tempo + event_outbox juntos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Ajustes da base encontrados na auditoria de 16/10
-- ---------------------------------------------------------------------
-- Índices nas colunas usadas pelas policies e por on delete cascade
create index if not exists client_members_tenant_idx on public.client_members (tenant_id);
create index if not exists event_outbox_tenant_idx on public.event_outbox (tenant_id);

-- Fuso da agência: "hoje" e "vencido" seguem o relógio dela, não o do servidor (UTC)
alter table public.tenants
  add column if not exists timezone text not null default 'America/Sao_Paulo';

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.contact_origin as enum
  ('indicacao', 'instagram', 'site', 'anuncio_meta', 'anuncio_google', 'outro');
create type public.deal_stage as enum
  ('contato', 'diagnostico', 'mapeamento', 'proposta', 'fechado');
create type public.diagnostic_tier as enum ('essencial', 'ampliado');
create type public.lost_reason as enum
  ('preco', 'prazo', 'escolheu_outro', 'sem_resposta', 'nao_era_o_momento', 'outro');

-- ---------------------------------------------------------------------
-- 2. clients: dados de contato e origem
-- ---------------------------------------------------------------------
alter table public.clients
  alter column whatsapp drop not null,
  add column contact_role     text check (contact_role is null or length(contact_role) <= 80),
  add column segment          text check (segment is null or length(segment) <= 60),
  add column city             text check (city is null or length(city) <= 80),
  add column origin           public.contact_origin not null default 'outro',
  add column ad_name          text check (ad_name is null or length(ad_name) <= 120),
  add column referred_by      text check (referred_by is null or length(referred_by) <= 120),
  add column current_site     text check (current_site is null or length(current_site) <= 200),
  add column size_range       text check (size_range is null or size_range in ('ate_10', '11_50', '51_200', 'mais_200')),
  add column client_since     date,
  add column last_activity_at timestamptz not null default now(),
  add column whatsapp_digits  text generated always as (nullif(regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g'), '')) stored,
  add constraint clients_contato_minimo check (
    nullif(trim(coalesce(whatsapp, '')), '') is not null or nullif(trim(coalesce(email, '')), '') is not null
  );

-- Última atividade não conta como edição da ficha: só ela mudando, a versão (updated_at) fica igual.
-- Assim anotar ou mover não invalida quem está com a ficha aberta para editar.
create or replace function public.clients_touch_updated_at()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(new) - 'last_activity_at' - 'updated_at' - 'whatsapp_digits')
     = (to_jsonb(old) - 'last_activity_at' - 'updated_at' - 'whatsapp_digits') then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.clients_touch_updated_at();

create index clients_tenant_email_idx on public.clients (tenant_id, lower(email)) where email is not null;
create index clients_tenant_whatsapp_idx on public.clients (tenant_id, whatsapp_digits) where whatsapp_digits is not null;
create index clients_tenant_atividade_idx on public.clients (tenant_id, last_activity_at desc);

-- ---------------------------------------------------------------------
-- 3. deals (oportunidades), deal_events (linha do tempo), client_notes
-- ---------------------------------------------------------------------
create table public.deals (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  client_id           uuid not null references public.clients (id) on delete cascade,
  stage               public.deal_stage not null default 'contato',
  value_cents         integer check (value_cents is null or value_cents between 0 and 100000000),
  diagnostic_tier     public.diagnostic_tier,
  diagnostic_paid     boolean not null default false,
  next_step           text check (next_step is null or length(trim(next_step)) between 1 and 200),
  next_step_at        timestamptz,
  next_step_has_time  boolean not null default false,
  requested_slot_at   timestamptz,
  archived_at         timestamptz,
  archived_from_stage public.deal_stage,
  lost_reason         public.lost_reason,
  lost_note           text check (lost_note is null or length(lost_note) <= 500),
  stage_changed_at    timestamptz not null default now(),
  closed_at           timestamptz,
  site_contato_id     uuid unique references public.site_contatos (id) on delete set null,
  position            double precision not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Etapa aberta e ativa sempre tem próximo passo com data
  constraint deals_proximo_passo check (
    stage = 'fechado' or archived_at is not null or (next_step is not null and next_step_at is not null)
  ),
  constraint deals_arquivo_com_motivo check (archived_at is null or lost_reason is not null),
  constraint deals_outro_com_nota check (lost_reason is distinct from 'outro' or nullif(trim(coalesce(lost_note, '')), '') is not null)
);
create index deals_tenant_stage_idx on public.deals (tenant_id, stage) where archived_at is null;
create index deals_tenant_next_idx on public.deals (tenant_id, next_step_at) where archived_at is null and stage <> 'fechado';
create index deals_client_idx on public.deals (client_id);
-- Uma oportunidade aberta por cliente
create unique index deals_uma_aberta_por_cliente on public.deals (client_id)
  where archived_at is null and stage <> 'fechado';

create trigger deals_touch before update on public.deals
  for each row execute function public.touch_updated_at();

-- deals.tenant_id tem que ser o tenant do cliente
create or replace function public.deals_check_tenant()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is distinct from (select tenant_id from public.clients where id = new.client_id) then
    raise exception 'deals.tenant_id difere do tenant do cliente';
  end if;
  return new;
end;
$$;
create trigger deals_tenant_guard before insert or update of tenant_id, client_id on public.deals
  for each row execute function public.deals_check_tenant();

create table public.deal_events (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  deal_id     uuid references public.deals (id) on delete cascade,
  kind        text not null check (kind in (
                'contato_criado', 'contato_repetido', 'etapa_alterada', 'oportunidade_atualizada',
                'arquivada', 'desarquivada', 'cliente_atualizado', 'pedido_do_site')),
  from_stage  public.deal_stage,
  to_stage    public.deal_stage,
  detail      jsonb not null default '{}'::jsonb,
  actor_id    uuid references auth.users (id) on delete set null,
  source      text not null default 'hub' check (source in ('hub', 'site')),
  created_at  timestamptz not null default now()
);
create index deal_events_client_idx on public.deal_events (client_id, created_at desc);
create index deal_events_deal_idx on public.deal_events (deal_id);
create index deal_events_tenant_idx on public.deal_events (tenant_id);

create table public.client_notes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  body        text not null check (length(trim(body)) between 1 and 4000),
  author_id   uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index client_notes_client_idx on public.client_notes (client_id, created_at desc);
create index client_notes_tenant_idx on public.client_notes (tenant_id);

-- ---------------------------------------------------------------------
-- 4. RLS: só o dono do tenant lê; ninguém escreve direto
-- ---------------------------------------------------------------------
alter table public.deals        enable row level security;
alter table public.deal_events  enable row level security;
alter table public.client_notes enable row level security;

create policy deals_owner_select on public.deals
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy deal_events_owner_select on public.deal_events
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy client_notes_owner_select on public.client_notes
  for select to authenticated using (public.is_tenant_owner(tenant_id));

revoke all on public.deals, public.deal_events, public.client_notes from anon;
revoke insert, update, delete, truncate on public.deals, public.deal_events, public.client_notes from authenticated;

-- ---------------------------------------------------------------------
-- 5. Funções internas (não expostas)
-- ---------------------------------------------------------------------
-- Tenant em que o usuário é dono; recusa quem não é
create or replace function public._tenant_do_dono()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select tenant_id into v from public.memberships
   where user_id = auth.uid() and role = 'owner'
   order by created_at limit 1;
  if v is null then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return v;
end;
$$;

-- Data (+ hora opcional) no fuso do tenant → timestamptz. Sem hora: meio-dia.
create or replace function public._no_fuso(p_tenant uuid, p_data date, p_hora time)
returns timestamptz language sql stable security definer set search_path = public as $$
  select case when p_data is null then null else
    ((p_data + coalesce(p_hora, time '12:00'))::timestamp at time zone
      (select timezone from public.tenants where id = p_tenant)) end;
$$;

-- Linha do tempo + fila de eventos + última atividade, sempre juntos
create or replace function public._funil_registrar(
  p_tenant uuid, p_client uuid, p_deal uuid, p_kind text,
  p_from public.deal_stage, p_to public.deal_stage, p_detail jsonb, p_source text, p_event text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.deal_events (tenant_id, client_id, deal_id, kind, from_stage, to_stage, detail, actor_id, source)
  values (p_tenant, p_client, p_deal, p_kind, p_from, p_to, coalesce(p_detail, '{}'::jsonb), auth.uid(), p_source);
  update public.clients set last_activity_at = now() where id = p_client;
  if p_event is not null then
    insert into public.event_outbox (tenant_id, event, payload)
    values (p_tenant, p_event, jsonb_build_object('client_id', p_client, 'deal_id', p_deal, 'de', p_from, 'para', p_to)
                               || coalesce(p_detail, '{}'::jsonb));
  end if;
end;
$$;

-- Oportunidade travada para alteração, com conferência de dono e de versão
create or replace function public._funil_travar(p_deal uuid, p_versao timestamptz)
returns public.deals language plpgsql security definer set search_path = public as $$
declare d public.deals;
begin
  select * into d from public.deals where id = p_deal for update;
  if d.id is null or not public.is_tenant_owner(d.tenant_id) then
    raise exception 'oportunidade_inexistente' using errcode = 'P0002';
  end if;
  if p_versao is not null and date_trunc('milliseconds', d.updated_at) <> date_trunc('milliseconds', p_versao) then
    raise exception 'versao_desatualizada' using errcode = 'PT409';
  end if;
  return d;
end;
$$;

revoke all on function public._tenant_do_dono() from public, anon, authenticated;
revoke all on function public._no_fuso(uuid, date, time) from public, anon, authenticated;
revoke all on function public._funil_registrar(uuid, uuid, uuid, text, public.deal_stage, public.deal_stage, jsonb, text, text) from public, anon, authenticated;
revoke all on function public._funil_travar(uuid, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. RPCs de escrita
-- ---------------------------------------------------------------------

-- Cria ficha + oportunidade em "Contato". Mesmo e-mail ou WhatsApp com
-- oportunidade aberta: devolve a existente e registra na linha do tempo.
create or replace function public.funil_criar_contato(
  p_empresa         text,
  p_contato         text,
  p_whatsapp        text,
  p_email           text,
  p_origem          public.contact_origin,
  p_proximo_passo   text,
  p_data            date,
  p_hora            time default null,
  p_segmento        text default null,
  p_cidade          text default null,
  p_anuncio         text default null,
  p_indicado_por    text default null,
  p_site_atual      text default null,
  p_valor_cents     integer default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_tenant  uuid := public._tenant_do_dono();
  v_contato text := nullif(trim(coalesce(p_contato, '')), '');
  v_empresa text := coalesce(nullif(trim(coalesce(p_empresa, '')), ''), v_contato);
  v_email   text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_wpp     text := nullif(trim(coalesce(p_whatsapp, '')), '');
  v_dig     text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  v_client  uuid;
  v_deal    uuid;
begin
  if v_contato is null then
    raise exception 'contato_obrigatorio' using errcode = '22023';
  end if;
  if v_email is null and v_dig is null then
    raise exception 'whatsapp_ou_email' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'email_invalido' using errcode = '22023';
  end if;
  if v_dig is not null and (length(v_dig) < 10 or length(v_dig) > 13) then
    raise exception 'whatsapp_invalido' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_proximo_passo, '')), '') is null or p_data is null then
    raise exception 'proximo_passo_obrigatorio' using errcode = '22023';
  end if;

  select id into v_client from public.clients
   where tenant_id = v_tenant
     and ((v_email is not null and lower(email) = v_email) or (v_dig is not null and whatsapp_digits = v_dig))
   order by created_at limit 1;

  if v_client is not null then
    select id into v_deal from public.deals
     where client_id = v_client and archived_at is null and stage <> 'fechado';
    if v_deal is not null then
      perform public._funil_registrar(v_tenant, v_client, v_deal, 'contato_repetido', null, null,
        jsonb_build_object('origem', p_origem), 'hub', null);
      return jsonb_build_object('client_id', v_client, 'deal_id', v_deal, 'reaproveitado', true);
    end if;
  else
    insert into public.clients (tenant_id, company_name, contact_name, whatsapp, email, origin,
                                segment, city, ad_name, referred_by, current_site)
    values (v_tenant, v_empresa, v_contato, v_wpp, v_email, coalesce(p_origem, 'outro'),
            nullif(trim(coalesce(p_segmento, '')), ''), nullif(trim(coalesce(p_cidade, '')), ''),
            nullif(trim(coalesce(p_anuncio, '')), ''), nullif(trim(coalesce(p_indicado_por, '')), ''),
            nullif(trim(coalesce(p_site_atual, '')), ''))
    returning id into v_client;
  end if;

  insert into public.deals (tenant_id, client_id, stage, value_cents, next_step, next_step_at, next_step_has_time)
  values (v_tenant, v_client, 'contato', p_valor_cents, trim(p_proximo_passo),
          public._no_fuso(v_tenant, p_data, p_hora), p_hora is not null)
  returning id into v_deal;

  perform public._funil_registrar(v_tenant, v_client, v_deal, 'contato_criado', null, 'contato',
    jsonb_build_object('origem', coalesce(p_origem, 'outro')), 'hub', 'contato.criado');
  return jsonb_build_object('client_id', v_client, 'deal_id', v_deal, 'reaproveitado', false);
end;
$$;

-- Muda a etapa. Etapa aberta exige próximo passo (o atual ou o enviado agora).
create or replace function public.funil_mover(
  p_deal          uuid,
  p_etapa         public.deal_stage,
  p_versao        timestamptz,
  p_proximo_passo text default null,
  p_data          date default null,
  p_hora          time default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  d public.deals := public._funil_travar(p_deal, p_versao);
  v_de public.deal_stage := d.stage;
begin
  if d.archived_at is not null then
    raise exception 'oportunidade_arquivada' using errcode = '22023';
  end if;
  if v_de = p_etapa then
    return to_jsonb(d);
  end if;
  if nullif(trim(coalesce(p_proximo_passo, '')), '') is not null and p_data is not null then
    d.next_step := trim(p_proximo_passo);
    d.next_step_at := public._no_fuso(d.tenant_id, p_data, p_hora);
    d.next_step_has_time := p_hora is not null;
  end if;
  if p_etapa <> 'fechado' and (d.next_step is null or d.next_step_at is null) then
    raise exception 'proximo_passo_obrigatorio' using errcode = '22023';
  end if;

  update public.deals set
    stage = p_etapa,
    stage_changed_at = now(),
    closed_at = case when p_etapa = 'fechado' then now() else null end,
    next_step = d.next_step, next_step_at = d.next_step_at, next_step_has_time = d.next_step_has_time,
    position = extract(epoch from now())
  where id = p_deal
  returning * into d;

  if p_etapa = 'fechado' then
    update public.clients set client_since = coalesce(client_since, current_date) where id = d.client_id;
  end if;

  perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'etapa_alterada', v_de, p_etapa,
    '{}'::jsonb, 'hub', 'oportunidade.etapa_alterada');
  return to_jsonb(d);
end;
$$;

-- Altera valor, diagnóstico e próximo passo. Só mexe nas chaves enviadas.
-- Chaves: valor_cents, diagnostico (essencial|ampliado|null), diagnostico_pago,
--         proximo_passo, data (AAAA-MM-DD), hora (HH:MM ou null)
create or replace function public.funil_atualizar(p_deal uuid, p_versao timestamptz, p_campos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  d public.deals := public._funil_travar(p_deal, p_versao);
  v_alterados text[] := '{}';
begin
  if p_campos ? 'valor_cents' then
    d.value_cents := nullif(p_campos ->> 'valor_cents', '')::integer;
    v_alterados := array_append(v_alterados, 'valor');
  end if;
  if p_campos ? 'diagnostico' then
    d.diagnostic_tier := nullif(p_campos ->> 'diagnostico', '')::public.diagnostic_tier;
    v_alterados := array_append(v_alterados, 'diagnostico');
  end if;
  if p_campos ? 'diagnostico_pago' then
    d.diagnostic_paid := coalesce((p_campos ->> 'diagnostico_pago')::boolean, false);
    v_alterados := array_append(v_alterados, 'diagnostico_pago');
  end if;
  if p_campos ? 'proximo_passo' then
    d.next_step := nullif(trim(coalesce(p_campos ->> 'proximo_passo', '')), '');
    v_alterados := array_append(v_alterados, 'proximo_passo');
  end if;
  if p_campos ? 'data' then
    d.next_step_at := public._no_fuso(d.tenant_id, nullif(p_campos ->> 'data', '')::date,
                                      nullif(p_campos ->> 'hora', '')::time);
    d.next_step_has_time := nullif(p_campos ->> 'hora', '') is not null;
    v_alterados := array_append(v_alterados, 'data');
  end if;
  if d.stage <> 'fechado' and d.archived_at is null and (d.next_step is null or d.next_step_at is null) then
    raise exception 'proximo_passo_obrigatorio' using errcode = '22023';
  end if;

  update public.deals set
    value_cents = d.value_cents, diagnostic_tier = d.diagnostic_tier, diagnostic_paid = d.diagnostic_paid,
    next_step = d.next_step, next_step_at = d.next_step_at, next_step_has_time = d.next_step_has_time
  where id = p_deal
  returning * into d;

  perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'oportunidade_atualizada', null, null,
    jsonb_build_object('campos', to_jsonb(v_alterados), 'proximo_passo', d.next_step), 'hub', null);
  return to_jsonb(d);
end;
$$;

create or replace function public.funil_arquivar(
  p_deal uuid, p_motivo public.lost_reason, p_nota text, p_versao timestamptz
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare d public.deals := public._funil_travar(p_deal, p_versao);
begin
  if p_motivo is null then
    raise exception 'motivo_obrigatorio' using errcode = '22023';
  end if;
  if p_motivo = 'outro' and nullif(trim(coalesce(p_nota, '')), '') is null then
    raise exception 'nota_obrigatoria' using errcode = '22023';
  end if;
  if d.archived_at is not null then
    return to_jsonb(d);
  end if;
  update public.deals set archived_at = now(), archived_from_stage = stage,
         lost_reason = p_motivo, lost_note = nullif(trim(coalesce(p_nota, '')), '')
   where id = p_deal returning * into d;
  perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'arquivada', d.stage, null,
    jsonb_build_object('motivo', p_motivo, 'nota', d.lost_note), 'hub', 'oportunidade.arquivada');
  return to_jsonb(d);
end;
$$;

create or replace function public.funil_desarquivar(p_deal uuid, p_versao timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare d public.deals := public._funil_travar(p_deal, p_versao);
begin
  if d.archived_at is null then
    return to_jsonb(d);
  end if;
  if exists (select 1 from public.deals where client_id = d.client_id and id <> d.id
               and archived_at is null and stage <> 'fechado') then
    raise exception 'ja_existe_oportunidade_aberta' using errcode = '23505';
  end if;
  update public.deals set archived_at = null, lost_reason = null, lost_note = null,
         stage = coalesce(archived_from_stage, stage), archived_from_stage = null,
         next_step = coalesce(next_step, 'Retomar contato'),
         next_step_at = coalesce(next_step_at, now())
   where id = p_deal returning * into d;
  perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'desarquivada', null, d.stage,
    '{}'::jsonb, 'hub', 'oportunidade.desarquivada');
  return to_jsonb(d);
end;
$$;

-- Edita a ficha. Só mexe nas chaves enviadas. Confere a versão (updated_at).
create or replace function public.cliente_salvar(p_cliente uuid, p_versao timestamptz, p_campos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  c public.clients;
  v_dig text;
begin
  select * into c from public.clients where id = p_cliente for update;
  if c.id is null or not public.is_tenant_owner(c.tenant_id) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if p_versao is not null and date_trunc('milliseconds', c.updated_at) <> date_trunc('milliseconds', p_versao) then
    raise exception 'versao_desatualizada' using errcode = 'PT409';
  end if;
  if p_campos ? 'empresa' then c.company_name := nullif(trim(coalesce(p_campos ->> 'empresa', '')), ''); end if;
  if p_campos ? 'contato' then c.contact_name := nullif(trim(coalesce(p_campos ->> 'contato', '')), ''); end if;
  if p_campos ? 'papel' then c.contact_role := nullif(trim(coalesce(p_campos ->> 'papel', '')), ''); end if;
  if p_campos ? 'whatsapp' then c.whatsapp := nullif(trim(coalesce(p_campos ->> 'whatsapp', '')), ''); end if;
  if p_campos ? 'email' then c.email := nullif(lower(trim(coalesce(p_campos ->> 'email', ''))), ''); end if;
  if p_campos ? 'segmento' then c.segment := nullif(trim(coalesce(p_campos ->> 'segmento', '')), ''); end if;
  if p_campos ? 'cidade' then c.city := nullif(trim(coalesce(p_campos ->> 'cidade', '')), ''); end if;
  if p_campos ? 'origem' then c.origin := coalesce(nullif(p_campos ->> 'origem', '')::public.contact_origin, 'outro'); end if;
  if p_campos ? 'anuncio' then c.ad_name := nullif(trim(coalesce(p_campos ->> 'anuncio', '')), ''); end if;
  if p_campos ? 'indicado_por' then c.referred_by := nullif(trim(coalesce(p_campos ->> 'indicado_por', '')), ''); end if;
  if p_campos ? 'site_atual' then c.current_site := nullif(trim(coalesce(p_campos ->> 'site_atual', '')), ''); end if;

  if c.company_name is null or c.contact_name is null then
    raise exception 'campos_obrigatorios' using errcode = '22023';
  end if;
  v_dig := nullif(regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g'), '');
  if v_dig is not null and (length(v_dig) < 10 or length(v_dig) > 13) then
    raise exception 'whatsapp_invalido' using errcode = '22023';
  end if;
  if c.email is not null and c.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'email_invalido' using errcode = '22023';
  end if;
  if v_dig is null and c.email is null then
    raise exception 'whatsapp_ou_email' using errcode = '22023';
  end if;

  update public.clients set
    company_name = c.company_name, contact_name = c.contact_name, contact_role = c.contact_role,
    whatsapp = c.whatsapp, email = c.email, segment = c.segment, city = c.city, origin = c.origin,
    ad_name = c.ad_name, referred_by = c.referred_by, current_site = c.current_site
  where id = p_cliente returning * into c;

  perform public._funil_registrar(c.tenant_id, c.id, null, 'cliente_atualizado', null, null,
    jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(p_campos) k)), 'hub', null);
  return to_jsonb(c);
end;
$$;

create or replace function public.cliente_anotar(p_cliente uuid, p_texto text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_tenant uuid;
  n public.client_notes;
begin
  select tenant_id into v_tenant from public.clients where id = p_cliente;
  if v_tenant is null or not public.is_tenant_owner(v_tenant) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if nullif(trim(coalesce(p_texto, '')), '') is null or length(p_texto) > 4000 then
    raise exception 'anotacao_invalida' using errcode = '22023';
  end if;
  insert into public.client_notes (tenant_id, client_id, body, author_id)
  values (v_tenant, p_cliente, trim(p_texto), auth.uid()) returning * into n;
  update public.clients set last_activity_at = now() where id = p_cliente;
  return to_jsonb(n);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Leitura: views com RLS de quem consulta + RPCs de agregação
-- ---------------------------------------------------------------------
create view public.v_funil with (security_invoker = true) as
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
  (date_trunc('month', d.created_at at time zone t.timezone) = date_trunc('month', now() at time zone t.timezone)) as deste_mes
from public.deals d
join public.clients c on c.id = d.client_id
join public.tenants t on t.id = d.tenant_id;

create view public.v_clientes with (security_invoker = true) as
select
  c.id, c.company_name, c.contact_name, c.contact_role, c.whatsapp, c.email, c.origin,
  c.segment, c.city, c.ad_name, c.referred_by, c.current_site, c.size_range,
  c.client_since, c.last_activity_at, c.created_at, c.updated_at,
  od.id as deal_id, od.stage, od.value_cents, od.diagnostic_tier, od.diagnostic_paid,
  od.next_step, od.next_step_at, od.next_step_has_time, od.archived_at, od.updated_at as deal_updated_at,
  (od.next_step_at at time zone t.timezone)::date as next_step_date,
  (now() at time zone t.timezone)::date as hoje,
  case
    when exists (select 1 from public.deals f where f.client_id = c.id and f.stage = 'fechado' and f.archived_at is null) then 'cliente'
    when od.id is null then 'sem_oportunidade'
    when od.archived_at is not null then 'arquivado'
    when od.stage = 'contato' then 'contato'
    else 'negociacao'
  end as situacao,
  (select coalesce(sum(f.value_cents), 0) from public.deals f
    where f.client_id = c.id and f.stage = 'fechado' and f.archived_at is null)::bigint as fechado_cents,
  (select ev.kind from public.deal_events ev where ev.client_id = c.id order by ev.created_at desc limit 1) as ultima_atividade
from public.clients c
join public.tenants t on t.id = c.tenant_id
left join lateral (
  select * from public.deals d
   where d.client_id = c.id
   order by (d.archived_at is null and d.stage <> 'fechado') desc, d.created_at desc
   limit 1
) od on true;

revoke all on public.v_funil, public.v_clientes from anon;
grant select on public.v_funil, public.v_clientes to authenticated;

-- Totais do funil por etapa e contagens dos filtros
create or replace function public.funil_resumo(p_filtro text default 'todos')
returns jsonb language sql stable security invoker set search_path = public as $$
  with base as (select * from public.v_funil),
  filtrado as (
    select * from base where
      case p_filtro
        when 'arquivados' then archived_at is not null
        when 'vencidos'   then vencido
        when 'este_mes'   then archived_at is null and deste_mes
        else archived_at is null
      end
  )
  select jsonb_build_object(
    'ativos',            (select count(*) from base where archived_at is null and stage <> 'fechado'),
    'vencidos',          (select count(*) from base where vencido),
    'em_negociacao_cents', (select coalesce(sum(value_cents), 0) from base
                            where archived_at is null and stage in ('diagnostico', 'mapeamento', 'proposta')),
    'filtros', jsonb_build_object(
      'todos',      (select count(*) from base where archived_at is null),
      'este_mes',   (select count(*) from base where archived_at is null and deste_mes),
      'vencidos',   (select count(*) from base where vencido),
      'arquivados', (select count(*) from base where archived_at is not null)),
    'etapas', (select coalesce(jsonb_object_agg(s.stage, jsonb_build_object(
                 'quantidade', (select count(*) from filtrado f where f.stage = s.stage),
                 'soma_cents', (select coalesce(sum(value_cents), 0) from filtrado f where f.stage = s.stage))), '{}'::jsonb)
               from unnest(enum_range(null::public.deal_stage)) as s(stage))
  );
$$;

-- "Precisa de você hoje": passos vencidos e de hoje, por urgência
create or replace function public.painel_hoje()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
               'deal_id', id, 'client_id', client_id, 'empresa', company_name, 'contato', contact_name,
               'whatsapp', whatsapp, 'etapa', stage, 'proximo_passo', next_step, 'quando', next_step_at,
               'com_hora', next_step_has_time, 'vencido', vencido, 'valor_cents', value_cents)
             order by vencido desc, next_step_at)
        from public.v_funil
       where archived_at is null and stage <> 'fechado' and next_step_date <= hoje), '[]'::jsonb),
    'resumo', public.funil_resumo('todos')
  );
$$;

-- Contagens dos filtros e totais da lista de clientes
create or replace function public.clientes_resumo()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'todos',      count(*),
    'contato',    count(*) filter (where situacao = 'contato'),
    'negociacao', count(*) filter (where situacao = 'negociacao'),
    'cliente',    count(*) filter (where situacao = 'cliente'),
    'arquivado',  count(*) filter (where situacao = 'arquivado'),
    'em_negociacao_cents', coalesce(sum(value_cents) filter (where situacao = 'negociacao'), 0),
    'fechado_cents', coalesce(sum(fechado_cents), 0)
  ) from public.v_clientes;
$$;

-- Linha do tempo da ficha: eventos e anotações, mais recentes primeiro
create or replace function public.cliente_linha_do_tempo(p_cliente uuid)
returns table (tipo text, quando timestamptz, kind text, de public.deal_stage, para public.deal_stage,
               detalhe jsonb, texto text, origem text)
language sql stable security invoker set search_path = public as $$
  select 'evento', e.created_at, e.kind, e.from_stage, e.to_stage, e.detail, null, e.source
    from public.deal_events e where e.client_id = p_cliente
  union all
  select 'anotacao', n.created_at, null, null, null, '{}'::jsonb, n.body, 'hub'
    from public.client_notes n where n.client_id = p_cliente
  order by 2 desc
  limit 200;
$$;

-- Permissões das RPCs: só usuário logado (cada uma confere se é dono)
do $$
declare f text;
begin
  foreach f in array array[
    'public.funil_criar_contato(text, text, text, text, public.contact_origin, text, date, time, text, text, text, text, text, integer)',
    'public.funil_mover(uuid, public.deal_stage, timestamptz, text, date, time)',
    'public.funil_atualizar(uuid, timestamptz, jsonb)',
    'public.funil_arquivar(uuid, public.lost_reason, text, timestamptz)',
    'public.funil_desarquivar(uuid, timestamptz)',
    'public.cliente_salvar(uuid, timestamptz, jsonb)',
    'public.cliente_anotar(uuid, text)',
    'public.funil_resumo(text)',
    'public.painel_hoje()',
    'public.clientes_resumo()',
    'public.cliente_linha_do_tempo(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 8. Pedido do site vira contato no funil (sem ação manual)
-- ---------------------------------------------------------------------
create or replace function public._site_contato_para_funil_registro(s public.site_contatos)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dig     text := nullif(regexp_replace(coalesce(s.whatsapp, ''), '\D', '', 'g'), '');
  v_wpp_ok  boolean := v_dig is not null and length(v_dig) between 10 and 13;
  v_client  uuid;
  v_deal    uuid;
  v_tz      text;
  v_passo   text;
  v_quando  timestamptz;
begin
  if s.tipo not in ('mensagem', 'horario') then
    return;
  end if;
  begin
    select timezone into v_tz from public.tenants where id = s.tenant_id;
    v_passo := case
      when s.tipo = 'horario' and v_wpp_ok then 'Confirmar horário pelo WhatsApp'
      when v_wpp_ok then 'Primeiro contato pelo WhatsApp'
      else 'Responder por e-mail' end;
    -- Para hoje; o horário pedido aparece à parte no cartão
    v_quando := ((now() at time zone v_tz)::date + time '12:00')::timestamp at time zone v_tz;

    select id into v_client from public.clients
     where tenant_id = s.tenant_id
       and (lower(email) = lower(s.email) or (v_wpp_ok and whatsapp_digits = v_dig))
     order by created_at limit 1;

    if v_client is null then
      insert into public.clients (tenant_id, company_name, contact_name, whatsapp, email, origin, size_range)
      values (s.tenant_id, coalesce(s.nome, s.email), coalesce(s.nome, s.email),
              case when v_wpp_ok then s.whatsapp end, lower(s.email), 'site', s.porte)
      returning id into v_client;
    end if;

    select id into v_deal from public.deals
     where client_id = v_client and archived_at is null and stage <> 'fechado';

    if v_deal is null then
      insert into public.deals (tenant_id, client_id, stage, next_step, next_step_at, requested_slot_at, site_contato_id)
      values (s.tenant_id, v_client, 'contato', v_passo, v_quando, s.horario_sugerido, s.id)
      returning id into v_deal;
      insert into public.deal_events (tenant_id, client_id, deal_id, kind, to_stage, detail, source)
      values (s.tenant_id, v_client, v_deal, 'contato_criado', 'contato',
              jsonb_build_object('origem', 'site', 'tipo', s.tipo), 'site');
    else
      update public.deals set requested_slot_at = coalesce(s.horario_sugerido, requested_slot_at)
       where id = v_deal;
    end if;

    insert into public.deal_events (tenant_id, client_id, deal_id, kind, detail, source)
    values (s.tenant_id, v_client, v_deal, 'pedido_do_site',
            jsonb_build_object('tipo', s.tipo, 'assunto', s.assunto, 'mensagem', left(s.mensagem, 500),
                               'horario', s.horario_sugerido, 'porte', s.porte), 'site');
    if s.assunto is not null or s.mensagem is not null then
      insert into public.client_notes (tenant_id, client_id, body)
      values (s.tenant_id, v_client,
              'Pedido do site' || coalesce(' · ' || s.assunto, '') || coalesce(E'\n' || left(s.mensagem, 3500), ''));
    end if;
    update public.clients set last_activity_at = now() where id = v_client;
  exception when others then
    -- O contato do site nunca se perde: fica em site_contatos e o erro vai para a fila
    insert into public.event_outbox (tenant_id, event, payload, last_error)
    values (s.tenant_id, 'funil.falha_ao_importar_site', jsonb_build_object('contato_id', s.id), sqlerrm);
  end;
end;
$$;

create or replace function public._site_contato_para_funil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._site_contato_para_funil_registro(new);
  return new;
end;
$$;
revoke all on function public._site_contato_para_funil_registro(public.site_contatos) from public, anon, authenticated;
revoke all on function public._site_contato_para_funil() from public, anon, authenticated;

create trigger site_contatos_para_funil after insert on public.site_contatos
  for each row execute function public._site_contato_para_funil();

-- Contatos do site que já existem viram contatos no funil (uma vez)
do $$
declare r public.site_contatos;
begin
  for r in select * from public.site_contatos s
            where s.tipo in ('mensagem', 'horario')
              and not exists (select 1 from public.deals d where d.site_contato_id = s.id)
            order by s.created_at loop
    perform public._site_contato_para_funil_registro(r);
  end loop;
end $$;
