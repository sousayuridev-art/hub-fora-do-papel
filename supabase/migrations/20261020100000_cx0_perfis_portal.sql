-- CX-0 · Perfis de acesso no portal (20/10): card docs/cards/CX-0-perfis-de-acesso.md
-- Cada pessoa com acesso ao portal é "responsavel" (quem contratou: vê tudo) ou "equipe"
-- (acompanha o projeto, aprova se puder, pede ajustes, vê arquivos; sem valores nem pagamentos).
-- A separação é feita aqui, nas funções do portal; o frontend só esconde a aba como consequência.
-- Também: conta a pagar entra no "Precisa de você" com 5 dias de antecedência (era 3) e o Início
-- ganha a parcela como ação, o perfil de quem entrou e o WhatsApp do responsável da agência.

-- ---------------------------------------------------------------------
-- 1. Perfil em quem tem acesso e em quem foi convidado
-- ---------------------------------------------------------------------
-- Quem já tinha acesso vira responsável (hoje só o cliente de teste); daqui em diante o padrão é equipe.
alter table public.client_members
  add column profile text not null default 'responsavel' check (profile in ('responsavel', 'equipe'));
alter table public.client_members alter column profile set default 'equipe';
alter table public.portal_invites
  add column profile text not null default 'equipe' check (profile in ('responsavel', 'equipe')),
  add column can_approve boolean not null default true;

-- Quem entrou é responsável pelo contrato desta empresa?
create or replace function public._portal_responsavel(p_cliente uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.client_members
                  where client_id = p_cliente and user_id = auth.uid() and profile = 'responsavel');
$$;
revoke all on function public._portal_responsavel(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Apoio: troca de trecho no corpo de uma função (falha se o trecho não existir)
-- ---------------------------------------------------------------------
create or replace function public._cx0_trocar(p_funcao text, p_de text, p_para text)
returns void language plpgsql as $$
declare d text; novo text;
begin
  d := pg_get_functiondef(p_funcao::regprocedure);
  novo := replace(d, p_de, p_para);
  if novo = d then raise exception '%: ponto de troca não encontrado', p_funcao; end if;
  execute novo;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Dinheiro só para o responsável
-- ---------------------------------------------------------------------
-- Pagamentos do portal
select public._cx0_trocar('public.portal_pagamentos(uuid)',
  '  perform public._mensalidades_gerar(t);',
  '  if not public._portal_responsavel(c) then raise exception ''sem_permissao_financeiro'' using errcode = ''42501''; end if;
  perform public._mensalidades_gerar(t);');

-- Avisar que pagou
select public._cx0_trocar('public.portal_cobranca_avisar(uuid)',
  '  if x.status <> ''aberta'' then return jsonb_build_object(''repetido'', true); end if;',
  '  if not public._portal_responsavel(x.client_id) then raise exception ''sem_permissao_financeiro'' using errcode = ''42501''; end if;
  if x.status <> ''aberta'' then return jsonb_build_object(''repetido'', true); end if;');

-- Recibo: dono da agência ou responsável da empresa
select public._cx0_trocar('public.recibo(uuid)',
  'or public.is_client_member(x.client_id))',
  'or (public.is_client_member(x.client_id) and public._portal_responsavel(x.client_id)))');

-- Serviço adicional muda o contrato: só o responsável decide
select public._cx0_trocar('public.portal_adicional_decidir(uuid,boolean,text)',
  '  if not public._portal_pode_aprovar(r.client_id) then',
  '  if not public._portal_responsavel(r.client_id) then raise exception ''sem_permissao_financeiro'' using errcode = ''42501''; end if;
  if not public._portal_pode_aprovar(r.client_id) then');

-- Aprovações: serviços adicionais só aparecem para o responsável
select public._cx0_trocar('public.portal_aprovacoes(uuid)',
  'from public.requests r where r.client_id = c and r.classification = ''adicional''',
  'from public.requests r where r.client_id = c and r.classification = ''adicional'' and public._portal_responsavel(c)');
select public._cx0_trocar('public.portal_aprovacoes(uuid)',
  '''pode_aprovar'', public._portal_pode_aprovar(c),',
  '''pode_aprovar'', public._portal_pode_aprovar(c),
    ''perfil'', case when public._portal_responsavel(c) then ''responsavel'' else ''equipe'' end,');

-- Pedidos de ajuste: a equipe vê o pedido, sem o valor
select public._cx0_trocar('public.portal_pedidos(uuid)',
  '''horas'', r.hours_estimated, ''valor_cents'', r.value_cents, ''nota'', r.owner_note,',
  '''horas'', case when public._portal_responsavel(c) then r.hours_estimated end,
      ''valor_cents'', case when public._portal_responsavel(c) then r.value_cents end,
      ''nota'', case when public._portal_responsavel(c) then r.owner_note end,');

-- ---------------------------------------------------------------------
-- 3. Contador do portal: adicionais e contas só contam para o responsável; contas com 5 dias
-- ---------------------------------------------------------------------
select public._cx0_trocar('public.portal_pendencias(uuid)',
  'select count(*) into ad from public.requests where client_id = c and status = ''aguardando_cliente'';',
  'select count(*) into ad from public.requests where client_id = c and status = ''aguardando_cliente''
     and public._portal_responsavel(c);');
select public._cx0_trocar('public.portal_pendencias(uuid)',
  '     and ch.due_date <= public._hoje(ch.tenant_id) + 3;',
  '     and ch.due_date <= public._hoje(ch.tenant_id) + 5 and public._portal_responsavel(c);');

-- ---------------------------------------------------------------------
-- 4. Início do portal
-- ---------------------------------------------------------------------
select public._cx0_trocar('public.portal_inicio(uuid)',
  '''hoje'', public._hoje(t),',
  '''hoje'', public._hoje(t),
    ''perfil'', case when public._portal_responsavel(c) then ''responsavel'' else ''equipe'' end,
    ''responsavel_whatsapp'', (select nullif(trim(pr.whatsapp), '''')
                     from public.memberships m join public.profiles pr on pr.id = m.user_id
                    where m.tenant_id = t and m.role = ''owner'' order by m.created_at limit 1),');
select public._cx0_trocar('public.portal_inicio(uuid)',
  '''mensal_cents'', p.monthly_cents,',
  '''mensal_cents'', case when public._portal_responsavel(c) then p.monthly_cents end,');
select public._cx0_trocar('public.portal_inicio(uuid)',
  'from public.requests r where r.client_id = c and r.status = ''aguardando_cliente''',
  'from public.requests r where r.client_id = c and r.status = ''aguardando_cliente'' and public._portal_responsavel(c)
        union all
        select jsonb_build_object(''tipo'', ''pagamento'', ''id'', ch.id, ''titulo'', ch.description,
                                  ''valor_cents'', ch.amount_cents, ''vencimento'', ch.due_date,
                                  ''atrasada'', ch.due_date < public._hoje(ch.tenant_id),
                                  ''ordem'', ''4'' || ch.due_date)
          from public.charges ch where ch.client_id = c and ch.status = ''aberta'' and ch.client_reported_at is null
           and ch.due_date <= public._hoje(ch.tenant_id) + 5 and public._portal_responsavel(c)');

-- Empresa e perfil de quem entrou (o portal decide as abas por aqui).
-- Mesma ordem de _portal_cliente(null), para o perfil ser o da empresa que o portal mostra.
create or replace function public.portal_minha_empresa()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'empresa', c.company_name, 'contato', c.contact_name, 'perfil', cm.profile)
    from public.client_members cm join public.clients c on c.id = cm.client_id
   where cm.user_id = auth.uid()
   order by cm.created_at limit 1;
$$;

-- ---------------------------------------------------------------------
-- 5. Convite com perfil; quem aceita entra com o perfil do convite
-- ---------------------------------------------------------------------
drop function public.portal_convidar(uuid, text);
create function public.portal_convidar(p_cliente uuid, p_email text, p_perfil text default 'equipe',
                                       p_pode_aprovar boolean default true)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); v text := lower(trim(coalesce(p_email, ''))); i public.portal_invites;
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if coalesce(p_perfil, '') not in ('responsavel', 'equipe') then raise exception 'perfil_invalido' using errcode = '22023'; end if;
  if v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v) > 160 then raise exception 'email_invalido' using errcode = '22023'; end if;
  if (select count(*) from public.portal_invites where tenant_id = t and created_at > now() - interval '1 day') >= 30 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;
  if exists (select 1 from public.memberships m join auth.users u on u.id = m.user_id
              where lower(u.email) = v and m.role = 'owner' and m.tenant_id = t) then
    raise exception 'email_de_dono' using errcode = '22023';
  end if;
  if exists (select 1 from public.client_members cm join auth.users u on u.id = cm.user_id
              where cm.client_id = p_cliente and lower(u.email) = v) then
    raise exception 'ja_tem_acesso' using errcode = '22023';
  end if;
  -- A empresa começa por quem contratou: sem responsável (nem convite de responsável), a equipe espera
  if p_perfil = 'equipe'
     and not exists (select 1 from public.client_members where client_id = p_cliente and profile = 'responsavel')
     and not exists (select 1 from public.portal_invites where client_id = p_cliente and profile = 'responsavel'
                      and accepted_at is null and canceled_at is null and expires_at > now() and lower(email) <> v) then
    raise exception 'precisa_responsavel' using errcode = '22023';
  end if;
  select * into i from public.portal_invites
   where client_id = p_cliente and lower(email) = v and accepted_at is null and canceled_at is null;
  if i.id is not null then
    update public.portal_invites set expires_at = now() + interval '30 days', profile = p_perfil,
           can_approve = coalesce(p_pode_aprovar, true)
     where id = i.id returning * into i;
  else
    insert into public.portal_invites (tenant_id, client_id, email, invited_by, profile, can_approve)
    values (t, p_cliente, v, auth.uid(), p_perfil, coalesce(p_pode_aprovar, true)) returning * into i;
  end if;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'portal.convite', jsonb_build_object('client_id', p_cliente, 'email', v, 'perfil', p_perfil));
  return jsonb_build_object('id', i.id, 'vale_ate', i.expires_at, 'perfil', i.profile);
end;
$$;

select public._cx0_trocar('public.portal_aceitar_convite()',
  'insert into public.client_members (client_id, user_id, tenant_id) values (i.client_id, auth.uid(), i.tenant_id)',
  'insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve)
      values (i.client_id, auth.uid(), i.tenant_id, i.profile, i.can_approve)');

-- Lista de acessos com perfil e permissão de aprovar
create or replace function public.portal_acessos(p_cliente uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'pessoas', coalesce((select jsonb_agg(jsonb_build_object('user_id', u.id, 'email', u.email, 'desde', cm.created_at,
                  'perfil', cm.profile, 'pode_aprovar', cm.can_approve,
                  'nome', nullif(trim(coalesce(pr.full_name, u.raw_user_meta_data->>'full_name', '')), ''))
                  order by (cm.profile = 'responsavel') desc, cm.created_at)
                from public.client_members cm join auth.users u on u.id = cm.user_id
                left join public.profiles pr on pr.id = cm.user_id
               where cm.client_id = p_cliente), '[]'::jsonb),
    'convites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'enviado_em', i.created_at,
                  'vale_ate', i.expires_at, 'perfil', i.profile, 'pode_aprovar', i.can_approve) order by i.created_at desc)
                from public.portal_invites i where i.client_id = p_cliente and i.accepted_at is null
                 and i.canceled_at is null and i.expires_at > now()), '[]'::jsonb));
end;
$$;

-- Trocar o perfil de quem já tem acesso. A empresa fica sempre com ao menos um responsável.
create or replace function public.portal_acesso_perfil(p_cliente uuid, p_usuario uuid, p_perfil text,
                                                       p_pode_aprovar boolean default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); m public.client_members;
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if coalesce(p_perfil, '') not in ('responsavel', 'equipe') then raise exception 'perfil_invalido' using errcode = '22023'; end if;
  -- Trava a empresa: duas trocas ao mesmo tempo não deixam a empresa sem responsável
  perform 1 from public.clients where id = p_cliente for update;
  select * into m from public.client_members where client_id = p_cliente and user_id = p_usuario for update;
  if m.user_id is null then raise exception 'acesso_inexistente' using errcode = 'P0002'; end if;
  if m.profile = 'responsavel' and p_perfil = 'equipe'
     and not exists (select 1 from public.client_members where client_id = p_cliente and profile = 'responsavel'
                      and user_id <> p_usuario) then
    raise exception 'precisa_responsavel' using errcode = '22023';
  end if;
  update public.client_members
     set profile = p_perfil,
         can_approve = case when p_perfil = 'responsavel' then true else coalesce(p_pode_aprovar, m.can_approve) end
   where client_id = p_cliente and user_id = p_usuario returning * into m;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'portal.perfil_alterado', jsonb_build_object('client_id', p_cliente, 'perfil', m.profile,
          'pode_aprovar', m.can_approve));
  return jsonb_build_object('perfil', m.profile, 'pode_aprovar', m.can_approve);
end;
$$;

-- Tirar acesso não remove o último responsável enquanto houver equipe na empresa
select public._cx0_trocar('public.portal_acesso_remover(uuid,uuid)',
  '  delete from public.client_members where client_id = p_cliente and user_id = p_usuario;',
  '  perform 1 from public.clients where id = p_cliente for update;
  if exists (select 1 from public.client_members where client_id = p_cliente and user_id = p_usuario and profile = ''responsavel'')
     and not exists (select 1 from public.client_members where client_id = p_cliente and profile = ''responsavel''
                      and user_id <> p_usuario)
     and exists (select 1 from public.client_members where client_id = p_cliente and user_id <> p_usuario) then
    raise exception ''precisa_responsavel'' using errcode = ''22023'';
  end if;
  delete from public.client_members where client_id = p_cliente and user_id = p_usuario;');

drop function public._cx0_trocar(text, text, text);

revoke all on function public.portal_convidar(uuid, text, text, boolean) from public, anon;
revoke all on function public.portal_acesso_perfil(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.portal_convidar(uuid, text, text, boolean) to authenticated;
grant execute on function public.portal_acesso_perfil(uuid, uuid, text, boolean) to authenticated;
