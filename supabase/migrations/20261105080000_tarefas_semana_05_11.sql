-- Tarefas de quinta 05/11 e sexta 06/11 (pedido do Yuri em 05/11): 17 tarefas internas na Central de Tarefas (/app/tarefas).
-- Só dados: não muda tabela nem função. Entram como tipo "interna" (sem projeto), com a frente em "área".
-- Idempotente: uma tarefa com o mesmo título, do tipo interna, não é gravada de novo.
-- Só grava se houver um único dono (tenant) no Hub; senão avisa e não grava nada.
do $$
declare
  v_tenant uuid;
  n int;
  v_base double precision := extract(epoch from now());
begin
  select count(distinct tenant_id), min(tenant_id::text)::uuid into n, v_tenant
    from public.memberships where role = 'owner';
  if n <> 1 then
    raise notice 'Dono do Hub não encontrado ou ambíguo (%): nada gravado.', n;
    return;
  end if;

  insert into public.project_tasks
    (tenant_id, project_id, cycle, area, title, description, position, kind, priority, due_date)
  select v_tenant, null, 1, v.area, v.titulo, v.descricao, v_base + (100 - v.ordem), 'interna', v.prioridade, v.prazo
    from (values
      -- Quinta 05/11 (hoje): o que destrava os outros e o que tem hora
      (1, 'Mansão Mediterrâneo', 'Cobrar a Laura: fotos da mansão na pasta do Drive',
        'Mandar a mensagem hoje cedo e pedir uma data (até amanhã). Sem as fotos, o site da mansão não fecha. Pasta do Drive enviada ontem.',
        date '2026-11-05', 'alta'),
      (2, 'Fora do Papel · conteúdo', 'Gravar o vídeo com o rosto para a Fora do Papel',
        'O roteiro do vídeo com o seu rosto já está pronto (cerca de 35 s). Celular na vertical, luz de janela de frente, cada trecho gravado separado. Mandar o vídeo bruto para revisar o corte e as legendas.',
        date '2026-11-05', 'alta'),
      (3, 'Fora do Papel · conteúdo', 'Postar hoje no Instagram da Fora do Papel',
        'Uma peça por dia no feed. Antes de compartilhar, conferir se a conta aberta é a @somosforadopapel e colar a legenda antes de clicar em Compartilhar.',
        date '2026-11-05', 'alta'),
      (4, 'Mansão Mediterrâneo', 'Postar no Instagram da mansão',
        'Se o post for em colaboração, convidar a @somosforadopapel como colaboradora na hora de postar (Marcar pessoas, Convidar colaborador). A legenda é da mansão.',
        date '2026-11-05', 'alta'),
      (5, 'Fora do Papel · site', 'Decidir o rumo do site da Fora do Papel',
        'Escolher: (a) seguir a Direção C com 3 ajustes (recomendado), (b) mudar só o topo ou o painel, (c) manter o site de hoje e emprestar elementos. Comparativo no canvas. Decidido, os desenhos e os cards andam.',
        date '2026-11-05', 'alta'),
      (6, 'OSAB', 'OSAB: organizar a proposta (o que ouvimos, escopo, o que fica de fora, prazo)',
        'Juntar o que foi conversado com a OSAB e fechar o escopo por escrito: o que está incluído, o que não está incluído e o prazo. O valor vem depois, pelas regras de preço do Hub.',
        date '2026-11-05', 'alta'),
      (7, 'Fora do Papel · site', 'Site Fora do Papel: ajustar o canvas conforme a decisão e aprovar',
        'Claude redesenha os ajustes escolhidos (ex.: Projetos reais no tamanho de hoje, a história caderno, planilha, WhatsApp e e-mail virando uma tela só no topo, painel como janela clara real). Você aprova ainda hoje, para o card sair amanhã cedo.',
        date '2026-11-05', 'normal'),
      (8, 'Psicólogo', 'Psicólogo: enviar o kit de validação ao psicólogo parceiro',
        'Conferir se o documento Kit de validação está completo e enviar: mensagem para ele convidar 5 colegas, roteiro da conversa e tabela de respostas. Enviar já começa a contar as duas semanas de validação.',
        date '2026-11-05', 'normal'),
      -- Sexta 06/11 (amanhã): entregas
      (9, 'OSAB', 'OSAB: montar a proposta no Hub, conferir e enviar',
        'Criar a proposta na oportunidade da OSAB, calcular o valor pelas regras de preço, passar o Antes de enviar e mandar o link pelo WhatsApp.',
        date '2026-11-06', 'alta'),
      (10, 'Junior Soares', 'Junior Soares: finalizar o site e publicar',
        'Conferir no celular e no computador, textos finais, domínio e a demonstração com a mensagem pronta. Depois publicar pelo Lovable.',
        date '2026-11-06', 'alta'),
      (11, 'Mansão Mediterrâneo', 'Mansão: finalizar o site com as fotos novas e publicar',
        'Depende da Laura (tarefa de hoje). Colocar as fotos, conferir no celular, revisar os textos e publicar.',
        date '2026-11-06', 'alta'),
      (12, 'Fora do Papel · conteúdo', 'Revisar o corte e as legendas do vídeo e publicar o Reels',
        'Mandar o vídeo bruto para revisão. Legenda na tela do começo ao fim, porque muita gente assiste sem som. Capa com o texto Quem faz a Fora do Papel. Publicar depois de aprovado.',
        date '2026-11-06', 'normal'),
      (13, 'Junior Soares', 'Junior Soares: post de lançamento do site',
        'No dia em que o site for ao ar: post em colaboração com a @somosforadopapel, no horário em que os seguidores dele estão mais ativos. No dia seguinte, o carrossel do projeto.',
        date '2026-11-06', 'normal'),
      (14, 'Fora do Papel · site', 'Site Fora do Papel: aplicar a decisão (card, código, testes e publicar)',
        'Depende da aprovação do canvas (tarefa de hoje). Fluxo do repositório: card com critérios de aceite, implementação, testes, build e conferência no navegador, envio ao GitHub e publicação pelo Lovable. Meta Lighthouse mobile 90 ou mais.',
        date '2026-11-06', 'normal'),
      (15, 'Catálogo do irmão', 'Catálogo do seu irmão: finalizar para captar clientes e seguidores',
        'Fechar o catálogo, testar no celular, ligar ao WhatsApp dele e combinar como usar (link na bio, stories). Objetivo: seu irmão usar o catálogo e você captar os clientes e seguidores dele.',
        date '2026-11-06', 'normal'),
      (16, 'OSAB', 'OSAB: finalizar o design do site',
        'Fechar o desenho das telas no canvas, com dados de exemplo avisados, e aprovar antes de construir.',
        date '2026-11-06', 'normal'),
      (17, 'Psicólogo', 'Psicólogo: fechar a ideia em uma página',
        'Problema, o que entra no primeiro lançamento, o que fica para depois, modelo (uma marca só, já pronto para marca própria) e o que as 5 conversas precisam responder, incluindo quanto pagariam.',
        date '2026-11-06', 'baixa')
    ) as v(ordem, area, titulo, descricao, prazo, prioridade)
   where not exists (
     select 1 from public.project_tasks t
      where t.tenant_id = v_tenant and t.kind = 'interna' and t.title = v.titulo
   );
end
$$;
