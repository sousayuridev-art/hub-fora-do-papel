-- =====================================================================
-- Hub Fora do Papel · RE-1 · Reuniões no Hub
-- Card: docs/cards/RE-1-reunioes-no-hub.md
-- Reuniões do Google Meet (com transcrição) ligadas a cliente, oportunidade e projeto.
-- Só o dono da agência lê; quem grava é a função de servidor `reunioes-google`
-- (service_role) pelas RPCs abaixo. A permissão do Google fica cifrada e nunca
-- é legível pelo app.
-- =====================================================================

create type public.meeting_status as enum ('aguardando_transcricao', 'transcrita', 'sem_transcricao');
create type public.meeting_link as enum ('email', 'manual');

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------
create table public.meetings (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  conference_record  text not null check (conference_record ~ '^conferenceRecords/[A-Za-z0-9_-]{1,120}$'),
  meeting_code       text check (meeting_code is null or length(meeting_code) <= 40),
  calendar_event_id  text check (calendar_event_id is null or length(calendar_event_id) <= 1024),
  title              text not null check (length(trim(title)) between 1 and 200),
  started_at         timestamptz not null,
  ended_at           timestamptz,
  attendees          jsonb not null default '[]'::jsonb
                     check (jsonb_typeof(attendees) = 'array' and jsonb_array_length(attendees) <= 200),
  status             public.meeting_status not null default 'aguardando_transcricao',
  transcript_name    text check (transcript_name is null or length(transcript_name) <= 300),
  client_id          uuid references public.clients (id) on delete set null,
  deal_id            uuid references public.deals (id) on delete set null,
  project_id         uuid references public.projects (id) on delete set null,
  linked_by          public.meeting_link,
  linked_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tenant_id, conference_record),
  constraint meetings_deal_com_cliente check (deal_id is null or client_id is not null),
  constraint meetings_projeto_com_cliente check (project_id is null or client_id is not null)
);
create index meetings_tenant_idx on public.meetings (tenant_id, started_at desc);
create index meetings_client_idx on public.meetings (client_id, started_at desc) where client_id is not null;
create index meetings_sem_cliente_idx on public.meetings (tenant_id) where client_id is null;
create index meetings_deal_idx on public.meetings (deal_id) where deal_id is not null;
create index meetings_project_idx on public.meetings (project_id) where project_id is not null;
create trigger meetings_touch before update on public.meetings for each row execute function public.touch_updated_at();

-- Falas separadas da reunião: a lista não carrega o texto inteiro.
-- entries: [{"quem": "Yuri Sousa", "seg": 4, "texto": "..."}]
create table public.meeting_transcripts (
  meeting_id  uuid primary key references public.meetings (id) on delete cascade,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  entries     jsonb not null check (jsonb_typeof(entries) = 'array' and jsonb_array_length(entries) <= 20000),
  language    text check (language is null or length(language) <= 20),
  created_at  timestamptz not null default now()
);
create index meeting_transcripts_tenant_idx on public.meeting_transcripts (tenant_id);

-- Permissão do Google (uma por agência). token_cipher = token de renovação cifrado
-- (AES-GCM) pela função de servidor; a chave nunca entra no banco.
create table public.google_connections (
  tenant_id        uuid primary key references public.tenants (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  google_email     text not null check (length(google_email) between 3 and 320),
  token_cipher     text not null check (length(token_cipher) between 20 and 4000),
  status           text not null default 'ligada' check (status in ('ligada', 'religar')),
  last_sync_at     timestamptz,
  last_attempt_at  timestamptz,
  sync_started_at  timestamptz,
  last_error       text check (last_error is null or length(last_error) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger google_connections_touch before update on public.google_connections for each row execute function public.touch_updated_at();

-- Pedido de ligação (vence em 10 minutos), em duas etapas:
-- 1. o Google volta com o `state`: a função guarda a permissão cifrada aqui e gera `confirm_code`;
-- 2. o Hub confirma com o login de quem pediu (google_confirmar). Só então vira conexão.
-- Assim, uma permissão dada no navegador de outra pessoa nunca entra na agência errada.
create table public.google_oauth_states (
  state         text primary key check (state ~ '^[a-f0-9]{64}$'),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  return_to     text not null check (length(return_to) <= 200),
  google_email  text check (google_email is null or length(google_email) between 3 and 320),
  token_cipher  text check (token_cipher is null or length(token_cipher) between 20 and 4000),
  confirm_code  text unique check (confirm_code is null or confirm_code ~ '^[a-f0-9]{64}$'),
  expires_at    timestamptz not null default now() + interval '10 minutes',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. RLS: dono lê reuniões e falas; conexão e códigos só o servidor
-- ---------------------------------------------------------------------
alter table public.meetings            enable row level security;
alter table public.meeting_transcripts enable row level security;
alter table public.google_connections  enable row level security;
alter table public.google_oauth_states enable row level security;

create policy meetings_owner_select on public.meetings
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy meeting_transcripts_owner_select on public.meeting_transcripts
  for select to authenticated using (public.is_tenant_owner(tenant_id));

revoke all on public.meetings, public.meeting_transcripts from anon;
revoke insert, update, delete, truncate on public.meetings, public.meeting_transcripts from authenticated;
revoke all on public.google_connections, public.google_oauth_states from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Auxiliares
-- ---------------------------------------------------------------------
-- Liga a reunião ao cliente pelos e-mails dos convidados (fora os da agência).
-- Só liga quando há exatamente um cliente; oportunidade e projeto só quando únicos.
create or replace function public._reuniao_ligar_por_email(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r public.meetings;
  emails text[];
  cands uuid[];
  v_deal uuid;
  v_proj uuid;
begin
  select * into r from public.meetings where id = p_id for update;
  if r.client_id is not null or r.linked_by is not null then return r.client_id; end if;

  select coalesce(array_agg(distinct lower(trim(a ->> 'email'))), '{}') into emails
    from jsonb_array_elements(r.attendees) a
   where coalesce(trim(a ->> 'email'), '') <> ''
     and lower(trim(a ->> 'email')) not in (
       select lower(u.email) from public.memberships m join auth.users u on u.id = m.user_id
        where m.tenant_id = r.tenant_id and m.role = 'owner' and u.email is not null
       union
       select lower(g.google_email) from public.google_connections g where g.tenant_id = r.tenant_id);
  if cardinality(emails) = 0 then return null; end if;

  select array_agg(distinct x.id) into cands from (
    select c.id from public.clients c
     where c.tenant_id = r.tenant_id
       and (lower(trim(c.email)) = any (emails) or lower(trim(c.billing_email)) = any (emails))
    union
    select cm.client_id from public.client_members cm join auth.users u on u.id = cm.user_id
     where cm.tenant_id = r.tenant_id and lower(u.email) = any (emails)
  ) x;
  if coalesce(cardinality(cands), 0) <> 1 then return null; end if;

  select case when count(*) = 1 then min(d.id::text)::uuid end into v_deal
    from public.deals d where d.client_id = cands[1] and d.tenant_id = r.tenant_id and d.archived_at is null;
  select case when count(*) = 1 then min(p.id::text)::uuid end into v_proj
    from public.projects p where p.client_id = cands[1] and p.tenant_id = r.tenant_id
     and p.status in ('andamento', 'mensalidade');

  update public.meetings
     set client_id = cands[1], deal_id = v_deal, project_id = v_proj, linked_by = 'email', linked_at = now()
   where id = p_id;
  update public.clients set last_activity_at = now() where id = cands[1];
  insert into public.event_outbox (tenant_id, event, payload)
  values (r.tenant_id, 'reuniao.vinculada', jsonb_build_object(
    'meeting_id', p_id, 'client_id', cands[1], 'deal_id', v_deal, 'project_id', v_proj, 'por', 'email'));
  return cands[1];
end;
$$;

create or replace function public._reuniao_json(m public.meetings)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', m.id,
    'titulo', m.title,
    'inicio', m.started_at,
    'fim', m.ended_at,
    'situacao', m.status,
    'codigo', m.meeting_code,
    'convidados', jsonb_array_length(m.attendees),
    'vinculo', m.linked_by,
    'cliente', (select jsonb_build_object('id', c.id, 'nome', c.company_name)
                  from public.clients c where c.id = m.client_id),
    'deal_id', m.deal_id,
    'projeto', (select jsonb_build_object('id', p.id, 'nome', p.name)
                  from public.projects p where p.id = m.project_id));
$$;

revoke all on function public._reuniao_ligar_por_email(uuid) from public, anon, authenticated;
revoke all on function public._reuniao_json(public.meetings) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. RPCs do dono (Hub)
-- ---------------------------------------------------------------------
-- Situação da ligação com o Google (sem o token).
create or replace function public.google_situacao()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); g public.google_connections;
begin
  select * into g from public.google_connections where tenant_id = t;
  return jsonb_build_object(
    'tenant_id', t,
    'ligada', g.tenant_id is not null,
    'email', g.google_email,
    'situacao', g.status,
    'ultima_busca', g.last_sync_at,
    'erro', g.last_error);
end;
$$;

-- Cria o código de uso único para ligar o Google. p_volta = origem do Hub para onde voltar.
create or replace function public.google_estado_criar(p_volta text)
returns text language plpgsql security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s text;
begin
  if p_volta is null or not (
       p_volta ~ '^https://spring-board-kit\.lovable\.app$'
    or p_volta ~ '^https://([a-z0-9-]+\.)*foradopapel\.com\.br$'
    or p_volta ~ '^http://(localhost|127\.0\.0\.1):[0-9]{2,5}$') then
    raise exception 'volta_invalida' using errcode = '22023';
  end if;
  delete from public.google_oauth_states where expires_at < now() or (tenant_id = t and user_id = auth.uid());
  s := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.google_oauth_states (state, tenant_id, user_id, return_to) values (s, t, auth.uid(), p_volta);
  return s;
end;
$$;

-- Lista de reuniões. p_filtro: 'todas' | 'sem_cliente' | 'sem_transcricao'. p_cliente: só as de um cliente.
create or replace function public.reunioes_listar(p_filtro text default 'todas', p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  if coalesce(p_filtro, 'todas') not in ('todas', 'sem_cliente', 'sem_transcricao') then
    raise exception 'filtro_invalido' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'itens', coalesce((
      select jsonb_agg(public._reuniao_json(m) order by m.started_at desc)
        from (select * from public.meetings m
               where m.tenant_id = t
                 and (p_cliente is null or m.client_id = p_cliente)
                 and (coalesce(p_filtro, 'todas') = 'todas'
                      or (p_filtro = 'sem_cliente' and m.client_id is null)
                      or (p_filtro = 'sem_transcricao' and m.status = 'sem_transcricao'))
               order by m.started_at desc limit 500) m), '[]'::jsonb),
    'sem_cliente', (select count(*) from public.meetings where tenant_id = t and client_id is null),
    'sem_transcricao', (select count(*) from public.meetings where tenant_id = t and status = 'sem_transcricao'));
end;
$$;

-- Uma reunião com convidados e falas.
create or replace function public.reuniao_abrir(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); m public.meetings;
begin
  select * into m from public.meetings where id = p_id and tenant_id = t;
  if m.id is null then raise exception 'nao_encontrada' using errcode = 'P0002'; end if;
  return public._reuniao_json(m) || jsonb_build_object(
    'lista_convidados', m.attendees,
    'falas', coalesce((select entries from public.meeting_transcripts where meeting_id = m.id), '[]'::jsonb),
    'idioma', (select language from public.meeting_transcripts where meeting_id = m.id));
end;
$$;

-- Liga (ou desliga, com p_cliente nulo) a reunião a cliente, oportunidade e projeto.
create or replace function public.reuniao_vincular(p_id uuid, p_cliente uuid, p_deal uuid default null, p_projeto uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); m public.meetings;
begin
  select * into m from public.meetings where id = p_id and tenant_id = t for update;
  if m.id is null then raise exception 'nao_encontrada' using errcode = 'P0002'; end if;
  if p_cliente is null and (p_deal is not null or p_projeto is not null) then
    raise exception 'precisa_cliente' using errcode = '22023';
  end if;
  if p_cliente is not null and not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_invalido' using errcode = '22023';
  end if;
  if p_deal is not null and not exists (
       select 1 from public.deals where id = p_deal and tenant_id = t and client_id = p_cliente) then
    raise exception 'oportunidade_invalida' using errcode = '22023';
  end if;
  if p_projeto is not null and not exists (
       select 1 from public.projects where id = p_projeto and tenant_id = t and client_id = p_cliente) then
    raise exception 'projeto_invalido' using errcode = '22023';
  end if;

  update public.meetings
     set client_id = p_cliente, deal_id = p_deal, project_id = p_projeto, linked_by = 'manual', linked_at = now()
   where id = p_id
  returning * into m;
  if p_cliente is not null then
    update public.clients set last_activity_at = now() where id = p_cliente;
  end if;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'reuniao.vinculada', jsonb_build_object(
    'meeting_id', p_id, 'client_id', p_cliente, 'deal_id', p_deal, 'project_id', p_projeto, 'por', 'manual'));
  return public._reuniao_json(m);
end;
$$;

-- Etapa 2 da ligação: só quem pediu confirma, e só se ainda for dono da agência.
create or replace function public.google_confirmar(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.google_oauth_states;
begin
  select * into s from public.google_oauth_states
   where confirm_code = p_codigo and token_cipher is not null for update;
  if s.state is null or s.expires_at < now() or s.user_id <> auth.uid() or s.tenant_id <> t then
    raise exception 'pedido_invalido' using errcode = '22023';
  end if;
  insert into public.google_connections (tenant_id, user_id, google_email, token_cipher, status)
  values (s.tenant_id, s.user_id, s.google_email, s.token_cipher, 'ligada')
  on conflict (tenant_id) do update
     set user_id = excluded.user_id, google_email = excluded.google_email, token_cipher = excluded.token_cipher,
         status = 'ligada', last_error = null, sync_started_at = null, last_attempt_at = null;
  delete from public.google_oauth_states where state = s.state;
  insert into public.event_outbox (tenant_id, event, payload)
  values (s.tenant_id, 'google.ligado', jsonb_build_object('email', s.google_email));
  return jsonb_build_object('email', s.google_email);
end;
$$;

revoke all on function public.google_situacao() from public, anon;
revoke all on function public.google_confirmar(text) from public, anon;
grant execute on function public.google_confirmar(text) to authenticated;
revoke all on function public.google_estado_criar(text) from public, anon;
revoke all on function public.reunioes_listar(text, uuid) from public, anon;
revoke all on function public.reuniao_abrir(uuid) from public, anon;
revoke all on function public.reuniao_vincular(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.google_situacao() to authenticated;
grant execute on function public.google_estado_criar(text) to authenticated;
grant execute on function public.reunioes_listar(text, uuid) to authenticated;
grant execute on function public.reuniao_abrir(uuid) to authenticated;
grant execute on function public.reuniao_vincular(uuid, uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. RPCs do servidor (só service_role)
-- ---------------------------------------------------------------------
-- Etapa 1 da ligação: lê o pedido (sem gastar) para a função saber a agência e a volta.
create or replace function public.google_estado_ler(p_state text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.google_oauth_states;
begin
  select * into s from public.google_oauth_states where state = p_state;
  if s.state is null or s.expires_at < now() or s.token_cipher is not null then return null; end if;
  return jsonb_build_object('tenant_id', s.tenant_id, 'volta', s.return_to);
end;
$$;

-- Guarda a permissão cifrada no pedido e devolve o código que o Hub usa para confirmar (uma vez só).
create or replace function public.google_estado_guardar(p_state text, p_email text, p_cifra text)
returns text language plpgsql security definer set search_path = public as $$
declare c text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  update public.google_oauth_states
     set google_email = lower(trim(p_email)), token_cipher = p_cifra, confirm_code = c
   where state = p_state and expires_at > now() and token_cipher is null;
  if not found then return null; end if;
  return c;
end;
$$;

-- Reserva conexões para buscar (trava de 5 minutos contra buscas paralelas).
-- p_tenant nulo = busca automática: só quem não TENTOU nos últimos 10 minutos (com ou sem erro).
-- p_tenant informado = "Buscar agora": no máximo uma tentativa por minuto.
create or replace function public.google_conexoes_reservar(p_tenant uuid default null)
returns table (tenant_id uuid, google_email text, token_cipher text, last_sync_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.google_connections g
     set sync_started_at = now(), last_attempt_at = now()
   where g.status = 'ligada'
     and (g.sync_started_at is null or g.sync_started_at < now() - interval '5 minutes')
     and ((p_tenant is null and (g.last_attempt_at is null or g.last_attempt_at < now() - interval '10 minutes'))
       or (g.tenant_id = p_tenant and (g.last_attempt_at is null or g.last_attempt_at < now() - interval '1 minute')))
  returning g.tenant_id, g.google_email, g.token_cipher, g.last_sync_at;
end;
$$;

-- p_avancar = falso quando a busca parou no limite de reuniões: a próxima continua da mesma janela.
create or replace function public.google_busca_concluir(p_tenant uuid, p_ok boolean, p_erro text default null,
                                                        p_religar boolean default false, p_avancar boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.google_connections
     set sync_started_at = null,
         last_sync_at = case when p_ok and p_avancar then now() else last_sync_at end,
         last_error = case when p_ok then null else left(p_erro, 500) end,
         status = case when p_religar then 'religar' else status end
   where tenant_id = p_tenant;
  if p_religar then
    insert into public.event_outbox (tenant_id, event, payload)
    values (p_tenant, 'google.religar', jsonb_build_object('erro', left(p_erro, 200)));
  end if;
end;
$$;

-- Remove a conexão e devolve o token cifrado para a função revogar no Google.
create or replace function public.google_conexao_remover(p_tenant uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  delete from public.google_connections where tenant_id = p_tenant returning token_cipher into c;
  if c is not null then
    insert into public.event_outbox (tenant_id, event, payload) values (p_tenant, 'google.desligado', '{}'::jsonb);
  end if;
  return c;
end;
$$;

-- Registros do Meet já resolvidos (transcritos ou sem transcrição): não consultar de novo.
create or replace function public.reunioes_transcritas(p_tenant uuid, p_registros text[])
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(conference_record), '{}') from public.meetings
   where tenant_id = p_tenant and conference_record = any (p_registros) and status in ('transcrita', 'sem_transcricao');
$$;

-- Grava (ou atualiza) uma reunião vinda do Meet. Idempotente pelo registro do Meet.
-- p: {registro, codigo, evento_id, titulo, inicio, fim, convidados:[{email,nome}],
--     situacao, transcricao_nome, falas:[{quem,seg,texto}], idioma}
create or replace function public.reuniao_gravar(p_tenant uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.meetings;
  v_sit public.meeting_status := coalesce(nullif(p ->> 'situacao', ''), 'aguardando_transcricao')::public.meeting_status;
  v_titulo text := left(nullif(trim(p ->> 'titulo'), ''), 200);
  v_falas jsonb := p -> 'falas';
  v_cliente uuid;
  nova_transcricao boolean := false;
begin
  if not exists (select 1 from public.tenants where id = p_tenant) then
    raise exception 'agencia_invalida' using errcode = '22023';
  end if;
  if v_falas is not null and (jsonb_typeof(v_falas) <> 'array' or jsonb_array_length(v_falas) = 0) then
    v_falas := null;
  end if;
  if v_falas is not null then v_sit := 'transcrita'; end if;
  if v_titulo is null then
    v_titulo := 'Reunião de ' || to_char(((p ->> 'inicio')::timestamptz) at time zone (select timezone from public.tenants where id = p_tenant), 'DD/MM');
  end if;

  insert into public.meetings as x (tenant_id, conference_record, meeting_code, calendar_event_id, title,
                                   started_at, ended_at, attendees, status, transcript_name)
  values (p_tenant, p ->> 'registro', nullif(p ->> 'codigo', ''), nullif(p ->> 'evento_id', ''), v_titulo,
          (p ->> 'inicio')::timestamptz, (p ->> 'fim')::timestamptz,
          coalesce(p -> 'convidados', '[]'::jsonb), v_sit, nullif(p ->> 'transcricao_nome', ''))
  on conflict (tenant_id, conference_record) do update
     set meeting_code      = coalesce(excluded.meeting_code, x.meeting_code),
         calendar_event_id = coalesce(excluded.calendar_event_id, x.calendar_event_id),
         title             = case when nullif(trim(p ->> 'titulo'), '') is not null then excluded.title else x.title end,
         ended_at          = coalesce(excluded.ended_at, x.ended_at),
         attendees         = case when jsonb_array_length(excluded.attendees) > 0 then excluded.attendees else x.attendees end,
         status            = case when x.status = 'transcrita' then x.status else excluded.status end,
         transcript_name   = coalesce(x.transcript_name, excluded.transcript_name)
  returning * into m;

  if v_falas is not null and not exists (select 1 from public.meeting_transcripts where meeting_id = m.id) then
    insert into public.meeting_transcripts (meeting_id, tenant_id, entries, language)
    values (m.id, p_tenant, v_falas, left(nullif(p ->> 'idioma', ''), 20));
    nova_transcricao := true;
  end if;

  v_cliente := public._reuniao_ligar_por_email(m.id);

  if nova_transcricao then
    insert into public.event_outbox (tenant_id, event, payload)
    values (p_tenant, 'reuniao.transcrita', jsonb_build_object('meeting_id', m.id, 'client_id', v_cliente));
  end if;
  return jsonb_build_object('id', m.id, 'client_id', v_cliente, 'nova_transcricao', nova_transcricao);
end;
$$;

revoke all on function public.google_estado_ler(text) from public, anon, authenticated;
revoke all on function public.google_estado_guardar(text, text, text) from public, anon, authenticated;
revoke all on function public.google_conexoes_reservar(uuid) from public, anon, authenticated;
revoke all on function public.google_busca_concluir(uuid, boolean, text, boolean, boolean) from public, anon, authenticated;
revoke all on function public.google_conexao_remover(uuid) from public, anon, authenticated;
revoke all on function public.reunioes_transcritas(uuid, text[]) from public, anon, authenticated;
revoke all on function public.reuniao_gravar(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.google_estado_ler(text) to service_role;
grant execute on function public.google_estado_guardar(text, text, text) to service_role;
grant execute on function public.google_conexoes_reservar(uuid) to service_role;
grant execute on function public.google_busca_concluir(uuid, boolean, text, boolean, boolean) to service_role;
grant execute on function public.google_conexao_remover(uuid) to service_role;
grant execute on function public.reunioes_transcritas(uuid, text[]) to service_role;
grant execute on function public.reuniao_gravar(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 6. Busca automática a cada 15 minutos (só onde pg_cron e pg_net existem)
-- A função não exige chave: ela se protege pela trava de 10 minutos e não devolve dados.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'reunioes-buscar';
    perform cron.schedule('reunioes-buscar', '*/15 * * * *', $cron$
      select net.http_post(
        url := 'https://cjzzbpqwlpjvlawllfqy.supabase.co/functions/v1/reunioes-google/buscar',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 5000);
    $cron$);
  end if;
end $$;
