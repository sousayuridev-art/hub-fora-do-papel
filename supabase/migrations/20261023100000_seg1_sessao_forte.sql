-- =====================================================================
-- Hub Fora do Papel · SEG-1 · Login do gestor com senha e código do app
-- Card: docs/cards/SEG-1-login-do-gestor.md
-- Dono só age com sessão verificada pelo código do app (aal2). Vale para toda RLS e RPC de dono, porque todas passam por is_tenant_owner
-- ou _tenant_do_dono. Sessão só com senha ou só com link não basta.
-- =====================================================================

-- Sessão forte: código do app verificado nesta sessão (aal2). Sem exceção para quem ainda
-- não ativou o app: a página Segurança só usa a API de autenticação e my_access, então o
-- gestor consegue ativar o app sem passar por aqui (revisão de segurança do SEG-1).
create or replace function public._sessao_forte()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
revoke all on function public._sessao_forte() from public, anon, authenticated;

create or replace function public.is_tenant_owner(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where tenant_id = t and user_id = auth.uid() and role = 'owner'
  ) and public._sessao_forte();
$$;

create or replace function public._tenant_do_dono()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid; n int;
begin
  select count(*), min(tenant_id::text)::uuid into n, v
    from public.memberships where user_id = auth.uid() and role = 'owner';
  if n = 0 then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if n > 1 then
    raise exception 'tenant_ambiguo' using errcode = '42501';
  end if;
  if not public._sessao_forte() then
    raise exception 'precisa_codigo' using errcode = '42501';
  end if;
  return v;
end;
$$;
