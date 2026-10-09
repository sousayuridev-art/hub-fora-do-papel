-- =====================================================================
-- Hub Fora do Papel · Sprint 0 · Base multi-tenant
-- Tenants, pessoas, papéis, clientes e fila de eventos, com RLS.
-- Regra de ouro: a segurança mora aqui. O frontend nunca filtra por tenant.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.member_role as enum ('owner', 'client');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- A agência (hoje só a Fora do Papel; no futuro, outras agências whitelabel)
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  created_at  timestamptz not null default now()
);

-- Perfil de cada pessoa que entra no sistema (operador ou cliente)
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  whatsapp    text,
  created_at  timestamptz not null default now()
);

-- Quem pertence a qual tenant e com qual papel
create table public.memberships (
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.member_role not null,
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- Empresa cliente da agência (o lead também mora aqui; a etapa do funil vem na Sprint 1)
create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  company_name      text not null check (length(trim(company_name)) > 0),
  contact_name      text not null,
  whatsapp          text not null,
  email             text,
  -- Dados de contrato: obrigatórios só no aceite da proposta (regra C2, validada por RPC)
  document_type     text check (document_type in ('cnpj', 'cpf')),
  document_number   text,
  legal_name        text,
  address           text,
  billing_email     text,
  legal_responsible text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index clients_tenant_idx on public.clients (tenant_id);

-- Quais pessoas (logins do portal) representam qual cliente
create table public.client_members (
  client_id   uuid not null references public.clients (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  can_approve boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (client_id, user_id)
);
create index client_members_user_idx on public.client_members (user_id);

-- Fila de eventos para o n8n (gravada na mesma transação da ação)
create table public.event_outbox (
  id           bigint generated always as identity primary key,
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  event        text not null,
  payload      jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now(),
  sent_at      timestamptz,
  attempts     smallint not null default 0,
  last_error   text
);
create index event_outbox_pending_idx on public.event_outbox (occurred_at) where sent_at is null;

-- ---------------------------------------------------------------------
-- Funções auxiliares de segurança
-- security definer + search_path fixo: leem memberships sem cair em RLS recursiva
-- ---------------------------------------------------------------------
create or replace function public.is_tenant_owner(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where tenant_id = t and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.is_tenant_member(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where tenant_id = t and user_id = auth.uid()
  );
$$;

create or replace function public.is_client_member(c uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.client_members
    where client_id = c and user_id = auth.uid()
  );
$$;

revoke all on function public.is_tenant_owner(uuid)  from public;
revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.is_client_member(uuid) from public;
grant execute on function public.is_tenant_owner(uuid)  to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.is_client_member(uuid) to authenticated;

-- Papel do usuário logado (o frontend usa para decidir entre /app e /portal)
create or replace function public.my_access()
returns table (tenant_id uuid, role public.member_role, client_id uuid)
language sql stable security definer set search_path = public
as $$
  select m.tenant_id, m.role, cm.client_id
  from public.memberships m
  left join public.client_members cm
    on cm.user_id = m.user_id and cm.tenant_id = m.tenant_id
  where m.user_id = auth.uid();
$$;
revoke all on function public.my_access() from public;
grant execute on function public.my_access() to authenticated;

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

-- Cria o perfil quando alguém entra pela primeira vez
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

-- client_members.tenant_id tem que ser o tenant do cliente (evita vazamento entre tenants)
create or replace function public.client_members_check_tenant()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is distinct from (select tenant_id from public.clients where id = new.client_id) then
    raise exception 'client_members.tenant_id difere do tenant do cliente';
  end if;
  return new;
end;
$$;

create trigger client_members_tenant_guard before insert or update on public.client_members
  for each row execute function public.client_members_check_tenant();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.tenants        enable row level security;
alter table public.profiles       enable row level security;
alter table public.memberships    enable row level security;
alter table public.clients        enable row level security;
alter table public.client_members enable row level security;
alter table public.event_outbox   enable row level security;

-- tenants: membro lê; só o dono altera; criação de tenant é feita fora do app (service role)
create policy tenants_select on public.tenants
  for select to authenticated using (public.is_tenant_member(id));
create policy tenants_update on public.tenants
  for update to authenticated using (public.is_tenant_owner(id)) with check (public.is_tenant_owner(id));

-- profiles: cada um lê e edita o seu; o dono lê os perfis das pessoas do seu tenant
create policy profiles_self_select on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_owner_select on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id and public.is_tenant_owner(m.tenant_id)
    )
  );

-- memberships: cada um vê as suas; o dono gerencia as do tenant
create policy memberships_self_select on public.memberships
  for select to authenticated using (user_id = auth.uid());
create policy memberships_owner_all on public.memberships
  for all to authenticated using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- clients: dono faz tudo no seu tenant; cliente só lê a própria empresa
create policy clients_owner_all on public.clients
  for all to authenticated using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));
create policy clients_member_select on public.clients
  for select to authenticated using (public.is_client_member(id));

-- client_members: dono gerencia; a pessoa vê o próprio vínculo
create policy client_members_owner_all on public.client_members
  for all to authenticated using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));
create policy client_members_self_select on public.client_members
  for select to authenticated using (user_id = auth.uid());

-- event_outbox: só o dono lê (painel de falhas); ninguém grava pelo app.
-- Escrita acontece dentro de RPCs security definer (próximas sprints) e o envio pela Edge Function (service role).
create policy event_outbox_owner_select on public.event_outbox
  for select to authenticated using (public.is_tenant_owner(tenant_id));

-- anon não acessa nada
revoke all on all tables in schema public from anon;
