-- =====================================================================
-- Hub Fora do Papel · REV-1 · Revisão geral (16/10)
-- Card: docs/cards/REV-1-revisao-geral.md
-- 1. Segurança: papéis só por convite, clientes só por RPC, aceite preso à versão vista,
--    limite de envios do site, nota do site não entra em ficha existente, portal sem campos internos.
-- 2. Regras: oportunidade fechada por aceite não reabre; arquivar retira a proposta enviada.
-- 3. Preços precisam ser conferidos antes do primeiro envio.
-- 4. Painel: novidades (cliente e site), fechado no mês e propostas aguardando.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1.1 Pessoas e papéis: ninguém se dá papel nem dá papel a outro pelo app (P1)
-- ---------------------------------------------------------------------
drop policy if exists memberships_owner_all on public.memberships;
create policy memberships_owner_select on public.memberships
  for select to authenticated using (public.is_tenant_owner(tenant_id));
drop policy if exists client_members_owner_all on public.client_members;
create policy client_members_owner_select on public.client_members
  for select to authenticated using (public.is_tenant_owner(tenant_id));
revoke insert, update, delete, truncate on public.memberships, public.client_members, public.tenants from authenticated;
revoke insert, delete, truncate on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, whatsapp) on public.profiles to authenticated;

-- Dono de mais de uma empresa precisa escolher: nunca cair na errada em silêncio
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
  return v;
end;
$$;
revoke all on function public._tenant_do_dono() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 1.2 Clientes: escrita só pelas RPCs (que gravam linha do tempo); nada apaga em cascata o aceite (P2)
-- ---------------------------------------------------------------------
drop policy if exists clients_owner_all on public.clients;
create policy clients_owner_select on public.clients
  for select to authenticated using (public.is_tenant_owner(tenant_id));
revoke insert, update, delete, truncate on public.clients from authenticated;

alter table public.proposals drop constraint proposals_client_id_fkey,
  add constraint proposals_client_id_fkey foreign key (client_id) references public.clients (id) on delete restrict;
alter table public.proposals drop constraint proposals_deal_id_fkey,
  add constraint proposals_deal_id_fkey foreign key (deal_id) references public.deals (id) on delete restrict;

-- Portal: o cliente não lê mais a tabela inteira (origem, indicação, anúncio são internos)
drop policy if exists clients_member_select on public.clients;
create or replace function public.portal_minha_empresa()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'empresa', c.company_name, 'contato', c.contact_name)
    from public.clients c
   where public.is_client_member(c.id)
   order by c.created_at limit 1;
$$;
revoke all on function public.portal_minha_empresa() from public, anon;
grant execute on function public.portal_minha_empresa() to authenticated;

-- ---------------------------------------------------------------------
-- 1.3 Permissões que sobraram (P2/P3)
-- ---------------------------------------------------------------------
revoke all on public.site_contatos from anon;
revoke insert, update, delete, truncate on public.site_contatos from authenticated;
revoke insert, update, delete, truncate on public.v_funil, public.v_clientes, public.v_propostas from authenticated;
revoke execute on function public.is_tenant_owner(uuid), public.is_tenant_member(uuid),
  public.is_client_member(uuid), public.my_access() from anon;
revoke execute on function public._cabecalho(text), public._documento_valido(text) from public, anon, authenticated;

create index if not exists proposals_deal_idx on public.proposals (deal_id);
create index if not exists proposals_plan_idx on public.proposals (plan_id);

-- ---------------------------------------------------------------------
-- 1.4 Formulário do site: limite por agência e por endereço (P1)
-- ---------------------------------------------------------------------
alter table public.site_contatos add column if not exists ip text;

-- Endereço de quem chamou: Cloudflare primeiro; senão o último salto do x-forwarded-for (o que o proxy viu)
create or replace function public._ip_cliente()
returns text language sql stable as $$
  select left(coalesce(
    nullif(public._cabecalho('cf-connecting-ip'), ''),
    nullif(trim(reverse(split_part(reverse(coalesce(public._cabecalho('x-forwarded-for'), '')), ',', 1))), '')), 64);
$$;
revoke all on function public._ip_cliente() from public, anon, authenticated;

create or replace function public.site_contatos_limite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.ip := public._ip_cliente();
  if (select count(*) from public.site_contatos
       where tenant_id = new.tenant_id and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;
  if new.ip is not null and (select count(*) from public.site_contatos
       where ip = new.ip and created_at > now() - interval '1 hour') >= 8 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;
  if new.horario_sugerido is not null and new.horario_sugerido > now() + interval '120 days' then
    raise exception 'horario_invalido' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.site_contatos_limite() from public, anon, authenticated;
create trigger site_contatos_limite before insert on public.site_contatos
  for each row execute function public.site_contatos_limite();
create index if not exists site_contatos_ip_idx on public.site_contatos (ip, created_at) where ip is not null;

-- ---------------------------------------------------------------------
-- 1.5 Pedido do site para quem já é cliente: vira evento, não anotação (P2)
--     Qualquer pessoa pode digitar o e-mail de um cliente; o texto não entra na ficha como nota.
-- ---------------------------------------------------------------------
create or replace function public._site_contato_para_funil_registro(s public.site_contatos)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dig     text := nullif(regexp_replace(coalesce(s.whatsapp, ''), '\D', '', 'g'), '');
  v_wpp_ok  boolean := v_dig is not null and length(v_dig) between 10 and 13;
  v_client  uuid;
  v_deal    uuid;
  v_novo    boolean := false;
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
    v_quando := ((now() at time zone v_tz)::date + time '12:00')::timestamp at time zone v_tz;

    select id into v_client from public.clients
     where tenant_id = s.tenant_id
       and (lower(email) = lower(s.email) or (v_wpp_ok and whatsapp_digits = v_dig))
     order by created_at limit 1;

    if v_client is null then
      v_novo := true;
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
    end if;

    insert into public.deal_events (tenant_id, client_id, deal_id, kind, detail, source)
    values (s.tenant_id, v_client, v_deal, 'pedido_do_site',
            jsonb_build_object('tipo', s.tipo, 'assunto', s.assunto, 'mensagem', left(s.mensagem, 500),
                               'horario', s.horario_sugerido, 'porte', s.porte,
                               'nao_verificado', not v_novo), 'site');
    if v_novo and (s.assunto is not null or s.mensagem is not null) then
      insert into public.client_notes (tenant_id, client_id, body)
      values (s.tenant_id, v_client,
              'Pedido do site' || coalesce(' · ' || s.assunto, '') || coalesce(E'\n' || left(s.mensagem, 3500), ''));
    end if;
    update public.clients set last_activity_at = now() where id = v_client;
  exception when others then
    insert into public.event_outbox (tenant_id, event, payload, last_error)
    values (s.tenant_id, 'funil.falha_ao_importar_site', jsonb_build_object('contato_id', s.id), sqlerrm);
  end;
end;
$$;
revoke all on function public._site_contato_para_funil_registro(public.site_contatos) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Regras do funil × propostas (P2)
-- ---------------------------------------------------------------------
-- Fechada por aceite do cliente não volta para etapa aberta (o aceite é um contrato)
create or replace function public.deals_protege_aceite()
returns trigger language plpgsql as $$
begin
  if old.stage = 'fechado' and new.stage <> 'fechado'
     and exists (select 1 from public.proposals p where p.deal_id = old.id and p.status = 'aceita') then
    raise exception 'oportunidade_fechada_por_aceite' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger deals_protege_aceite before update of stage on public.deals
  for each row execute function public.deals_protege_aceite();

-- Arquivar retira a proposta enviada: o link deixa de aceitar
create or replace function public.deals_retira_proposta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update public.proposals set status = 'recusada', refused_at = now(),
           refused_reason = 'Retirada ao arquivar a oportunidade'
     where deal_id = new.id and status = 'enviada';
  end if;
  return new;
end;
$$;
revoke all on function public.deals_retira_proposta() from public, anon, authenticated;
create trigger deals_retira_proposta after update of archived_at on public.deals
  for each row execute function public.deals_retira_proposta();

-- ---------------------------------------------------------------------
-- 3. Aceite preso à versão que o cliente viu (P1) + IP confiável + próximo passo do Yuri
-- ---------------------------------------------------------------------
drop function public.proposta_aceitar(text, text, text, text, text, text, text, text, boolean);

create function public.proposta_aceitar(
  p_token           text,
  p_versao          integer,
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
  p public.proposals; d public.deals; v_de public.deal_stage; v_tz text;
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
  if p_versao is distinct from p.version then
    raise exception 'proposta_mudou' using errcode = 'PT409';
  end if;
  if p.expires_at < now() then
    raise exception 'proposta_vencida' using errcode = '22023';
  end if;
  if not coalesce(p_concordo, false) then
    raise exception 'concordo_obrigatorio' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_nome, ''))) < 3 or length(p_nome) > 120 then raise exception 'nome_invalido' using errcode = '22023'; end if;
  if v_email !~ v_reg or v_cobranca !~ v_reg or length(v_email) > 160 or length(v_cobranca) > 160 then
    raise exception 'email_invalido' using errcode = '22023';
  end if;
  if not public._documento_valido(v_doc) then raise exception 'documento_invalido' using errcode = '22023'; end if;
  if length(trim(coalesce(p_razao_social, ''))) < 3 or length(p_razao_social) > 160 then raise exception 'razao_social_invalida' using errcode = '22023'; end if;
  if length(trim(coalesce(p_endereco, ''))) < 8 or length(p_endereco) > 300 then raise exception 'endereco_invalido' using errcode = '22023'; end if;

  select * into d from public.deals where id = p.deal_id for update;
  if d.archived_at is not null then
    raise exception 'proposta_indisponivel' using errcode = '22023';
  end if;
  select timezone into v_tz from public.tenants where id = p.tenant_id;

  update public.proposals set
    status = 'aceita', accepted_at = now(),
    accept_data = jsonb_build_object(
      'nome', trim(p_nome), 'email', v_email,
      'documento_tipo', case when length(v_doc) = 11 then 'cpf' else 'cnpj' end, 'documento', v_doc,
      'razao_social', trim(p_razao_social), 'endereco', trim(p_endereco),
      'email_cobranca', v_cobranca,
      'responsavel', left(trim(coalesce(nullif(trim(p_responsavel), ''), p_nome)), 120),
      'versao', p.version, 'total_cents', p.total_cents,
      'navegador', public._cabecalho('user-agent'),
      'endereco_ip', public._ip_cliente())
  where id = p.id returning * into p;

  update public.clients set
    document_type = p.accept_data->>'documento_tipo', document_number = v_doc,
    legal_name = p.accept_data->>'razao_social', address = p.accept_data->>'endereco',
    billing_email = p.accept_data->>'email_cobranca', legal_responsible = p.accept_data->>'responsavel',
    email = coalesce(email, v_email),
    client_since = coalesce(client_since, (now() at time zone v_tz)::date)
  where id = p.client_id;

  v_de := d.stage;
  -- Próximo passo registrado na ficha; o Painel mostra o aceite em "Novidades"
  update public.deals set stage = 'fechado', closed_at = now(), stage_changed_at = now(),
    value_cents = p.total_cents,
    next_step = 'Combinar o início e a 1ª cobrança',
    next_step_at = public._no_fuso(tenant_id, (now() at time zone v_tz)::date, null),
    next_step_has_time = false
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
revoke all on function public.proposta_aceitar(text, integer, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.proposta_aceitar(text, integer, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Preços conferidos antes do primeiro envio
-- ---------------------------------------------------------------------
alter table public.pricing_settings add column if not exists confirmed_at timestamptz;

create or replace function public.precos_marca_conferido()
returns trigger language plpgsql as $$
begin
  new.confirmed_at := now();
  return new;
end;
$$;
-- precos_salvar faz update na linha: salvar = conferir
create trigger pricing_settings_conferido before update on public.pricing_settings
  for each row execute function public.precos_marca_conferido();

-- Pendência nova na conta: preços nunca salvos em Configurações
create or replace function public._proposta_pendencia_precos(p public.proposals)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when (select confirmed_at from public.pricing_settings where tenant_id = p.tenant_id) is null
    then jsonb_build_array(jsonb_build_object('chave', 'precos', 'acao', 'conferir os preços em Configurações'))
    else '[]'::jsonb end;
$$;
revoke all on function public._proposta_pendencia_precos(public.proposals) from public, anon, authenticated;

do $$
declare src text;
begin
  -- Acrescenta a pendência de preços na conta existente, sem reescrever a função inteira
  select pg_get_functiondef('public._proposta_calcular(public.proposals)'::regprocedure) into src;
  if position('_proposta_pendencia_precos' in src) = 0 then
    src := replace(src,
      'if not coalesce((p.checks->>''escopo'')::boolean, false) then',
      'v_pend := v_pend || public._proposta_pendencia_precos(p);
  if not coalesce((p.checks->>''escopo'')::boolean, false) then');
    execute src;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Painel: novidades e números de fechamento
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
        select jsonb_build_object(
          'tipo', e.kind, 'quando', e.created_at, 'client_id', e.client_id,
          'empresa', c.company_name, 'detalhe', e.detail) as x
          from public.deal_events e join public.clients c on c.id = e.client_id
         where e.tenant_id = t and e.created_at > now() - interval '7 days'
           and e.kind in ('proposta_vista', 'proposta_aceita', 'proposta_recusada', 'pedido_do_site')
         order by e.created_at desc limit 12) q), '[]'::jsonb),
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
        where tenant_id = t and event = 'funil.falha_ao_importar_site' and occurred_at > now() - interval '30 days')
  );
end;
$$;
revoke all on function public.painel_novidades() from public, anon;
grant execute on function public.painel_novidades() to authenticated;

-- ---------------------------------------------------------------------
-- 6. "Precisa de você hoje" com o dia no fuso da agência (a tela não calcula datas)
-- ---------------------------------------------------------------------
create or replace function public.painel_hoje()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
               'deal_id', id, 'client_id', client_id, 'empresa', company_name, 'contato', contact_name,
               'whatsapp', whatsapp, 'etapa', stage, 'proximo_passo', next_step, 'quando', next_step_at,
               'dia', next_step_date, 'hoje', hoje,
               'com_hora', next_step_has_time, 'vencido', vencido, 'valor_cents', value_cents)
             order by vencido desc, next_step_at)
        from public.v_funil
       where archived_at is null and stage <> 'fechado' and next_step_date <= hoje), '[]'::jsonb),
    'resumo', public.funil_resumo('todos')
  );
$$;
