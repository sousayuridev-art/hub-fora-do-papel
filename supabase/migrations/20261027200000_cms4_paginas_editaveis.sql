-- =====================================================================
-- Hub Fora do Papel · CMS-4 · Páginas editáveis por campos fixos
-- Card: docs/cards/CMS-4-paginas-editaveis.md (PRD: CMS-0). Espelho no site: SITE-20.
-- Valida o formato de cada chave de site_blocos (o CMS-1 deixou para cá):
--   inicio.topo    {linha (40), titulo (90), apoio (300), link_sites (80)}
--                  a chamada "Marcar uma conversa" e os destinos dos links ficam no código
--   inicio.frentes [{id, situacao (90), titulo (40), frase (160), topicos [1 a 6, 90 cada]}]
--                  as 4 frentes (sistemas, ia, sites, automacoes), uma vez cada
--   perguntas      [{pergunta (120), resposta (600), grupo (preco|trabalho|depois), inicio bool}]
--                  de 1 a 30; de 1 a 6 marcadas para a página inicial; sem pergunta repetida
--   projetos       [{nome (60), linha (120), imagem (url pública do site-midia ou null), link (https://… ou /… ou null)}]
--                  de 1 a 3; sem nome repetido
--   quem-somos     {titulo (60), texto (300)}
-- Títulos (topo e quem-somos) aceitam um destaque **assim**; o limite conta sem os asteriscos.
-- Textos obrigatórios (não vazios). Só os campos listados. Marcador pendente segue a regra do CMS-1:
-- aceito em rascunho, recusado ao publicar ou ao salvar bloco já publicado.
-- As mesmas regras estão no site (src/lib/blocos.ts) e no Hub (src/lib/paginasSite.ts).
-- =====================================================================

-- Texto obrigatório até o limite (em caracteres). Campo ausente = false (nunca null).
create or replace function public._site_campo_ok(p jsonb, p_max int)
returns boolean language sql immutable as $$
  select coalesce(jsonb_typeof(p) = 'string' and length(trim(p #>> '{}')) > 0 and length(p #>> '{}') <= p_max, false);
$$;

-- Título com no máximo um destaque **assim**; o limite conta sem os asteriscos
create or replace function public._site_titulo_ok(p jsonb, p_max int)
returns boolean language sql immutable as $$
  select coalesce(jsonb_typeof(p) = 'string'
     and (p #>> '{}') ~ '^[^*]*(\*\*[^*]+\*\*[^*]*)?$'
     and length(trim(replace(p #>> '{}', '**', ''))) > 0
     and length(replace(p #>> '{}', '**', '')) <= p_max, false);
$$;

-- Objeto só com as chaves permitidas
create or replace function public._site_so_chaves(p jsonb, p_chaves text[])
returns boolean language sql immutable as $$
  select coalesce(jsonb_typeof(p) = 'object', false)
     and not exists (select 1 from jsonb_object_keys(p) k where k <> all (p_chaves));
$$;

-- Valida o valor de uma chave de página. Devolve o problema (em português) ou null.
create or replace function public._site_bloco_erro(p_chave text, v jsonb)
returns text language plpgsql immutable as $$
declare e jsonb; t jsonb; ids text[] := '{}'; nomes text[] := '{}'; n_inicio int := 0; i int := 0;
begin
  case p_chave
  when 'inicio.topo' then
    if not public._site_so_chaves(v, array['linha', 'titulo', 'apoio', 'link_sites']) then
      return 'o topo tem só linha, titulo, apoio e link_sites';
    end if;
    if not public._site_campo_ok(v -> 'linha', 40) then return 'linha acima do título: obrigatória, até 40 caracteres'; end if;
    if not public._site_titulo_ok(v -> 'titulo', 90) then return 'título: obrigatório, até 90 caracteres e no máximo um destaque'; end if;
    if not public._site_campo_ok(v -> 'apoio', 300) then return 'texto de apoio: obrigatório, até 300 caracteres'; end if;
    if not public._site_campo_ok(v -> 'link_sites', 80) then return 'link para sites: obrigatório, até 80 caracteres'; end if;

  when 'inicio.frentes' then
    if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) <> 4 then return 'são exatamente 4 frentes'; end if;
    for e in select * from jsonb_array_elements(v) loop
      i := i + 1;
      if not public._site_so_chaves(e, array['id', 'situacao', 'titulo', 'frase', 'topicos']) then
        return 'frente ' || i || ': só id, situacao, titulo, frase e topicos';
      end if;
      if coalesce(e ->> 'id', '') not in ('sistemas', 'ia', 'sites', 'automacoes') or (e ->> 'id') = any (ids) then
        return 'frente ' || i || ': id deve ser sistemas, ia, sites ou automacoes, uma vez cada';
      end if;
      ids := ids || (e ->> 'id');
      if not public._site_campo_ok(e -> 'situacao', 90) then return 'frente ' || i || ': situação obrigatória, até 90 caracteres'; end if;
      if not public._site_campo_ok(e -> 'titulo', 40) then return 'frente ' || i || ': título obrigatório, até 40 caracteres'; end if;
      if not public._site_campo_ok(e -> 'frase', 160) then return 'frente ' || i || ': frase obrigatória, até 160 caracteres'; end if;
      if jsonb_typeof(e -> 'topicos') is distinct from 'array' or jsonb_array_length(e -> 'topicos') not between 1 and 6 then
        return 'frente ' || i || ': de 1 a 6 tópicos';
      end if;
      for t in select * from jsonb_array_elements(e -> 'topicos') loop
        if not public._site_campo_ok(t, 90) then return 'frente ' || i || ': cada tópico até 90 caracteres, sem ficar vazio'; end if;
      end loop;
    end loop;

  when 'perguntas' then
    if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) not between 1 and 30 then return 'de 1 a 30 perguntas'; end if;
    for e in select * from jsonb_array_elements(v) loop
      i := i + 1;
      if not public._site_so_chaves(e, array['pergunta', 'resposta', 'grupo', 'inicio']) then
        return 'pergunta ' || i || ': só pergunta, resposta, grupo e inicio';
      end if;
      if not public._site_campo_ok(e -> 'pergunta', 120) then return 'pergunta ' || i || ': obrigatória, até 120 caracteres'; end if;
      if not public._site_campo_ok(e -> 'resposta', 600) then return 'pergunta ' || i || ': resposta obrigatória, até 600 caracteres'; end if;
      if coalesce(e ->> 'grupo', '') not in ('preco', 'trabalho', 'depois') then return 'pergunta ' || i || ': grupo inválido'; end if;
      if jsonb_typeof(e -> 'inicio') is distinct from 'boolean' then return 'pergunta ' || i || ': inicio deve ser sim ou não'; end if;
      if (e ->> 'pergunta') = any (nomes) then return 'pergunta ' || i || ': repetida'; end if;
      nomes := nomes || (e ->> 'pergunta');
      if (e ->> 'inicio')::boolean then n_inicio := n_inicio + 1; end if;
    end loop;
    if n_inicio not between 1 and 6 then return 'marque de 1 a 6 perguntas para a página inicial'; end if;

  when 'projetos' then
    if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) not between 1 and 3 then return 'de 1 a 3 projetos'; end if;
    for e in select * from jsonb_array_elements(v) loop
      i := i + 1;
      if not public._site_so_chaves(e, array['nome', 'linha', 'imagem', 'link']) then
        return 'projeto ' || i || ': só nome, linha, imagem e link';
      end if;
      if not public._site_campo_ok(e -> 'nome', 60) then return 'projeto ' || i || ': nome obrigatório, até 60 caracteres'; end if;
      if not public._site_campo_ok(e -> 'linha', 120) then return 'projeto ' || i || ': linha obrigatória, até 120 caracteres'; end if;
      if coalesce(jsonb_typeof(e -> 'imagem'), 'null') <> 'null' and (
           jsonb_typeof(e -> 'imagem') <> 'string'
           or (e ->> 'imagem') !~ '^https://[a-z0-9.-]+(:[0-9]+)?/storage/v1/object/public/site-midia/[A-Za-z0-9._/-]+\.(jpe?g|png|webp)$') then
        return 'projeto ' || i || ': a imagem precisa ser da Mídia do site (JPG, PNG ou WebP)';
      end if;
      if coalesce(jsonb_typeof(e -> 'link'), 'null') <> 'null' and (
           jsonb_typeof(e -> 'link') <> 'string' or length(e ->> 'link') > 300
           or (e ->> 'link') !~ '^(https://[^\s"''<>]+|/[A-Za-z0-9/#?=&_.-]*)$') then
        return 'projeto ' || i || ': o link precisa começar com https:// ou / (até 300 caracteres)';
      end if;
      if (e ->> 'nome') = any (nomes) then return 'projeto ' || i || ': nome repetido'; end if;
      nomes := nomes || (e ->> 'nome');
    end loop;

  when 'quem-somos' then
    if not public._site_so_chaves(v, array['titulo', 'texto']) then return 'quem somos tem só titulo e texto'; end if;
    if not public._site_titulo_ok(v -> 'titulo', 60) then return 'título: obrigatório, até 60 caracteres e no máximo um destaque'; end if;
    if not public._site_campo_ok(v -> 'texto', 300) then return 'texto: obrigatório, até 300 caracteres'; end if;

  else
    return 'chave desconhecida';
  end case;
  return null;
end;
$$;

-- Recusa com o motivo no detalhe (o Hub mostra a frase)
create or replace function public._site_bloco_validar(p_chave text, v jsonb)
returns void language plpgsql immutable as $$
declare problema text := public._site_bloco_erro(p_chave, v);
begin
  if problema = 'chave desconhecida' then raise exception 'chave_invalida' using errcode = '22023'; end if;
  if problema is not null then raise exception 'bloco_invalido' using errcode = '22023', detail = problema; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- RPCs de edição (substituem as do CMS-1, mesma assinatura e mesmas permissões)
-- ---------------------------------------------------------------------

-- Cria ou altera um bloco. Novo nasce rascunho; publicado continua no ar (sem marcador pendente).
create or replace function public.site_bloco_salvar(p_site uuid, p_chave text, p_valor jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._site_do_dono(p_site); b public.site_blocos; k text := lower(trim(coalesce(p_chave, '')));
begin
  if k !~ '^[a-z0-9-]+(\.[a-z0-9-]+)*$' or length(k) > 60 then raise exception 'chave_invalida' using errcode = '22023'; end if;
  if jsonb_typeof(p_valor) not in ('object', 'array') then raise exception 'valor_invalido' using errcode = '22023'; end if;
  if pg_column_size(p_valor) > 65536 then raise exception 'valor_grande' using errcode = '22023'; end if;
  perform public._site_bloco_validar(k, p_valor);
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

-- Publica. Confere o formato de novo (bloco gravado antes desta migração pode estar fora dele).
create or replace function public.site_bloco_publicar(p_site uuid, p_chave text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._site_do_dono(p_site); b public.site_blocos;
begin
  select * into b from public.site_blocos where site_id = s.id and chave = lower(trim(coalesce(p_chave, ''))) for update;
  if b.id is null then raise exception 'bloco_inexistente' using errcode = 'P0002'; end if;
  perform public._site_bloco_validar(b.chave, b.valor);
  if public._site_tem_marcador(b.valor::text) then raise exception 'marcador_pendente' using errcode = '22023'; end if;
  update public.site_blocos set situacao = 'publicado', publicado_em = now() where id = b.id returning * into b;
  perform public._site_evento(s.tenant_id, 'site.bloco_publicado', s.id, jsonb_build_object('bloco_id', b.id, 'chave', b.chave));
  return public._site_bloco_json(b);
end;
$$;

-- ---------------------------------------------------------------------
-- Importação dos textos atuais do site (scripts/importar-paginas.ts gera a migração que chama esta função).
-- Grava publicado só se a chave ainda não existe no site: rodar de novo NÃO apaga edições
-- feitas no Hub (on conflict do nothing). Mesmas regras de formato. Sem evento: é carga inicial.
-- Devolve true se gravou, false se a chave já existia.
-- ---------------------------------------------------------------------
create or replace function public._site_importar_bloco(p_dominio text, p_chave text, p_valor jsonb)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare s public.sites; v_id uuid;
begin
  select * into s from public.sites where public._site_dominio(dominio) = public._site_dominio(p_dominio);
  if s.id is null then raise exception 'site_inexistente: %', p_dominio using errcode = 'P0002'; end if;
  perform public._site_bloco_validar(p_chave, p_valor);
  if public._site_tem_marcador(p_valor::text) then raise exception 'marcador_pendente' using errcode = '22023'; end if;
  insert into public.site_blocos (site_id, tenant_id, chave, valor, situacao, publicado_em)
  values (s.id, s.tenant_id, p_chave, p_valor, 'publicado', now())
  on conflict (site_id, chave) do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    '_site_campo_ok(jsonb, integer)', '_site_titulo_ok(jsonb, integer)', '_site_so_chaves(jsonb, text[])',
    '_site_bloco_erro(text, jsonb)', '_site_bloco_validar(text, jsonb)', '_site_importar_bloco(text, text, jsonb)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon, authenticated';
  end loop;
  foreach f in array array['site_bloco_salvar(uuid, text, jsonb)', 'site_bloco_publicar(uuid, text)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;

comment on table public.site_blocos is
  'Blocos de página editáveis por campos fixos (CMS-1). Formato de cada chave validado por _site_bloco_erro (CMS-4).';
