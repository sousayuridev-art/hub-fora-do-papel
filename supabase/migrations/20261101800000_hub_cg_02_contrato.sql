-- =====================================================================
-- Hub Fora do Papel · HUB-CG (2ª parte) · Contrato do site da CG
-- Card: docs/cards/HUB-CG-catalogo.md · Contrato: docs/integracoes/catalogo-cg/INTEGRACAO-CATALOGO-CG.md
-- 1. Validação da publicação igual ao validarCatalogo do contrato (preço > 0, tamanho, cor, endereço...).
-- 2. Cada versão publicada guarda também o objeto no formato do contrato (camelCase, fotos com URL https).
-- 3. site_catalogo_publicado(dominio): o que o bloco __CG_REMOTE__ do site busca (GET, chave publishable).
-- 4. HTML base do site por site (o "motor"), sobre o qual o Hub injeta os dados ao gerar o arquivo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Validação = validarCatalogo (catalogo-cg.mjs)
-- ---------------------------------------------------------------------
create or replace function public._site_catalogo_problemas(d jsonb)
returns text[] language plpgsql immutable as $$
declare p jsonb; c jsonb; probs text[] := '{}'; slugs text[];
begin
  slugs := array(select x ->> 'slug' from jsonb_array_elements(d -> 'categorias') x);
  if coalesce(d #>> '{config,whatsapp}', '') !~ '^[0-9]{10,13}$' then
    probs := probs || 'Informe o WhatsApp da loja (com DDD) em Ajustes da loja.'::text;
  end if;
  if coalesce(trim(d #>> '{config,endereco}'), '') = '' then
    probs := probs || 'Informe o endereço da loja em Ajustes da loja.'::text;
  end if;
  if coalesce(trim(d #>> '{config,horario}'), '') = '' then
    probs := probs || 'Informe o horário de atendimento em Ajustes da loja.'::text;
  end if;
  if coalesce(trim(d #>> '{config,instagram}'), '') = '' then
    probs := probs || 'Informe o Instagram da loja em Ajustes da loja.'::text;
  end if;
  if jsonb_array_length(d -> 'categorias') = 0 then
    probs := probs || 'Crie pelo menos uma categoria.'::text;
  end if;
  for p in select * from jsonb_array_elements(d -> 'produtos') loop
    if not ((p ->> 'categoria') = any (slugs)) then
      probs := probs || format('Produto %s (%s): categoria inexistente.', p ->> 'codigo', p ->> 'nome');
    end if;
    if coalesce((p ->> 'preco_cents')::int, 0) <= 0 then
      probs := probs || format('Produto %s (%s): informe o preço.', p ->> 'codigo', p ->> 'nome');
    end if;
    if jsonb_array_length(coalesce(p -> 'tamanhos', '[]'::jsonb)) = 0 then
      probs := probs || format('Produto %s (%s): informe pelo menos um tamanho.', p ->> 'codigo', p ->> 'nome');
    end if;
    if jsonb_array_length(coalesce(p -> 'cores', '[]'::jsonb)) = 0 then
      probs := probs || format('Produto %s (%s): informe pelo menos uma cor.', p ->> 'codigo', p ->> 'nome');
    end if;
    for c in select * from jsonb_array_elements(coalesce(p -> 'cores', '[]'::jsonb)) loop
      if coalesce(trim(c ->> 'nome'), '') = '' or coalesce(c ->> 'tom', '') !~ '^#[0-9a-fA-F]{6}$' then
        probs := probs || format('Produto %s (%s): toda cor precisa de nome e tom.', p ->> 'codigo', p ->> 'nome');
        exit;
      end if;
    end loop;
    if p ->> 'selo' = 'promo' and coalesce((p ->> 'promo_pct')::int, 0) not between 1 and 90 then
      probs := probs || format('Produto %s (%s): promoção sem percentual.', p ->> 'codigo', p ->> 'nome');
    end if;
  end loop;
  return probs;
end;
$$;

create or replace function public._site_catalogo_avisos(d jsonb)
returns text[] language sql immutable as $$
  select coalesce(array_agg(a), '{}') from (
    select format('Categoria "%s" está sem produtos (aparece vazia no site).', k ->> 'nome') as a
      from jsonb_array_elements(d -> 'categorias') k
     where not exists (select 1 from jsonb_array_elements(d -> 'produtos') p where p ->> 'categoria' = k ->> 'slug')
    union all
    select format('Produto %s (%s) está sem foto (o site mostra o desenho padrão).', p ->> 'codigo', p ->> 'nome')
      from jsonb_array_elements(d -> 'produtos') p
     where jsonb_array_length(coalesce(p -> 'fotos', '[]'::jsonb)) = 0) x;
$$;

-- ---------------------------------------------------------------------
-- 2. Formato do contrato
-- ---------------------------------------------------------------------
-- "+55 79 99651-6350" a partir dos números guardados
create or replace function public._whatsapp_legivel(p text)
returns text language sql immutable as $$
  select case
    when p ~ '^55[0-9]{11}$' then '+55 ' || substr(p, 3, 2) || ' ' || substr(p, 5, 5) || '-' || substr(p, 10, 4)
    when p ~ '^55[0-9]{10}$' then '+55 ' || substr(p, 3, 2) || ' ' || substr(p, 5, 4) || '-' || substr(p, 9, 4)
    when p ~ '^[0-9]{11}$' then '+55 ' || substr(p, 1, 2) || ' ' || substr(p, 3, 5) || '-' || substr(p, 8, 4)
    when p ~ '^[0-9]{10}$' then '+55 ' || substr(p, 1, 2) || ' ' || substr(p, 3, 4) || '-' || substr(p, 7, 4)
    else '+' || p end;
$$;

-- Dados do Hub → objeto do contrato (camelCase; fotos com a URL pública do bucket)
create or replace function public._site_catalogo_contrato(d jsonb, p_base text)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'config', jsonb_build_object(
      'whatsappNumber', public._whatsapp_legivel(d #>> '{config,whatsapp}'),
      'showPromoBanner', coalesce((d #>> '{config,mostrar_promocoes}')::boolean, true),
      'address', coalesce(d #>> '{config,endereco}', ''),
      'hours', coalesce(d #>> '{config,horario}', ''),
      'instagram', case when coalesce(d #>> '{config,instagram}', '') = '' then '' else '@' || (d #>> '{config,instagram}') end),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', k ->> 'slug', 'name', k ->> 'nome'))
                              from jsonb_array_elements(d -> 'categorias') k), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                              'id', (p ->> 'codigo')::int, 'name', p ->> 'nome', 'category', p ->> 'categoria',
                              'brand', coalesce(p ->> 'marca', ''), 'priceCents', (p ->> 'preco_cents')::int,
                              'sizes', p -> 'tamanhos',
                              'colors', coalesce((select jsonb_agg(jsonb_build_object('n', c ->> 'nome', 'h', c ->> 'tom'))
                                                    from jsonb_array_elements(p -> 'cores') c), '[]'::jsonb),
                              'promoPct', case when p ->> 'selo' = 'promo' then (p ->> 'promo_pct')::int end))
                            -- badge fica explícito (null quando não há selo), como no arquivo original
                            || jsonb_build_object('badge', p -> 'selo'))
                            from jsonb_array_elements(d -> 'produtos') p), '[]'::jsonb),
    'testimonials', coalesce((select jsonb_agg(jsonb_build_object('quote', t ->> 'texto', 'author', t ->> 'autor'))
                                from jsonb_array_elements(d -> 'depoimentos') t), '[]'::jsonb),
    'brands', coalesce(d #> '{config,marcas}', '[]'::jsonb),
    'img', coalesce((select jsonb_object_agg(case when f.key like 'ig%' then 'ig-' || substr(f.key, 3) else f.key end,
                                             p_base || f.value)
                       from jsonb_each_text(coalesce(d #> '{config,fotos}', '{}'::jsonb)) f), '{}'::jsonb)
           || coalesce((select jsonb_object_agg('cat-' || (k ->> 'slug'), p_base || (k ->> 'foto'))
                          from jsonb_array_elements(d -> 'categorias') k where k ->> 'foto' is not null), '{}'::jsonb),
    'productImgs', coalesce((select jsonb_object_agg(p ->> 'codigo',
                                      (select jsonb_agg(p_base || f) from jsonb_array_elements_text(p -> 'fotos') f))
                               from jsonb_array_elements(d -> 'produtos') p
                              where jsonb_array_length(coalesce(p -> 'fotos', '[]'::jsonb)) > 0), '{}'::jsonb));
$$;
revoke all on function public._whatsapp_legivel(text) from public, anon, authenticated;
revoke all on function public._site_catalogo_contrato(jsonb, text) from public, anon, authenticated;

alter table public.site_catalogo_publicacoes add column if not exists contrato jsonb;

-- Publicar recebe a base pública das fotos (URL do bucket site-midia do próprio projeto)
drop function if exists public.site_catalogo_publicar(uuid);
create or replace function public.site_catalogo_publicar(p_site uuid, p_base_fotos text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site); d jsonb; probs text[]; ult public.site_catalogo_publicacoes; v int;
begin
  if coalesce(p_base_fotos, '') !~ '^https://[a-z0-9.-]+(:[0-9]+)?/storage/v1/object/public/site-midia/$' then
    raise exception 'base_fotos_invalida' using errcode = '22023';
  end if;
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
  insert into public.site_catalogo_publicacoes (site_id, tenant_id, versao, dados, contrato, resumo, publicado_por)
  values (s.id, s.tenant_id, v, d, public._site_catalogo_contrato(d, p_base_fotos),
          jsonb_build_object('produtos', jsonb_array_length(d -> 'produtos'), 'categorias', jsonb_array_length(d -> 'categorias'),
                             'depoimentos', jsonb_array_length(d -> 'depoimentos')),
          auth.uid());
  perform public._site_evento(s.tenant_id, 'site.catalogo_publicado', s.id, jsonb_build_object('versao', v));
  return jsonb_build_object('publicado', true, 'versao', v, 'problemas', '[]'::jsonb);
end;
$$;
revoke all on function public.site_catalogo_publicar(uuid, text) from public, anon;
grant execute on function public.site_catalogo_publicar(uuid, text) to authenticated;

-- Objeto do contrato de uma versão (para gerar o arquivo do site no Hub; null = última)
create or replace function public.site_catalogo_contrato(p_site uuid, p_versao int default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select p.contrato from public.site_catalogo_publicacoes p
   where p.site_id = (public._site_catalogo(p_site)).id and (p_versao is null or p.versao = p_versao)
   order by p.versao desc limit 1;
$$;
revoke all on function public.site_catalogo_contrato(uuid, int) from public, anon;
grant execute on function public.site_catalogo_contrato(uuid, int) to authenticated;

-- ---------------------------------------------------------------------
-- 3. O que o site busca (bloco __CG_REMOTE__): objeto do contrato, puro, da última versão
--    GET /rest/v1/rpc/site_catalogo_publicado?p_dominio=... com a chave publishable
-- ---------------------------------------------------------------------
create or replace function public.site_catalogo_publicado(p_dominio text)
returns jsonb language sql stable security definer set search_path = public as $$
  select p.contrato
    from public.site_catalogo_publicacoes p
    join public.sites s on s.id = p.site_id
   where public._site_dominio(s.dominio) = public._site_dominio(p_dominio)
     and 'catalogo' = any (s.modulos) and p.contrato is not null
   order by p.versao desc limit 1;
$$;
revoke all on function public.site_catalogo_publicado(text) from public;
grant execute on function public.site_catalogo_publicado(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. HTML base do site (o "motor"; só muda quando a Fora do Papel entrega design novo)
-- ---------------------------------------------------------------------
create table public.site_catalogo_base (
  site_id        uuid primary key references public.sites (id) on delete cascade,
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  html           text not null check (length(html) <= 8388608),
  nome_arquivo   text check (nome_arquivo is null or length(nome_arquivo) <= 120),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);
alter table public.site_catalogo_base enable row level security;
create policy site_catalogo_base_dono_le on public.site_catalogo_base for select to authenticated
  using (public.is_tenant_owner(tenant_id));
revoke all on public.site_catalogo_base from anon;
revoke insert, update, delete, truncate on public.site_catalogo_base from authenticated;

create or replace function public.site_catalogo_base_salvar(p_site uuid, p_html text, p_nome text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.sites := public._site_catalogo(p_site);
begin
  if position('/*__CG_DATA__*/' in coalesce(p_html, '')) = 0 or position('/*__CG_DATA_END__*/' in p_html) = 0 then
    raise exception 'html_sem_contrato' using errcode = '22023';
  end if;
  if position('/*__CG_REMOTE__*/' in p_html) = 0 or position('/*__CG_REMOTE_END__*/' in p_html) = 0 then
    raise exception 'html_sem_remoto' using errcode = '22023';
  end if;
  insert into public.site_catalogo_base (site_id, tenant_id, html, nome_arquivo, atualizado_por)
  values (s.id, s.tenant_id, p_html, left(p_nome, 120), auth.uid())
  on conflict (site_id) do update set html = excluded.html, nome_arquivo = excluded.nome_arquivo,
    atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public._site_evento(s.tenant_id, 'site.catalogo_base_salva', s.id, jsonb_build_object('titulo', left(p_nome, 120)));
  return jsonb_build_object('tamanho', length(p_html), 'atualizado_em', now());
end;
$$;
revoke all on function public.site_catalogo_base_salvar(uuid, text, text) from public, anon;
grant execute on function public.site_catalogo_base_salvar(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Marcas parceiras mantêm a ordem escolhida (o site mostra nessa ordem); só tira repetidas e vazias
-- ---------------------------------------------------------------------
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.site_catalogo_config_salvar(uuid, jsonb)'::regprocedure);
  novo := replace(d,
    $q$array(select distinct trim(m) from jsonb_array_elements_text(coalesce(p_dados -> 'marcas', '[]'::jsonb)) m
                 where trim(m) <> '' order by 1)$q$,
    $q$array(select x.m from (select trim(m) as m, min(ord) as ord
                                from jsonb_array_elements_text(coalesce(p_dados -> 'marcas', '[]'::jsonb)) with ordinality as e(m, ord)
                               where trim(m) <> '' group by trim(m)) x order by x.ord)$q$);
  if novo = d then raise exception 'site_catalogo_config_salvar: marcas não encontradas'; end if;
  execute novo;
end $$;
