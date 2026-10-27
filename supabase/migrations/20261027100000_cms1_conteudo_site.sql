-- =====================================================================
-- Hub Fora do Papel · CMS-1 · Banco de conteúdo dos sites
-- Card: docs/cards/CMS-1-banco-de-conteudo.md (PRD: CMS-0-painel-de-conteudo-prd.md)
-- Um registro por site; artigos e blocos de página com situação (rascunho, publicado, arquivado).
-- O dono lê pela RLS e grava só por RPC (com evento no event_outbox na mesma transação).
-- O site lê pelas três RPCs públicas (anon), que devolvem só o que está publicado.
-- Imagens no bucket público site-midia, caminho {site_id}/{arquivo}.
-- =====================================================================

create type public.site_situacao as enum ('rascunho', 'publicado', 'arquivado');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Um site por domínio. client_id vazio = site da própria agência.
create table public.sites (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  client_id  uuid references public.clients (id) on delete restrict,
  nome       text not null check (length(trim(nome)) between 2 and 120),
  dominio    text not null check (dominio ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' and length(dominio) <= 253),
  criado_em  timestamptz not null default now()
);
-- Domínio único com ou sem "www." (www.exemplo.com e exemplo.com são o mesmo site)
create unique index sites_dominio_idx on public.sites ((regexp_replace(dominio, '^www\.', '')));
create index sites_tenant_idx on public.sites (tenant_id);
create index sites_client_idx on public.sites (client_id) where client_id is not null;

-- Artigos. corpo = ConteudoArtigo do site (src/data/conteudo/tipos.ts):
--   { "pontos": [texto, texto, texto], "secoes": [{ "id", "titulo", "blocos": [Bloco] }] }
--   Bloco = texto | {"lista": [texto]} | {"passos": [texto]} | {"dica": texto} | {"exemplo": {"titulo", "texto"}}
--   Dentro dos textos: [texto do link](/caminho) e **destaque**.
create table public.site_artigos (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete cascade,
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  slug           text not null check (slug ~ '^[a-z0-9-]{3,80}$'),
  categoria      text not null check (length(trim(categoria)) between 2 and 60),
  titulo         text not null check (length(trim(titulo)) between 3 and 160),
  titulo_seo     text check (titulo_seo is null or length(titulo_seo) <= 60),
  descricao      text check (descricao is null or length(descricao) <= 155),
  resumo         text check (resumo is null or length(resumo) <= 300),
  capa           text not null default 'cv0'
                 check (capa in ('cv0', 'cv1', 'cv2', 'cv3') or (capa ~ '^https://[^\s]{3,}$' and length(capa) <= 600)),
  corpo          jsonb not null default '{"pontos": ["", "", ""], "secoes": []}'::jsonb
                 check (jsonb_typeof(corpo) = 'object' and pg_column_size(corpo) <= 262144),
  leitura        text check (leitura is null or length(leitura) <= 20),
  autor          text check (autor is null or length(autor) <= 80),
  situacao       public.site_situacao not null default 'rascunho',
  publicado_em   timestamptz,
  ordem          integer not null default 0,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (site_id, slug),
  check (situacao <> 'publicado' or publicado_em is not null)
);
create index site_artigos_lista_idx on public.site_artigos (site_id, situacao, ordem, publicado_em desc);
create index site_artigos_tenant_idx on public.site_artigos (tenant_id);

-- Blocos de página editáveis por campos fixos (formato validado no CMS-4). Chaves previstas:
--   inicio.topo    {linha (40), titulo (90), apoio (300), link_sites (80)}  (a chamada é fixa, não editável)
--   inicio.frentes [{situacao (90), titulo (40), frase (160), topicos [até 6, 90 cada]}] (4 frentes)
--   perguntas      [{pergunta (120), resposta (600)}]
--   projetos       [{nome, linha (120), imagem (url do site-midia), link}]
--   quem-somos     {titulo (60), texto (300)}
create table public.site_blocos (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete cascade,
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  chave          text not null check (chave ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*$' and length(chave) <= 60),
  valor          jsonb not null check (jsonb_typeof(valor) in ('object', 'array') and pg_column_size(valor) <= 65536),
  situacao       public.site_situacao not null default 'rascunho',
  publicado_em   timestamptz,
  atualizado_em  timestamptz not null default now(),
  unique (site_id, chave),
  check (situacao <> 'publicado' or publicado_em is not null)
);
create index site_blocos_tenant_idx on public.site_blocos (tenant_id);

-- ---------------------------------------------------------------------
-- Gatilhos: tenant coerente com o site e com o cliente; atualizado_em automático
-- ---------------------------------------------------------------------
create or replace function public._site_cliente_do_tenant()
returns trigger language plpgsql as $$
begin
  if new.client_id is not null
     and new.tenant_id is distinct from (select tenant_id from public.clients where id = new.client_id) then
    raise exception 'sites.client_id de outro tenant';
  end if;
  return new;
end;
$$;
create trigger sites_tenant_guard before insert or update on public.sites
  for each row execute function public._site_cliente_do_tenant();

create or replace function public._site_conteudo_tenant()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is distinct from (select tenant_id from public.sites where id = new.site_id) then
    raise exception '%.tenant_id difere do tenant do site', tg_table_name;
  end if;
  return new;
end;
$$;
create trigger site_artigos_tenant_guard before insert or update on public.site_artigos
  for each row execute function public._site_conteudo_tenant();
create trigger site_blocos_tenant_guard before insert or update on public.site_blocos
  for each row execute function public._site_conteudo_tenant();

create or replace function public._site_tocar()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
create trigger site_artigos_touch before update on public.site_artigos
  for each row execute function public._site_tocar();
create trigger site_blocos_touch before update on public.site_blocos
  for each row execute function public._site_tocar();

revoke all on function public._site_cliente_do_tenant() from public, anon, authenticated;
revoke all on function public._site_conteudo_tenant() from public, anon, authenticated;
revoke all on function public._site_tocar() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS: só o dono do tenant lê; ninguém grava direto (tudo por RPC)
-- ---------------------------------------------------------------------
alter table public.sites        enable row level security;
alter table public.site_artigos enable row level security;
alter table public.site_blocos  enable row level security;

create policy sites_owner_select on public.sites
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy site_artigos_owner_select on public.site_artigos
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy site_blocos_owner_select on public.site_blocos
  for select to authenticated using (public.is_tenant_owner(tenant_id));

revoke all on public.sites, public.site_artigos, public.site_blocos from anon;
revoke insert, update, delete, truncate on public.sites, public.site_artigos, public.site_blocos from authenticated;

-- ---------------------------------------------------------------------
-- Seed: site da própria agência
-- ---------------------------------------------------------------------
insert into public.sites (tenant_id, client_id, nome, dominio)
select id, null, 'Fora do Papel', 'www.foradopapel.com.br' from public.tenants where slug = 'fora-do-papel'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Storage: bucket público site-midia (leitura pelo endereço público; gravação só do dono)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-midia', 'site-midia', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Caminho {site_id}/{arquivo.jpg|png|webp}; o site tem de ser de um tenant do qual a pessoa é dona
create or replace function public._site_midia_do_dono(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$'
     and exists (select 1 from public.sites s
                  where s.id::text = split_part(p_path, '/', 1) and public.is_tenant_owner(s.tenant_id));
$$;
revoke all on function public._site_midia_do_dono(text) from public, anon;
grant execute on function public._site_midia_do_dono(text) to authenticated;

-- Listar e ler pela API exige select (o Storage também exige ler para apagar ou substituir)
create policy site_midia_ler on storage.objects for select to authenticated
  using (bucket_id = 'site-midia' and public._site_midia_do_dono(name));
create policy site_midia_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'site-midia' and public._site_midia_do_dono(name));
create policy site_midia_substituir on storage.objects for update to authenticated
  using (bucket_id = 'site-midia' and public._site_midia_do_dono(name))
  with check (bucket_id = 'site-midia' and public._site_midia_do_dono(name));
create policy site_midia_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'site-midia' and public._site_midia_do_dono(name));

-- ---------------------------------------------------------------------
-- Apoio
-- ---------------------------------------------------------------------

-- Domínio sem "www.", em minúsculas (a mesma forma do índice único)
create or replace function public._site_dominio(p text)
returns text language sql immutable as $$
  select regexp_replace(lower(trim(coalesce(p, ''))), '^www\.', '');
$$;

-- Marcador pendente ([PREÇO], [NOME DO CLIENTE]...). Link com texto em caixa alta ([FAQ](/x)) não conta.
-- Abrange o padrão do card \[[A-ZÇÃÕ ]+\] e as demais maiúsculas acentuadas.
create or replace function public._site_tem_marcador(p text)
returns boolean language sql immutable as $$
  select coalesce(p, '') ~ '\[[A-ZÀ-Ý][A-ZÀ-Ý ]*\](?!\()';
$$;

-- Texto de um campo do corpo: string não vazia até o limite
create or replace function public._site_texto_ok(p jsonb, p_max int)
returns boolean language sql immutable as $$
  select jsonb_typeof(p) = 'string' and length(p #>> '{}') <= p_max;
$$;

-- Lista de textos (lista e passos do corpo)
create or replace function public._site_lista_ok(p jsonb)
returns boolean language sql immutable as $$
  select jsonb_typeof(p) = 'array' and jsonb_array_length(p) between 1 and 30
     and not exists (select 1 from jsonb_array_elements(p) e where not public._site_texto_ok(e, 2000));
$$;

-- Valida o formato do corpo (ConteudoArtigo). Devolve o problema ou null.
create or replace function public._site_corpo_erro(c jsonb)
returns text language plpgsql immutable as $$
declare s jsonb; b jsonb; k text; ids text[] := '{}';
begin
  if jsonb_typeof(c) <> 'object' or (select count(*) from jsonb_object_keys(c) x where x not in ('pontos', 'secoes')) > 0 then
    return 'corpo deve ter só pontos e secoes';
  end if;
  if jsonb_typeof(c -> 'pontos') is distinct from 'array' or jsonb_array_length(c -> 'pontos') <> 3 then
    return 'pontos deve ter exatamente 3 itens';
  end if;
  if exists (select 1 from jsonb_array_elements(c -> 'pontos') e where not public._site_texto_ok(e, 400)) then
    return 'cada ponto é um texto de até 400 caracteres';
  end if;
  if jsonb_typeof(c -> 'secoes') is distinct from 'array' or jsonb_array_length(c -> 'secoes') > 40 then
    return 'secoes deve ser uma lista de até 40 itens';
  end if;
  for s in select * from jsonb_array_elements(c -> 'secoes') loop
    if jsonb_typeof(s) <> 'object' or coalesce(s ->> 'id', '') !~ '^[a-z0-9-]{1,40}$'
       or not public._site_texto_ok(s -> 'titulo', 160) or length(trim(s ->> 'titulo')) = 0
       or jsonb_typeof(s -> 'blocos') is distinct from 'array' or jsonb_array_length(s -> 'blocos') > 80
       or (select count(*) from jsonb_object_keys(s) x where x not in ('id', 'titulo', 'blocos')) > 0 then
      return 'seção inválida: precisa de id, titulo e blocos';
    end if;
    if (s ->> 'id') = any (ids) then
      return 'id de seção repetido: ' || (s ->> 'id');
    end if;
    ids := ids || (s ->> 'id');
    for b in select * from jsonb_array_elements(s -> 'blocos') loop
      if jsonb_typeof(b) = 'string' then
        if not public._site_texto_ok(b, 4000) or length(trim(b #>> '{}')) = 0 then
          return 'parágrafo vazio ou longo demais na seção ' || (s ->> 'id');
        end if;
        continue;
      end if;
      if jsonb_typeof(b) <> 'object' or (select count(*) from jsonb_object_keys(b)) <> 1 then
        return 'bloco inválido na seção ' || (s ->> 'id');
      end if;
      k := (select x from jsonb_object_keys(b) x);
      if not (case k
          when 'lista' then public._site_lista_ok(b -> k)
          when 'passos' then public._site_lista_ok(b -> k)
          when 'dica' then public._site_texto_ok(b -> k, 2000)
          when 'exemplo' then jsonb_typeof(b -> k) = 'object'
                              and public._site_texto_ok(b -> k -> 'titulo', 160)
                              and public._site_texto_ok(b -> k -> 'texto', 4000)
                              and (select count(*) from jsonb_object_keys(b -> k)) = 2
          else false end) then
        return 'bloco "' || k || '" inválido na seção ' || (s ->> 'id');
      end if;
    end loop;
  end loop;
  return null;
end;
$$;

-- Regras do artigo (formato sempre; completude e marcadores só para o que vai ao ar)
create or replace function public._site_artigo_validar(a public.site_artigos, p_publicar boolean)
returns void language plpgsql stable as $$
declare erro text;
begin
  if coalesce(a.slug, '') !~ '^[a-z0-9-]{3,80}$' then raise exception 'slug_invalido' using errcode = '22023'; end if;
  if length(trim(coalesce(a.titulo, ''))) not between 3 and 160 then raise exception 'titulo_invalido' using errcode = '22023'; end if;
  if length(trim(coalesce(a.categoria, ''))) not between 2 and 60 then raise exception 'categoria_invalida' using errcode = '22023'; end if;
  if length(coalesce(a.titulo_seo, '')) > 60 then raise exception 'titulo_seo_longo' using errcode = '22023'; end if;
  if length(coalesce(a.descricao, '')) > 155 then raise exception 'descricao_longa' using errcode = '22023'; end if;
  if length(coalesce(a.resumo, '')) > 300 then raise exception 'resumo_longo' using errcode = '22023'; end if;
  if length(coalesce(a.leitura, '')) > 20 or length(coalesce(a.autor, '')) > 80 then raise exception 'campo_longo' using errcode = '22023'; end if;
  if not (a.capa in ('cv0', 'cv1', 'cv2', 'cv3') or (a.capa ~ '^https://[^\s]{3,}$' and length(a.capa) <= 600)) then
    raise exception 'capa_invalida' using errcode = '22023';
  end if;
  erro := public._site_corpo_erro(a.corpo);
  if erro is not null then
    raise exception 'corpo_invalido' using errcode = '22023', detail = erro;
  end if;
  if p_publicar then
    if a.titulo_seo is null or a.descricao is null or a.resumo is null then
      raise exception 'falta_seo' using errcode = '22023', detail = 'título SEO, descrição e resumo são obrigatórios para publicar';
    end if;
    if exists (select 1 from jsonb_array_elements_text(a.corpo -> 'pontos') e where length(trim(e)) = 0)
       or jsonb_array_length(a.corpo -> 'secoes') = 0 then
      raise exception 'corpo_incompleto' using errcode = '22023', detail = 'os 3 pontos e ao menos uma seção';
    end if;
    if public._site_tem_marcador(concat_ws(' ', a.titulo, a.titulo_seo, a.descricao, a.resumo, a.categoria,
                                           a.leitura, a.autor, a.corpo::text)) then
      raise exception 'marcador_pendente' using errcode = '22023';
    end if;
  end if;
end;
$$;

-- Aplica as chaves enviadas sobre o artigo (chave ausente = mantém o valor)
create or replace function public._site_artigo_mesclar(a public.site_artigos, j jsonb)
returns public.site_artigos language plpgsql stable as $$
begin
  if j ? 'slug'       then a.slug       := lower(trim(coalesce(j ->> 'slug', ''))); end if;
  if j ? 'categoria'  then a.categoria  := trim(coalesce(j ->> 'categoria', '')); end if;
  if j ? 'titulo'     then a.titulo     := trim(coalesce(j ->> 'titulo', '')); end if;
  if j ? 'titulo_seo' then a.titulo_seo := nullif(trim(coalesce(j ->> 'titulo_seo', '')), ''); end if;
  if j ? 'descricao'  then a.descricao  := nullif(trim(coalesce(j ->> 'descricao', '')), ''); end if;
  if j ? 'resumo'     then a.resumo     := nullif(trim(coalesce(j ->> 'resumo', '')), ''); end if;
  if j ? 'capa'       then a.capa       := coalesce(nullif(trim(coalesce(j ->> 'capa', '')), ''), 'cv0'); end if;
  if j ? 'corpo'      then a.corpo      := coalesce(j -> 'corpo', 'null'::jsonb); end if;
  if j ? 'leitura'    then a.leitura    := nullif(trim(coalesce(j ->> 'leitura', '')), ''); end if;
  if j ? 'autor'      then a.autor      := nullif(trim(coalesce(j ->> 'autor', '')), ''); end if;
  if j ? 'ordem'      then
    if jsonb_typeof(j -> 'ordem') <> 'number' then raise exception 'ordem_invalida' using errcode = '22023'; end if;
    a.ordem := (j ->> 'ordem')::int;
  end if;
  return a;
end;
$$;

-- Artigo novo (ainda não gravado) com os padrões da tabela
create or replace function public._site_artigo_novo(s public.sites)
returns public.site_artigos language sql volatile as $$
  select jsonb_populate_record(null::public.site_artigos, jsonb_build_object(
    'id', gen_random_uuid(), 'site_id', s.id, 'tenant_id', s.tenant_id, 'capa', 'cv0',
    'corpo', '{"pontos": ["", "", ""], "secoes": []}'::jsonb, 'situacao', 'rascunho', 'ordem', 0,
    'criado_em', now(), 'atualizado_em', now()));
$$;

create or replace function public._site_artigo_json(a public.site_artigos)
returns jsonb language sql stable as $$
  select jsonb_build_object('id', a.id, 'site_id', a.site_id, 'slug', a.slug, 'categoria', a.categoria,
    'titulo', a.titulo, 'titulo_seo', a.titulo_seo, 'descricao', a.descricao, 'resumo', a.resumo,
    'capa', a.capa, 'corpo', a.corpo, 'leitura', a.leitura, 'autor', a.autor, 'situacao', a.situacao,
    'publicado_em', a.publicado_em, 'ordem', a.ordem, 'atualizado_em', a.atualizado_em);
$$;

create or replace function public._site_bloco_json(b public.site_blocos)
returns jsonb language sql stable as $$
  select jsonb_build_object('id', b.id, 'site_id', b.site_id, 'chave', b.chave, 'valor', b.valor,
    'situacao', b.situacao, 'publicado_em', b.publicado_em, 'atualizado_em', b.atualizado_em);
$$;

-- Site do dono (sessão forte via _tenant_do_dono)
create or replace function public._site_do_dono(p_site uuid)
returns public.sites language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.sites;
begin
  select * into s from public.sites where id = p_site and tenant_id = t;
  if s.id is null then raise exception 'site_inexistente' using errcode = 'P0002'; end if;
  return s;
end;
$$;

-- Artigo do dono, travado para alteração
create or replace function public._site_artigo_do_dono(p_id uuid)
returns public.site_artigos language plpgsql security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); a public.site_artigos;
begin
  select * into a from public.site_artigos where id = p_id and tenant_id = t for update;
  if a.id is null then raise exception 'artigo_inexistente' using errcode = 'P0002'; end if;
  return a;
end;
$$;

create or replace function public._site_evento(p_tenant uuid, p_evento text, p_site uuid, p_extra jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.event_outbox (tenant_id, event, payload)
  select p_tenant, p_evento,
         jsonb_build_object('site_id', s.id, 'dominio', s.dominio) || coalesce(p_extra, '{}'::jsonb)
    from public.sites s where s.id = p_site;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    '_site_dominio(text)', '_site_tem_marcador(text)', '_site_texto_ok(jsonb, integer)', '_site_lista_ok(jsonb)',
    '_site_corpo_erro(jsonb)', '_site_artigo_validar(public.site_artigos, boolean)',
    '_site_artigo_mesclar(public.site_artigos, jsonb)', '_site_artigo_novo(public.sites)', '_site_artigo_json(public.site_artigos)',
    '_site_bloco_json(public.site_blocos)', '_site_do_dono(uuid)', '_site_artigo_do_dono(uuid)',
    '_site_evento(uuid, text, uuid, jsonb)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon, authenticated';
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RPCs de edição (dono)
-- ---------------------------------------------------------------------

-- Cria (sem "id") ou altera um artigo. Artigo novo nasce rascunho.
-- Artigo já publicado continua no ar: a alteração passa pelas regras de publicação.
-- Opcional: "atualizado_em" para recusar gravação sobre versão mais nova (artigo_alterado).
-- O endereço (slug) não muda depois da primeira publicação, para não quebrar links.
create or replace function public.site_artigo_salvar(p_site uuid, p_dados jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  s public.sites := public._site_do_dono(p_site);
  j jsonb := coalesce(p_dados, '{}'::jsonb);
  a public.site_artigos;
  slug_antes text;
  novo boolean := nullif(j ->> 'id', '') is null;
begin
  if jsonb_typeof(j) <> 'object' then raise exception 'dados_invalidos' using errcode = '22023'; end if;
  if novo then
    a := public._site_artigo_novo(s);
  else
    a := public._site_artigo_do_dono((j ->> 'id')::uuid);
    if a.site_id <> s.id then raise exception 'artigo_inexistente' using errcode = 'P0002'; end if;
    if j ? 'atualizado_em' and (j ->> 'atualizado_em')::timestamptz is distinct from a.atualizado_em then
      raise exception 'artigo_alterado' using errcode = '40001';
    end if;
  end if;
  slug_antes := a.slug;
  a := public._site_artigo_mesclar(a, j);
  perform public._site_artigo_validar(a, a.situacao = 'publicado');
  if not novo and a.publicado_em is not null and a.slug is distinct from slug_antes then
    raise exception 'slug_publicado' using errcode = '22023';
  end if;
  if exists (select 1 from public.site_artigos where site_id = s.id and slug = a.slug and id <> a.id) then
    raise exception 'slug_em_uso' using errcode = '23505';
  end if;

  if novo then
    insert into public.site_artigos select a.* returning * into a;
  else
    update public.site_artigos set
      slug = a.slug, categoria = a.categoria, titulo = a.titulo, titulo_seo = a.titulo_seo, descricao = a.descricao,
      resumo = a.resumo, capa = a.capa, corpo = a.corpo, leitura = a.leitura, autor = a.autor, ordem = a.ordem
     where id = a.id returning * into a;
  end if;

  perform public._site_evento(s.tenant_id, 'site.artigo_salvo', s.id,
    jsonb_build_object('artigo_id', a.id, 'slug', a.slug, 'situacao', a.situacao, 'novo', novo));
  return public._site_artigo_json(a);
end;
$$;

-- Publica (ou republica um arquivado). A data de publicação é a primeira; republicar não a troca.
create or replace function public.site_artigo_publicar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare a public.site_artigos := public._site_artigo_do_dono(p_id);
begin
  perform public._site_artigo_validar(a, true);
  update public.site_artigos set situacao = 'publicado', publicado_em = coalesce(publicado_em, now())
   where id = a.id returning * into a;
  perform public._site_evento(a.tenant_id, 'site.artigo_publicado', a.site_id,
    jsonb_build_object('artigo_id', a.id, 'slug', a.slug));
  return public._site_artigo_json(a);
end;
$$;

-- Tira do ar sem apagar (volta com site_artigo_publicar)
create or replace function public.site_artigo_arquivar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare a public.site_artigos := public._site_artigo_do_dono(p_id);
begin
  update public.site_artigos set situacao = 'arquivado' where id = a.id returning * into a;
  perform public._site_evento(a.tenant_id, 'site.artigo_arquivado', a.site_id,
    jsonb_build_object('artigo_id', a.id, 'slug', a.slug));
  return public._site_artigo_json(a);
end;
$$;

-- Cria ou altera um bloco de página. Bloco novo nasce rascunho; publicado continua no ar
-- (sem marcadores pendentes). O formato de cada chave é validado no CMS-4.
create or replace function public.site_bloco_salvar(p_site uuid, p_chave text, p_valor jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._site_do_dono(p_site); b public.site_blocos; k text := lower(trim(coalesce(p_chave, '')));
begin
  if k !~ '^[a-z0-9-]+(\.[a-z0-9-]+)*$' or length(k) > 60 then raise exception 'chave_invalida' using errcode = '22023'; end if;
  if jsonb_typeof(p_valor) not in ('object', 'array') then raise exception 'valor_invalido' using errcode = '22023'; end if;
  if pg_column_size(p_valor) > 65536 then raise exception 'valor_grande' using errcode = '22023'; end if;
  select * into b from public.site_blocos where site_id = s.id and chave = k for update;
  if b.situacao = 'publicado' and public._site_tem_marcador(p_valor::text) then
    raise exception 'marcador_pendente' using errcode = '22023';
  end if;
  if b.id is null then
    insert into public.site_blocos (site_id, tenant_id, chave, valor) values (s.id, s.tenant_id, k, p_valor) returning * into b;
  else
    update public.site_blocos set valor = p_valor where id = b.id returning * into b;
  end if;
  perform public._site_evento(s.tenant_id, 'site.bloco_salvo', s.id,
    jsonb_build_object('bloco_id', b.id, 'chave', b.chave, 'situacao', b.situacao));
  return public._site_bloco_json(b);
end;
$$;

create or replace function public.site_bloco_publicar(p_site uuid, p_chave text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._site_do_dono(p_site); b public.site_blocos;
begin
  select * into b from public.site_blocos where site_id = s.id and chave = lower(trim(coalesce(p_chave, ''))) for update;
  if b.id is null then raise exception 'bloco_inexistente' using errcode = 'P0002'; end if;
  if public._site_tem_marcador(b.valor::text) then raise exception 'marcador_pendente' using errcode = '22023'; end if;
  update public.site_blocos set situacao = 'publicado', publicado_em = now() where id = b.id returning * into b;
  perform public._site_evento(s.tenant_id, 'site.bloco_publicado', s.id, jsonb_build_object('bloco_id', b.id, 'chave', b.chave));
  return public._site_bloco_json(b);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'site_artigo_salvar(uuid, jsonb)', 'site_artigo_publicar(uuid)', 'site_artigo_arquivar(uuid)',
    'site_bloco_salvar(uuid, text, jsonb)', 'site_bloco_publicar(uuid, text)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RPCs públicas (o site chama com a chave publishable). Só o publicado do domínio pedido.
-- Domínio com ou sem "www.". Domínio desconhecido: lista vazia / null.
-- ---------------------------------------------------------------------

-- Lista para a página de artigos e o mapa do site (sem corpo), na ordem de exibição
create or replace function public.site_publico_artigos(p_dominio text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', a.slug, 'categoria', a.categoria, 'titulo', a.titulo,
           'titulo_seo', a.titulo_seo, 'descricao', a.descricao, 'resumo', a.resumo, 'capa', a.capa,
           'leitura', a.leitura, 'autor', a.autor, 'publicado_em', a.publicado_em, 'atualizado_em', a.atualizado_em)
           order by a.ordem, a.publicado_em desc, a.slug), '[]'::jsonb)
    from public.site_artigos a
    join public.sites s on s.id = a.site_id
   where public._site_dominio(s.dominio) = public._site_dominio(p_dominio)
     and a.situacao = 'publicado';
$$;

-- Um artigo com corpo (null se não existe ou não está publicado)
create or replace function public.site_publico_artigo(p_dominio text, p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('slug', a.slug, 'categoria', a.categoria, 'titulo', a.titulo,
           'titulo_seo', a.titulo_seo, 'descricao', a.descricao, 'resumo', a.resumo, 'capa', a.capa,
           'corpo', a.corpo, 'leitura', a.leitura, 'autor', a.autor,
           'publicado_em', a.publicado_em, 'atualizado_em', a.atualizado_em)
    from public.site_artigos a
    join public.sites s on s.id = a.site_id
   where public._site_dominio(s.dominio) = public._site_dominio(p_dominio)
     and a.slug = lower(trim(coalesce(p_slug, '')))
     and a.situacao = 'publicado';
$$;

-- Blocos publicados como objeto { chave: valor }
create or replace function public.site_publico_blocos(p_dominio text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(b.chave, b.valor), '{}'::jsonb)
    from public.site_blocos b
    join public.sites s on s.id = b.site_id
   where public._site_dominio(s.dominio) = public._site_dominio(p_dominio)
     and b.situacao = 'publicado';
$$;

revoke all on function public.site_publico_artigos(text) from public;
revoke all on function public.site_publico_artigo(text, text) from public;
revoke all on function public.site_publico_blocos(text) from public;
grant execute on function public.site_publico_artigos(text) to anon, authenticated;
grant execute on function public.site_publico_artigo(text, text) to anon, authenticated;
grant execute on function public.site_publico_blocos(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Importação (scripts/importar-site.ts gera a migração que chama esta função).
-- Upsert por site + slug, sempre publicado, com as mesmas regras de publicação.
-- Sem evento: é carga inicial, não ação no painel. Só o banco (postgres) executa.
-- ---------------------------------------------------------------------
create or replace function public._site_importar_artigo(p_dominio text, p_dados jsonb)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare s public.sites; a public.site_artigos; j jsonb := coalesce(p_dados, '{}'::jsonb); v_id uuid;
begin
  select * into s from public.sites where public._site_dominio(dominio) = public._site_dominio(p_dominio);
  if s.id is null then raise exception 'site_inexistente: %', p_dominio using errcode = 'P0002'; end if;
  select * into a from public.site_artigos where site_id = s.id and slug = lower(trim(coalesce(j ->> 'slug', ''))) for update;
  if a.id is null then
    a := public._site_artigo_novo(s);
  end if;
  a := public._site_artigo_mesclar(a, j);
  a.situacao := 'publicado';
  a.publicado_em := coalesce((j ->> 'publicado_em')::timestamptz, a.publicado_em, now());
  perform public._site_artigo_validar(a, true);
  insert into public.site_artigos select a.*
  on conflict (site_id, slug) do update set
    categoria = excluded.categoria, titulo = excluded.titulo, titulo_seo = excluded.titulo_seo,
    descricao = excluded.descricao, resumo = excluded.resumo, capa = excluded.capa, corpo = excluded.corpo,
    leitura = excluded.leitura, autor = excluded.autor, ordem = excluded.ordem,
    situacao = excluded.situacao, publicado_em = excluded.publicado_em
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public._site_importar_artigo(text, jsonb) from public, anon, authenticated;
