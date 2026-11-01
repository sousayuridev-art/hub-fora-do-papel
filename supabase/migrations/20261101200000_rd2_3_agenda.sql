-- =====================================================================
-- RD2-3 · Reuniões como agenda da semana (docs/cards/RD2-3-reunioes-agenda.md)
-- A função reunioes-google lê a Google Agenda; o banco liga cada evento ao
-- que o Hub sabe (reunião gravada, cliente, oportunidade e proposta).
-- =====================================================================

-- Permissão cifrada da agência, sem travar a busca automática (só o servidor)
create or replace function public.google_conexao_ler(p_tenant uuid)
returns table (tenant_id uuid, google_email text, token_cipher text)
language sql stable security definer set search_path = public as $$
  select g.tenant_id, g.google_email, g.token_cipher
    from public.google_connections g
   where g.tenant_id = p_tenant and g.status = 'ligada';
$$;
revoke all on function public.google_conexao_ler(uuid) from public, anon, authenticated;
grant execute on function public.google_conexao_ler(uuid) to service_role;

-- Liga os eventos da agenda ao Hub. Entrada: [{"id": "...", "emails": ["a@b.com", ...]}] (até 200)
-- Saída: {"<id>": {reuniao_id, cliente, deal, proposta, ultima_reuniao}}
create or replace function public.agenda_ligar(p_eventos jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  e jsonb;
  v_id text;
  v_emails text[];
  m public.meetings;
  c public.clients;
  d public.deals;
  pr public.proposals;
  v_ultima timestamptz;
  saida jsonb := '{}'::jsonb;
begin
  if p_eventos is null or jsonb_typeof(p_eventos) <> 'array' or jsonb_array_length(p_eventos) > 200 then
    raise exception 'eventos_invalidos' using errcode = '22023';
  end if;

  for e in select * from jsonb_array_elements(p_eventos) loop
    v_id := left(e ->> 'id', 1024);
    if v_id is null or v_id = '' then continue; end if;
    select coalesce(array_agg(lower(trim(x))), '{}') into v_emails
      from (select jsonb_array_elements_text(coalesce(e -> 'emails', '[]'::jsonb)) as x limit 50) s;

    m := null; c := null; d := null; pr := null; v_ultima := null;

    -- 1. Reunião já gravada com este evento
    select * into m from public.meetings
     where tenant_id = t and calendar_event_id = v_id
     order by started_at desc limit 1;

    -- 2. Cliente: o da reunião gravada; senão, o primeiro convidado cadastrado
    if m.client_id is not null then
      select * into c from public.clients where id = m.client_id and tenant_id = t;
    end if;
    if c.id is null and array_length(v_emails, 1) > 0 then
      select * into c from public.clients
       where tenant_id = t and email is not null and lower(email) = any (v_emails)
       order by last_activity_at desc nulls last limit 1;
    end if;

    if c.id is not null then
      -- Oportunidade: a da reunião; senão a aberta mais recente do cliente
      if m.deal_id is not null then
        select * into d from public.deals where id = m.deal_id and tenant_id = t;
      end if;
      if d.id is null then
        select * into d from public.deals
         where client_id = c.id and tenant_id = t and archived_at is null and stage <> 'fechado'
         order by updated_at desc limit 1;
      end if;
      if d.id is not null then
        select * into pr from public.proposals where deal_id = d.id order by created_at desc limit 1;
      end if;
      select max(started_at) into v_ultima from public.meetings
       where tenant_id = t and client_id = c.id and started_at < now()
         and calendar_event_id is distinct from v_id;
    end if;

    saida := saida || jsonb_build_object(v_id, jsonb_build_object(
      'reuniao_id', m.id,
      'reuniao_situacao', m.status,
      'cliente', case when c.id is null then null
                      else jsonb_build_object('id', c.id, 'nome', c.company_name, 'contato', c.contact_name) end,
      'deal', case when d.id is null then null
                   else jsonb_build_object('id', d.id, 'etapa', d.stage, 'valor_cents', d.value_cents,
                                           'proximo_passo', d.next_step, 'quando', d.next_step_at) end,
      'proposta', case when pr.id is null then null
                       else jsonb_build_object('status', pr.status, 'versao', pr.version,
                                               'enviada_em', pr.sent_at, 'vista_em', pr.viewed_at,
                                               'total_cents', pr.total_cents) end,
      'ultima_reuniao', v_ultima));
  end loop;
  return saida;
end;
$$;
revoke all on function public.agenda_ligar(jsonb) from public, anon;
grant execute on function public.agenda_ligar(jsonb) to authenticated;
