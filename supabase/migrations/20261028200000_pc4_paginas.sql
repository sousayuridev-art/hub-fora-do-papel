-- =====================================================================
-- Hub Fora do Papel · PC-4 · Páginas editadas na própria página
-- Card: docs/cards/PC-4-paginas-na-propria-pagina.md
-- Cada página guarda o formato de dados do Puck: {"root": {"props": {...}}, "content": [{type, props: {id, ...}}]}.
-- Rascunho e publicado separados; versões só por inserção, na publicação.
-- O Yuri cria as páginas e define quais seções o cliente pode adicionar e quais ficam fixas.
-- Gravação do cliente passa por _site_editavel (PC-3): só o site da empresa e com o módulo "paginas".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------
create table public.site_paginas (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete cascade,
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  nome           text not null check (length(trim(nome)) between 2 and 60),
  caminho        text not null check (caminho ~ '^/([a-z0-9-]+(/[a-z0-9-]+)*)?$' and length(caminho) <= 120),
  rascunho       jsonb not null default '{"root": {"props": {}}, "content": []}'::jsonb
                 check (jsonb_typeof(rascunho) = 'object' and pg_column_size(rascunho) <= 524288),
  publicado      jsonb check (publicado is null or (jsonb_typeof(publicado) = 'object' and pg_column_size(publicado) <= 524288)),
  publicado_em   timestamptz,
  versao         integer not null default 1,
  ordem          integer not null default 0,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (site_id, caminho),
  check ((publicado is null) = (publicado_em is null))
);
create index site_paginas_tenant_idx on public.site_paginas (tenant_id);
create trigger site_paginas_tenant_guard before insert or update on public.site_paginas
  for each row execute function public._site_conteudo_tenant();

create table public.site_paginas_versoes (
  id             bigint generated always as identity primary key,
  pagina_id      uuid not null references public.site_paginas (id) on delete cascade,
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  dados          jsonb not null,
  publicado_em   timestamptz not null default now(),
  publicado_por  uuid references auth.users (id) on delete set null
);
create index site_paginas_versoes_pagina_idx on public.site_paginas_versoes (pagina_id, publicado_em desc);
create index site_paginas_versoes_tenant_idx on public.site_paginas_versoes (tenant_id);

-- Seções que o cliente pode usar no site; travada = fica fixa (edita texto, não sai do lugar)
create table public.site_secoes_permitidas (
  site_id    uuid not null references public.sites (id) on delete cascade,
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  tipo       text not null check (tipo ~ '^[A-Z][A-Za-z0-9]{1,40}$'),
  travada    boolean not null default false,
  primary key (site_id, tipo)
);
create index site_secoes_permitidas_tenant_idx on public.site_secoes_permitidas (tenant_id);
create trigger site_secoes_permitidas_tenant_guard before insert or update on public.site_secoes_permitidas
  for each row execute function public._site_conteudo_tenant();

-- ---------------------------------------------------------------------
-- 2. RLS: dono e pessoa do portal com o módulo "paginas" leem; ninguém grava direto
-- ---------------------------------------------------------------------
alter table public.site_paginas enable row level security;
alter table public.site_paginas_versoes enable row level security;
alter table public.site_secoes_permitidas enable row level security;
create policy site_paginas_select on public.site_paginas
  for select to authenticated using (public.pode_editar_site(site_id, 'paginas'));
create policy site_paginas_versoes_select on public.site_paginas_versoes
  for select to authenticated using (
    exists (select 1 from public.site_paginas p where p.id = pagina_id and public.pode_editar_site(p.site_id, 'paginas')));
create policy site_secoes_permitidas_select on public.site_secoes_permitidas
  for select to authenticated using (public.pode_editar_site(site_id, 'paginas'));
revoke all on public.site_paginas, public.site_paginas_versoes, public.site_secoes_permitidas from anon;
revoke insert, update, delete, truncate on public.site_paginas, public.site_paginas_versoes, public.site_secoes_permitidas
  from authenticated;

-- ---------------------------------------------------------------------
-- 3. Validação do formato
-- ---------------------------------------------------------------------
-- Formato do Puck: objeto com root.props (objeto) e content (lista de {type, props: {id}});
-- textos até 2.000 caracteres; até 40 seções; ids únicos. Devolve o problema ou null.
create or replace function public._site_pagina_formato_erro(d jsonb)
returns text language plpgsql immutable as $$
declare item jsonb; ids text[] := '{}'; v jsonb;
begin
  if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d -> 'content') is distinct from 'array'
     or jsonb_typeof(coalesce(d -> 'root' -> 'props', '{}'::jsonb)) <> 'object' then
    return 'formato da página';
  end if;
  if jsonb_array_length(d -> 'content') > 40 then return 'mais de 40 seções'; end if;
  for item in select * from jsonb_array_elements(d -> 'content') loop
    if jsonb_typeof(item) <> 'object' or coalesce(item ->> 'type', '') !~ '^[A-Z][A-Za-z0-9]{1,40}$'
       or jsonb_typeof(item -> 'props') is distinct from 'object' or coalesce(item -> 'props' ->> 'id', '') = '' then
      return 'seção sem tipo ou sem identificação';
    end if;
    if (item -> 'props' ->> 'id') = any (ids) then return 'seção repetida'; end if;
    ids := ids || (item -> 'props' ->> 'id');
  end loop;
  -- Nenhum texto passa de 2.000 caracteres (em qualquer nível)
  for v in select x from jsonb_path_query(d, 'strict $.**') x where jsonb_typeof(x) = 'string' loop
    if length(v #>> '{}') > 2000 then return 'texto com mais de 2.000 caracteres'; end if;
  end loop;
  return null;
end;
$$;

-- Ids das seções de tipos travados, na ordem em que aparecem
create or replace function public._site_pagina_travadas(p_site uuid, d jsonb)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(e.item -> 'props' ->> 'id' order by e.n), '{}')
    from jsonb_array_elements(coalesce(d -> 'content', '[]'::jsonb)) with ordinality e(item, n)
   where exists (select 1 from public.site_secoes_permitidas sp
                  where sp.site_id = p_site and sp.tipo = e.item ->> 'type' and sp.travada);
$$;

-- Posição (índice) de cada seção travada
create or replace function public._site_pagina_posicoes_travadas(p_site uuid, d jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(e.item -> 'props' ->> 'id', e.n), '{}'::jsonb)
    from jsonb_array_elements(coalesce(d -> 'content', '[]'::jsonb)) with ordinality e(item, n)
   where exists (select 1 from public.site_secoes_permitidas sp
                  where sp.site_id = p_site and sp.tipo = e.item ->> 'type' and sp.travada);
$$;

revoke all on function public._site_pagina_formato_erro(jsonb) from public, anon, authenticated;
revoke all on function public._site_pagina_travadas(uuid, jsonb) from public, anon, authenticated;
revoke all on function public._site_pagina_posicoes_travadas(uuid, jsonb) from public, anon, authenticated;

create or replace function public._site_pagina_json(p public.site_paginas)
returns jsonb language sql stable as $$
  select jsonb_build_object('id', p.id, 'site_id', p.site_id, 'nome', p.nome, 'caminho', p.caminho,
    'rascunho', p.rascunho, 'publicado_em', p.publicado_em, 'versao', p.versao, 'atualizado_em', p.atualizado_em,
    'tem_rascunho', p.publicado is distinct from p.rascunho);
$$;
revoke all on function public._site_pagina_json(public.site_paginas) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Hub (dono): criar página e definir seções
-- ---------------------------------------------------------------------
create or replace function public.site_pagina_criar(p_site uuid, p_nome text, p_caminho text, p_dados jsonb default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._site_do_dono(p_site); p public.site_paginas; erro text;
        v_caminho text := lower(trim(coalesce(p_caminho, '')));
        dados jsonb := coalesce(p_dados, '{"root": {"props": {}}, "content": []}'::jsonb);
begin
  if length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_obrigatorio' using errcode = '22023'; end if;
  if v_caminho !~ '^/([a-z0-9-]+(/[a-z0-9-]+)*)?$' then raise exception 'caminho_invalido' using errcode = '22023'; end if;
  erro := public._site_pagina_formato_erro(dados);
  if erro is not null then raise exception 'pagina_invalida' using errcode = '22023', detail = erro; end if;
  if exists (select 1 from public.site_paginas sp where sp.site_id = s.id and sp.caminho = v_caminho) then
    raise exception 'caminho_em_uso' using errcode = '23505';
  end if;
  insert into public.site_paginas (site_id, tenant_id, nome, caminho, rascunho, ordem)
  values (s.id, s.tenant_id, left(trim(p_nome), 60), v_caminho, dados,
          coalesce((select max(ordem) + 1 from public.site_paginas where site_id = s.id), 0))
  returning * into p;
  perform public._site_evento(s.tenant_id, 'site.pagina_criada', s.id, jsonb_build_object('pagina_id', p.id, 'caminho', p.caminho));
  return public._site_pagina_json(p);
end;
$$;

-- Lista completa [{tipo, travada}]: troca as seções permitidas do site
create or replace function public.site_secoes_definir(p_site uuid, p_secoes jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._site_do_dono(p_site);
begin
  if jsonb_typeof(coalesce(p_secoes, '[]'::jsonb)) <> 'array' then raise exception 'secoes_invalidas' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_secoes, '[]'::jsonb)) e
              where coalesce(e ->> 'tipo', '') !~ '^[A-Z][A-Za-z0-9]{1,40}$') then
    raise exception 'secoes_invalidas' using errcode = '22023';
  end if;
  delete from public.site_secoes_permitidas where site_id = s.id;
  insert into public.site_secoes_permitidas (site_id, tenant_id, tipo, travada)
  select distinct on (e ->> 'tipo') s.id, s.tenant_id, e ->> 'tipo', coalesce((e ->> 'travada')::boolean, false)
    from jsonb_array_elements(coalesce(p_secoes, '[]'::jsonb)) e;
  perform public._site_evento(s.tenant_id, 'site.secoes_definidas', s.id, jsonb_build_object('secoes', p_secoes));
  return coalesce((select jsonb_agg(jsonb_build_object('tipo', tipo, 'travada', travada) order by tipo)
                     from public.site_secoes_permitidas where site_id = s.id), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Editor (dono e cliente)
-- ---------------------------------------------------------------------
create or replace function public._site_pagina_editavel(p_id uuid)
returns public.site_paginas language plpgsql security definer set search_path = public as $$
declare p public.site_paginas;
begin
  select * into p from public.site_paginas where id = p_id for update;
  if p.id is null or not (public._site_dono_do_tenant(p.tenant_id) or public.pode_editar_site(p.site_id)) then
    raise exception 'pagina_inexistente' using errcode = 'P0002';
  end if;
  perform public._site_editavel(p.site_id, 'paginas');
  return p;
end;
$$;
revoke all on function public._site_pagina_editavel(uuid) from public, anon, authenticated;

-- Rascunho automático: recusa se outra pessoa salvou depois (versão diferente)
create or replace function public.site_pagina_salvar_rascunho(p_id uuid, p_dados jsonb, p_versao integer)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.site_paginas := public._site_pagina_editavel(p_id); erro text;
begin
  if p_versao is distinct from p.versao then raise exception 'pagina_alterada' using errcode = '40001'; end if;
  erro := public._site_pagina_formato_erro(p_dados);
  if erro is not null then raise exception 'pagina_invalida' using errcode = '22023', detail = erro; end if;
  if p_dados = p.rascunho then return public._site_pagina_json(p); end if;
  update public.site_paginas set rascunho = p_dados, versao = versao + 1, atualizado_em = now()
   where id = p.id returning * into p;
  return public._site_pagina_json(p);
end;
$$;

-- Publica o rascunho. Para o cliente: só seções permitidas, travadas no mesmo lugar e sem marcador pendente.
create or replace function public.site_pagina_publicar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.site_paginas := public._site_pagina_editavel(p_id); dono boolean; erro text; base jsonb; v_tipo text;
begin
  dono := public._site_dono_do_tenant(p.tenant_id);
  erro := public._site_pagina_formato_erro(p.rascunho);
  if erro is not null then raise exception 'pagina_invalida' using errcode = '22023', detail = erro; end if;
  if public._site_tem_marcador(p.rascunho::text) then raise exception 'marcador_pendente' using errcode = '22023'; end if;
  if not dono then
    select e ->> 'type' into v_tipo from jsonb_array_elements(p.rascunho -> 'content') e
     where not exists (select 1 from public.site_secoes_permitidas sp where sp.site_id = p.site_id and sp.tipo = e ->> 'type')
     limit 1;
    if v_tipo is not null then raise exception 'secao_nao_permitida' using errcode = '42501', detail = v_tipo; end if;
    -- Base de comparação das travadas: o que está no ar (ou, na primeira vez, a última versão do dono)
    base := coalesce(p.publicado, (select dados from public.site_paginas_versoes where pagina_id = p.id
                                    order by publicado_em desc limit 1));
    -- Página que a Fora do Papel ainda não publicou não é liberada ao cliente
    if base is null then raise exception 'pagina_nao_liberada' using errcode = '42501'; end if;
    if (public._site_pagina_travadas(p.site_id, base) is distinct from public._site_pagina_travadas(p.site_id, p.rascunho)
                             or public._site_pagina_posicoes_travadas(p.site_id, base)
                                is distinct from public._site_pagina_posicoes_travadas(p.site_id, p.rascunho)) then
      raise exception 'secao_travada' using errcode = '42501';
    end if;
  end if;
  update public.site_paginas set publicado = rascunho, publicado_em = now() where id = p.id returning * into p;
  insert into public.site_paginas_versoes (pagina_id, tenant_id, dados, publicado_por)
  values (p.id, p.tenant_id, p.publicado, auth.uid());
  perform public._site_evento(p.tenant_id, 'site.pagina_publicada', p.site_id,
    jsonb_build_object('pagina_id', p.id, 'caminho', p.caminho));
  return public._site_pagina_json(p);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Leitura pública: só o publicado
-- ---------------------------------------------------------------------
create or replace function public.site_publico_pagina(p_dominio text, p_caminho text)
returns jsonb language sql stable security definer set search_path = public as $$
  select p.publicado
    from public.site_paginas p
    join public.sites s on s.id = p.site_id
   where public._site_dominio(s.dominio) = public._site_dominio(p_dominio)
     and p.caminho = coalesce(nullif(lower(trim(p_caminho)), ''), '/')
     and p.publicado is not null;
$$;
revoke all on function public.site_publico_pagina(text, text) from public;
grant execute on function public.site_publico_pagina(text, text) to anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array['site_pagina_criar(uuid, text, text, jsonb)', 'site_secoes_definir(uuid, jsonb)',
                           'site_pagina_salvar_rascunho(uuid, jsonb, integer)', 'site_pagina_publicar(uuid)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;

-- "Onde é usada" (PC-3) passa a olhar as páginas também
create or replace function public._site_midia_usos(p_path text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(u order by u ->> 'tipo', u ->> 'nome'), '[]'::jsonb) from (
    select jsonb_build_object('tipo', 'artigo', 'id', a.id, 'nome', a.titulo) u
      from public.site_artigos a
     where a.site_id::text = split_part(p_path, '/', 1)
       and (a.capa like '%/' || p_path or a.corpo::text like '%' || p_path || '%')
    union all
    select jsonb_build_object('tipo', 'pagina', 'id', b.id, 'nome', b.chave)
      from public.site_blocos b
     where b.site_id::text = split_part(p_path, '/', 1) and b.valor::text like '%' || p_path || '%'
    union all
    select jsonb_build_object('tipo', 'pagina', 'id', pg.id, 'nome', pg.nome)
      from public.site_paginas pg
     where pg.site_id::text = split_part(p_path, '/', 1)
       and (pg.rascunho::text like '%' || p_path || '%' or coalesce(pg.publicado::text, '') like '%' || p_path || '%')
  ) x;
$$;
revoke all on function public._site_midia_usos(text) from public, anon, authenticated;
