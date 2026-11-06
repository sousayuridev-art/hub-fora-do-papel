-- =====================================================================
-- Hub Fora do Papel · RS-1 · Revisar o site pelo portal
-- Card: docs/cards/RS-1-revisar-site-banco.md (canvas "Portal · Revisar o site", versão 2)
--
-- O cliente marca ajustes no site (rascunho), envia todos juntos (revisão 1, 2, 3…) e cada ajuste
-- vira um pedido de ajuste (requests, S3) com o lugar exato e o antes e depois. Depois confere
-- cada um ("Ficou bom" / "Quero outra mudança") e o responsável aprova o site.
-- Foto nova e áudio são arquivos do cliente (materials, S8) ligados ao pedido no envio, como no PC-2.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Áudio gravado no navegador (webm no Chrome, mp4 no Safari, ogg no Firefox)
-- ---------------------------------------------------------------------
create or replace function public._material_tipo_ok(p_mime text)
returns boolean language sql immutable as $$
  select p_mime = any (array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'application/zip', 'video/mp4', 'audio/mpeg',
    'audio/webm', 'audio/mp4', 'audio/ogg']);
$$;
revoke all on function public._material_tipo_ok(text) from public, anon, authenticated;

update storage.buckets
   set allowed_mime_types = (select array(select distinct unnest(coalesce(allowed_mime_types, '{}'::text[])
                                                    || array['audio/webm', 'audio/mp4', 'audio/ogg'])))
 where id = 'materiais';

-- ---------------------------------------------------------------------
-- 2. Tabelas: revisões (rodadas) e ajustes em rascunho
-- ---------------------------------------------------------------------
create table public.site_rodadas (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  client_id    uuid not null references public.clients (id) on delete restrict,
  numero       int not null check (numero between 1 and 99),
  situacao     text not null default 'rascunho' check (situacao in ('rascunho', 'enviada')),
  criada_por   uuid references auth.users (id) on delete set null,
  criada_em    timestamptz not null default now(),
  enviada_em   timestamptz,
  enviada_por  uuid references auth.users (id) on delete set null,
  unique (site_id, numero)
);
-- Uma revisão em rascunho por site
create unique index site_rodadas_rascunho_idx on public.site_rodadas (site_id) where situacao = 'rascunho';
create index site_rodadas_tenant_idx on public.site_rodadas (tenant_id);

create table public.site_marcadores (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  rodada_id    uuid not null references public.site_rodadas (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  tipo         text not null check (tipo in ('texto', 'foto', 'tirar', 'mover', 'incluir', 'outro')),
  pagina_id    uuid references public.site_paginas (id) on delete set null,
  pagina_nome  text not null check (length(trim(pagina_nome)) between 1 and 80),
  secao_id     text check (secao_id is null or secao_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  secao_nome   text check (secao_nome is null or length(secao_nome) <= 80),
  posicao      jsonb check (posicao is null or (jsonb_typeof(posicao) = 'object'
                 and (posicao ->> 'x')::numeric between 0 and 1 and (posicao ->> 'y')::numeric between 0 and 1)),
  antes        text check (antes is null or length(antes) <= 500),
  depois       text check (depois is null or length(depois) <= 1500),
  observacao   text check (observacao is null or length(observacao) <= 400),
  foto_id      uuid references public.materials (id) on delete set null,
  audio_id     uuid references public.materials (id) on delete set null,
  criado_por   uuid references auth.users (id) on delete set null,
  -- clock_timestamp: a ordem da lista é a ordem em que foram marcados, mesmo na mesma transação
  criado_em    timestamptz not null default clock_timestamp(),
  atualizado_em timestamptz not null default now(),
  -- Um ajuste precisa dizer o que fazer: texto novo, observação, foto ou áudio
  check (coalesce(length(trim(depois)), 0) + coalesce(length(trim(observacao)), 0) > 0
         or foto_id is not null or audio_id is not null or tipo = 'tirar')
);
create index site_marcadores_rodada_idx on public.site_marcadores (rodada_id, criado_em);
create index site_marcadores_tenant_idx on public.site_marcadores (tenant_id);

alter table public.site_rodadas enable row level security;
alter table public.site_marcadores enable row level security;
-- Leitura do dono; o cliente usa só as RPCs abaixo
create policy site_rodadas_dono on public.site_rodadas for select to authenticated
  using (public.is_tenant_owner(tenant_id));
create policy site_marcadores_dono on public.site_marcadores for select to authenticated
  using (public.is_tenant_owner(tenant_id));
revoke all on public.site_rodadas, public.site_marcadores from anon;
revoke insert, update, delete, truncate on public.site_rodadas, public.site_marcadores from authenticated;

-- ---------------------------------------------------------------------
-- 3. Pedidos e site ganham o que a revisão precisa
-- ---------------------------------------------------------------------
alter table public.requests
  add column rodada_id      uuid references public.site_rodadas (id) on delete set null,
  add column marcador_ordem int check (marcador_ordem is null or marcador_ordem between 1 and 99),
  add column validado_em    timestamptz,
  add column validado_por   uuid references auth.users (id) on delete set null,
  add column refeito_vezes  int not null default 0 check (refeito_vezes between 0 and 2);
create index requests_rodada_idx on public.requests (rodada_id) where rodada_id is not null;

-- O contexto da revisão leva o antes e o depois: o limite de 1000 caracteres do PC-2 sobe para 4000
do $$
declare n text;
begin
  for n in select conname from pg_constraint
            where conrelid = 'public.requests'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) like '%contexto%' loop
    execute format('alter table public.requests drop constraint %I', n);
  end loop;
end $$;
alter table public.requests add constraint requests_contexto_check
  check (contexto is null or (jsonb_typeof(contexto) = 'object' and length(contexto::text) <= 4000));

alter table public.sites
  add column revisao_aprovada_em  timestamptz,
  add column revisao_aprovada_por uuid references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------
-- 4. Ajudantes internos
-- ---------------------------------------------------------------------
-- Revisões incluídas na proposta (fluxo da Fora do Papel): da 3ª em diante, provável serviço adicional
create or replace function public._revisao_incluidas() returns int language sql immutable as $$ select 2 $$;

create or replace function public._revisao_tipo_nome(p text) returns text language sql immutable as $$
  select case p when 'texto' then 'Trocar texto' when 'foto' then 'Trocar foto' when 'tirar' then 'Tirar'
                when 'mover' then 'Mudar de lugar' when 'incluir' then 'Incluir algo' else 'Outra coisa' end
$$;

-- Situação que o cliente vê (frase normal no portal)
create or replace function public._revisao_situacao(r public.requests) returns text language sql stable as $$
  select case
    when r.status = 'pronto' and r.validado_em is not null then 'aprovado'
    when r.status = 'pronto' then 'para_ver'
    when r.status = 'fazendo' or (r.status = 'em_analise' and r.client_decision = 'aprovado') then 'fazendo'
    when r.status = 'aguardando_cliente' then 'orcamento'
    when r.status = 'recusado' then 'recusado'
    else 'enviado' end
$$;

-- Site do cliente desta pessoa (escrita): valida a empresa e devolve o site
create or replace function public._revisao_site(p_site uuid, p_cliente uuid default null)
returns public.sites language plpgsql stable security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); s public.sites;
begin
  select * into s from public.sites where id = p_site and client_id = c;
  if s.id is null then raise exception 'site_de_outra_empresa' using errcode = '42501'; end if;
  return s;
end;
$$;

-- Arquivo do cliente pronto para virar foto ou áudio do ajuste
create or replace function public._revisao_arquivo_ok(p_id uuid, p_cliente uuid, p_tipos text[])
returns boolean language sql stable security definer set search_path = public as $$
  select p_id is null or exists (
    select 1 from public.materials m
     where m.id = p_id and m.client_id = p_cliente and m.origin = 'cliente' and m.kind = 'arquivo'
       and m.uploaded_by = auth.uid() and m.ready_at is not null and m.deleted_at is null and m.request_id is null
       and m.mime_type = any (p_tipos) and m.size_bytes <= 5242880)
$$;

create or replace function public._revisao_para_ver(p_cliente uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.requests
   where client_id = p_cliente and origin = 'revisao' and status = 'pronto' and validado_em is null
$$;

revoke all on function public._revisao_incluidas(), public._revisao_tipo_nome(text),
  public._revisao_situacao(public.requests), public._revisao_site(uuid, uuid),
  public._revisao_arquivo_ok(uuid, uuid, text[]), public._revisao_para_ver(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Leitura do portal: tudo da revisão de um site
-- ---------------------------------------------------------------------
create or replace function public.portal_revisao(p_site uuid, p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid := public._portal_cliente_leitura(p_cliente); s public.sites; rasc public.site_rodadas;
        resp text;
begin
  select * into s from public.sites where id = p_site and client_id = c;
  if s.id is null then raise exception 'site_de_outra_empresa' using errcode = '42501'; end if;
  select * into rasc from public.site_rodadas where site_id = s.id and situacao = 'rascunho';
  select coalesce(nullif(trim(p.full_name), ''), 'o responsável pelo contrato') into resp
    from public.client_members m left join public.profiles p on p.id = m.user_id
   where m.client_id = c and m.profile = 'responsavel' order by m.created_at limit 1;
  return jsonb_build_object(
    'site', jsonb_build_object('id', s.id, 'nome', s.nome, 'dominio', s.dominio, 'modulos', to_jsonb(s.modulos)),
    'incluidas', public._revisao_incluidas(),
    'proxima', coalesce((select max(numero) from public.site_rodadas where site_id = s.id and situacao = 'enviada'), 0) + 1,
    'aprovado_em', s.revisao_aprovada_em,
    'aprovado_por', (select nullif(trim(full_name), '') from public.profiles where id = s.revisao_aprovada_por),
    'pode_aprovar', public._portal_responsavel_leitura(c) and public._portal_pode_aprovar_leitura(c),
    'responsavel', coalesce(resp, 'o responsável pelo contrato'),
    'para_ver', public._revisao_para_ver(c),
    'rascunho', case when rasc.id is null then null else jsonb_build_object(
      'id', rasc.id, 'numero', rasc.numero,
      'itens', coalesce((select jsonb_agg(jsonb_build_object(
          'id', k.id, 'tipo', k.tipo, 'pagina_id', k.pagina_id, 'pagina', k.pagina_nome, 'secao_id', k.secao_id,
          'secao', k.secao_nome, 'posicao', k.posicao, 'antes', k.antes, 'depois', k.depois, 'observacao', k.observacao,
          'foto_id', k.foto_id, 'foto', (select storage_path from public.materials where id = k.foto_id),
          'audio_id', k.audio_id, 'audio', (select storage_path from public.materials where id = k.audio_id),
          'meu', k.criado_por = auth.uid(),
          'autor', (select nullif(split_part(trim(full_name), ' ', 1), '') from public.profiles where id = k.criado_por))
          order by k.criado_em) from public.site_marcadores k where k.rodada_id = rasc.id), '[]'::jsonb)) end,
    'rodadas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'numero', d.numero, 'enviada_em', d.enviada_em,
        'ajustes', coalesce((select jsonb_agg(jsonb_build_object(
            'id', r.id, 'codigo', r.code, 'ordem', r.marcador_ordem, 'tipo', r.contexto ->> 'tipo',
            'pagina', r.contexto ->> 'pagina', 'secao', r.contexto ->> 'secao', 'posicao', r.contexto -> 'posicao',
            'antes', r.contexto ->> 'antes', 'depois', r.contexto ->> 'depois', 'descricao', r.description,
            'situacao', public._revisao_situacao(r), 'nota', r.owner_note, 'refeito_vezes', r.refeito_vezes,
            'validado_em', r.validado_em, 'pronto_em', r.done_at,
            'foto', (select m.storage_path from public.materials m
                      where m.request_id = r.id and m.deleted_at is null and m.mime_type like 'image/%'
                      order by m.created_at limit 1),
            'conversa', coalesce((select jsonb_agg(jsonb_build_object('autor', x.autor, 'nome', x.autor_nome,
                                    'texto', x.texto, 'em', x.created_at) order by x.created_at)
                                    from public.request_mensagens x where x.request_id = r.id), '[]'::jsonb))
            order by r.marcador_ordem) from public.requests r where r.rodada_id = d.id), '[]'::jsonb))
        order by d.numero desc) from public.site_rodadas d where d.site_id = s.id and d.situacao = 'enviada'), '[]'::jsonb));
end;
$$;
revoke all on function public.portal_revisao(uuid, uuid) from public, anon;
grant execute on function public.portal_revisao(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Rascunho: salvar e tirar ajuste
-- ---------------------------------------------------------------------
create or replace function public.portal_revisao_salvar(p_site uuid, p_ajuste jsonb, p_cliente uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._revisao_site(p_site, p_cliente); rasc public.site_rodadas; k public.site_marcadores;
        v_id uuid; v_tipo text := p_ajuste ->> 'tipo'; v_pag uuid; v_pag_nome text; v_pos jsonb; v_foto uuid; v_audio uuid;
begin
  if jsonb_typeof(p_ajuste) is distinct from 'object' then raise exception 'ajuste_invalido' using errcode = '22023'; end if;
  if s.revisao_aprovada_em is not null then raise exception 'revisao_encerrada' using errcode = '22023'; end if;
  if v_tipo is null or v_tipo not in ('texto', 'foto', 'tirar', 'mover', 'incluir', 'outro') then
    raise exception 'ajuste_invalido' using errcode = '22023';
  end if;
  begin
    v_id := nullif(p_ajuste ->> 'id', '')::uuid;
    v_pag := nullif(p_ajuste ->> 'pagina_id', '')::uuid;
    v_foto := nullif(p_ajuste ->> 'foto_id', '')::uuid;
    v_audio := nullif(p_ajuste ->> 'audio_id', '')::uuid;
  exception when others then raise exception 'ajuste_invalido' using errcode = '22023';
  end;
  if v_pag is not null then
    select nome into v_pag_nome from public.site_paginas where id = v_pag and site_id = s.id;
    if v_pag_nome is null then raise exception 'pagina_de_outro_site' using errcode = '42501'; end if;
  end if;
  v_pag_nome := coalesce(v_pag_nome, nullif(left(trim(p_ajuste ->> 'pagina'), 80), ''));
  if v_pag_nome is null then raise exception 'pagina_obrigatoria' using errcode = '22023'; end if;
  if jsonb_typeof(p_ajuste -> 'posicao') = 'object' then
    begin
      v_pos := jsonb_build_object('x', round(least(greatest((p_ajuste #>> '{posicao,x}')::numeric, 0), 1), 4),
                                  'y', round(least(greatest((p_ajuste #>> '{posicao,y}')::numeric, 0), 1), 4));
    exception when others then v_pos := null;
    end;
  end if;

  -- Rascunho do site (cria a próxima revisão se não houver); trava contra duas abas
  perform pg_advisory_xact_lock(hashtext('revisao:' || s.id::text));
  select * into rasc from public.site_rodadas where site_id = s.id and situacao = 'rascunho' for update;
  if rasc.id is null then
    insert into public.site_rodadas (tenant_id, site_id, client_id, numero, criada_por)
    values (s.tenant_id, s.id, s.client_id,
            coalesce((select max(numero) from public.site_rodadas where site_id = s.id), 0) + 1, auth.uid())
    returning * into rasc;
  end if;

  if v_id is not null then
    select * into k from public.site_marcadores where id = v_id and rodada_id = rasc.id for update;
    if k.id is null then raise exception 'ajuste_inexistente' using errcode = 'P0002'; end if;
    -- Quem não criou só mexe se for o responsável
    if k.criado_por is distinct from auth.uid() and not public._portal_responsavel(s.client_id) then
      raise exception 'ajuste_de_outra_pessoa' using errcode = '42501';
    end if;
    -- Arquivo novo precisa ser de quem salva; o que já estava no ajuste continua valendo
    if (v_foto is distinct from k.foto_id
          and not public._revisao_arquivo_ok(v_foto, s.client_id, array['image/jpeg', 'image/png', 'image/webp']))
       or (v_audio is distinct from k.audio_id
          and not public._revisao_arquivo_ok(v_audio, s.client_id, array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'])) then
      raise exception 'anexo_invalido' using errcode = '22023';
    end if;
    update public.site_marcadores set tipo = v_tipo, pagina_id = v_pag, pagina_nome = v_pag_nome,
           secao_id = nullif(p_ajuste ->> 'secao_id', ''), secao_nome = nullif(left(trim(p_ajuste ->> 'secao'), 80), ''),
           posicao = v_pos, antes = nullif(left(p_ajuste ->> 'antes', 500), ''),
           depois = nullif(trim(p_ajuste ->> 'depois'), ''), observacao = nullif(trim(p_ajuste ->> 'observacao'), ''),
           foto_id = v_foto, audio_id = v_audio, atualizado_em = now()
     where id = k.id returning * into k;
  else
    if (select count(*) from public.site_marcadores where rodada_id = rasc.id) >= 30 then
      raise exception 'muitos_ajustes' using errcode = '54000';
    end if;
    if not public._revisao_arquivo_ok(v_foto, s.client_id, array['image/jpeg', 'image/png', 'image/webp'])
       or not public._revisao_arquivo_ok(v_audio, s.client_id, array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg']) then
      raise exception 'anexo_invalido' using errcode = '22023';
    end if;
    insert into public.site_marcadores (tenant_id, rodada_id, site_id, tipo, pagina_id, pagina_nome, secao_id, secao_nome,
                                        posicao, antes, depois, observacao, foto_id, audio_id, criado_por)
    values (s.tenant_id, rasc.id, s.id, v_tipo, v_pag, v_pag_nome, nullif(p_ajuste ->> 'secao_id', ''),
            nullif(left(trim(p_ajuste ->> 'secao'), 80), ''), v_pos, nullif(left(p_ajuste ->> 'antes', 500), ''),
            nullif(trim(p_ajuste ->> 'depois'), ''), nullif(trim(p_ajuste ->> 'observacao'), ''), v_foto, v_audio, auth.uid())
    returning * into k;
  end if;
  return jsonb_build_object('id', k.id, 'rodada_id', rasc.id, 'numero', rasc.numero);
exception
  when check_violation then raise exception 'ajuste_invalido' using errcode = '22023';
end;
$$;
revoke all on function public.portal_revisao_salvar(uuid, jsonb, uuid) from public, anon;
grant execute on function public.portal_revisao_salvar(uuid, jsonb, uuid) to authenticated;

create or replace function public.portal_revisao_tirar(p_ajuste uuid, p_cliente uuid default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); k public.site_marcadores;
begin
  select m.* into k from public.site_marcadores m
    join public.site_rodadas d on d.id = m.rodada_id and d.situacao = 'rascunho'
    join public.sites s on s.id = m.site_id and s.client_id = c
   where m.id = p_ajuste for update of m;
  if k.id is null then raise exception 'ajuste_inexistente' using errcode = 'P0002'; end if;
  if k.criado_por is distinct from auth.uid() and not public._portal_responsavel(c) then
    raise exception 'ajuste_de_outra_pessoa' using errcode = '42501';
  end if;
  delete from public.site_marcadores where id = k.id;
end;
$$;
revoke all on function public.portal_revisao_tirar(uuid, uuid) from public, anon;
grant execute on function public.portal_revisao_tirar(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Enviar a revisão: um pedido de ajuste por item, um aviso só
-- ---------------------------------------------------------------------
create or replace function public.portal_revisao_enviar(p_rodada uuid, p_cliente uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); d public.site_rodadas; s public.sites; k record;
        v_proj uuid; n int; i int := 0; r public.requests; adicional boolean; ids uuid[] := '{}';
begin
  select * into d from public.site_rodadas where id = p_rodada and client_id = c for update;
  if d.id is null then raise exception 'revisao_inexistente' using errcode = 'P0002'; end if;
  if d.situacao <> 'rascunho' then raise exception 'revisao_ja_enviada' using errcode = '22023'; end if;
  select * into s from public.sites where id = d.site_id;
  if s.revisao_aprovada_em is not null then raise exception 'revisao_encerrada' using errcode = '22023'; end if;
  if not exists (select 1 from public.site_marcadores where rodada_id = d.id) then
    raise exception 'revisao_vazia' using errcode = '22023';
  end if;
  adicional := d.numero > public._revisao_incluidas();
  select id into v_proj from public.projects where client_id = c
   order by (status = 'andamento') desc, created_at desc limit 1;

  perform pg_advisory_xact_lock(hashtext('pedido:' || c::text));
  for k in select * from public.site_marcadores where rodada_id = d.id order by criado_em loop
    i := i + 1;
    select count(*) + 1 into n from public.requests where client_id = c;
    insert into public.requests (tenant_id, client_id, project_id, code, title, description, origin, site_id, contexto,
                                 created_by, rodada_id, marcador_ordem)
    values (d.tenant_id, c, v_proj, public._sigla_cliente(c) || '-' || lpad(n::text, 2, '0'),
            left(public._revisao_tipo_nome(k.tipo) || ' · ' || coalesce(k.secao_nome, k.pagina_nome), 120),
            nullif(left(concat_ws(E'\n\n', k.depois, case when k.observacao is not null then 'Observação: ' || k.observacao end), 2000), ''),
            'revisao', s.id,
            jsonb_strip_nulls(jsonb_build_object(
              'pagina', k.pagina_nome, 'secao', k.secao_nome, 'tela', '/portal/site/revisar',
              'tipo', k.tipo, 'secao_id', k.secao_id, 'posicao', k.posicao, 'antes', k.antes, 'depois', k.depois,
              'revisao', d.numero, 'provavel_adicional', case when adicional then true end)),
            coalesce(k.criado_por, auth.uid()), d.id, i)
    returning * into r;
    ids := ids || r.id;
    update public.materials set request_id = r.id, project_id = coalesce(project_id, r.project_id)
     where id in (k.foto_id, k.audio_id) and request_id is null;
    -- Linha do tempo do projeto, sem aviso por item (o aviso é um só, abaixo)
    perform public._projeto_evento(d.tenant_id, c, r.project_id, r.id, 'pedido_recebido',
      jsonb_build_object('codigo', r.code, 'titulo', r.title, 'origem', 'revisao', 'site_id', s.id, 'site', s.nome,
                         'pagina', k.pagina_nome, 'secao', k.secao_nome, 'revisao', d.numero),
      'cliente', null);
  end loop;
  delete from public.site_marcadores where rodada_id = d.id;
  update public.site_rodadas set situacao = 'enviada', enviada_em = now(), enviada_por = auth.uid() where id = d.id;
  insert into public.event_outbox (tenant_id, event, payload)
  values (d.tenant_id, 'revisao.enviada', jsonb_build_object('client_id', c, 'site_id', s.id, 'site', s.nome,
          'revisao', d.numero, 'ajustes', i, 'pedidos', to_jsonb(ids), 'provavel_adicional', adicional));
  return jsonb_build_object('numero', d.numero, 'ajustes', i);
end;
$$;
revoke all on function public.portal_revisao_enviar(uuid, uuid) from public, anon;
grant execute on function public.portal_revisao_enviar(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Conferir: "Ficou bom" e "Quero outra mudança"
-- ---------------------------------------------------------------------
create or replace function public._revisao_pedido(p_pedido uuid, p_cliente uuid)
returns public.requests language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_pedido and client_id = p_cliente and origin = 'revisao' for update;
  if r.id is null then raise exception 'pedido_inexistente' using errcode = 'P0002'; end if;
  if r.status <> 'pronto' then raise exception 'ajuste_ainda_nao_pronto' using errcode = '22023'; end if;
  return r;
end;
$$;
revoke all on function public._revisao_pedido(uuid, uuid) from public, anon, authenticated;

create or replace function public.portal_revisao_ficou_bom(p_pedido uuid, p_cliente uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); r public.requests := public._revisao_pedido(p_pedido, c);
begin
  if r.validado_em is not null then return jsonb_build_object('repetido', true); end if;
  update public.requests set validado_em = now(), validado_por = auth.uid() where id = r.id;
  perform public._projeto_evento(r.tenant_id, c, r.project_id, r.id, 'revisao_ficou_bom',
    jsonb_build_object('codigo', r.code, 'titulo', r.title), 'cliente', null);
  return jsonb_build_object('repetido', false);
end;
$$;
revoke all on function public.portal_revisao_ficou_bom(uuid, uuid) from public, anon;
grant execute on function public.portal_revisao_ficou_bom(uuid, uuid) to authenticated;

create or replace function public.portal_revisao_outra_mudanca(p_pedido uuid, p_texto text, p_cliente uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); r public.requests := public._revisao_pedido(p_pedido, c);
        nome text;
begin
  if length(trim(coalesce(p_texto, ''))) < 3 then raise exception 'texto_obrigatorio' using errcode = '22023'; end if;
  if r.validado_em is not null then raise exception 'ajuste_ja_aprovado' using errcode = '22023'; end if;
  if r.refeito_vezes >= 2 then raise exception 'limite_refacao' using errcode = '22023'; end if;
  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Cliente') into nome from public.profiles where id = auth.uid();
  insert into public.request_mensagens (tenant_id, request_id, autor, autor_nome, autor_user, texto)
  values (r.tenant_id, r.id, 'cliente', left(coalesce(nome, 'Cliente'), 80), auth.uid(), left(trim(p_texto), 2000));
  update public.requests set status = 'fazendo', refeito_vezes = refeito_vezes + 1, done_at = null where id = r.id;
  perform public._projeto_evento(r.tenant_id, c, r.project_id, r.id, 'revisao_outra_mudanca',
    jsonb_build_object('codigo', r.code, 'titulo', r.title, 'vez', r.refeito_vezes + 1), 'cliente', 'revisao.outra_mudanca');
  return jsonb_build_object('vez', r.refeito_vezes + 1);
end;
$$;
revoke all on function public.portal_revisao_outra_mudanca(uuid, text, uuid) from public, anon;
grant execute on function public.portal_revisao_outra_mudanca(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 9. Aprovar o site: só o responsável pelo contrato que pode aprovar
-- ---------------------------------------------------------------------
create or replace function public.portal_revisao_aprovar(p_site uuid, p_confirmacoes boolean[], p_cliente uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._revisao_site(p_site, p_cliente); v_proj uuid; abertos int;
begin
  if not (public._portal_responsavel(s.client_id) and public._portal_pode_aprovar(s.client_id)) then
    raise exception 'so_responsavel' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_confirmacoes), 0) <> 3 or false = any (p_confirmacoes) or null = any (p_confirmacoes)
     or exists (select 1 from unnest(p_confirmacoes) x where x is not true) then
    raise exception 'confirmacoes_obrigatorias' using errcode = '22023';
  end if;
  perform 1 from public.sites where id = s.id for update;
  if (select revisao_aprovada_em from public.sites where id = s.id) is not null then
    return jsonb_build_object('repetido', true);
  end if;
  select count(*) into abertos from public.requests
   where site_id = s.id and origin = 'revisao'
     and not (status = 'recusado' or (status = 'pronto' and validado_em is not null));
  if abertos > 0 then raise exception 'ajustes_em_aberto' using errcode = '22023'; end if;
  update public.sites set revisao_aprovada_em = now(), revisao_aprovada_por = auth.uid() where id = s.id;
  -- Fica no histórico de Aprovações (S3) quando há projeto
  select id into v_proj from public.projects where client_id = s.client_id
   order by (status = 'andamento') desc, created_at desc limit 1;
  if v_proj is not null then
    insert into public.approvals (tenant_id, client_id, project_id, title, description, status, decided_at, decided_by, decision_note)
    values (s.tenant_id, s.client_id, v_proj, 'Aprovação final do site', left(s.nome || ' · ' || s.dominio, 1000),
            'aprovada', now(), auth.uid(), 'Aprovado pela revisão do site, com as três confirmações.');
  end if;
  perform public._projeto_evento(s.tenant_id, s.client_id, v_proj, null, 'revisao_site_aprovado',
    jsonb_build_object('site_id', s.id, 'site', s.nome), 'cliente', 'revisao.site_aprovado');
  return jsonb_build_object('repetido', false);
end;
$$;
revoke all on function public.portal_revisao_aprovar(uuid, boolean[], uuid) from public, anon;
grant execute on function public.portal_revisao_aprovar(uuid, boolean[], uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 10. Selo "Meu site" = ajustes esperando o cliente conferir
-- ---------------------------------------------------------------------
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.portal_pendencias(uuid)'::regprocedure);
  novo := replace(d, '''pedidos_andamento'',', '''site'', public._revisao_para_ver(c), ''pedidos_andamento'',');
  if novo = d then raise exception 'portal_pendencias: ponto de troca não encontrado'; end if;
  execute novo;
end $$;

-- ---------------------------------------------------------------------
-- 11. Hub: lista de pedidos com a revisão
-- ---------------------------------------------------------------------
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
       (select count(*) from public.request_anexos x where x.request_id = r.id)::int as prints,
       r.rodada_id, d.numero as revisao_numero, r.marcador_ordem,
       (select count(*) from public.requests x where x.rodada_id = r.rodada_id)::int as revisao_total,
       r.validado_em, r.refeito_vezes
  from public.requests r
  join public.clients c on c.id = r.client_id
  left join public.projects p on p.id = r.project_id
  left join public.sites s on s.id = r.site_id
  left join public.sistemas si on si.id = r.sistema_id
  left join public.site_rodadas d on d.id = r.rodada_id;
