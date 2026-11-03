-- =====================================================================
-- CMS-5 · Três frentes e textos da revisão do site (03/11/2026)
-- Origem: documento "Revisão do site · Fora do Papel" e cards SITE-24 e SITE-25 do repositório do site.
--
-- 1. O banco passa a exigir exatamente 3 frentes (sistemas, sites, automacoes): "Inteligência
--    artificial aplicada" e "Automações e integrações" viram o cartão "Automações e inteligência artificial".
-- 2. Troca o texto PUBLICADO de inicio.topo, inicio.frentes e quem-somos pelos textos novos
--    (os mesmos de src/data/paginas.ts do site, validados pelas regras acima).
--    ATENÇÃO: sobrescreve o que estiver publicado nessas três chaves. Se você editou algum
--    desses blocos no Hub desde 27/10, o valor antigo aparece no aviso (NOTICE) da execução.
-- Antes de aplicar em produção: `supabase test db` e o fluxo de docs/banco-de-producao.md.
-- =====================================================================

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
    if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) <> 3 then return 'são exatamente 3 frentes'; end if;
    for e in select * from jsonb_array_elements(v) loop
      i := i + 1;
      if not public._site_so_chaves(e, array['id', 'situacao', 'titulo', 'frase', 'topicos']) then
        return 'frente ' || i || ': só id, situacao, titulo, frase e topicos';
      end if;
      if coalesce(e ->> 'id', '') not in ('sistemas', 'sites', 'automacoes') or (e ->> 'id') = any (ids) then
        return 'frente ' || i || ': id deve ser sistemas, sites ou automacoes, uma vez cada';
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

-- Troca o texto publicado de uma chave do site principal. Se a chave não existe, importa.
create or replace function public._cms5_trocar_texto(p_dominio text, p_chave text, p_valor jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare s public.sites; antigo jsonb;
begin
  select * into s from public.sites where public._site_dominio(dominio) = public._site_dominio(p_dominio);
  if s.id is null then raise exception 'site_inexistente: %', p_dominio using errcode = 'P0002'; end if;
  perform public._site_bloco_validar(p_chave, p_valor);
  if public._site_tem_marcador(p_valor::text) then raise exception 'marcador_pendente' using errcode = '22023'; end if;
  select valor into antigo from public.site_blocos where site_id = s.id and chave = p_chave;
  if antigo is null then
    perform public._site_importar_bloco(p_dominio, p_chave, p_valor);
  elsif antigo is distinct from p_valor then
    raise notice 'CMS-5: % substituído. Valor anterior: %', p_chave, antigo;
    update public.site_blocos set valor = p_valor, situacao = 'publicado', publicado_em = now()
     where site_id = s.id and chave = p_chave;
  end if;
end;
$$;
revoke all on function public._cms5_trocar_texto(text, text, jsonb) from public, anon, authenticated;

-- inicio.topo
select public._cms5_trocar_texto('www.foradopapel.com.br', 'inicio.topo', '{"linha": "Para quem vive entre planilha e WhatsApp", "titulo": "**Sistemas sob medida** para empresas que cresceram mais rápido que as suas planilhas.", "apoio": "Juntamos o WhatsApp, as planilhas e os programas que não conversam em um sistema só, feito para o jeito que a sua equipe trabalha. Menos tempo copiando informação de um lugar para outro, mais tempo para atender e vender.", "link_sites": "Precisa só de um site? Veja os sites que trazem contatos"}'::jsonb);

-- inicio.frentes
select public._cms5_trocar_texto('www.foradopapel.com.br', 'inicio.frentes', '[{"id": "sistemas", "situacao": "Minha equipe vive entre planilhas e programas que não conversam.", "titulo": "Sistemas sob medida e portais", "frase": "Planilhas, papel e vários programas pagos que não conversam viram um sistema só, feito para o seu jeito de trabalhar.", "topicos": ["A fila do dia da equipe, com a mensagem certa já escrita", "O painel do dono: anúncio, venda, equipe e financeiro numa tela só", "Área onde o seu cliente acompanha e aprova", "Os programas que você já usa, ligados ao sistema (nota fiscal, banco, pagamento)"]}, {"id": "sites", "situacao": "Preciso de um site que traga clientes, não só que exista.", "titulo": "Sites que trazem contatos", "frase": "Um site que atende: rápido, preparado para o Google, traz contatos e você mesmo atualiza.", "topicos": ["Página para captar contatos e campanhas", "Site institucional com painel de edição", "Loja virtual em plataforma pronta, quando fizer sentido"]}, {"id": "automacoes", "situacao": "Minha equipe perde horas respondendo mensagens e repetindo as mesmas tarefas.", "titulo": "Automações e inteligência artificial", "frase": "O que alguém da equipe repete todo dia passa a acontecer sozinho. A inteligência artificial lê, organiza e sugere; sua equipe confere e aprova.", "topicos": ["Mensagens do WhatsApp separadas por assunto e urgência", "Respostas sugeridas, prontas para a equipe revisar e enviar", "Contato do site que entra direto no funil de vendas", "Venda que gera nota e cobrança", "Relatório que chega pronto no e-mail"]}]'::jsonb);

-- quem-somos
select public._cms5_trocar_texto('www.foradopapel.com.br', 'quem-somos', '{"titulo": "O projeto termina **com o sistema funcionando.**", "texto": "A Fora do Papel é conduzida pelo Yuri Sousa, que une gestão de projetos e desenvolvimento. Escopo claro, etapas combinadas e a equipe usando o que foi entregue."}'::jsonb);

drop function public._cms5_trocar_texto(text, text, jsonb);
