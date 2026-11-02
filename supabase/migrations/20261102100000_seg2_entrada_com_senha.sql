-- Card SEG-2: entrada do cliente com e-mail e senha.
-- O primeiro acesso é um link gerado no Hub (função de servidor `portal-acesso`) e enviado pelo
-- WhatsApp; com ele a pessoa cria a própria senha. Esta migração é a porta do banco.
--
-- Regras que impedem o dono de tomar a conta de alguém (relecture de segurança, rodada 1):
--   1. Link só para conta em que a pessoa NUNCA criou senha. "Criou senha" é marcado aqui
--      (portal_senha_criada), por gatilho na troca de senha: a coluna encrypted_password não serve,
--      porque o Auth grava uma senha aleatória em toda conta criada pelo link do e-mail.
--   2. Recusa conta dona de algum tenant, com acesso em outro tenant ou com convite aberto de outro.
--   3. A conta que recebeu link fica presa ao tenant de quem gerou (portal_conta_origem): o aceite
--      de convite (portal_aceitar_convite) ignora convites de outros tenants para ela.
--   4. Recusas têm uma resposta só ("usar_entrada") e contam no limite do dia, para não virar sonda.

-- 1. Quem criou senha de verdade --------------------------------------------------------------------
create table public.portal_senha_criada (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now()
);
alter table public.portal_senha_criada enable row level security;
revoke all on public.portal_senha_criada from public, anon, authenticated;
comment on table public.portal_senha_criada is
  'SEG-2: contas em que a pessoa definiu a senha (gatilho em auth.users). Sem tenant_id: é dado da conta, lido só por funções security definer.';

create or replace function public._marcar_senha_criada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password and coalesce(new.encrypted_password, '') <> '' then
    insert into public.portal_senha_criada (user_id) values (new.id)
      on conflict (user_id) do update set criada_em = now();
  end if;
  return new;
end;
$$;
revoke all on function public._marcar_senha_criada() from public, anon, authenticated;

create trigger portal_senha_criada_marca
  after update of encrypted_password on auth.users
  for each row execute function public._marcar_senha_criada();

-- Donos já entram com senha (SEG-1)
insert into public.portal_senha_criada (user_id)
select distinct m.user_id from public.memberships m where m.role = 'owner'
on conflict do nothing;

-- 3. Tenant de origem da conta que recebeu link -----------------------------------------------------
create table public.portal_conta_origem (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  criada_em timestamptz not null default now()
);
create index portal_conta_origem_tenant_idx on public.portal_conta_origem (tenant_id);
alter table public.portal_conta_origem enable row level security;
revoke all on public.portal_conta_origem from public, anon, authenticated;
create policy portal_conta_origem_dono on public.portal_conta_origem
  for select to authenticated using (public.is_tenant_owner(tenant_id));
grant select on public.portal_conta_origem to authenticated;

-- 2. Porta do link (com o login do dono, chamada pela função de servidor) ---------------------------
create or replace function public.portal_primeiro_acesso(p_cliente uuid, p_email text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  v text := lower(trim(coalesce(p_email, '')));
  u auth.users;
  recusa boolean := false;
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v) > 160 then
    raise exception 'email_invalido' using errcode = '22023';
  end if;
  -- Só para quem foi convidado (convite aberto) ou já entra no portal desta empresa
  if not exists (select 1 from public.portal_invites
                  where client_id = p_cliente and lower(email) = v
                    and accepted_at is null and canceled_at is null and expires_at > now())
     and not exists (select 1 from public.client_members cm join auth.users x on x.id = cm.user_id
                      where cm.client_id = p_cliente and lower(x.email) = v) then
    raise exception 'sem_convite' using errcode = '22023';
  end if;
  -- Limite do dia: conta pedidos atendidos e recusados (trava por tenant contra pedidos simultâneos)
  perform pg_advisory_xact_lock(hashtext('portal_primeiro_acesso:' || t::text));
  if (select count(*) from public.event_outbox
       where tenant_id = t and event in ('portal.primeiro_acesso', 'portal.primeiro_acesso_recusado')
         and occurred_at > now() - interval '1 day') >= 30 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;

  select * into u from auth.users where lower(email) = v order by created_at limit 1;
  -- Convite aberto deste e-mail em outro tenant: a conta não é só desta empresa
  recusa := exists (select 1 from public.portal_invites
                     where lower(email) = v and tenant_id <> t
                       and accepted_at is null and canceled_at is null and expires_at > now());
  if u.id is not null then
    recusa := recusa
      or exists (select 1 from public.portal_senha_criada where user_id = u.id)
      or exists (select 1 from public.memberships where user_id = u.id and (role = 'owner' or tenant_id <> t))
      or exists (select 1 from public.portal_conta_origem where user_id = u.id and tenant_id <> t);
  end if;

  if recusa then
    insert into public.event_outbox (tenant_id, event, payload)
    values (t, 'portal.primeiro_acesso_recusado', jsonb_build_object('client_id', p_cliente, 'por', auth.uid()));
    return jsonb_build_object('erro', 'usar_entrada');
  end if;

  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'portal.primeiro_acesso',
          jsonb_build_object('client_id', p_cliente, 'por', auth.uid(), 'conta_nova', u.id is null));
  return jsonb_build_object('email', v, 'existe', u.id is not null, 'tenant_id', t);
end;
$$;
revoke all on function public.portal_primeiro_acesso(uuid, text) from public, anon;
grant execute on function public.portal_primeiro_acesso(uuid, text) to authenticated;

-- Gravada pela função de servidor (chave de serviço) com o id da conta que o Auth devolveu.
create or replace function public.portal_conta_origem_gravar(p_usuario uuid, p_tenant uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  insert into public.portal_conta_origem (user_id, tenant_id) values (p_usuario, p_tenant)
    on conflict (user_id) do nothing;
  if exists (select 1 from public.portal_conta_origem where user_id = p_usuario and tenant_id <> p_tenant) then
    raise exception 'conta_de_outro' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.portal_conta_origem_gravar(uuid, uuid) from public, anon, authenticated;
grant execute on function public.portal_conta_origem_gravar(uuid, uuid) to service_role;

-- Aceite de convite: conta presa a um tenant só aceita convites dele ---------------------------------
create or replace function public.portal_aceitar_convite()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v text; i public.portal_invites; n int := 0; origem uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ligados', 0); end if;
  select lower(email) into v from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if v is null then return jsonb_build_object('ligados', 0); end if;
  select tenant_id into origem from public.portal_conta_origem where user_id = auth.uid();
  for i in select * from public.portal_invites
            where lower(email) = v and accepted_at is null and canceled_at is null and expires_at > now()
              and (origem is null or tenant_id = origem) for update loop
    -- Dono do mesmo tenant não vira cliente
    if exists (select 1 from public.memberships where user_id = auth.uid() and tenant_id = i.tenant_id and role = 'owner') then
      continue;
    end if;
    insert into public.memberships (tenant_id, user_id, role) values (i.tenant_id, auth.uid(), 'client')
      on conflict (tenant_id, user_id) do nothing;
    insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve)
      values (i.client_id, auth.uid(), i.tenant_id, i.profile, i.can_approve)
      on conflict (client_id, user_id) do nothing;
    update public.portal_invites set accepted_at = now(), accepted_by = auth.uid() where id = i.id;
    insert into public.event_outbox (tenant_id, event, payload)
    values (i.tenant_id, 'portal.convite_aceito', jsonb_build_object('client_id', i.client_id));
    n := n + 1;
  end loop;
  return jsonb_build_object('ligados', n);
end;
$$;

-- A tela do cliente no Hub mostra quem ainda não criou a senha ---------------------------------------
create or replace function public.portal_acesso_tem_senha(p_cliente uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(cm.user_id, exists (select 1 from public.portal_senha_criada s where s.user_id = cm.user_id)), '{}'::jsonb)
    from public.client_members cm
   where cm.client_id = p_cliente
     and cm.tenant_id = public._tenant_do_dono();
$$;
revoke all on function public.portal_acesso_tem_senha(uuid) from public, anon;
grant execute on function public.portal_acesso_tem_senha(uuid) to authenticated;
