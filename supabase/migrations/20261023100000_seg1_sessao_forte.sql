-- =====================================================================
-- Hub Fora do Papel · SEG-1 · Login do gestor com senha e código do app
-- Card: docs/cards/SEG-1-login-do-gestor.md
-- Quem tem app autenticador ativado só age como dono com sessão verificada pelo código
-- (aal2). Vale para toda RLS e RPC de dono, porque todas passam por is_tenant_owner
-- ou _tenant_do_dono. Sessão só com senha ou só com link não basta.
-- =====================================================================

-- Sessão forte: código do app verificado nesta sessão, ou a pessoa ainda não tem app ativado
-- (nesse caso o Hub obriga a ativar antes de abrir qualquer tela de gestor).
create or replace function public._sessao_forte()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f
                      where f.user_id = auth.uid() and f.status::text = 'verified');
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
