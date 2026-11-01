-- =====================================================================
-- Hub Fora do Papel · HUB-CG-01 · Catálogo de loja no banco do Hub
-- Card: docs/cards/HUB-CG-catalogo.md (PRD "Catálogo da CG editado pelo Hub", 01/11/2026)
-- Mesmo formato do conteúdo do site da Fora do Papel (CMS-1/CMS-3):
--   tabelas com site_id + tenant_id, RLS de leitura para o dono, escrita só por RPC com evento;
--   rascunho nas tabelas e versão publicada (instantâneo validado); o site lê a versão publicada
--   pela função pública site_publico_catalogo(dominio); fotos no bucket público site-midia.
-- Decisão do Yuri (01/11): o catálogo pertence a um site da central de Sites (módulo "catalogo").
-- =====================================================================

-- ---------------------------------------------------------------------
-- Módulo "catalogo" nos sites
-- ---------------------------------------------------------------------
alter table public.sites drop constraint if exists sites_modulos_check;
alter table public.sites add constraint sites_modulos_check
  check (modulos <@ array['paginas', 'artigos', 'portfolio', 'loja', 'contatos', 'catalogo']::text[]);

-- ---------------------------------------------------------------------
-- Tabelas (rascunho)
-- ---------------------------------------------------------------------
create table public.site_catalogo_config (
  site_id            uuid primary key references public.sites (id) on delete cascade,
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  whatsapp           text check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$'),
  endereco           text check (endereco is null or length(endereco) <= 200),
  horario            text check (horario is null or length(horario) <= 200),
  instagram          text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  mostrar_promocoes  boolean not null default true,
  marcas             text[] not null default '{}' check (cardinality(marcas) <= 30),
  -- Fotos fixas do site: hero, fachada, ig1..ig6 → caminho no bucket site-midia
  fotos              jsonb not null default '{}'::jsonb check (jsonb_typeof(fotos) = 'object'),
  atualizado_em      timestamptz not null default now()
);

create table public.site_catalogo_categorias (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites (id) on delete cascade,
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  slug       text not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  nome       text not null check (length(trim(nome)) between 2 and 60),
  foto       text check (foto is null or foto ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$'),
  ordem      integer not null default 0,
  unique (site_id, slug)
);

create table public.site_catalogo_produtos (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id) on delete cascade,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  codigo      integer not null check (codigo between 1 and 999999),
  categoria   uuid not null references public.site_catalogo_categorias (id) on delete restrict,
  nome        text not null check (length(trim(nome)) between 2 and 120),
  marca       text check (marca is null or length(marca) <= 60),
  preco_cents integer check (preco_cents is null or preco_cents between 0 and 100000000),
  tamanhos    text[] not null default '{}' check (cardinality(tamanhos) <= 20),
  -- [{"nome": "Azul", "tom": "#1F3A93"}]
  cores       jsonb not null default '[]'::jsonb check (jsonb_typeof(cores) = 'array' and jsonb_array_length(cores) <= 20),
  selo        text check (selo is null or selo in ('novo', 'mais-vendido', 'promo')),
  promo_pct   integer,
  -- até 4 fotos (a 1ª é a principal), caminhos no bucket site-midia
  fotos       text[] not null default '{}' check (cardinality(fotos) <= 4),
  ordem       integer not null default 0,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (site_id, codigo),
  constraint site_catalogo_promo check (
    (selo = 'promo' and promo_pct between 1 and 90) or (selo is distinct from 'promo' and promo_pct is null))
);
create index site_catalogo_produtos_categoria_idx on public.site_catalogo_produtos (categoria);

create table public.site_catalogo_depoimentos (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites (id) on delete cascade,
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  texto      text not null check (length(trim(texto)) between 3 and 600),
  autor      text not null check (length(trim(autor)) between 2 and 80),
  ordem      integer not null default 0
);

-- Versões publicadas: o instantâneo que o site lê (e o histórico)
create table public.site_catalogo_publicacoes (
  id            bigint generated always as identity primary key,
  site_id       uuid not null references public.sites (id) on delete cascade,
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  versao        integer not null,
  dados         jsonb not null check (pg_column_size(dados) <= 2097152),
  resumo        jsonb not null default '{}'::jsonb,
  publicado_em  timestamptz not null default now(),
  publicado_por uuid,
  unique (site_id, versao)
);

do $$
declare t text;
begin
  foreach t in array array['site_catalogo_config', 'site_catalogo_categorias', 'site_catalogo_produtos',
                           'site_catalogo_depoimentos', 'site_catalogo_publicacoes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_tenant_owner(tenant_id))',
                   t || '_dono_le', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
  end loop;
end $$;

-- Contagem de produtos por categoria (agregação no banco, não na tela)
create view public.v_site_catalogo_categorias with (security_invoker = true) as
select c.*, (select count(*) from public.site_catalogo_produtos p where p.categoria = c.id)::int as produtos
  from public.site_catalogo_categorias c;
revoke all on public.v_site_catalogo_categorias from anon;
grant select on public.v_site_catalogo_categorias to authenticated;

-- ---------------------------------------------------------------------
-- Apoio
-- ---------------------------------------------------------------------
-- Site do catálogo do dono (o cliente edita no P2, com aprovação)
create or replace function public._site_catalogo(p_site uuid)
returns public.sites language plpgsql stable security definer set search_path = public as $$
declare s public.sites;
begin
  select * into s from public.sites where id = p_site and tenant_id = public._tenant_do_dono();
  if s.id is null then raise exception 'site_inexistente' using errcode = 'P0002'; end if;
  if not ('catalogo' = any (s.modulos)) then raise exception 'catalogo_desligado' using errcode = '42501'; end if;
  return s;
end;
$$;

-- Caminho de foto do próprio site (ou nulo)
create or replace function public._site_catalogo_foto(p_site uuid, p_caminho text)
returns text language plpgsql immutable as $$
begin
  if nullif(p_caminho, '') is null then return null; end if;
  if p_caminho !~ ('^' || p_site::text || '/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$') then
    raise exception 'foto_invalida' using errcode = '22023';
  end if;
  return p_caminho;
end;
$$;

-- Centavos: só inteiro (199.90 é recusado). Vazio = nulo.
create or replace function public._centavos(p jsonb)
returns integer language plpgsql immutable as $$
begin
  if p is null or jsonb_typeof(p) = 'null' then return null; end if;
  if jsonb_typeof(p) <> 'number' or (p #>> '{}')::numeric <> trunc((p #>> '{}')::numeric) then
    raise exception 'preco_invalido' using errcode = '22023';
  end if;
  return (p #>> '{}')::numeric::integer;
end;
$$;

-- Catálogo atual (rascunho) no formato que o site lê
create or replace function public._site_catalogo_dados(p_site uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'config', coalesce((select jsonb_build_object('whatsapp', c.whatsapp, 'endereco', c.endereco, 'horario', c.horario,
                          'instagram', c.instagram, 'mostrar_promocoes', c.mostrar_promocoes,
                          'marcas', to_jsonb(c.marcas), 'fotos', c.fotos)
                          from public.site_catalogo_config c where c.site_id = p_site),
                       jsonb_build_object('whatsapp', null, 'endereco', null, 'horario', null, 'instagram', null,
                          'mostrar_promocoes', true, 'marcas', '[]'::jsonb, 'fotos', '{}'::jsonb)),
    'categorias', coalesce((select jsonb_agg(jsonb_build_object('slug', k.slug, 'nome', k.nome, 'foto', k.foto)
                              order by k.ordem, k.nome)
                              from public.site_catalogo_categorias k where k.site_id = p_site), '[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(jsonb_build_object('codigo', p.codigo, 'nome', p.nome, 'categoria', k.slug,
                              'marca', p.marca, 'preco_cents', p.preco_cents, 'tamanhos', to_jsonb(p.tamanhos),
                              'cores', p.cores, 'selo', p.selo, 'promo_pct', p.promo_pct, 'fotos', to_jsonb(p.fotos))
                              order by p.ordem, p.codigo)
                            from public.site_catalogo_produtos p
                            join public.site_catalogo_categorias k on k.id = p.categoria
                           where p.site_id = p_site), '[]'::jsonb),
    'depoimentos', coalesce((select jsonb_agg(jsonb_build_object('texto', d.texto, 'autor', d.autor) order by d.ordem)
                               from public.site_catalogo_depoimentos d where d.site_id = p_site), '[]'::jsonb));
$$;

-- Problemas que bloqueiam a publicação (o site nunca recebe dado quebrado)
create or replace function public._site_catalogo_problemas(d jsonb)
returns text[] language plpgsql immutable as $$
declare p jsonb; probs text[] := '{}'; slugs text[];
begin
  slugs := array(select x ->> 'slug' from jsonb_array_elements(d -> 'categorias') x);
  if coalesce(d #>> '{config,whatsapp}', '') !~ '^[0-9]{10,13}$' then
    probs := probs || 'Informe o WhatsApp da loja (com DDD) em Ajustes da loja.'::text;
  end if;
  if jsonb_array_length(d -> 'produtos') = 0 then
    probs := probs || 'Cadastre pelo menos um produto.'::text;
  end if;
  for p in select * from jsonb_array_elements(d -> 'produtos') loop
    if not ((p ->> 'categoria') = any (slugs)) then
      probs := probs || format('Produto %s (%s): categoria inexistente.', p ->> 'codigo', p ->> 'nome');
    end if;
    if p ->> 'selo' = 'promo' and coalesce((p ->> 'promo_pct')::int, 0) not between 1 and 90 then
      probs := probs || format('Produto %s (%s): promoção sem percentual.', p ->> 'codigo', p ->> 'nome');
    end if;
    if jsonb_array_length(p -> 'fotos') = 0 then
      probs := probs || format('Produto %s (%s): sem foto.', p ->> 'codigo', p ->> 'nome');
    end if;
  end loop;
  return probs;
end;
$$;

create or replace function public._site_catalogo_avisos(d jsonb)
returns text[] language sql immutable as $$
  select coalesce(array_agg(format('Categoria "%s" está sem produtos (aparece vazia no site).', k ->> 'nome')), '{}')
    from jsonb_array_elements(d -> 'categorias') k
   where not exists (select 1 from jsonb_array_elements(d -> 'produtos') p where p ->> 'categoria' = k ->> 'slug');
$$;

do $$
declare f text;
begin
  foreach f in array array['_site_catalogo(uuid)', '_site_catalogo_foto(uuid, text)', '_centavos(jsonb)',
                           '_site_catalogo_dados(uuid)', '_site_catalogo_problemas(jsonb)', '_site_catalogo_avisos(jsonb)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon, authenticated';
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Escrita (só o dono, com evento)
-- ---------------------------------------------------------------------
create or replace function public.site_catalogo_config_salvar(p_site uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site); fotos jsonb := '{}'::jsonb; k text;
begin
  for k in select jsonb_object_keys(coalesce(p_dados -> 'fotos', '{}'::jsonb)) loop
    if k not in ('hero', 'fachada', 'ig1', 'ig2', 'ig3', 'ig4', 'ig5', 'ig6') then
      raise exception 'foto_invalida' using errcode = '22023';
    end if;
    if public._site_catalogo_foto(s.id, p_dados -> 'fotos' ->> k) is not null then
      fotos := fotos || jsonb_build_object(k, p_dados -> 'fotos' ->> k);
    end if;
  end loop;
  insert into public.site_catalogo_config (site_id, tenant_id, whatsapp, endereco, horario, instagram,
                                           mostrar_promocoes, marcas, fotos, atualizado_em)
  values (s.id, s.tenant_id,
          nullif(regexp_replace(coalesce(p_dados ->> 'whatsapp', ''), '\D', '', 'g'), ''),
          nullif(trim(p_dados ->> 'endereco'), ''), nullif(trim(p_dados ->> 'horario'), ''),
          nullif(trim(ltrim(coalesce(p_dados ->> 'instagram', ''), '@')), ''),
          coalesce((p_dados ->> 'mostrar_promocoes')::boolean, true),
          array(select distinct trim(m) from jsonb_array_elements_text(coalesce(p_dados -> 'marcas', '[]'::jsonb)) m
                 where trim(m) <> '' order by 1),
          fotos, now())
  on conflict (site_id) do update set
    whatsapp = excluded.whatsapp, endereco = excluded.endereco, horario = excluded.horario,
    instagram = excluded.instagram, mostrar_promocoes = excluded.mostrar_promocoes, marcas = excluded.marcas,
    fotos = excluded.fotos, atualizado_em = now();
  perform public._site_evento(s.tenant_id, 'site.catalogo_config_salva', s.id, '{}'::jsonb);
  return public._site_catalogo_dados(s.id) -> 'config';
end;
$$;

-- Categoria: cria (sem id) ou renomeia/troca a capa. O slug nasce do nome e não muda.
create or replace function public.site_catalogo_categoria_salvar(p_site uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site); k public.site_catalogo_categorias; base text; v_slug text; n int := 1;
begin
  if p_dados ? 'id' and nullif(p_dados ->> 'id', '') is not null then
    update public.site_catalogo_categorias
       set nome = trim(p_dados ->> 'nome'),
           foto = public._site_catalogo_foto(s.id, p_dados ->> 'foto'),
           ordem = coalesce((p_dados ->> 'ordem')::int, ordem)
     where id = (p_dados ->> 'id')::uuid and site_id = s.id
    returning * into k;
    if k.id is null then raise exception 'categoria_inexistente' using errcode = 'P0002'; end if;
  else
    base := coalesce(nullif(p_dados ->> 'slug', ''),
                     trim(both '-' from regexp_replace(translate(lower(coalesce(p_dados ->> 'nome', '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', '-', 'g')));
    base := left(base, 36);
    if base !~ '^[a-z0-9-]{2,40}$' then raise exception 'nome_invalido' using errcode = '22023'; end if;
    v_slug := base;
    while exists (select 1 from public.site_catalogo_categorias c where c.site_id = s.id and c.slug = v_slug) loop
      n := n + 1; v_slug := base || '-' || n;
    end loop;
    insert into public.site_catalogo_categorias (site_id, tenant_id, slug, nome, foto, ordem)
    values (s.id, s.tenant_id, v_slug, trim(p_dados ->> 'nome'), public._site_catalogo_foto(s.id, p_dados ->> 'foto'),
            coalesce((p_dados ->> 'ordem')::int,
                     (select coalesce(max(ordem), 0) + 1 from public.site_catalogo_categorias where site_id = s.id)))
    returning * into k;
  end if;
  perform public._site_evento(s.tenant_id, 'site.catalogo_categoria_salva', s.id, jsonb_build_object('slug', k.slug, 'titulo', k.nome));
  return to_jsonb(k);
end;
$$;

create or replace function public.site_catalogo_categoria_apagar(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare k public.site_catalogo_categorias; s public.sites;
begin
  select * into k from public.site_catalogo_categorias where id = p_id;
  if k.id is null then raise exception 'categoria_inexistente' using errcode = 'P0002'; end if;
  s := public._site_catalogo(k.site_id);
  if exists (select 1 from public.site_catalogo_produtos where categoria = k.id) then
    raise exception 'categoria_com_produtos' using errcode = '23503';
  end if;
  delete from public.site_catalogo_categorias where id = k.id;
  perform public._site_evento(s.tenant_id, 'site.catalogo_categoria_apagada', s.id, jsonb_build_object('slug', k.slug, 'titulo', k.nome));
end;
$$;

-- Produto: cria (sem id; o código é o próximo) ou atualiza. Preço só em centavos inteiros.
create or replace function public.site_catalogo_produto_salvar(p_site uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site); p public.site_catalogo_produtos; cat uuid; v_fotos text[]; f text;
        v_selo text := nullif(p_dados ->> 'selo', ''); v_pct int := nullif(p_dados ->> 'promo_pct', '')::int;
begin
  select c.id into cat from public.site_catalogo_categorias c
   where c.site_id = s.id and (c.id::text = p_dados ->> 'categoria' or c.slug = p_dados ->> 'categoria');
  if cat is null then raise exception 'categoria_inexistente' using errcode = 'P0002'; end if;
  if v_selo = 'promo' and (v_pct is null or v_pct not between 1 and 90) then
    raise exception 'promo_sem_percentual' using errcode = '22023';
  end if;
  if v_selo is distinct from 'promo' then v_pct := null; end if;
  v_fotos := '{}';
  for f in select jsonb_array_elements_text(coalesce(p_dados -> 'fotos', '[]'::jsonb)) loop
    v_fotos := v_fotos || public._site_catalogo_foto(s.id, f);
  end loop;
  if cardinality(v_fotos) > 4 then raise exception 'fotos_demais' using errcode = '22023'; end if;

  if nullif(p_dados ->> 'id', '') is not null then
    update public.site_catalogo_produtos set
      categoria = cat, nome = trim(p_dados ->> 'nome'), marca = nullif(trim(p_dados ->> 'marca'), ''),
      preco_cents = public._centavos(p_dados -> 'preco_cents'),
      tamanhos = array(select trim(x) from jsonb_array_elements_text(coalesce(p_dados -> 'tamanhos', '[]'::jsonb)) x where trim(x) <> ''),
      cores = coalesce(p_dados -> 'cores', '[]'::jsonb), selo = v_selo, promo_pct = v_pct, fotos = v_fotos,
      atualizado_em = now()
     where id = (p_dados ->> 'id')::uuid and site_id = s.id
    returning * into p;
    if p.id is null then raise exception 'produto_inexistente' using errcode = 'P0002'; end if;
  else
    -- um produto novo por vez (duplo clique não cria dois com o mesmo código)
    perform pg_advisory_xact_lock(hashtextextended('catalogo:' || s.id::text, 0));
    insert into public.site_catalogo_produtos (site_id, tenant_id, codigo, categoria, nome, marca, preco_cents,
                                               tamanhos, cores, selo, promo_pct, fotos, ordem)
    values (s.id, s.tenant_id,
            coalesce(nullif(p_dados ->> 'codigo', '')::int,
                     (select coalesce(max(codigo), 0) + 1 from public.site_catalogo_produtos where site_id = s.id)),
            cat, trim(p_dados ->> 'nome'), nullif(trim(p_dados ->> 'marca'), ''),
            public._centavos(p_dados -> 'preco_cents'),
            array(select trim(x) from jsonb_array_elements_text(coalesce(p_dados -> 'tamanhos', '[]'::jsonb)) x where trim(x) <> ''),
            coalesce(p_dados -> 'cores', '[]'::jsonb), v_selo, v_pct, v_fotos,
            (select coalesce(max(ordem), 0) + 1 from public.site_catalogo_produtos where site_id = s.id))
    returning * into p;
  end if;
  perform public._site_evento(s.tenant_id, 'site.catalogo_produto_salvo', s.id,
    jsonb_build_object('codigo', p.codigo, 'titulo', p.nome, 'preco_cents', p.preco_cents));
  return to_jsonb(p);
end;
$$;

create or replace function public.site_catalogo_produto_apagar(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.site_catalogo_produtos; s public.sites;
begin
  select * into p from public.site_catalogo_produtos where id = p_id;
  if p.id is null then raise exception 'produto_inexistente' using errcode = 'P0002'; end if;
  s := public._site_catalogo(p.site_id);
  delete from public.site_catalogo_produtos where id = p.id;
  perform public._site_evento(s.tenant_id, 'site.catalogo_produto_apagado', s.id, jsonb_build_object('codigo', p.codigo, 'titulo', p.nome));
end;
$$;

create or replace function public.site_catalogo_depoimento_salvar(p_site uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site); d public.site_catalogo_depoimentos;
begin
  if nullif(p_dados ->> 'id', '') is not null then
    update public.site_catalogo_depoimentos set texto = trim(p_dados ->> 'texto'), autor = trim(p_dados ->> 'autor')
     where id = (p_dados ->> 'id')::uuid and site_id = s.id returning * into d;
    if d.id is null then raise exception 'depoimento_inexistente' using errcode = 'P0002'; end if;
  else
    insert into public.site_catalogo_depoimentos (site_id, tenant_id, texto, autor, ordem)
    values (s.id, s.tenant_id, trim(p_dados ->> 'texto'), trim(p_dados ->> 'autor'),
            (select coalesce(max(ordem), 0) + 1 from public.site_catalogo_depoimentos where site_id = s.id))
    returning * into d;
  end if;
  perform public._site_evento(s.tenant_id, 'site.catalogo_depoimento_salvo', s.id, jsonb_build_object('titulo', d.autor));
  return to_jsonb(d);
end;
$$;

create or replace function public.site_catalogo_depoimento_apagar(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d public.site_catalogo_depoimentos; s public.sites;
begin
  select * into d from public.site_catalogo_depoimentos where id = p_id;
  if d.id is null then raise exception 'depoimento_inexistente' using errcode = 'P0002'; end if;
  s := public._site_catalogo(d.site_id);
  delete from public.site_catalogo_depoimentos where id = d.id;
  perform public._site_evento(s.tenant_id, 'site.catalogo_depoimento_apagado', s.id, jsonb_build_object('titulo', d.autor));
end;
$$;

-- Importação (idempotente: reimportar substitui tudo) a partir do formato do site
create or replace function public.site_catalogo_importar(p_site uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site); k jsonb; p jsonb; d jsonb; n int := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('catalogo:' || s.id::text, 0));
  delete from public.site_catalogo_produtos where site_id = s.id;
  delete from public.site_catalogo_categorias where site_id = s.id;
  delete from public.site_catalogo_depoimentos where site_id = s.id;
  perform public.site_catalogo_config_salvar(s.id, coalesce(p_dados -> 'config', '{}'::jsonb));
  for k in select * from jsonb_array_elements(coalesce(p_dados -> 'categorias', '[]'::jsonb)) loop
    n := n + 1;
    perform public.site_catalogo_categoria_salvar(s.id, k || jsonb_build_object('ordem', n));
  end loop;
  for p in select * from jsonb_array_elements(coalesce(p_dados -> 'produtos', '[]'::jsonb)) loop
    perform public.site_catalogo_produto_salvar(s.id, p - 'id');
  end loop;
  for d in select * from jsonb_array_elements(coalesce(p_dados -> 'depoimentos', '[]'::jsonb)) loop
    perform public.site_catalogo_depoimento_salvar(s.id, d - 'id');
  end loop;
  perform public._site_evento(s.tenant_id, 'site.catalogo_importado', s.id, '{}'::jsonb);
  return public.site_catalogo_editor(s.id) -> 'contagem';
end;
$$;

-- ---------------------------------------------------------------------
-- Leitura do Hub e publicação
-- ---------------------------------------------------------------------
create or replace function public.site_catalogo_editor(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site); d jsonb := public._site_catalogo_dados(p_site); ult public.site_catalogo_publicacoes;
begin
  select * into ult from public.site_catalogo_publicacoes where site_id = s.id order by versao desc limit 1;
  return jsonb_build_object(
    'contagem', jsonb_build_object('produtos', jsonb_array_length(d -> 'produtos'),
                                   'categorias', jsonb_array_length(d -> 'categorias'),
                                   'depoimentos', jsonb_array_length(d -> 'depoimentos'),
                                   'marcas', jsonb_array_length(d #> '{config,marcas}'),
                                   'fotos_fixas', (select count(*) from jsonb_object_keys(d #> '{config,fotos}'))),
    'problemas', to_jsonb(public._site_catalogo_problemas(d)),
    'avisos', to_jsonb(public._site_catalogo_avisos(d)),
    'mudou', ult.id is null or ult.dados is distinct from d,
    'ultima', case when ult.id is null then null else jsonb_build_object(
        'versao', ult.versao, 'publicado_em', ult.publicado_em, 'resumo', ult.resumo) end);
end;
$$;

-- Publica o rascunho validado como nova versão. Nada meio-publicado: tudo numa transação.
-- Duplo clique: a segunda chamada espera a primeira e não cria versão repetida.
create or replace function public.site_catalogo_publicar(p_site uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site); d jsonb; probs text[]; ult public.site_catalogo_publicacoes; v int;
begin
  perform pg_advisory_xact_lock(hashtextextended('catalogo:' || s.id::text, 0));
  d := public._site_catalogo_dados(s.id);
  probs := public._site_catalogo_problemas(d);
  if cardinality(probs) > 0 then
    return jsonb_build_object('publicado', false, 'problemas', to_jsonb(probs));
  end if;
  select * into ult from public.site_catalogo_publicacoes where site_id = s.id order by versao desc limit 1;
  if ult.id is not null and ult.dados = d then
    return jsonb_build_object('publicado', false, 'repetido', true, 'versao', ult.versao, 'problemas', '[]'::jsonb);
  end if;
  v := coalesce(ult.versao, 0) + 1;
  insert into public.site_catalogo_publicacoes (site_id, tenant_id, versao, dados, resumo, publicado_por)
  values (s.id, s.tenant_id, v, d,
          jsonb_build_object('produtos', jsonb_array_length(d -> 'produtos'), 'categorias', jsonb_array_length(d -> 'categorias'),
                             'depoimentos', jsonb_array_length(d -> 'depoimentos')),
          auth.uid());
  perform public._site_evento(s.tenant_id, 'site.catalogo_publicado', s.id, jsonb_build_object('versao', v));
  return jsonb_build_object('publicado', true, 'versao', v, 'problemas', '[]'::jsonb);
end;
$$;

create or replace function public.site_catalogo_publicacoes_lista(p_site uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('versao', p.versao, 'publicado_em', p.publicado_em, 'resumo', p.resumo,
           'por', coalesce(nullif(trim(pr.full_name), ''), split_part(u.email, '@', 1))) order by p.versao desc), '[]'::jsonb)
    from public.site_catalogo_publicacoes p
    left join public.profiles pr on pr.id = p.publicado_por
    left join auth.users u on u.id = p.publicado_por
   where p.site_id = (public._site_catalogo(p_site)).id;
$$;

-- O site lê a última versão publicada (chave publishable, sem RLS aberta)
create or replace function public.site_publico_catalogo(p_dominio text)
returns jsonb language sql stable security definer set search_path = public as $$
  select p.dados || jsonb_build_object('versao', p.versao, 'publicado_em', p.publicado_em)
    from public.site_catalogo_publicacoes p
    join public.sites s on s.id = p.site_id
   where public._site_dominio(s.dominio) = public._site_dominio(p_dominio)
     and 'catalogo' = any (s.modulos)
   order by p.versao desc limit 1;
$$;

do $$
declare f text;
begin
  foreach f in array array['site_catalogo_config_salvar(uuid, jsonb)', 'site_catalogo_categoria_salvar(uuid, jsonb)',
                           'site_catalogo_categoria_apagar(uuid)', 'site_catalogo_produto_salvar(uuid, jsonb)',
                           'site_catalogo_produto_apagar(uuid)', 'site_catalogo_depoimento_salvar(uuid, jsonb)',
                           'site_catalogo_depoimento_apagar(uuid)', 'site_catalogo_importar(uuid, jsonb)',
                           'site_catalogo_editor(uuid)', 'site_catalogo_publicar(uuid)',
                           'site_catalogo_publicacoes_lista(uuid)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
revoke all on function public.site_publico_catalogo(text) from public;
grant execute on function public.site_publico_catalogo(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Central de Sites (RD2-8): publicação do catálogo conta como publicação, e a capa do cartão
-- de um site de catálogo é a foto de capa publicada (a primeira seção do site da loja).
-- ---------------------------------------------------------------------
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.sites_resumo()'::regprocedure);
  novo := replace(d, $q$'site.midia_enviada', 'site.negocio_atualizado'];$q$,
                     $q$'site.midia_enviada', 'site.negocio_atualizado', 'site.catalogo_publicado'];$q$);
  if novo = d then raise exception 'sites_resumo: lista de publicações não encontrada'; end if;
  d := novo;
  novo := replace(d, $q$where bl.site_id = b.id and bl.chave = 'inicio.topo' and bl.situacao = 'publicado')),$q$,
                     $q$where bl.site_id = b.id and bl.chave = 'inicio.topo' and bl.situacao = 'publicado'),
          (select jsonb_build_object('tipo', 'foto', 'caminho', pc.dados #>> '{config,fotos,hero}')
             from public.site_catalogo_publicacoes pc
            where pc.site_id = b.id and pc.dados #>> '{config,fotos,hero}' is not null
            order by pc.versao desc limit 1)),$q$);
  if novo = d then raise exception 'sites_resumo: capa não encontrada'; end if;
  execute novo;
end $$;
