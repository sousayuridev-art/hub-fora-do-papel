-- =====================================================================
-- Hub Fora do Papel · SITE-46 · Revisão da comunicação do site (aprovada pelo Yuri em 16/11)
-- Card: fora-do-papel-blueprint/docs/cards/SITE-46-revisao-da-comunicacao.md
-- Publica os textos novos de topo, perguntas e quem somos no site da Fora do Papel,
-- substituindo os publicados (o import do CMS-4 não sobrescreve). Valores = reserva do site.
-- Sem o site cadastrado (banco de teste), não faz nada.
-- =====================================================================
create or replace function public._site46_publicar(p_chave text, p_valor jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare s public.sites;
begin
  select * into s from public.sites where public._site_dominio(dominio) = public._site_dominio('www.foradopapel.com.br');
  if s.id is null then return; end if;
  perform public._site_bloco_validar(p_chave, p_valor);
  if public._site_tem_marcador(p_valor::text) then raise exception 'marcador_pendente' using errcode = '22023'; end if;
  insert into public.site_blocos (site_id, tenant_id, chave, valor, situacao, publicado_em)
  values (s.id, s.tenant_id, p_chave, p_valor, 'publicado', now())
  on conflict (site_id, chave) do update set valor = excluded.valor, situacao = 'publicado', publicado_em = now();
end $$;
revoke all on function public._site46_publicar(text, jsonb) from public, anon, authenticated;

-- inicio.topo
select public._site46_publicar('inicio.topo', '{"linha":"Sistemas sob medida · sites · automações","titulo":"**Sistemas sob medida** para empresas que cresceram mais rápido que as suas planilhas.","apoio":"Juntamos o WhatsApp, as planilhas e os programas que não conversam num sistema só, feito para a rotina da sua equipe. Menos tempo copiando informação, mais tempo para atender e vender.","link_sites":"Precisa só de um site? Veja os sites que trazem contatos"}'::jsonb);

-- perguntas
select public._site46_publicar('perguntas', '[{"pergunta":"Quanto custa?","resposta":"O valor depende do escopo, das integrações, do conteúdo e do prazo. Depois de uma conversa de 30 minutos, mandamos uma proposta por escrito com tudo o que está incluído.","grupo":"preco","inicio":true},{"pergunta":"Quanto tempo leva?","resposta":"O prazo sai na proposta, junto com as etapas. Depende do escopo e de quando o conteúdo e os acessos chegam do seu lado.","grupo":"preco","inicio":true},{"pergunta":"O diagnóstico é pago?","resposta":"A conversa inicial é gratuita. Em projetos grandes, fazemos antes um diagnóstico pago: como funciona hoje, onde trava e o que resolver primeiro. Se você seguir com o projeto, o valor é abatido.","grupo":"preco","inicio":false},{"pergunta":"E se eu precisar de algo que não estava combinado?","resposta":"Mandamos um orçamento de serviço adicional. Só começamos depois que você aprovar.","grupo":"preco","inicio":false},{"pergunta":"Vocês atendem empresas maiores?","resposta":"Sim. O que define o projeto é o problema, não o tamanho da empresa. Projetos maiores começam por um diagnóstico.","grupo":"trabalho","inicio":false},{"pergunta":"Vocês atendem em todo o Brasil?","resposta":"Sim. A conversa e as reuniões são por vídeo, e o sistema funciona no navegador e no celular.","grupo":"trabalho","inicio":false},{"pergunta":"Preciso trocar o que já uso?","resposta":"Nem sempre. Quando dá, juntamos tudo num sistema só. Quando um programa precisa continuar, como nota fiscal, banco ou pagamento, ligamos ele ao sistema. Confirmamos isso antes da proposta.","grupo":"trabalho","inicio":true},{"pergunta":"Vocês integram com o sistema que já usamos?","resposta":"Na maioria dos casos, sim. Quando dá, juntamos tudo num sistema só; quando um programa precisa continuar (nota fiscal, banco, pagamento), ligamos ele ao sistema. Confirmamos antes de qualquer proposta.","grupo":"trabalho","inicio":false},{"pergunta":"Vocês usam inteligência artificial?","resposta":"Onde ela poupa tempo de verdade: separar mensagens, sugerir respostas, resumir conversas e combinar horários. Uma pessoa da sua equipe sempre confere e aprova.","grupo":"trabalho","inicio":false},{"pergunta":"O que é a mensalidade?","resposta":"O cuidado depois da entrega, em três níveis. Essencial mantém no ar e seguro. Evolução inclui melhorias todo mês. Parceria soma indicadores e uma reunião mensal. Hospedagem e ferramentas são cobradas pelo custo.","grupo":"depois","inicio":false},{"pergunta":"Tem garantia?","resposta":"Sim. Por 30 dias depois da entrega, corrigimos sem custo qualquer falha no que foi combinado.","grupo":"depois","inicio":true},{"pergunta":"O que fica com a minha empresa no fim?","resposta":"Os dados são sempre da sua empresa, e você exporta quando quiser. Domínio e contas das ferramentas ficam no nome da empresa. Sites ficam inteiros com você. Sistemas sob medida são usados com uma licença enquanto a mensalidade estiver ativa; se quiser ficar com o código, a proposta já diz quanto custa.","grupo":"depois","inicio":true},{"pergunta":"Eu consigo atualizar o site sozinho?","resposta":"Sim. O site tem painel de edição para trocar textos e fotos. Lojas em plataforma pronta têm o painel da própria plataforma.","grupo":"depois","inicio":false}]'::jsonb);

-- quem-somos
select public._site46_publicar('quem-somos', '{"titulo":"Yuri Sousa, **do primeiro contato à entrega.**","texto":"Formado em Direito e em Análise de Sistemas, com certificação em gestão de projetos (PMO). O Yuri junta gestão e programação: entende o processo da sua empresa e constrói o sistema. É com ele que você fala do começo ao fim."}'::jsonb);

drop function public._site46_publicar(text, jsonb);
