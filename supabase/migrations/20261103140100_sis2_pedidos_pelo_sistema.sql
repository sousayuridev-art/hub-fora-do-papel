-- =====================================================================
-- Hub Fora do Papel · SIS-2 · Pedidos de ajuste vindos dos sistemas que entregamos
-- Card: docs/cards/SIS-2-pedidos-pelo-sistema.md
--
-- Cada sistema (SIS-1) ganha uma chave de integração. O sistema do cliente guarda a chave no
-- servidor dele e fala com a função `sistema-pedidos`, que usa a chave de serviço e só chama as
-- funções _sis_* abaixo (liberadas só para service_role). A chave nunca é guardada: só o sha256.
--
-- 1. Pedido ganha: sistema, quem pediu (nome e id no sistema), tipo, prioridade e id externo.
-- 2. Conversa (request_mensagens) e prints (request_anexos, bucket privado pedidos-anexos).
-- 3. Chave por sistema (sistema_integracoes) e RPCs do dono para gerar, revogar e responder.
-- 4. RPCs de serviço para a função: achar o sistema pela chave, listar, detalhar, criar, comentar
--    e registrar print. Tudo preso ao sistema da chave (um sistema nunca vê pedido de outro).
-- =====================================================================

-- 1. Pedido -----------------------------------------------------------------------------------
alter table public.requests
  add column if not exists sistema_id uuid references public.sistemas (id) on delete set null,
  add column if not exists solicitante jsonb
    check (solicitante is null or (jsonb_typeof(solicitante) = 'object' and length(solicitante::text) <= 400)),
  add column if not exists tipo text check (tipo is null or tipo in ('erro', 'melhoria')),
  add column if not exists prioridade text check (prioridade is null or prioridade in ('urgente', 'alta', 'media', 'baixa')),
  add column if not exists externo_id text check (externo_id is null or (length(externo_id) between 1 and 80));
create unique index if not exists requests_sistema_externo on public.requests (sistema_id, externo_id)
  where externo_id is not null;
create index if not exists requests_sistema_idx on public.requests (sistema_id, created_at desc)
  where sistema_id is not null;

-- Pedido que vem do sistema conta como do cliente na linha do tempo
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public._pedido_novo(uuid, uuid, uuid, text, text, public.request_origin, uuid, jsonb)'::regprocedure);
  novo := replace(d, $q$case when p_origem in ('portal', 'painel') then 'cliente'$q$,
                     $q$case when p_origem in ('portal', 'painel', 'sistema') then 'cliente'$q$);
  if novo = d then raise exception '_pedido_novo: regra da origem não encontrada'; end if;
  execute novo;
end;
$$;

-- 2. Conversa e prints --------------------------------------------------------------------------
create table public.request_mensagens (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  request_id  uuid not null references public.requests (id) on delete cascade,
  autor       text not null check (autor in ('equipe', 'cliente')),
  autor_nome  text not null check (length(trim(autor_nome)) between 1 and 80),
  autor_user  uuid references auth.users (id) on delete set null,
  texto       text not null check (length(trim(texto)) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index request_mensagens_pedido_idx on public.request_mensagens (request_id, created_at);
create index request_mensagens_tenant_idx on public.request_mensagens (tenant_id);

create table public.request_anexos (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  request_id  uuid not null references public.requests (id) on delete cascade,
  caminho     text not null unique
              check (caminho ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'),
  tipo        text not null check (tipo in ('image/png', 'image/jpeg', 'image/webp')),
  tamanho     integer not null check (tamanho between 1 and 2097152),
  enviado_por text not null check (enviado_por in ('equipe', 'cliente')),
  created_at  timestamptz not null default now()
);
create index request_anexos_pedido_idx on public.request_anexos (request_id, created_at);
create index request_anexos_tenant_idx on public.request_anexos (tenant_id);

alter table public.request_mensagens enable row level security;
alter table public.request_anexos enable row level security;
create policy request_mensagens_dono_ler on public.request_mensagens
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy request_anexos_dono_ler on public.request_anexos
  for select to authenticated using (public.is_tenant_owner(tenant_id));
revoke insert, update, delete, truncate on public.request_mensagens, public.request_anexos from anon, authenticated;
revoke select on public.request_mensagens, public.request_anexos from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pedidos-anexos', 'pedidos-anexos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- O dono lê os prints dos pedidos do tenant dele; ninguém envia pelo navegador (só a função de servidor)
create or replace function public._anexo_pedido_do_dono(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.request_anexos a
                  where a.caminho = p_path and public.is_tenant_owner(a.tenant_id));
$$;
revoke all on function public._anexo_pedido_do_dono(text) from public, anon;
grant execute on function public._anexo_pedido_do_dono(text) to authenticated;

create policy pedidos_anexos_ler on storage.objects for select to authenticated
  using (bucket_id = 'pedidos-anexos' and public._anexo_pedido_do_dono(name));

-- 3. Chave de integração por sistema ----------------------------------------------------------
create table public.sistema_integracoes (
  sistema_id     uuid primary key references public.sistemas (id) on delete cascade,
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  chave_hash     text not null unique check (chave_hash ~ '^[0-9a-f]{64}$'),
  prefixo        text not null check (length(prefixo) between 6 and 16),
  criada_em      timestamptz not null default now(),
  criada_por     uuid references auth.users (id) on delete set null,
  ultimo_uso_em  timestamptz
);
create index sistema_integracoes_tenant_idx on public.sistema_integracoes (tenant_id);
alter table public.sistema_integracoes enable row level security;
-- Sem policy: o hash não sai do banco. O dono vê prefixo e uso por sistema_integracao().
revoke all on public.sistema_integracoes from anon, authenticated;

create or replace function public._hash_chave(p text)
returns text language sql immutable as $$
  select encode(sha256(convert_to(coalesce(p, ''), 'UTF8')), 'hex');
$$;
revoke all on function public._hash_chave(text) from public, anon, authenticated;

-- Gera (ou troca) a chave. A chave aparece só nesta resposta; a anterior para de valer na hora.
create or replace function public.sistema_chave_gerar(p_sistema uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.sistemas; k text;
begin
  select * into s from public.sistemas where id = p_sistema and tenant_id = t for update;
  if s.id is null then raise exception 'sistema_inexistente' using errcode = 'P0002'; end if;
  -- 2 × 122 bits do gerador seguro do Postgres
  k := 'fdp_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.sistema_integracoes (sistema_id, tenant_id, chave_hash, prefixo, criada_por)
  values (s.id, t, public._hash_chave(k), left(k, 10), auth.uid())
  on conflict (sistema_id) do update
    set chave_hash = excluded.chave_hash, prefixo = excluded.prefixo, criada_em = now(),
        criada_por = excluded.criada_por, ultimo_uso_em = null;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'sistema.chave_gerada', jsonb_build_object('sistema_id', s.id, 'client_id', s.client_id, 'prefixo', left(k, 10)));
  return jsonb_build_object('chave', k, 'prefixo', left(k, 10));
end;
$$;

create or replace function public.sistema_chave_revogar(p_sistema uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  delete from public.sistema_integracoes where sistema_id = p_sistema and tenant_id = t;
  if found then
    insert into public.event_outbox (tenant_id, event, payload)
    values (t, 'sistema.chave_revogada', jsonb_build_object('sistema_id', p_sistema));
  end if;
end;
$$;

create or replace function public.sistema_integracao(p_sistema uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ligada', i.sistema_id is not null, 'prefixo', i.prefixo, 'criada_em', i.criada_em,
    'ultimo_uso_em', i.ultimo_uso_em,
    'pedidos', (select count(*) from public.requests r where r.sistema_id = s.id),
    'abertos', (select count(*) from public.requests r where r.sistema_id = s.id and r.status not in ('pronto', 'recusado')))
  from public.sistemas s left join public.sistema_integracoes i on i.sistema_id = s.id
  where s.id = p_sistema and s.tenant_id = public._tenant_do_dono();
$$;

-- Resposta do Yuri na conversa do pedido (qualquer pedido do tenant; o cliente vê no sistema dele)
create or replace function public.pedido_mensagem_enviar(p_pedido uuid, p_texto text)
returns public.request_mensagens language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); r public.requests; m public.request_mensagens; nome text;
begin
  select * into r from public.requests where id = p_pedido and tenant_id = t;
  if r.id is null then raise exception 'pedido_inexistente' using errcode = 'P0002'; end if;
  if length(trim(coalesce(p_texto, ''))) = 0 then raise exception 'texto_obrigatorio' using errcode = '22023'; end if;
  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Fora do Papel') into nome
    from public.profiles where id = auth.uid();
  insert into public.request_mensagens (tenant_id, request_id, autor, autor_nome, autor_user, texto)
  values (t, r.id, 'equipe', left(coalesce(nome, 'Fora do Papel'), 80), auth.uid(), left(trim(p_texto), 2000))
  returning * into m;
  update public.requests set updated_at = now() where id = r.id;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'pedido.mensagem', jsonb_build_object('pedido_id', r.id, 'client_id', r.client_id,
          'sistema_id', r.sistema_id, 'autor', 'equipe'));
  return m;
end;
$$;

revoke all on function public.sistema_chave_gerar(uuid) from public, anon;
revoke all on function public.sistema_chave_revogar(uuid) from public, anon;
revoke all on function public.sistema_integracao(uuid) from public, anon;
revoke all on function public.pedido_mensagem_enviar(uuid, text) from public, anon;
grant execute on function public.sistema_chave_gerar(uuid) to authenticated;
grant execute on function public.sistema_chave_revogar(uuid) to authenticated;
grant execute on function public.sistema_integracao(uuid) to authenticated;
grant execute on function public.pedido_mensagem_enviar(uuid, text) to authenticated;

-- 4. Funções de serviço (só a função sistema-pedidos, com a chave de serviço) ------------------
create or replace function public._sis_situacao(s public.request_status)
returns text language sql immutable as $$
  select case s when 'recebido' then 'Recebido' when 'em_analise' then 'Em análise'
                when 'aguardando_cliente' then 'Esperando vocês' when 'fazendo' then 'Em andamento'
                when 'pronto' then 'Feito' when 'recusado' then 'Não vamos fazer' end;
$$;

-- Acha o sistema pela chave. Marca o uso no máximo uma vez por minuto.
create or replace function public._sis_por_chave(p_chave text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare i public.sistema_integracoes; s public.sistemas;
begin
  if p_chave is null or p_chave !~ '^fdp_[0-9a-f]{64}$' then return null; end if;
  select * into i from public.sistema_integracoes where chave_hash = public._hash_chave(p_chave);
  if i.sistema_id is null then return null; end if;
  select * into s from public.sistemas where id = i.sistema_id;
  if s.id is null then return null; end if;
  if i.ultimo_uso_em is null or i.ultimo_uso_em < now() - interval '1 minute' then
    update public.sistema_integracoes set ultimo_uso_em = now() where sistema_id = i.sistema_id;
  end if;
  return jsonb_build_object('sistema_id', s.id, 'tenant_id', s.tenant_id, 'client_id', s.client_id,
                            'project_id', s.project_id, 'nome', s.nome);
end;
$$;

create or replace function public._sis_pedido_json(r public.requests, completo boolean)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', r.id, 'codigo', r.code, 'titulo', r.title, 'tipo', r.tipo, 'prioridade', r.prioridade,
    'situacao', r.status, 'situacao_rotulo', public._sis_situacao(r.status),
    'solicitante', r.solicitante, 'externo_id', r.externo_id,
    'criado_em', r.created_at, 'atualizado_em', r.updated_at, 'feito_em', r.done_at,
    'nota', case when r.status in ('pronto', 'recusado') then r.owner_note end,
    'mensagens', (select count(*) from public.request_mensagens m where m.request_id = r.id),
    'anexos', (select count(*) from public.request_anexos a where a.request_id = r.id),
    'descricao', case when completo then r.description end))
$$;

create or replace function public._sis_pedidos(p_sistema uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public._sis_pedido_json(r, false) order by r.created_at desc), '[]'::jsonb)
    from (select * from public.requests where sistema_id = p_sistema order by created_at desc limit 300) r;
$$;

create or replace function public._sis_pedido(p_sistema uuid, p_pedido uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_pedido and sistema_id = p_sistema;
  if r.id is null then raise exception 'pedido_inexistente' using errcode = 'P0002'; end if;
  return public._sis_pedido_json(r, true) || jsonb_build_object(
    'conversa', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'autor', m.autor,
                   'autor_nome', m.autor_nome, 'texto', m.texto, 'criado_em', m.created_at) order by m.created_at), '[]'::jsonb)
                   from public.request_mensagens m where m.request_id = r.id),
    'prints', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'caminho', a.caminho, 'tipo', a.tipo,
                   'enviado_por', a.enviado_por, 'criado_em', a.created_at) order by a.created_at), '[]'::jsonb)
                   from public.request_anexos a where a.request_id = r.id));
end;
$$;

-- Cria o pedido. Com externo_id repetido devolve o mesmo pedido (a importação pode rodar de novo).
-- Na importação (externo_id + situacao), aceita a situação de origem: recebido, em_analise ou fazendo.
create or replace function public._sis_pedido_criar(p_sistema uuid, p_dados jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sistemas; r public.requests;
        v_ext text := nullif(trim(coalesce(p_dados->>'externo_id', '')), '');
        v_tipo text := nullif(p_dados->>'tipo', '');
        v_prio text := coalesce(nullif(p_dados->>'prioridade', ''), 'media');
        v_sit text := nullif(p_dados->>'situacao', '');
        v_nome text := left(trim(coalesce(p_dados #>> '{solicitante,nome}', '')), 80);
        v_quem text := left(trim(coalesce(p_dados #>> '{solicitante,id}', '')), 64);
        v_criado timestamptz;
begin
  select * into s from public.sistemas where id = p_sistema;
  if s.id is null then raise exception 'sistema_inexistente' using errcode = 'P0002'; end if;
  if v_tipo is not null and v_tipo not in ('erro', 'melhoria') then raise exception 'tipo_invalido' using errcode = '22023'; end if;
  if v_prio not in ('urgente', 'alta', 'media', 'baixa') then raise exception 'prioridade_invalida' using errcode = '22023'; end if;
  if length(v_nome) = 0 then raise exception 'solicitante_obrigatorio' using errcode = '22023'; end if;
  if v_ext is not null then
    select * into r from public.requests where sistema_id = s.id and externo_id = v_ext;
    if r.id is not null then return public._sis_pedido_json(r, false); end if;
  end if;
  if (select count(*) from public.requests where sistema_id = s.id and created_at > now() - interval '1 day') >= 100 then
    raise exception 'muitos_pedidos' using errcode = '54000';
  end if;
  if v_sit is not null and (v_ext is null or v_sit not in ('recebido', 'em_analise', 'fazendo')) then
    raise exception 'situacao_invalida' using errcode = '22023';
  end if;
  begin
    v_criado := nullif(p_dados->>'criado_em', '')::timestamptz;
  exception when others then v_criado := null;
  end;

  r := public._pedido_novo(s.tenant_id, s.client_id, s.project_id, p_dados->>'titulo', p_dados->>'descricao', 'sistema');
  update public.requests set
    sistema_id = s.id,
    solicitante = jsonb_strip_nulls(jsonb_build_object('nome', v_nome, 'id', nullif(v_quem, ''))),
    tipo = v_tipo, prioridade = v_prio, urgente = (v_prio = 'urgente'), externo_id = v_ext,
    status = coalesce(v_sit::public.request_status, status),
    created_at = case when v_ext is not null and v_criado is not null and v_criado < now() then v_criado else created_at end
  where id = r.id returning * into r;
  return public._sis_pedido_json(r, false);
end;
$$;

create or replace function public._sis_mensagem(p_sistema uuid, p_pedido uuid, p_dados jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests; m public.request_mensagens; v_criado timestamptz;
        v_nome text := left(trim(coalesce(p_dados->>'autor_nome', '')), 80);
        v_texto text := left(trim(coalesce(p_dados->>'texto', '')), 2000);
begin
  select * into r from public.requests where id = p_pedido and sistema_id = p_sistema for update;
  if r.id is null then raise exception 'pedido_inexistente' using errcode = 'P0002'; end if;
  if length(v_nome) = 0 then raise exception 'solicitante_obrigatorio' using errcode = '22023'; end if;
  if length(v_texto) = 0 then raise exception 'texto_obrigatorio' using errcode = '22023'; end if;
  if (select count(*) from public.request_mensagens x join public.requests y on y.id = x.request_id
       where y.sistema_id = p_sistema and x.created_at > now() - interval '1 day') >= 500 then
    raise exception 'muitas_mensagens' using errcode = '54000';
  end if;
  begin
    v_criado := nullif(p_dados->>'criado_em', '')::timestamptz;
  exception when others then v_criado := null;
  end;
  insert into public.request_mensagens (tenant_id, request_id, autor, autor_nome, texto, created_at)
  values (r.tenant_id, r.id, 'cliente', v_nome, v_texto,
          case when r.externo_id is not null and v_criado is not null and v_criado < now() then v_criado else now() end)
  returning * into m;
  update public.requests set updated_at = now() where id = r.id;
  insert into public.event_outbox (tenant_id, event, payload)
  values (r.tenant_id, 'pedido.mensagem', jsonb_build_object('pedido_id', r.id, 'client_id', r.client_id,
          'sistema_id', p_sistema, 'autor', 'cliente'));
  return jsonb_build_object('id', m.id, 'autor', m.autor, 'autor_nome', m.autor_nome, 'texto', m.texto, 'criado_em', m.created_at);
end;
$$;

-- Registra um print já enviado ao bucket pela função (caminho {tenant}/{pedido}/{uuid}.ext). Até 5 por pedido.
create or replace function public._sis_anexo(p_sistema uuid, p_pedido uuid, p_caminho text, p_tipo text, p_tamanho integer)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests; a public.request_anexos;
begin
  select * into r from public.requests where id = p_pedido and sistema_id = p_sistema for update;
  if r.id is null then raise exception 'pedido_inexistente' using errcode = 'P0002'; end if;
  if split_part(p_caminho, '/', 1) <> r.tenant_id::text or split_part(p_caminho, '/', 2) <> r.id::text then
    raise exception 'caminho_invalido' using errcode = '22023';
  end if;
  if (select count(*) from public.request_anexos where request_id = r.id) >= 5 then
    raise exception 'prints_demais' using errcode = '54000';
  end if;
  insert into public.request_anexos (tenant_id, request_id, caminho, tipo, tamanho, enviado_por)
  values (r.tenant_id, r.id, p_caminho, p_tipo, p_tamanho, 'cliente') returning * into a;
  update public.requests set updated_at = now() where id = r.id;
  return jsonb_build_object('id', a.id, 'caminho', a.caminho, 'tipo', a.tipo);
end;
$$;

-- Prints do pedido para a função assinar (confere que o pedido é do sistema da chave)
create or replace function public._sis_anexo_do_sistema(p_sistema uuid, p_anexo uuid)
returns text language sql stable security definer set search_path = public as $$
  select a.caminho from public.request_anexos a join public.requests r on r.id = a.request_id
   where a.id = p_anexo and r.sistema_id = p_sistema;
$$;

revoke all on function public._sis_situacao(public.request_status) from public, anon, authenticated;
revoke all on function public._sis_por_chave(text) from public, anon, authenticated;
revoke all on function public._sis_pedido_json(public.requests, boolean) from public, anon, authenticated;
revoke all on function public._sis_pedidos(uuid) from public, anon, authenticated;
revoke all on function public._sis_pedido(uuid, uuid) from public, anon, authenticated;
revoke all on function public._sis_pedido_criar(uuid, jsonb) from public, anon, authenticated;
revoke all on function public._sis_mensagem(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public._sis_anexo(uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public._sis_anexo_do_sistema(uuid, uuid) from public, anon, authenticated;
grant execute on function public._sis_por_chave(text) to service_role;
grant execute on function public._sis_pedidos(uuid) to service_role;
grant execute on function public._sis_pedido(uuid, uuid) to service_role;
grant execute on function public._sis_pedido_criar(uuid, jsonb) to service_role;
grant execute on function public._sis_mensagem(uuid, uuid, jsonb) to service_role;
grant execute on function public._sis_anexo(uuid, uuid, text, text, integer) to service_role;
grant execute on function public._sis_anexo_do_sistema(uuid, uuid) to service_role;

-- 5. Lista de pedidos do Hub ganha sistema, quem pediu, tipo, prioridade e contagens (colunas no fim)
create or replace view public.v_pedidos with (security_invoker = true) as
select r.id, r.client_id, r.project_id, r.code, r.title, r.description, r.origin, r.status, r.classification,
       r.hours_estimated, r.value_cents, r.owner_note, r.client_decision, r.decided_at, r.decision_note,
       r.done_at, r.created_at, r.updated_at,
       c.company_name, c.contact_name, p.name as project_name, p.status as project_status,
       r.site_id, s.nome as site_nome, s.dominio as site_dominio, r.contexto,
       coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'arquivo', m.file_name, 'caminho', m.storage_path,
                                                     'mime', m.mime_type, 'tamanho', m.size_bytes) order by m.created_at)
                   from public.materials m
                  where m.request_id = r.id and m.deleted_at is null and m.ready_at is not null), '[]'::jsonb) as anexos,
       r.urgente,
       r.sistema_id, si.nome as sistema_nome, r.solicitante, r.tipo, r.prioridade,
       (select count(*) from public.request_mensagens x where x.request_id = r.id)::int as mensagens,
       (select count(*) from public.request_anexos x where x.request_id = r.id)::int as prints
  from public.requests r
  join public.clients c on c.id = r.client_id
  left join public.projects p on p.id = r.project_id
  left join public.sites s on s.id = r.site_id
  left join public.sistemas si on si.id = r.sistema_id;
