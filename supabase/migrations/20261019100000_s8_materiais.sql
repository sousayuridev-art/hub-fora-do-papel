-- =====================================================================
-- Hub Fora do Papel · S8 · Materiais e Arquivos do portal
-- Card: docs/cards/S8-materiais-arquivos.md
-- Um cadastro único: arquivo (Storage privado), texto pronto ou link.
-- O dono vê tudo do tenant; o cliente vê só o que foi compartilhado com a empresa
-- dele e o que ele mesmo enviou. Arquivos: caminho {tenant}/{material}/{nome}.
-- =====================================================================

create type public.material_category as enum ('modelos', 'guias', 'textos', 'marca', 'anuncios', 'entregas', 'cliente');
create type public.material_kind as enum ('arquivo', 'texto', 'link');
create type public.material_origin as enum ('nosso', 'cliente');

create table public.materials (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  client_id       uuid references public.clients (id) on delete restrict,
  project_id      uuid references public.projects (id) on delete set null,
  client_task_id  uuid references public.client_tasks (id) on delete set null,
  category        public.material_category not null default 'modelos',
  kind            public.material_kind not null,
  origin          public.material_origin not null default 'nosso',
  title           text not null check (length(trim(title)) between 2 and 120),
  description     text check (description is null or length(description) <= 600),
  body            text check (body is null or length(body) <= 20000),
  url             text check (url is null or (url ~ '^https://[^\s]{3,}$' and length(url) <= 600)),
  storage_path    text unique check (storage_path is null or length(storage_path) <= 400),
  file_name       text check (file_name is null or length(file_name) <= 160),
  mime_type       text check (mime_type is null or length(mime_type) <= 120),
  size_bytes      bigint check (size_bytes is null or size_bytes between 1 and 26214400),
  shared          boolean not null default false,
  uploaded_by     uuid references auth.users (id) on delete set null,
  ready_at        timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint materials_forma check (
    (kind = 'arquivo' and storage_path is not null and file_name is not null and body is null and url is null) or
    (kind = 'texto' and body is not null and storage_path is null and url is null) or
    (kind = 'link' and url is not null and storage_path is null and body is null)),
  constraint materials_compartilhado_com_cliente check (not shared or client_id is not null),
  constraint materials_cliente_tem_empresa check (origin <> 'cliente' or client_id is not null)
);
create index materials_tenant_idx on public.materials (tenant_id, deleted_at, category);
create index materials_client_idx on public.materials (client_id) where deleted_at is null;
create index materials_project_idx on public.materials (project_id);
create trigger materials_touch before update on public.materials for each row execute function public.touch_updated_at();

alter table public.materials enable row level security;
create policy materials_owner_select on public.materials for select to authenticated using (public.is_tenant_owner(tenant_id));
revoke all on public.materials from anon;
revoke insert, update, delete, truncate on public.materials from authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket privado e regras de acesso aos objetos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiais', 'materiais', false, 26214400, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/svg+xml', 'image/gif',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip', 'video/mp4', 'audio/mpeg'])
on conflict (id) do nothing;

create or replace function public._material_tipo_ok(p_mime text)
returns boolean language sql immutable as $$
  select p_mime = any (array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/svg+xml', 'image/gif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'application/zip', 'video/mp4', 'audio/mpeg']);
$$;

-- Quem pode ler um objeto: dono do tenant; cliente da empresa se compartilhado ou enviado por ele
create or replace function public._material_pode_ler(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.materials m
                  where m.storage_path = p_path
                    and (public.is_tenant_owner(m.tenant_id)  -- o dono lê também na lixeira (o Storage exige ler para apagar)
                         or (m.deleted_at is null and m.client_id is not null and public.is_client_member(m.client_id)
                             and (m.shared or m.origin = 'cliente'))));
$$;

-- Quem pode gravar: só quem preparou o envio, no caminho reservado, em até 1 dia, antes de confirmar
create or replace function public._material_pode_enviar(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.materials m
                  where m.storage_path = p_path and m.kind = 'arquivo' and m.ready_at is null and m.deleted_at is null
                    and m.uploaded_by = auth.uid() and m.created_at > now() - interval '1 day');
$$;

create or replace function public._material_pode_apagar(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.materials m
                  where m.storage_path = p_path and public.is_tenant_owner(m.tenant_id));
$$;

revoke all on function public._material_tipo_ok(text) from public, anon, authenticated;
revoke all on function public._material_pode_ler(text) from public, anon;
revoke all on function public._material_pode_enviar(text) from public, anon;
revoke all on function public._material_pode_apagar(text) from public, anon;
grant execute on function public._material_pode_ler(text) to authenticated;
grant execute on function public._material_pode_enviar(text) to authenticated;
grant execute on function public._material_pode_apagar(text) to authenticated;

create policy materiais_ler on storage.objects for select to authenticated
  using (bucket_id = 'materiais' and public._material_pode_ler(name));
create policy materiais_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'materiais' and public._material_pode_enviar(name));
create policy materiais_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'materiais' and public._material_pode_apagar(name));

-- ---------------------------------------------------------------------
-- Apoio
-- ---------------------------------------------------------------------
create or replace function public._material_json(m public.materials)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', m.id, 'categoria', m.category, 'tipo', m.kind, 'origem', m.origin,
    'titulo', m.title, 'descricao', m.description, 'texto', m.body, 'url', m.url, 'caminho', m.storage_path,
    'arquivo', m.file_name, 'mime', m.mime_type, 'tamanho', m.size_bytes, 'compartilhado', m.shared,
    'client_id', m.client_id, 'project_id', m.project_id,
    'empresa', (select company_name from public.clients where id = m.client_id),
    'projeto', (select name from public.projects where id = m.project_id),
    'atualizado_em', m.updated_at, 'excluido_em', m.deleted_at);
$$;
revoke all on function public._material_json(public.materials) from public, anon, authenticated;

create or replace function public._nome_arquivo(p text)
returns text language sql immutable as $$
  select left(nullif(regexp_replace(regexp_replace(coalesce(p, ''), '[/\\]', '-', 'g'), '[^A-Za-z0-9._ -]', '', 'g'), ''), 120);
$$;
revoke all on function public._nome_arquivo(text) from public, anon, authenticated;

create or replace function public._material_do_dono(p_id uuid)
returns public.materials language plpgsql security definer set search_path = public as $$
declare m public.materials;
begin
  select * into m from public.materials where id = p_id for update;
  if m.id is null or not public.is_tenant_owner(m.tenant_id) then raise exception 'material_inexistente' using errcode = 'P0002'; end if;
  return m;
end;
$$;
revoke all on function public._material_do_dono(uuid) from public, anon, authenticated;

create or replace function public._material_vinculos(p_tenant uuid, p_cliente uuid, p_projeto uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_cliente is not null and not exists (select 1 from public.clients where id = p_cliente and tenant_id = p_tenant) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if p_projeto is not null and not exists (select 1 from public.projects where id = p_projeto and tenant_id = p_tenant
                                             and (p_cliente is null or client_id = p_cliente)) then
    raise exception 'projeto_inexistente' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public._material_vinculos(uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RPCs do dono
-- ---------------------------------------------------------------------
create or replace function public.materiais_lista()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  return jsonb_build_object(
    'contagem', (select jsonb_build_object(
        'todos', count(*) filter (where deleted_at is null),
        'lixeira', count(*) filter (where deleted_at is not null),
        'modelos', count(*) filter (where deleted_at is null and category = 'modelos'),
        'guias', count(*) filter (where deleted_at is null and category = 'guias'),
        'textos', count(*) filter (where deleted_at is null and category = 'textos'),
        'marca', count(*) filter (where deleted_at is null and category = 'marca'),
        'anuncios', count(*) filter (where deleted_at is null and category = 'anuncios'),
        'entregas', count(*) filter (where deleted_at is null and category = 'entregas'),
        'cliente', count(*) filter (where deleted_at is null and category = 'cliente'),
        'compartilhados', count(*) filter (where deleted_at is null and shared))
       from public.materials where tenant_id = t and (kind <> 'arquivo' or ready_at is not null)),
    'itens', coalesce((select jsonb_agg(public._material_json(m) order by m.updated_at desc)
       from public.materials m where m.tenant_id = t and (m.kind <> 'arquivo' or m.ready_at is not null)), '[]'::jsonb)
  );
end;
$$;

create or replace function public.material_preparar(p_categoria public.material_category, p_titulo text, p_descricao text,
  p_cliente uuid, p_projeto uuid, p_compartilhado boolean, p_nome_arquivo text, p_mime text, p_tamanho bigint)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); m public.materials; nome text := public._nome_arquivo(p_nome_arquivo); novo_id uuid := gen_random_uuid();
begin
  perform public._material_vinculos(t, p_cliente, p_projeto);
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if nome is null then raise exception 'arquivo_invalido' using errcode = '22023'; end if;
  if not public._material_tipo_ok(p_mime) then raise exception 'tipo_nao_aceito' using errcode = '22023'; end if;
  if coalesce(p_tamanho, 0) < 1 or p_tamanho > 26214400 then raise exception 'arquivo_grande' using errcode = '22023'; end if;
  if coalesce(p_compartilhado, false) and p_cliente is null then raise exception 'compartilhar_sem_cliente' using errcode = '22023'; end if;
  insert into public.materials (id, tenant_id, client_id, project_id, category, kind, origin, title, description,
                                storage_path, file_name, mime_type, size_bytes, shared, uploaded_by)
  values (novo_id, t, p_cliente, p_projeto, coalesce(p_categoria, 'modelos'), 'arquivo', 'nosso', left(trim(p_titulo), 120),
          nullif(left(trim(coalesce(p_descricao, '')), 600), ''), t || '/' || novo_id || '/' || nome, nome, p_mime, p_tamanho,
          coalesce(p_compartilhado, false), auth.uid())
  returning * into m;
  return jsonb_build_object('id', m.id, 'caminho', m.storage_path);
end;
$$;

-- Confirma o envio (dono ou cliente que preparou): só vale se o arquivo chegou ao Storage
create or replace function public.material_confirmar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare m public.materials; o record;
begin
  select * into m from public.materials where id = p_id for update;
  if m.id is null or m.kind <> 'arquivo' or m.uploaded_by is distinct from auth.uid() then
    raise exception 'material_inexistente' using errcode = 'P0002';
  end if;
  if m.ready_at is not null then return public._material_json(m); end if;
  select * into o from storage.objects where bucket_id = 'materiais' and name = m.storage_path;
  if o.name is null then raise exception 'arquivo_nao_chegou' using errcode = '22023'; end if;
  update public.materials set ready_at = now(),
         size_bytes = coalesce(nullif(o.metadata->>'size', '')::bigint, size_bytes),
         mime_type = case when public._material_tipo_ok(o.metadata->>'mimetype') then o.metadata->>'mimetype' else mime_type end
   where id = m.id returning * into m;
  if m.origin = 'cliente' then
    if m.client_task_id is not null then
      update public.client_tasks set status = 'feita', done_at = now(), done_by = auth.uid()
       where id = m.client_task_id and status = 'aberta';
    end if;
    perform public._projeto_evento(m.tenant_id, m.client_id, m.project_id, null, 'arquivo_enviado',
      jsonb_build_object('material_id', m.id, 'titulo', m.title, 'arquivo', m.file_name), 'cliente', 'material.arquivo_enviado');
  elsif m.shared then
    perform public._projeto_evento(m.tenant_id, m.client_id, m.project_id, null, 'arquivo_compartilhado',
      jsonb_build_object('material_id', m.id, 'titulo', m.title), 'hub', 'material.compartilhado');
  end if;
  return public._material_json(m);
end;
$$;

-- Texto pronto ou link (criar ou editar)
create or replace function public.material_salvar(p_id uuid, p_tipo public.material_kind, p_categoria public.material_category,
  p_titulo text, p_descricao text, p_conteudo text, p_cliente uuid, p_projeto uuid, p_compartilhado boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); m public.materials;
begin
  perform public._material_vinculos(t, p_cliente, p_projeto);
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if coalesce(p_compartilhado, false) and p_cliente is null then raise exception 'compartilhar_sem_cliente' using errcode = '22023'; end if;
  if p_id is null then
    if p_tipo not in ('texto', 'link') then raise exception 'tipo_invalido' using errcode = '22023'; end if;
    if p_tipo = 'texto' and length(trim(coalesce(p_conteudo, ''))) < 2 then raise exception 'texto_obrigatorio' using errcode = '22023'; end if;
    if p_tipo = 'link' and trim(coalesce(p_conteudo, '')) !~ '^https://[^\s]{3,}$' then raise exception 'link_invalido' using errcode = '22023'; end if;
    insert into public.materials (tenant_id, client_id, project_id, category, kind, origin, title, description, body, url,
                                  shared, uploaded_by, ready_at)
    values (t, p_cliente, p_projeto, coalesce(p_categoria, 'textos'), p_tipo, 'nosso', left(trim(p_titulo), 120),
            nullif(left(trim(coalesce(p_descricao, '')), 600), ''),
            case when p_tipo = 'texto' then left(p_conteudo, 20000) end,
            case when p_tipo = 'link' then trim(p_conteudo) end,
            coalesce(p_compartilhado, false), auth.uid(), now())
    returning * into m;
  else
    m := public._material_do_dono(p_id);
    if m.origin = 'cliente' and coalesce(p_compartilhado, false) is distinct from m.shared then
      raise exception 'material_do_cliente' using errcode = '22023';
    end if;
    if m.kind = 'texto' and length(trim(coalesce(p_conteudo, ''))) < 2 then raise exception 'texto_obrigatorio' using errcode = '22023'; end if;
    if m.kind = 'link' and trim(coalesce(p_conteudo, '')) !~ '^https://[^\s]{3,}$' then raise exception 'link_invalido' using errcode = '22023'; end if;
    update public.materials set
      title = left(trim(p_titulo), 120), description = nullif(left(trim(coalesce(p_descricao, '')), 600), ''),
      category = case when origin = 'cliente' then category else coalesce(p_categoria, category) end,
      client_id = case when origin = 'cliente' then client_id else p_cliente end,
      project_id = p_projeto,
      shared = coalesce(p_compartilhado, false),
      body = case when kind = 'texto' then left(p_conteudo, 20000) else body end,
      url = case when kind = 'link' then trim(p_conteudo) else url end
     where id = m.id returning * into m;
  end if;
  return public._material_json(m);
end;
$$;

create or replace function public.material_lixeira(p_id uuid, p_excluir boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare m public.materials := public._material_do_dono(p_id);
begin
  update public.materials set deleted_at = case when p_excluir then now() end where id = m.id returning * into m;
  return jsonb_build_object('ok', true);
end;
$$;

-- Exclui de vez (só da lixeira). O arquivo no Storage é apagado pelo app antes, com a regra de "apagar".
create or replace function public.material_excluir(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare m public.materials := public._material_do_dono(p_id);
begin
  if m.deleted_at is null then raise exception 'material_fora_da_lixeira' using errcode = '22023'; end if;
  -- o app apaga o arquivo antes; se ele ainda existe, a remoção falhou e o registro fica (sem arquivo órfão)
  if m.storage_path is not null and exists (select 1 from storage.objects where bucket_id = 'materiais' and name = m.storage_path) then
    raise exception 'arquivo_nao_apagado' using errcode = '22023';
  end if;
  delete from public.materials where id = m.id;
  return jsonb_build_object('caminho', m.storage_path);
end;
$$;

-- ---------------------------------------------------------------------
-- Portal: Arquivos
-- ---------------------------------------------------------------------
create or replace function public.portal_arquivos(p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); t uuid; hoje date;
begin
  select tenant_id into t from public.clients where id = c;
  hoje := public._hoje(t);
  return jsonb_build_object(
    'da_agencia', coalesce((select jsonb_agg(public._material_json(m) order by m.updated_at desc)
        from public.materials m where m.client_id = c and m.origin = 'nosso' and m.shared and m.deleted_at is null
         and (m.kind <> 'arquivo' or m.ready_at is not null)), '[]'::jsonb),
    'enviados', coalesce((select jsonb_agg(public._material_json(m) order by m.updated_at desc)
        from public.materials m where m.client_id = c and m.origin = 'cliente' and m.deleted_at is null and m.ready_at is not null), '[]'::jsonb),
    'falta_enviar', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'titulo', k.title, 'detalhe', k.detail,
                       'prazo', k.due_date, 'atrasada', k.due_date < hoje) order by k.due_date nulls last)
        from public.client_tasks k where k.client_id = c and k.status = 'aberta'), '[]'::jsonb)
  );
end;
$$;

create or replace function public.portal_arquivo_preparar(p_titulo text, p_nome_arquivo text, p_mime text, p_tamanho bigint,
  p_pendencia uuid default null, p_cliente uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); t uuid; m public.materials; nome text := public._nome_arquivo(p_nome_arquivo);
        novo_id uuid := gen_random_uuid(); proj uuid;
begin
  select tenant_id into t from public.clients where id = c;
  if p_pendencia is not null and not exists (select 1 from public.client_tasks where id = p_pendencia and client_id = c) then
    raise exception 'pendencia_inexistente' using errcode = 'P0002';
  end if;
  if nome is null then raise exception 'arquivo_invalido' using errcode = '22023'; end if;
  if not public._material_tipo_ok(p_mime) then raise exception 'tipo_nao_aceito' using errcode = '22023'; end if;
  if coalesce(p_tamanho, 0) < 1 or p_tamanho > 26214400 then raise exception 'arquivo_grande' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('arquivo:' || c::text));
  if (select count(*) from public.materials where client_id = c and origin = 'cliente' and created_at > now() - interval '1 day') >= 60 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;
  select coalesce((select project_id from public.client_tasks where id = p_pendencia),
                  (select id from public.projects where client_id = c order by (status = 'andamento') desc, created_at desc limit 1))
    into proj;
  insert into public.materials (id, tenant_id, client_id, project_id, client_task_id, category, kind, origin, title,
                                storage_path, file_name, mime_type, size_bytes, shared, uploaded_by)
  values (novo_id, t, c, proj, p_pendencia, 'cliente', 'arquivo', 'cliente',
          left(coalesce(nullif(trim(coalesce(p_titulo, '')), ''), nome), 120),
          t || '/' || novo_id || '/' || nome, nome, p_mime, p_tamanho, false, auth.uid())
  returning * into m;
  return jsonb_build_object('id', m.id, 'caminho', m.storage_path);
end;
$$;

-- ---------------------------------------------------------------------
-- Painel: arquivo enviado pelo cliente entra nas novidades
-- ---------------------------------------------------------------------
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.painel_novidades()'::regprocedure);
  novo := replace(d, '''pagamento_avisado'')', '''pagamento_avisado'', ''arquivo_enviado'')');
  if novo = d then raise exception 'painel_novidades: ponto de troca não encontrado'; end if;
  execute novo;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'materiais_lista()',
    'material_preparar(public.material_category, text, text, uuid, uuid, boolean, text, text, bigint)',
    'material_confirmar(uuid)',
    'material_salvar(uuid, public.material_kind, public.material_category, text, text, text, uuid, uuid, boolean)',
    'material_lixeira(uuid, boolean)', 'material_excluir(uuid)',
    'portal_arquivos(uuid)', 'portal_arquivo_preparar(text, text, text, bigint, uuid, uuid)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
