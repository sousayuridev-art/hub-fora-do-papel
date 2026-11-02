-- Card SEG-2: entrada do cliente com e-mail e senha.
-- O primeiro acesso é um link gerado no Hub (função de servidor `portal-acesso`) e enviado pelo
-- WhatsApp; com ele a pessoa cria a própria senha. Esta função é a porta do banco: confere quem pede
-- (dono do tenant, com código: _tenant_do_dono exige aal2) e se a conta pode receber o link.
--
-- Regra que impede tomar a conta de alguém: o link só é gerado para conta SEM senha, que não é dona
-- de nenhum tenant e não tem acesso em outro tenant. Quem já tem senha usa "Esqueci a senha".

create or replace function public.portal_primeiro_acesso(p_cliente uuid, p_email text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  v text := lower(trim(coalesce(p_email, '')));
  u auth.users;
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
  if (select count(*) from public.event_outbox
       where tenant_id = t and event = 'portal.primeiro_acesso' and occurred_at > now() - interval '1 day') >= 30 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;

  select * into u from auth.users where lower(email) = v order by created_at limit 1;
  if u.id is not null then
    if coalesce(u.encrypted_password, '') <> '' then
      raise exception 'ja_tem_senha' using errcode = '22023';
    end if;
    if exists (select 1 from public.memberships where user_id = u.id and (role = 'owner' or tenant_id <> t)) then
      raise exception 'conta_de_outro' using errcode = '42501';
    end if;
  end if;

  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'portal.primeiro_acesso',
          jsonb_build_object('client_id', p_cliente, 'por', auth.uid(), 'conta_nova', u.id is null));
  return jsonb_build_object('email', v, 'existe', u.id is not null);
end;
$$;

revoke all on function public.portal_primeiro_acesso(uuid, text) from public, anon;
grant execute on function public.portal_primeiro_acesso(uuid, text) to authenticated;

-- A tela do cliente mostra se a pessoa já criou a senha (sem expor o hash).
create or replace function public.portal_acesso_tem_senha(p_cliente uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(cm.user_id, coalesce(u.encrypted_password, '') <> ''), '{}'::jsonb)
    from public.client_members cm join auth.users u on u.id = cm.user_id
   where cm.client_id = p_cliente
     and cm.tenant_id = public._tenant_do_dono();
$$;

revoke all on function public.portal_acesso_tem_senha(uuid) from public, anon;
grant execute on function public.portal_acesso_tem_senha(uuid) to authenticated;
