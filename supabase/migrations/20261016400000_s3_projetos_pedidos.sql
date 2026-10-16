-- =====================================================================
-- Hub Fora do Papel · S3 · Projetos, Pedidos e Portal do cliente
-- Card: docs/cards/S3-projetos-pedidos-portal.md
-- O projeto nasce no aceite. O cliente aprova entregas, resolve pendências e
-- faz pedidos pelo portal (login). Aprovação nunca é automática.
-- Leitura do dono: RLS por tenant. Leitura do cliente: só pelas RPCs portal_*.
-- Escrita: só por RPC, sempre com linha do tempo e event_outbox.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipos e tabelas
-- ---------------------------------------------------------------------
create type public.project_status as enum ('andamento', 'mensalidade', 'concluido');
create type public.phase_status as enum ('pendente', 'andamento', 'concluida');
create type public.approval_status as enum ('aguardando', 'aprovada', 'ajuste', 'cancelada');
create type public.task_status as enum ('a_fazer', 'fazendo', 'para_aprovar', 'pronto');
create type public.request_status as enum ('recebido', 'em_analise', 'aguardando_cliente', 'fazendo', 'pronto', 'recusado');
create type public.request_class as enum ('escopo', 'mensalidade', 'adicional');
create type public.request_origin as enum ('portal', 'whatsapp', 'reuniao', 'hub');

create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  client_id        uuid not null references public.clients (id) on delete restrict,
  deal_id          uuid references public.deals (id) on delete set null,
  proposal_id      uuid unique references public.proposals (id) on delete restrict,
  name             text not null check (length(trim(name)) between 2 and 120),
  status           public.project_status not null default 'andamento',
  launch_date      date,
  hours_estimated  numeric(6,1) not null default 0 check (hours_estimated between 0 and 9999),
  value_cents      integer not null default 0 check (value_cents between 0 and 100000000),
  plan_name        text,
  monthly_cents    integer check (monthly_cents is null or monthly_cents between 0 and 10000000),
  started_at       timestamptz not null default now(),
  launched_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index projects_tenant_status_idx on public.projects (tenant_id, status);
create index projects_client_idx on public.projects (client_id);
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

create table public.project_phases (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  position      smallint not null,
  name          text not null check (length(trim(name)) between 1 and 40),
  due_label     text check (due_label is null or length(due_label) <= 40),
  status        public.phase_status not null default 'pendente',
  started_at    timestamptz,
  completed_at  timestamptz,
  unique (project_id, position)
);
create index project_phases_tenant_idx on public.project_phases (tenant_id);

create table public.approvals (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  client_id     uuid not null references public.clients (id) on delete restrict,
  project_id    uuid not null references public.projects (id) on delete cascade,
  phase_id      uuid references public.project_phases (id) on delete set null,
  title         text not null check (length(trim(title)) between 2 and 120),
  description   text check (description is null or length(description) <= 1000),
  items         jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  preview_url   text check (preview_url is null or (preview_url ~ '^https://[^\s]{3,}$' and length(preview_url) <= 508)),
  status        public.approval_status not null default 'aguardando',
  sent_at       timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references auth.users (id) on delete set null,
  decision_note text check (decision_note is null or length(decision_note) <= 1000)
);
create index approvals_project_idx on public.approvals (project_id, status);
create index approvals_client_idx on public.approvals (client_id, status);
create index approvals_tenant_idx on public.approvals (tenant_id);

create table public.client_tasks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete restrict,
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null check (length(trim(title)) between 2 and 120),
  detail      text check (detail is null or length(detail) <= 600),
  due_date    date,
  status      text not null default 'aberta' check (status in ('aberta', 'feita')),
  done_at     timestamptz,
  done_by     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index client_tasks_project_idx on public.client_tasks (project_id, status);
create index client_tasks_client_idx on public.client_tasks (client_id, status);
create index client_tasks_tenant_idx on public.client_tasks (tenant_id);

create table public.requests (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  client_id        uuid not null references public.clients (id) on delete restrict,
  project_id       uuid references public.projects (id) on delete set null,
  code             text not null,
  title            text not null check (length(trim(title)) between 2 and 120),
  description      text check (description is null or length(description) <= 2000),
  origin           public.request_origin not null default 'hub',
  status           public.request_status not null default 'recebido',
  classification   public.request_class,
  hours_estimated  numeric(5,1) check (hours_estimated is null or hours_estimated between 0 and 999),
  value_cents      integer check (value_cents is null or value_cents between 0 and 100000000),
  owner_note       text check (owner_note is null or length(owner_note) <= 1000),
  client_decision  text check (client_decision is null or client_decision in ('aprovado', 'recusado')),
  decided_at       timestamptz,
  decided_by       uuid references auth.users (id) on delete set null,
  decision_note    text check (decision_note is null or length(decision_note) <= 1000),
  done_at          timestamptz,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (client_id, code),
  -- Serviço adicional só anda depois do sim do cliente
  constraint requests_adicional_aprovado check (
    classification is distinct from 'adicional' or status not in ('fazendo', 'pronto') or client_decision = 'aprovado')
);
create index requests_tenant_status_idx on public.requests (tenant_id, status);
create index requests_client_idx on public.requests (client_id, status);
create index requests_project_idx on public.requests (project_id);
create trigger requests_touch before update on public.requests for each row execute function public.touch_updated_at();

create table public.project_tasks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  request_id  uuid references public.requests (id) on delete set null,
  cycle       smallint not null default 1 check (cycle between 1 and 50),
  area        text check (area is null or length(area) <= 40),
  title       text not null check (length(trim(title)) between 2 and 120),
  description text check (description is null or length(description) <= 600),
  status      public.task_status not null default 'a_fazer',
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index project_tasks_project_idx on public.project_tasks (project_id, cycle, status);
create index project_tasks_tenant_idx on public.project_tasks (tenant_id);
create trigger project_tasks_touch before update on public.project_tasks for each row execute function public.touch_updated_at();

create table public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  worked_on   date not null,
  minutes     integer not null check (minutes between 1 and 1440),
  note        text check (note is null or length(note) <= 300),
  created_at  timestamptz not null default now()
);
create index time_entries_project_idx on public.time_entries (project_id, worked_on);
create index time_entries_tenant_idx on public.time_entries (tenant_id, worked_on);

create table public.launch_items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  position    smallint not null,
  title       text not null check (length(trim(title)) between 2 and 120),
  done        boolean not null default false,
  done_at     timestamptz
);
create index launch_items_project_idx on public.launch_items (project_id, position);
create index launch_items_tenant_idx on public.launch_items (tenant_id);

create table public.project_events (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  request_id  uuid references public.requests (id) on delete set null,
  kind        text not null check (length(kind) between 3 and 40),
  detail      jsonb not null default '{}'::jsonb,
  actor_id    uuid references auth.users (id) on delete set null,
  source      text not null default 'hub' check (source in ('hub', 'cliente')),
  created_at  timestamptz not null default now()
);
create index project_events_project_idx on public.project_events (project_id, created_at desc);
create index project_events_tenant_idx on public.project_events (tenant_id, created_at desc);

create table public.portal_invites (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  client_id    uuid not null references public.clients (id) on delete cascade,
  email        text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 160),
  invited_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 days',
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null,
  canceled_at  timestamptz
);
create unique index portal_invites_aberto on public.portal_invites (client_id, lower(email))
  where accepted_at is null and canceled_at is null;
create index portal_invites_email_idx on public.portal_invites (lower(email)) where accepted_at is null and canceled_at is null;
create index portal_invites_tenant_idx on public.portal_invites (tenant_id);

-- ---------------------------------------------------------------------
-- 2. RLS: só o dono lê as tabelas; o cliente só pelas RPCs portal_*
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['projects', 'project_phases', 'approvals', 'client_tasks', 'requests',
                           'project_tasks', 'time_entries', 'launch_items', 'project_events', 'portal_invites'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_tenant_owner(tenant_id))',
                   t || '_owner_select', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Apoio interno
-- ---------------------------------------------------------------------
create or replace function public._projeto_evento(
  p_tenant uuid, p_client uuid, p_project uuid, p_request uuid, p_kind text, p_detail jsonb, p_source text, p_event text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_events (tenant_id, client_id, project_id, request_id, kind, detail, actor_id, source)
  values (p_tenant, p_client, p_project, p_request, p_kind, coalesce(p_detail, '{}'::jsonb), auth.uid(), p_source);
  update public.clients set last_activity_at = now() where id = p_client;
  if p_event is not null then
    insert into public.event_outbox (tenant_id, event, payload)
    values (p_tenant, p_event, jsonb_build_object('client_id', p_client, 'project_id', p_project, 'request_id', p_request)
                               || coalesce(p_detail, '{}'::jsonb));
  end if;
end;
$$;

create or replace function public._projeto_do_dono(p_id uuid)
returns public.projects language plpgsql security definer set search_path = public as $$
declare p public.projects;
begin
  select * into p from public.projects where id = p_id for update;
  if p.id is null or not public.is_tenant_owner(p.tenant_id) then
    raise exception 'projeto_inexistente' using errcode = 'P0002';
  end if;
  return p;
end;
$$;

-- Empresa(s) do cliente logado no portal
create or replace function public._clientes_do_portal()
returns setof uuid language sql stable security definer set search_path = public as $$
  select client_id from public.client_members where user_id = auth.uid();
$$;

-- Hoje no fuso da agência
create or replace function public._hoje(p_tenant uuid)
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone (select timezone from public.tenants where id = p_tenant))::date;
$$;

-- Concluir uma fase inicia a próxima pendente
create or replace function public._fase_concluir(p_fase uuid)
returns void language plpgsql security definer set search_path = public as $$
declare f public.project_phases; prox uuid;
begin
  select * into f from public.project_phases where id = p_fase for update;
  if f.id is null or f.status = 'concluida' then return; end if;
  update public.project_phases set status = 'concluida', completed_at = now(),
         started_at = coalesce(started_at, now()) where id = f.id;
  select id into prox from public.project_phases
   where project_id = f.project_id and status = 'pendente' and position > f.position
   order by position limit 1;
  if prox is not null then
    update public.project_phases set status = 'andamento', started_at = now() where id = prox;
  end if;
end;
$$;

-- Sem extensão unaccent: troca acentos comuns do português
create or replace function public.unaccent_like(t text)
returns text language sql immutable as $$
  select translate(coalesce(t, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
                                     'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn');
$$;

-- Sigla do cliente para o código do pedido (SL-01)
create or replace function public._sigla_cliente(p_client uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(upper(
           string_agg(left(w, 1), '' order by n)), ''), 'CL')
    from (select w, n from regexp_split_to_table(
            (select regexp_replace(unaccent_like(company_name), '[^A-Za-z ]', '', 'g') from public.clients where id = p_client),
            '\s+') with ordinality as x(w, n)
          where length(w) > 2 order by n limit 2) q;
$$;


create or replace function public._projeto_padrao(p public.projects)
returns void language plpgsql security definer set search_path = public as $$
declare i int := 0; t text;
begin
  foreach t in array array['Conteúdo aprovado pelo cliente', 'Endereço definitivo no ar',
                           'Formulários e integrações testados', 'Treinamento do cliente feito',
                           'Última parte cobrada'] loop
    i := i + 1;
    insert into public.launch_items (tenant_id, project_id, position, title) values (p.tenant_id, p.id, i, t);
  end loop;
  if p.plan_name is not null then
    insert into public.launch_items (tenant_id, project_id, position, title)
    values (p.tenant_id, p.id, i + 1, 'Mensalidade ' || p.plan_name || ' combinada');
  end if;
end;
$$;

-- Fases de uma lista [{nome, quando}]; "Diagnóstico" e "Proposta" já nascem concluídas
create or replace function public._projeto_fases(p public.projects, p_fases jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare f jsonb; i int := 0; feita boolean; achou_andamento boolean := false; lista jsonb := p_fases;
begin
  if lista is null or jsonb_array_length(lista) = 0 then
    lista := '[{"nome":"Design","quando":""},{"nome":"Construção","quando":""},{"nome":"Revisão final","quando":""},{"nome":"Lançamento","quando":""}]'::jsonb;
  end if;
  for f in select * from jsonb_array_elements(lista) loop
    i := i + 1;
    feita := lower(public.unaccent_like(f->>'nome')) ~ '^(diagnostico|proposta|descoberta)';
    insert into public.project_phases (tenant_id, project_id, position, name, due_label, status, started_at, completed_at)
    values (p.tenant_id, p.id, i, left(coalesce(nullif(trim(f->>'nome'), ''), 'Fase ' || i), 40),
            nullif(left(trim(coalesce(f->>'quando', '')), 40), ''),
            case when feita then 'concluida'::public.phase_status
                 when not achou_andamento then 'andamento'::public.phase_status
                 else 'pendente'::public.phase_status end,
            case when feita or not achou_andamento then now() end,
            case when feita then now() end);
    if not feita then achou_andamento := true; end if;
  end loop;
end;
$$;

revoke all on function public._projeto_evento(uuid, uuid, uuid, uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public._projeto_do_dono(uuid) from public, anon, authenticated;
revoke all on function public._clientes_do_portal() from public, anon, authenticated;
revoke all on function public._hoje(uuid) from public, anon, authenticated;
revoke all on function public._fase_concluir(uuid) from public, anon, authenticated;
revoke all on function public._sigla_cliente(uuid) from public, anon, authenticated;
revoke all on function public._projeto_padrao(public.projects) from public, anon, authenticated;
revoke all on function public._projeto_fases(public.projects, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Projeto nasce no aceite
-- ---------------------------------------------------------------------
create or replace function public._projeto_do_aceite(pr public.proposals)
returns uuid language plpgsql security definer set search_path = public as $$
declare p public.projects; s jsonb := coalesce(pr.snapshot, '{}'::jsonb);
begin
  select * into p from public.projects where proposal_id = pr.id;
  if p.id is not null then return p.id; end if;
  insert into public.projects (tenant_id, client_id, deal_id, proposal_id, name, launch_date, hours_estimated,
                               value_cents, plan_name, monthly_cents)
  values (pr.tenant_id, pr.client_id, pr.deal_id, pr.id,
          left(coalesce(nullif(trim(pr.project_type), ''), nullif(trim(pr.title), ''), 'Projeto'), 120),
          pr.launch_date, coalesce(pr.hours_total, 0), coalesce(pr.total_cents, 0),
          s->'mensalidade'->>'nome', (s->'mensalidade'->>'cents')::int)
  returning * into p;
  perform public._projeto_fases(p, pr.phases);
  perform public._projeto_padrao(p);
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'projeto_criado',
    jsonb_build_object('nome', p.name, 'proposta_id', pr.id), 'cliente', 'projeto.criado');
  return p.id;
end;
$$;
revoke all on function public._projeto_do_aceite(public.proposals) from public, anon, authenticated;

create or replace function public.proposals_cria_projeto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aceita' and old.status is distinct from 'aceita' then
    perform public._projeto_do_aceite(new);
  end if;
  return new;
end;
$$;
revoke all on function public.proposals_cria_projeto() from public, anon, authenticated;
create trigger proposals_cria_projeto after update of status on public.proposals
  for each row execute function public.proposals_cria_projeto();

-- Propostas já aceitas viram projeto (uma vez)
do $$
declare r public.proposals;
begin
  for r in select * from public.proposals where status = 'aceita'
            and not exists (select 1 from public.projects x where x.proposal_id = proposals.id) loop
    perform public._projeto_do_aceite(r);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. RPCs do dono: projeto
-- ---------------------------------------------------------------------
create or replace function public.projeto_criar(
  p_cliente uuid, p_nome text, p_valor_cents integer default 0, p_horas numeric default 0,
  p_lancamento date default null, p_plano text default null, p_mensal_cents integer default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); p public.projects;
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_do_projeto' using errcode = '22023'; end if;
  insert into public.projects (tenant_id, client_id, name, value_cents, hours_estimated, launch_date, plan_name, monthly_cents)
  values (t, p_cliente, left(trim(p_nome), 120), greatest(0, coalesce(p_valor_cents, 0)), greatest(0, coalesce(p_horas, 0)),
          p_lancamento, nullif(trim(coalesce(p_plano, '')), ''), p_mensal_cents)
  returning * into p;
  perform public._projeto_fases(p, null);
  perform public._projeto_padrao(p);
  perform public._projeto_evento(t, p.client_id, p.id, null, 'projeto_criado', jsonb_build_object('nome', p.name),
    'hub', 'projeto.criado');
  return jsonb_build_object('id', p.id);
end;
$$;

-- Chaves: nome, lancamento (AAAA-MM-DD|null), horas_estimadas
create or replace function public.projeto_atualizar(p_id uuid, p_campos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_id); j jsonb := coalesce(p_campos, '{}'::jsonb);
begin
  if j ? 'nome' then
    if length(trim(coalesce(j->>'nome', ''))) < 2 then raise exception 'nome_do_projeto' using errcode = '22023'; end if;
    p.name := left(trim(j->>'nome'), 120);
  end if;
  if j ? 'lancamento' then p.launch_date := nullif(j->>'lancamento', '')::date; end if;
  if j ? 'horas_estimadas' then p.hours_estimated := greatest(0, least(9999, coalesce((j->>'horas_estimadas')::numeric, 0))); end if;
  update public.projects set name = p.name, launch_date = p.launch_date, hours_estimated = p.hours_estimated
   where id = p.id returning * into p;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'projeto_atualizado', j, 'hub', null);
  return to_jsonb(p) - 'tenant_id';
end;
$$;

-- Concluir fase sem aprovação do cliente (ex.: fase interna)
create or replace function public.projeto_fase_concluir(p_fase uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare f public.project_phases; p public.projects;
begin
  select * into f from public.project_phases where id = p_fase;
  if f.id is null then raise exception 'fase_inexistente' using errcode = 'P0002'; end if;
  p := public._projeto_do_dono(f.project_id);
  if exists (select 1 from public.approvals where phase_id = f.id and status = 'aguardando') then
    raise exception 'fase_aguardando_cliente' using errcode = '22023';
  end if;
  perform public._fase_concluir(f.id);
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'fase_concluida',
    jsonb_build_object('fase', f.name), 'hub', 'projeto.fase_concluida');
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Aprovações e pendências (dono)
-- ---------------------------------------------------------------------
create or replace function public.aprovacao_pedir(
  p_projeto uuid, p_titulo text, p_descricao text default null, p_itens text[] default null,
  p_previa text default null, p_fase uuid default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_projeto); a public.approvals;
begin
  if p_fase is not null and not exists (select 1 from public.project_phases where id = p_fase and project_id = p.id) then
    raise exception 'fase_inexistente' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if p_previa is not null and trim(p_previa) <> '' and (trim(p_previa) !~ '^https://[^\s]{3,}$' or length(trim(p_previa)) > 508) then
    raise exception 'previa_invalida' using errcode = '22023';
  end if;
  insert into public.approvals (tenant_id, client_id, project_id, phase_id, title, description, items, preview_url)
  values (p.tenant_id, p.client_id, p.id, p_fase, left(trim(p_titulo), 120), nullif(left(trim(coalesce(p_descricao, '')), 1000), ''),
          (select coalesce(jsonb_agg(left(trim(x), 200)), '[]'::jsonb)
             from (select unnest(coalesce(p_itens, '{}'::text[])) x limit 12) q where trim(x) <> ''),
          nullif(trim(coalesce(p_previa, '')), ''))
  returning * into a;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'aprovacao_enviada',
    jsonb_build_object('aprovacao_id', a.id, 'titulo', a.title), 'hub', 'aprovacao.enviada');
  return jsonb_build_object('id', a.id);
end;
$$;

create or replace function public.aprovacao_cancelar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare a public.approvals; p public.projects;
begin
  select * into a from public.approvals where id = p_id for update;
  if a.id is null then raise exception 'aprovacao_inexistente' using errcode = 'P0002'; end if;
  p := public._projeto_do_dono(a.project_id);
  if a.status <> 'aguardando' then raise exception 'aprovacao_ja_decidida' using errcode = '22023'; end if;
  update public.approvals set status = 'cancelada', decided_at = now() where id = a.id;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'aprovacao_cancelada',
    jsonb_build_object('aprovacao_id', a.id, 'titulo', a.title), 'hub', null);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.pendencia_criar(p_projeto uuid, p_titulo text, p_detalhe text default null, p_prazo date default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_projeto); c public.client_tasks;
begin
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  insert into public.client_tasks (tenant_id, client_id, project_id, title, detail, due_date)
  values (p.tenant_id, p.client_id, p.id, left(trim(p_titulo), 120), nullif(left(trim(coalesce(p_detalhe, '')), 600), ''), p_prazo)
  returning * into c;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'pendencia_criada',
    jsonb_build_object('pendencia_id', c.id, 'titulo', c.title, 'prazo', c.due_date), 'hub', 'pendencia.criada');
  return jsonb_build_object('id', c.id);
end;
$$;

-- Dono marca como feita (o cliente usa portal_pendencia_feita) ou reabre
create or replace function public.pendencia_marcar(p_id uuid, p_feita boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.client_tasks; p public.projects;
begin
  select * into c from public.client_tasks where id = p_id for update;
  if c.id is null then raise exception 'pendencia_inexistente' using errcode = 'P0002'; end if;
  p := public._projeto_do_dono(c.project_id);
  update public.client_tasks set status = case when p_feita then 'feita' else 'aberta' end,
         done_at = case when p_feita then now() end, done_by = case when p_feita then auth.uid() end
   where id = c.id;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null,
    case when p_feita then 'pendencia_feita' else 'pendencia_reaberta' end,
    jsonb_build_object('pendencia_id', c.id, 'titulo', c.title), 'hub', null);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.pendencia_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.client_tasks; p public.projects;
begin
  select * into c from public.client_tasks where id = p_id for update;
  if c.id is null then raise exception 'pendencia_inexistente' using errcode = 'P0002'; end if;
  p := public._projeto_do_dono(c.project_id);
  delete from public.client_tasks where id = c.id;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'pendencia_removida',
    jsonb_build_object('titulo', c.title), 'hub', null);
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Quadro de tarefas, horas e encerramento (dono)
-- ---------------------------------------------------------------------
create or replace function public.tarefa_criar(
  p_projeto uuid, p_titulo text, p_area text default null, p_descricao text default null, p_ciclo smallint default 1,
  p_pedido uuid default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_projeto); t public.project_tasks;
begin
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if p_pedido is not null and not exists (select 1 from public.requests where id = p_pedido and tenant_id = p.tenant_id) then
    raise exception 'pedido_inexistente' using errcode = 'P0002';
  end if;
  insert into public.project_tasks (tenant_id, project_id, request_id, cycle, area, title, description, position)
  values (p.tenant_id, p.id, p_pedido, greatest(1, least(50, coalesce(p_ciclo, 1))),
          nullif(left(trim(coalesce(p_area, '')), 40), ''), left(trim(p_titulo), 120),
          nullif(left(trim(coalesce(p_descricao, '')), 600), ''), extract(epoch from now()))
  returning * into t;
  return to_jsonb(t) - 'tenant_id';
end;
$$;

create or replace function public.tarefa_mover(p_id uuid, p_situacao public.task_status)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t public.project_tasks; p public.projects;
begin
  select * into t from public.project_tasks where id = p_id for update;
  if t.id is null then raise exception 'tarefa_inexistente' using errcode = 'P0002'; end if;
  p := public._projeto_do_dono(t.project_id);
  update public.project_tasks set status = p_situacao, position = extract(epoch from now()) where id = t.id returning * into t;
  return to_jsonb(t) - 'tenant_id';
end;
$$;

create or replace function public.tarefa_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t public.project_tasks; p public.projects;
begin
  select * into t from public.project_tasks where id = p_id for update;
  if t.id is null then raise exception 'tarefa_inexistente' using errcode = 'P0002'; end if;
  p := public._projeto_do_dono(t.project_id);
  delete from public.project_tasks where id = t.id;
  return to_jsonb(t) - 'tenant_id';
end;
$$;

create or replace function public.horas_lancar(p_projeto uuid, p_dia date, p_minutos integer, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_projeto); e public.time_entries;
begin
  if p_minutos is null or p_minutos < 1 or p_minutos > 1440 then raise exception 'horas_invalidas' using errcode = '22023'; end if;
  if p_dia is null or p_dia > public._hoje(p.tenant_id) or p_dia < public._hoje(p.tenant_id) - 366 then
    raise exception 'data_invalida' using errcode = '22023';
  end if;
  insert into public.time_entries (tenant_id, project_id, user_id, worked_on, minutes, note)
  values (p.tenant_id, p.id, auth.uid(), p_dia, p_minutos, nullif(left(trim(coalesce(p_nota, '')), 300), ''))
  returning * into e;
  return to_jsonb(e) - 'tenant_id';
end;
$$;

create or replace function public.horas_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare e public.time_entries; p public.projects;
begin
  select * into e from public.time_entries where id = p_id for update;
  if e.id is null then raise exception 'lancamento_inexistente' using errcode = 'P0002'; end if;
  p := public._projeto_do_dono(e.project_id);
  delete from public.time_entries where id = e.id;
  return to_jsonb(e) - 'tenant_id';
end;
$$;

create or replace function public.encerramento_marcar(p_item uuid, p_feito boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare i public.launch_items; p public.projects;
begin
  select * into i from public.launch_items where id = p_item for update;
  if i.id is null then raise exception 'item_inexistente' using errcode = 'P0002'; end if;
  p := public._projeto_do_dono(i.project_id);
  update public.launch_items set done = coalesce(p_feito, false), done_at = case when p_feito then now() end where id = i.id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.encerramento_item_criar(p_projeto uuid, p_titulo text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_projeto); i public.launch_items;
begin
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if (select count(*) from public.launch_items where project_id = p.id) >= 20 then raise exception 'itens_demais' using errcode = '22023'; end if;
  insert into public.launch_items (tenant_id, project_id, position, title)
  values (p.tenant_id, p.id, coalesce((select max(position) from public.launch_items where project_id = p.id), 0) + 1, left(trim(p_titulo), 120))
  returning * into i;
  return to_jsonb(i) - 'tenant_id';
end;
$$;

create or replace function public.projeto_lancar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_id); faltam int;
begin
  if p.status <> 'andamento' then raise exception 'projeto_ja_lancado' using errcode = '22023'; end if;
  select count(*) into faltam from public.launch_items where project_id = p.id and not done;
  if faltam > 0 then
    raise exception 'checklist_incompleto' using errcode = '22023', detail = faltam || ' itens';
  end if;
  update public.project_phases set status = 'concluida', completed_at = coalesce(completed_at, now()),
         started_at = coalesce(started_at, now())
   where project_id = p.id and status <> 'concluida';
  update public.projects set status = case when plan_name is not null then 'mensalidade'::public.project_status
                                           else 'concluido'::public.project_status end,
         launched_at = now()
   where id = p.id returning * into p;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'projeto_lancado',
    jsonb_build_object('nome', p.name, 'mensalidade', p.plan_name), 'hub', 'projeto.lancado');
  return jsonb_build_object('status', p.status);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Pedidos (dono)
-- ---------------------------------------------------------------------
create or replace function public._pedido_novo(
  p_tenant uuid, p_cliente uuid, p_projeto uuid, p_titulo text, p_descricao text, p_origem public.request_origin
) returns public.requests language plpgsql security definer set search_path = public as $$
declare r public.requests; v_proj uuid := p_projeto; n int;
begin
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if v_proj is not null and not exists (select 1 from public.projects where id = v_proj and client_id = p_cliente) then
    raise exception 'projeto_inexistente' using errcode = 'P0002';
  end if;
  if v_proj is null then
    select id into v_proj from public.projects where client_id = p_cliente
     order by (status = 'andamento') desc, created_at desc limit 1;
  end if;
  perform pg_advisory_xact_lock(hashtext('pedido:' || p_cliente::text));
  select count(*) + 1 into n from public.requests where client_id = p_cliente;
  insert into public.requests (tenant_id, client_id, project_id, code, title, description, origin, created_by)
  values (p_tenant, p_cliente, v_proj, public._sigla_cliente(p_cliente) || '-' || lpad(n::text, 2, '0'),
          left(trim(p_titulo), 120), nullif(left(trim(coalesce(p_descricao, '')), 2000), ''), p_origem, auth.uid())
  returning * into r;
  perform public._projeto_evento(p_tenant, p_cliente, r.project_id, r.id, 'pedido_recebido',
    jsonb_build_object('codigo', r.code, 'titulo', r.title, 'origem', r.origin),
    case when p_origem = 'portal' then 'cliente' else 'hub' end, 'pedido.recebido');
  return r;
end;
$$;
revoke all on function public._pedido_novo(uuid, uuid, uuid, text, text, public.request_origin) from public, anon, authenticated;

create or replace function public.pedido_registrar(
  p_cliente uuid, p_titulo text, p_descricao text default null, p_origem public.request_origin default 'whatsapp',
  p_projeto uuid default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); r public.requests;
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if p_origem = 'portal' then p_origem := 'hub'; end if;
  r := public._pedido_novo(t, p_cliente, p_projeto, p_titulo, p_descricao, p_origem);
  return jsonb_build_object('id', r.id, 'codigo', r.code);
end;
$$;

create or replace function public._pedido_do_dono(p_id uuid)
returns public.requests language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_id for update;
  if r.id is null or not public.is_tenant_owner(r.tenant_id) then
    raise exception 'pedido_inexistente' using errcode = 'P0002';
  end if;
  return r;
end;
$$;
revoke all on function public._pedido_do_dono(uuid) from public, anon, authenticated;

-- Classificar e estimar: o valor do serviço adicional sai da hora de referência (mínimo 1 h)
create or replace function public.pedido_classificar(p_id uuid, p_classificacao public.request_class, p_horas numeric, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests := public._pedido_do_dono(p_id); s public.pricing_settings := public._precos(r.tenant_id);
        h numeric := greatest(0, least(999, coalesce(p_horas, 0)));
begin
  if r.status not in ('recebido', 'em_analise') then raise exception 'pedido_ja_andando' using errcode = '22023'; end if;
  if p_classificacao is null then raise exception 'classificacao_obrigatoria' using errcode = '22023'; end if;
  if p_classificacao = 'adicional' and h <= 0 then raise exception 'horas_obrigatorias' using errcode = '22023'; end if;
  -- Dentro do combinado ou da mensalidade: vai direto para "Fazendo"
  update public.requests set status = case when p_classificacao = 'adicional' then 'em_analise'::public.request_status
                                           else 'fazendo'::public.request_status end,
         classification = p_classificacao, hours_estimated = h,
         value_cents = case when p_classificacao = 'adicional' then round(greatest(h, 1) * s.hour_cents)::int end,
         owner_note = nullif(left(trim(coalesce(p_nota, '')), 1000), '')
   where id = r.id returning * into r;
  perform public._projeto_evento(r.tenant_id, r.client_id, r.project_id, r.id, 'pedido_classificado',
    jsonb_build_object('codigo', r.code, 'classificacao', r.classification, 'horas', r.hours_estimated,
                       'valor_cents', r.value_cents), 'hub', null);
  return to_jsonb(r) - 'tenant_id';
end;
$$;

-- Serviço adicional: vai para o cliente decidir no portal
create or replace function public.pedido_enviar_cliente(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests := public._pedido_do_dono(p_id);
begin
  if r.classification is distinct from 'adicional' or r.status <> 'em_analise' then
    raise exception 'pedido_nao_e_adicional' using errcode = '22023';
  end if;
  update public.requests set status = 'aguardando_cliente', client_decision = null, decided_at = null where id = r.id returning * into r;
  perform public._projeto_evento(r.tenant_id, r.client_id, r.project_id, r.id, 'adicional_enviado',
    jsonb_build_object('codigo', r.code, 'valor_cents', r.value_cents, 'horas', r.hours_estimated), 'hub', 'pedido.adicional_enviado');
  return to_jsonb(r) - 'tenant_id';
end;
$$;

create or replace function public.pedido_iniciar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests := public._pedido_do_dono(p_id);
begin
  if r.status <> 'em_analise' or r.classification is null then raise exception 'classifique_antes' using errcode = '22023'; end if;
  if r.classification = 'adicional' and r.client_decision is distinct from 'aprovado' then
    raise exception 'adicional_sem_aprovacao' using errcode = '22023';
  end if;
  update public.requests set status = 'fazendo' where id = r.id returning * into r;
  perform public._projeto_evento(r.tenant_id, r.client_id, r.project_id, r.id, 'pedido_iniciado',
    jsonb_build_object('codigo', r.code), 'hub', 'pedido.iniciado');
  return to_jsonb(r) - 'tenant_id';
end;
$$;

create or replace function public.pedido_concluir(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests := public._pedido_do_dono(p_id);
begin
  if r.status <> 'fazendo' then raise exception 'pedido_nao_esta_fazendo' using errcode = '22023'; end if;
  update public.requests set status = 'pronto', done_at = now() where id = r.id returning * into r;
  perform public._projeto_evento(r.tenant_id, r.client_id, r.project_id, r.id, 'pedido_pronto',
    jsonb_build_object('codigo', r.code), 'hub', 'pedido.pronto');
  return to_jsonb(r) - 'tenant_id';
end;
$$;

create or replace function public.pedido_recusar(p_id uuid, p_motivo text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests := public._pedido_do_dono(p_id);
begin
  if r.status in ('pronto', 'recusado') then raise exception 'pedido_encerrado' using errcode = '22023'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'motivo_obrigatorio' using errcode = '22023'; end if;
  update public.requests set status = 'recusado', owner_note = left(trim(p_motivo), 1000) where id = r.id returning * into r;
  perform public._projeto_evento(r.tenant_id, r.client_id, r.project_id, r.id, 'pedido_recusado',
    jsonb_build_object('codigo', r.code, 'motivo', r.owner_note), 'hub', 'pedido.recusado');
  return to_jsonb(r) - 'tenant_id';
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Leitura do dono
-- ---------------------------------------------------------------------
create or replace function public.projetos_lista(p_situacao public.project_status default 'andamento')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); hoje date := public._hoje(t); ini_sem date;
begin
  ini_sem := hoje - ((extract(isodow from hoje)::int) - 1);
  return jsonb_build_object(
    'contagem', (select jsonb_build_object(
        'andamento', count(*) filter (where status = 'andamento'),
        'mensalidade', count(*) filter (where status = 'mensalidade'),
        'concluido', count(*) filter (where status = 'concluido'),
        'contratado_cents', coalesce(sum(value_cents) filter (where status = 'andamento'), 0))
       from public.projects where tenant_id = t),
    'proximo_lancamento', (select jsonb_build_object('nome', c.company_name, 'data', p.launch_date)
        from public.projects p join public.clients c on c.id = p.client_id
       where p.tenant_id = t and p.status = 'andamento' and p.launch_date >= hoje
       order by p.launch_date limit 1),
    'semana', jsonb_build_object('inicio', ini_sem, 'fim', ini_sem + 6,
       'itens', coalesce((select jsonb_agg(jsonb_build_object('projeto_id', p.id, 'empresa', c.company_name,
                    'projeto', p.name, 'minutos', x.m) order by x.m desc)
          from (select project_id, sum(minutes) m from public.time_entries
                 where tenant_id = t and worked_on between ini_sem and ini_sem + 6 group by project_id) x
          join public.projects p on p.id = x.project_id join public.clients c on c.id = p.client_id), '[]'::jsonb)),
    'projetos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nome', p.name, 'status', p.status, 'client_id', p.client_id,
        'empresa', c.company_name, 'contato', c.contact_name, 'lancamento', p.launch_date,
        'dias_para_lancar', case when p.launch_date is not null then p.launch_date - hoje end,
        'horas_estimadas', p.hours_estimated,
        'minutos_usados', (select coalesce(sum(minutes), 0) from public.time_entries e where e.project_id = p.id),
        'valor_cents', p.value_cents, 'plano', p.plan_name, 'mensal_cents', p.monthly_cents,
        'fases', (select jsonb_agg(jsonb_build_object('id', f.id, 'nome', f.name, 'quando', f.due_label,
                    'status', f.status, 'concluida_em', f.completed_at) order by f.position)
                    from public.project_phases f where f.project_id = p.id),
        'aguardando_cliente', (select count(*) from public.approvals a where a.project_id = p.id and a.status = 'aguardando')
                            + (select count(*) from public.client_tasks k where k.project_id = p.id and k.status = 'aberta')
                            + (select count(*) from public.requests r where r.project_id = p.id and r.status = 'aguardando_cliente'),
        'pendencias_atrasadas', (select count(*) from public.client_tasks k
                                  where k.project_id = p.id and k.status = 'aberta' and k.due_date < hoje),
        'checklist', jsonb_build_object(
            'feitos', (select count(*) from public.launch_items i where i.project_id = p.id and i.done),
            'total', (select count(*) from public.launch_items i where i.project_id = p.id)),
        'lancado_em', p.launched_at)
        order by p.launch_date nulls last, p.created_at)
       from public.projects p join public.clients c on c.id = p.client_id
      where p.tenant_id = t and p.status = coalesce(p_situacao, 'andamento')), '[]'::jsonb)
  );
end;
$$;

create or replace function public.projeto_detalhe(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.projects; hoje date;
begin
  select * into p from public.projects where id = p_id;
  if p.id is null or not public.is_tenant_owner(p.tenant_id) then raise exception 'projeto_inexistente' using errcode = 'P0002'; end if;
  hoje := public._hoje(p.tenant_id);
  return jsonb_build_object(
    'projeto', to_jsonb(p) - 'tenant_id',
    'hoje', hoje,
    'cliente', (select jsonb_build_object('id', c.id, 'empresa', c.company_name, 'contato', c.contact_name,
                  'whatsapp', c.whatsapp, 'email', c.email) from public.clients c where c.id = p.client_id),
    'proposta', (select jsonb_build_object('id', x.id, 'aceita_em', x.accepted_at) from public.proposals x where x.id = p.proposal_id),
    'minutos_usados', (select coalesce(sum(minutes), 0) from public.time_entries where project_id = p.id),
    'fases', (select coalesce(jsonb_agg(to_jsonb(f) - 'tenant_id' order by f.position), '[]'::jsonb)
                from public.project_phases f where f.project_id = p.id),
    'aprovacoes', (select coalesce(jsonb_agg(to_jsonb(a) - 'tenant_id' order by a.sent_at desc), '[]'::jsonb)
                     from public.approvals a where a.project_id = p.id),
    'pendencias', (select coalesce(jsonb_agg(to_jsonb(k) - 'tenant_id' order by k.status, k.due_date nulls last), '[]'::jsonb)
                     from public.client_tasks k where k.project_id = p.id),
    'tarefas', (select coalesce(jsonb_agg(to_jsonb(t) - 'tenant_id' order by t.position desc), '[]'::jsonb)
                  from public.project_tasks t where t.project_id = p.id),
    'pedidos', (select coalesce(jsonb_agg(to_jsonb(r) - 'tenant_id' order by r.created_at desc), '[]'::jsonb)
                  from public.requests r where r.project_id = p.id),
    'horas', (select coalesce(jsonb_agg(to_jsonb(e) - 'tenant_id' order by e.worked_on desc, e.created_at desc), '[]'::jsonb)
                from (select * from public.time_entries where project_id = p.id order by worked_on desc, created_at desc limit 200) e),
    'checklist', (select coalesce(jsonb_agg(to_jsonb(i) - 'tenant_id' order by i.position), '[]'::jsonb)
                    from public.launch_items i where i.project_id = p.id),
    'linha', (select coalesce(jsonb_agg(jsonb_build_object('tipo', e.kind, 'quando', e.created_at, 'detalhe', e.detail,
                    'origem', e.source) order by e.created_at desc), '[]'::jsonb)
                from (select * from public.project_events where project_id = p.id order by created_at desc limit 100) e)
  );
end;
$$;

create view public.v_pedidos with (security_invoker = true) as
select r.id, r.client_id, r.project_id, r.code, r.title, r.description, r.origin, r.status, r.classification,
       r.hours_estimated, r.value_cents, r.owner_note, r.client_decision, r.decided_at, r.decision_note,
       r.done_at, r.created_at, r.updated_at,
       c.company_name, c.contact_name, p.name as project_name, p.status as project_status
  from public.requests r
  join public.clients c on c.id = r.client_id
  left join public.projects p on p.id = r.project_id;
revoke all on public.v_pedidos from anon;
revoke insert, update, delete, truncate on public.v_pedidos from authenticated;
grant select on public.v_pedidos to authenticated;

create or replace function public.pedidos_resumo()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'todos', count(*),
    'recebido', count(*) filter (where status = 'recebido'),
    'andamento', count(*) filter (where status in ('em_analise', 'fazendo')),
    'aguardando_cliente', count(*) filter (where status = 'aguardando_cliente'),
    'concluidos', count(*) filter (where status in ('pronto', 'recusado')),
    'adicional_aprovado_cents', coalesce(sum(value_cents) filter (where classification = 'adicional' and client_decision = 'aprovado'), 0))
  from public.v_pedidos;
$$;

-- ---------------------------------------------------------------------
-- 10. Portal: convite e acesso
-- ---------------------------------------------------------------------
create or replace function public.portal_convidar(p_cliente uuid, p_email text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); v text := lower(trim(coalesce(p_email, ''))); i public.portal_invites;
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v) > 160 then raise exception 'email_invalido' using errcode = '22023'; end if;
  if exists (select 1 from public.memberships m join auth.users u on u.id = m.user_id
              where lower(u.email) = v and m.role = 'owner') then
    raise exception 'email_de_dono' using errcode = '22023';
  end if;
  if exists (select 1 from public.client_members cm join auth.users u on u.id = cm.user_id
              where cm.client_id = p_cliente and lower(u.email) = v) then
    raise exception 'ja_tem_acesso' using errcode = '22023';
  end if;
  select * into i from public.portal_invites
   where client_id = p_cliente and lower(email) = v and accepted_at is null and canceled_at is null;
  if i.id is not null then
    update public.portal_invites set expires_at = now() + interval '30 days' where id = i.id returning * into i;
  else
    insert into public.portal_invites (tenant_id, client_id, email, invited_by)
    values (t, p_cliente, v, auth.uid()) returning * into i;
  end if;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'portal.convite', jsonb_build_object('client_id', p_cliente, 'email', v));
  return jsonb_build_object('id', i.id, 'vale_ate', i.expires_at);
end;
$$;

create or replace function public.portal_convite_cancelar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare i public.portal_invites;
begin
  select * into i from public.portal_invites where id = p_id for update;
  if i.id is null or not public.is_tenant_owner(i.tenant_id) then raise exception 'convite_inexistente' using errcode = 'P0002'; end if;
  update public.portal_invites set canceled_at = now() where id = i.id and accepted_at is null;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.portal_acesso_remover(p_cliente uuid, p_usuario uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  delete from public.client_members where client_id = p_cliente and user_id = p_usuario;
  -- Sem outra empresa nesse tenant, perde o papel de cliente
  if not exists (select 1 from public.client_members where user_id = p_usuario and tenant_id = t) then
    delete from public.memberships where user_id = p_usuario and tenant_id = t and role = 'client';
  end if;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'portal.acesso_removido', jsonb_build_object('client_id', p_cliente));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.portal_acessos(p_cliente uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'pessoas', coalesce((select jsonb_agg(jsonb_build_object('user_id', u.id, 'email', u.email, 'desde', cm.created_at)
                  order by cm.created_at)
                from public.client_members cm join auth.users u on u.id = cm.user_id where cm.client_id = p_cliente), '[]'::jsonb),
    'convites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'enviado_em', i.created_at,
                  'vale_ate', i.expires_at) order by i.created_at desc)
                from public.portal_invites i where i.client_id = p_cliente and i.accepted_at is null
                 and i.canceled_at is null and i.expires_at > now()), '[]'::jsonb));
end;
$$;

-- No primeiro acesso: liga a pessoa aos clientes que a convidaram por este e-mail
create or replace function public.portal_aceitar_convite()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v text; i public.portal_invites; n int := 0;
begin
  if auth.uid() is null then return jsonb_build_object('ligados', 0); end if;
  select lower(email) into v from auth.users where id = auth.uid();
  if v is null then return jsonb_build_object('ligados', 0); end if;
  for i in select * from public.portal_invites
            where lower(email) = v and accepted_at is null and canceled_at is null and expires_at > now() for update loop
    -- Dono do mesmo tenant não vira cliente
    if exists (select 1 from public.memberships where user_id = auth.uid() and tenant_id = i.tenant_id and role = 'owner') then
      continue;
    end if;
    insert into public.memberships (tenant_id, user_id, role) values (i.tenant_id, auth.uid(), 'client')
      on conflict (tenant_id, user_id) do nothing;
    insert into public.client_members (client_id, user_id, tenant_id) values (i.client_id, auth.uid(), i.tenant_id)
      on conflict (client_id, user_id) do nothing;
    update public.portal_invites set accepted_at = now(), accepted_by = auth.uid() where id = i.id;
    insert into public.event_outbox (tenant_id, event, payload)
    values (i.tenant_id, 'portal.convite_aceito', jsonb_build_object('client_id', i.client_id));
    n := n + 1;
  end loop;
  return jsonb_build_object('ligados', n);
end;
$$;

-- ---------------------------------------------------------------------
-- 11. Portal: leitura e ações do cliente
-- ---------------------------------------------------------------------
create or replace function public._portal_cliente(p_cliente uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare c uuid;
begin
  select client_id into c from public.client_members
   where user_id = auth.uid() and (p_cliente is null or client_id = p_cliente)
   order by created_at limit 1;
  if c is null then raise exception 'sem_permissao' using errcode = '42501'; end if;
  return c;
end;
$$;
revoke all on function public._portal_cliente(uuid) from public, anon, authenticated;

create or replace function public.portal_pendencias(p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); ap int; pe int; ad int;
begin
  select count(*) into ap from public.approvals where client_id = c and status = 'aguardando';
  select count(*) into pe from public.client_tasks where client_id = c and status = 'aberta';
  select count(*) into ad from public.requests where client_id = c and status = 'aguardando_cliente';
  return jsonb_build_object('aprovacoes', ap + ad, 'pendencias', pe, 'total', ap + pe + ad,
    'pedidos_andamento', (select count(*) from public.requests where client_id = c and status in ('recebido', 'em_analise', 'fazendo')));
end;
$$;

create or replace function public.portal_inicio(p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); p public.projects; t uuid;
begin
  select tenant_id into t from public.clients where id = c;
  select * into p from public.projects where client_id = c
   order by (status = 'andamento') desc, created_at desc limit 1;
  return jsonb_build_object(
    'empresa', (select company_name from public.clients where id = c),
    'contato', (select contact_name from public.clients where id = c),
    'responsavel', coalesce((select coalesce(nullif(trim(pr.full_name), ''), nullif(trim(u.raw_user_meta_data->>'full_name'), ''))
                     from public.memberships m join auth.users u on u.id = m.user_id
                     left join public.profiles pr on pr.id = m.user_id
                    where m.tenant_id = t and m.role = 'owner' order by m.created_at limit 1),
                    (select name from public.tenants where id = t)),
    'hoje', public._hoje(t),
    'pendencias', public.portal_pendencias(c),
    'projeto', case when p.id is null then null else jsonb_build_object(
        'id', p.id, 'nome', p.name, 'status', p.status, 'lancamento', p.launch_date,
        'plano', p.plan_name, 'mensal_cents', p.monthly_cents,
        'fases', (select coalesce(jsonb_agg(jsonb_build_object('nome', f.name, 'quando', f.due_label, 'status', f.status,
                    'concluida_em', f.completed_at) order by f.position), '[]'::jsonb)
                  from public.project_phases f where f.project_id = p.id)) end,
    'acoes', coalesce((select jsonb_agg(x order by x->>'ordem') from (
        select jsonb_build_object('tipo', 'aprovacao', 'id', a.id, 'titulo', a.title, 'quando', a.sent_at, 'ordem', '1' || a.sent_at) x
          from public.approvals a where a.client_id = c and a.status = 'aguardando'
        union all
        select jsonb_build_object('tipo', 'adicional', 'id', r.id, 'titulo', r.title, 'valor_cents', r.value_cents,
                                  'quando', r.updated_at, 'ordem', '2' || r.updated_at)
          from public.requests r where r.client_id = c and r.status = 'aguardando_cliente'
        union all
        select jsonb_build_object('tipo', 'pendencia', 'id', k.id, 'titulo', k.title, 'detalhe', k.detail,
                                  'prazo', k.due_date, 'atrasada', k.due_date < public._hoje(k.tenant_id),
                                  'ordem', '3' || coalesce(k.due_date::text, '9999'))
          from public.client_tasks k where k.client_id = c and k.status = 'aberta') q), '[]'::jsonb)
  );
end;
$$;

create or replace function public.portal_aprovacoes(p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente);
begin
  return jsonb_build_object(
    'entregas', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.title, 'descricao', a.description,
        'itens', a.items, 'previa', a.preview_url, 'status', a.status, 'enviada_em', a.sent_at,
        'decidida_em', a.decided_at, 'comentario', a.decision_note,
        'fase', (select name from public.project_phases f where f.id = a.phase_id),
        'projeto', (select name from public.projects p where p.id = a.project_id))
        order by (a.status = 'aguardando') desc, a.sent_at desc)
      from public.approvals a where a.client_id = c and a.status <> 'cancelada'), '[]'::jsonb),
    'adicionais', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'codigo', r.code, 'titulo', r.title,
        'descricao', r.description, 'nota', r.owner_note, 'horas', r.hours_estimated, 'valor_cents', r.value_cents,
        'hora_cents', (public._precos(r.tenant_id)).hour_cents,
        'status', r.status, 'decisao', r.client_decision, 'decidido_em', r.decided_at)
        order by (r.status = 'aguardando_cliente') desc, r.updated_at desc)
      from public.requests r where r.client_id = c and r.classification = 'adicional'
       and (r.status = 'aguardando_cliente' or r.client_decision is not null)), '[]'::jsonb));
end;
$$;

create or replace function public.portal_pedidos(p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'codigo', r.code, 'titulo', r.title,
      'descricao', r.description, 'status', r.status, 'classificacao', r.classification,
      'horas', r.hours_estimated, 'valor_cents', r.value_cents, 'nota', r.owner_note,
      'decisao', r.client_decision, 'criado_em', r.created_at, 'pronto_em', r.done_at)
      order by (r.status in ('pronto', 'recusado')), r.created_at desc)
    from public.requests r where r.client_id = c), '[]'::jsonb);
end;
$$;

create or replace function public.portal_aprovar(p_id uuid, p_comentario text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare a public.approvals;
begin
  select * into a from public.approvals where id = p_id for update;
  if a.id is null or not public.is_client_member(a.client_id) then raise exception 'aprovacao_inexistente' using errcode = 'P0002'; end if;
  if a.status = 'aprovada' then return jsonb_build_object('repetido', true); end if;
  if a.status <> 'aguardando' then raise exception 'aprovacao_ja_decidida' using errcode = '22023'; end if;
  update public.approvals set status = 'aprovada', decided_at = now(), decided_by = auth.uid(),
         decision_note = nullif(left(trim(coalesce(p_comentario, '')), 1000), '')
   where id = a.id returning * into a;
  if a.phase_id is not null then perform public._fase_concluir(a.phase_id); end if;
  perform public._projeto_evento(a.tenant_id, a.client_id, a.project_id, null, 'aprovacao_aprovada',
    jsonb_build_object('aprovacao_id', a.id, 'titulo', a.title), 'cliente', 'aprovacao.aprovada');
  return jsonb_build_object('repetido', false);
end;
$$;

create or replace function public.portal_pedir_ajuste(p_id uuid, p_comentario text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare a public.approvals;
begin
  select * into a from public.approvals where id = p_id for update;
  if a.id is null or not public.is_client_member(a.client_id) then raise exception 'aprovacao_inexistente' using errcode = 'P0002'; end if;
  if a.status <> 'aguardando' then raise exception 'aprovacao_ja_decidida' using errcode = '22023'; end if;
  if length(trim(coalesce(p_comentario, ''))) < 5 then raise exception 'comentario_obrigatorio' using errcode = '22023'; end if;
  update public.approvals set status = 'ajuste', decided_at = now(), decided_by = auth.uid(),
         decision_note = left(trim(p_comentario), 1000)
   where id = a.id returning * into a;
  perform public._projeto_evento(a.tenant_id, a.client_id, a.project_id, null, 'aprovacao_ajuste',
    jsonb_build_object('aprovacao_id', a.id, 'titulo', a.title, 'comentario', a.decision_note), 'cliente', 'aprovacao.ajuste');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.portal_adicional_decidir(p_id uuid, p_aprova boolean, p_comentario text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_id for update;
  if r.id is null or not public.is_client_member(r.client_id) then raise exception 'pedido_inexistente' using errcode = 'P0002'; end if;
  if r.client_decision is not null and r.status <> 'aguardando_cliente' then return jsonb_build_object('repetido', true); end if;
  if r.status <> 'aguardando_cliente' then raise exception 'pedido_indisponivel' using errcode = '22023'; end if;
  update public.requests set client_decision = case when p_aprova then 'aprovado' else 'recusado' end,
         decided_at = now(), decided_by = auth.uid(),
         decision_note = nullif(left(trim(coalesce(p_comentario, '')), 1000), ''),
         status = case when p_aprova then 'em_analise'::public.request_status else 'recusado'::public.request_status end
   where id = r.id returning * into r;
  perform public._projeto_evento(r.tenant_id, r.client_id, r.project_id, r.id,
    case when p_aprova then 'adicional_aprovado' else 'adicional_recusado' end,
    jsonb_build_object('codigo', r.code, 'titulo', r.title, 'valor_cents', r.value_cents, 'comentario', r.decision_note),
    'cliente', case when p_aprova then 'pedido.adicional_aprovado' else 'pedido.adicional_recusado' end);
  return jsonb_build_object('repetido', false);
end;
$$;

create or replace function public.portal_pendencia_feita(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare k public.client_tasks;
begin
  select * into k from public.client_tasks where id = p_id for update;
  if k.id is null or not public.is_client_member(k.client_id) then raise exception 'pendencia_inexistente' using errcode = 'P0002'; end if;
  if k.status = 'feita' then return jsonb_build_object('repetido', true); end if;
  update public.client_tasks set status = 'feita', done_at = now(), done_by = auth.uid() where id = k.id;
  perform public._projeto_evento(k.tenant_id, k.client_id, k.project_id, null, 'pendencia_feita',
    jsonb_build_object('pendencia_id', k.id, 'titulo', k.title), 'cliente', 'pendencia.feita');
  return jsonb_build_object('repetido', false);
end;
$$;

create or replace function public.portal_pedido_criar(p_titulo text, p_descricao text default null, p_cliente uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); t uuid; r public.requests;
begin
  select tenant_id into t from public.clients where id = c;
  -- Limite contra excesso: 20 pedidos por dia por empresa
  if (select count(*) from public.requests where client_id = c and created_at > now() - interval '1 day') >= 20 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;
  r := public._pedido_novo(t, c, null, p_titulo, p_descricao, 'portal');
  return jsonb_build_object('id', r.id, 'codigo', r.code);
end;
$$;

-- ---------------------------------------------------------------------
-- 12. Painel: novidades do portal entram junto
-- ---------------------------------------------------------------------
create or replace function public.painel_novidades()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); tz text; ini date;
begin
  select timezone into tz from public.tenants where id = t;
  ini := date_trunc('month', now() at time zone tz)::date;
  return jsonb_build_object(
    'novidades', coalesce((
      select jsonb_agg(x order by x->>'quando' desc) from (
        select * from (
          select jsonb_build_object('tipo', e.kind, 'quando', e.created_at, 'client_id', e.client_id,
                   'empresa', c.company_name, 'detalhe', e.detail) as x, e.created_at
            from public.deal_events e join public.clients c on c.id = e.client_id
           where e.tenant_id = t and e.created_at > now() - interval '7 days'
             and e.kind in ('proposta_vista', 'proposta_aceita', 'proposta_recusada', 'pedido_do_site')
          union all
          select jsonb_build_object('tipo', e.kind, 'quando', e.created_at, 'client_id', e.client_id,
                   'project_id', e.project_id, 'empresa', c.company_name, 'detalhe', e.detail) as x, e.created_at
            from public.project_events e join public.clients c on c.id = e.client_id
           where e.tenant_id = t and e.created_at > now() - interval '7 days' and e.source = 'cliente'
             and e.kind in ('aprovacao_aprovada', 'aprovacao_ajuste', 'adicional_aprovado', 'adicional_recusado',
                            'pendencia_feita', 'pedido_recebido')
        ) u order by created_at desc limit 15) q), '[]'::jsonb),
    'fechado_mes_cents', (select coalesce(sum(value_cents), 0) from public.deals
        where tenant_id = t and stage = 'fechado' and (closed_at at time zone tz)::date >= ini),
    'fechados_mes', (select count(*) from public.deals
        where tenant_id = t and stage = 'fechado' and (closed_at at time zone tz)::date >= ini),
    'propostas_aguardando', (select count(*) from public.proposals
        where tenant_id = t and status = 'enviada' and expires_at >= now()),
    'propostas_aguardando_cents', (select coalesce(sum(total_cents), 0) from public.proposals
        where tenant_id = t and status = 'enviada' and expires_at >= now()),
    'propostas_vistas', (select count(*) from public.proposals
        where tenant_id = t and status = 'enviada' and expires_at >= now() and viewed_at is not null),
    'falhas_site', (select count(*) from public.event_outbox
        where tenant_id = t and event = 'funil.falha_ao_importar_site' and occurred_at > now() - interval '30 days'),
    'pedidos_novos', (select count(*) from public.requests where tenant_id = t and status = 'recebido')
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 13. Permissões das RPCs
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'projeto_criar(uuid, text, integer, numeric, date, text, integer)', 'projeto_atualizar(uuid, jsonb)',
    'projeto_fase_concluir(uuid)', 'aprovacao_pedir(uuid, text, text, text[], text, uuid)', 'aprovacao_cancelar(uuid)',
    'pendencia_criar(uuid, text, text, date)', 'pendencia_marcar(uuid, boolean)', 'pendencia_remover(uuid)',
    'tarefa_criar(uuid, text, text, text, smallint, uuid)', 'tarefa_mover(uuid, public.task_status)', 'tarefa_remover(uuid)',
    'horas_lancar(uuid, date, integer, text)', 'horas_remover(uuid)', 'encerramento_marcar(uuid, boolean)',
    'encerramento_item_criar(uuid, text)', 'projeto_lancar(uuid)',
    'pedido_registrar(uuid, text, text, public.request_origin, uuid)', 'pedido_classificar(uuid, public.request_class, numeric, text)',
    'pedido_enviar_cliente(uuid)', 'pedido_iniciar(uuid)', 'pedido_concluir(uuid)', 'pedido_recusar(uuid, text)',
    'projetos_lista(public.project_status)', 'projeto_detalhe(uuid)', 'pedidos_resumo()',
    'portal_convidar(uuid, text)', 'portal_convite_cancelar(uuid)', 'portal_acesso_remover(uuid, uuid)', 'portal_acessos(uuid)',
    'portal_aceitar_convite()', 'portal_pendencias(uuid)', 'portal_inicio(uuid)', 'portal_aprovacoes(uuid)', 'portal_pedidos(uuid)',
    'portal_aprovar(uuid, text)', 'portal_pedir_ajuste(uuid, text)', 'portal_adicional_decidir(uuid, boolean, text)',
    'portal_pendencia_feita(uuid)', 'portal_pedido_criar(text, text, uuid)', 'painel_novidades()'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
revoke all on function public.unaccent_like(text) from public, anon, authenticated;
