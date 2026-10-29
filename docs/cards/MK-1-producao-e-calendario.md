# Card MK-1 · Central de conteúdo: produção, aprovação e calendário

> **Origem:** PRD `docs/cards/MK-0-central-de-marketing-prd.md` (29/10/2026).
> **Decisões:** módulo no Hub, grupo "Marketing" no menu; 9 etapas em 5 colunas; "agendado" é dado da versão; regras da marca no banco; publicação manual com link até o MK-5 (Yuri, 29/10).

**Objetivo:** o Yuri planeja, produz, aprova e acompanha cada peça das redes num lugar só, com uma versão própria por canal e as regras da marca conferidas antes da aprovação.

**Não entra:** arquivos ligados à versão e prévia com imagem real (MK-2), IA (MK-3), painel de resultados (MK-4), publicação automática (MK-5), modelos visuais (MK-6), acesso de clientes.

## Requisitos

### Banco (`supabase/migrations/20261029200000_mk1_central_conteudo.sql`)

- **Tabelas** (todas com `tenant_id`, RLS ativa, leitura só do dono por `is_tenant_owner`, escrita só por RPC):
  - `mkt_channels`: canais do tenant (`slug`, nome, ativo, ordem). Começa com Instagram, LinkedIn, TikTok e YouTube para todos os tenants (e para os novos, por gatilho). Canal novo = linha nova, sem migração.
  - `mkt_campaigns`: nome, objetivo, etapa do funil, frente, início e fim (`date`), situação (planejada, ativa, encerrada), descrição, campanha de anúncio opcional (`ad_campaigns`).
  - `mkt_pieces`: a ideia. Título, ideia central, objetivo, etapa do funil, pilar, frente, público, série, direção de arte, campanha, cliente (projeto real) com autorização confirmada, prazo, etapa.
  - `mkt_versions`: a versão por canal. Canal, formato (validado por canal), gancho, texto, roteiro (`[{tempo, fala, na_tela}]`), slides (`[{titulo, texto}]`), chamada (lista do manual), hashtags, avisos (calculados), agendada para, publicada em, link, resultados (`alcance`, `salvamentos`, `cliques`, `mensagens`, inteiros ≥ 0), anúncio opcional (`ad_campaigns`).
  - `mkt_events`: histórico da peça (criada, etapa, aprovada, ajuste pedido, agendada, publicada, resultados), com nota e autor.
- **Formatos por canal:** Instagram (carrossel, post único, Reels, Stories), LinkedIn (texto, documento, artigo, vídeo), TikTok (vídeo, carrossel de fotos), YouTube (Shorts, vídeo longo). Anúncio vale em qualquer canal.
- **Revisão da marca** (`_mkt_avisos(texto)`): marcador `[MAIÚSCULAS]` (bloqueia), TUDO mais de uma vez, mais de uma exclamação, termos evitados do glossário (lead, call, deploy, pipeline, kickoff, onboarding, discovery, CRM sozinho). Recalculada em toda edição.
- **Portas entre etapas** (`mkt_peca_mover`):
  - sair de Ideia/Briefing para Criação exige objetivo, etapa do funil, pilar, ideia central e pelo menos 1 versão;
  - entrar em Aprovação exige texto em todas as versões, nenhum marcador e, com cliente ligado, autorização confirmada;
  - Pronto só por `mkt_peca_aprovar`; Publicado e Analisado só pelas ações da versão.
- **RPCs de dono** (`security definer`, validam tenant e etapa, gravam `mkt_events` na mesma transação):
  - `mkt_canais_listar`, `mkt_campanha_salvar`, `mkt_campanha_remover`, `mkt_campanhas_listar` (com contagem de peças por coluna);
  - `mkt_peca_criar` (título + canais/formatos → cria as versões), `mkt_peca_editar`, `mkt_peca_mover`, `mkt_peca_aprovar`, `mkt_peca_pedir_ajuste` (nota obrigatória, volta para Refinamento), `mkt_peca_remover`;
  - `mkt_versao_adicionar` (pode copiar outra versão como ponto de partida), `mkt_versao_editar`, `mkt_versao_remover` (não remove a última), `mkt_versao_agendar` (só com a peça em Pronto), `mkt_versao_publicar` (link `https`, data não futura), `mkt_versao_resultados` (só publicada);
  - `mkt_pecas_listar(filtros)`, `mkt_peca_detalhe`, `mkt_resumo`, `mkt_calendario(início, fim)` com aviso de pilar repetido no mesmo canal e de excesso de chamada direta.
- **Avanço automático:** todas as versões publicadas → peça em Publicado; todas com resultados → Analisado.
- **Eventos para o n8n:** `marketing.peca_aprovada`, `marketing.versao_agendada`, `marketing.versao_publicada`.
- **Testes pgTAP** `supabase/tests/mk1_central_conteudo.test.sql`.

### Telas

- **Menu:** grupo "Marketing" com "Central de conteúdo" (`/app/marketing`).
- **Cabeçalho:** abas Produção · Calendário · Campanhas; botão principal "Nova peça"; resumo (em criação, para aprovar, prontas, publicadas no mês) vindo do banco.
- **Produção:** quadro de 5 colunas; cartão com canais, etapa, pilar, prazo e avisos; mover por menu; Publicado mostra só os últimos 30 dias por padrão. Filtros por campanha, canal, pilar e objetivo na URL. No celular, lista agrupada por coluna.
- **Painel da peça** (Sheet; bottom sheet no celular; `?peca=<id>`):
  - Briefing: objetivo, etapa do funil, pilar, frente, público, ideia central, série, campanha, cliente e autorização, prazo, direção de arte.
  - Versões em abas por canal: formato, gancho, texto (com contador de caracteres do canal), roteiro em tabela Tempo · Fala · Na tela para vídeo, slides para carrossel e documento, chamada, hashtags, avisos da marca, prévia simples do canal.
  - Ações: avançar etapa, aprovar, pedir ajuste (com nota), agendar, marcar como publicada (link), registrar resultados; histórico.
  - Salva sozinho, com atualização otimista e "Tentar de novo" no erro.
- **Calendário:** mês com as versões agendadas e publicadas, por canal, com os avisos de pilar repetido e de chamada direta; clicar abre a peça.
- **Campanhas:** lista com período, objetivo e contagem por coluna; criar e editar em painel.

## Decidido na revisão (29/10)
Pontos que a implementação definiu além do texto acima; mudar qualquer um é ajuste pequeno.
- **Texto acima do limite do canal:** aviso que não bloqueia (o contador fica vermelho).
- **Mexer depois de aprovar desfaz a aprovação:** editar o texto, adicionar versão ou trocar cliente/autorização numa peça em Pronto volta para Aprovação (ou Refinamento, na versão nova) e tira as datas agendadas, com aviso na tela.
- **Peça com uma versão já publicada:** pode ir e voltar entre criação e aprovação para terminar as outras; não volta ao planejamento e a versão publicada não muda nem sai.
- **Trocar de cliente** zera a autorização.
- **Termos evitados** também incluem white-label, high-ticket e ROI (lista descartada da skill de conteúdo).
- **Ideia central** precisa de pelo menos 10 letras para valer como briefing.
- **Resumo** traz também prazo vencido, agendadas na semana e publicadas sem resultados.
- **Quadro no computador:** cada coluna mostra 12 peças e "Mostrar as N" (Publicado já vem cortado em 30 dias); a lista do celular é virtualizada.

## Critérios de aceite

- [ ] Dado um dono com sessão forte, quando cria "Por que planilha trava" com Instagram (carrossel) e LinkedIn (documento), então a peça nasce em Ideia com 2 versões.
- [ ] Peça sem pilar não passa para Criação; a tela diz o que falta.
- [ ] Versão com `[PREÇO]` no texto bloqueia a entrada em Aprovação; "TUDO" duas vezes aparece como aviso, sem bloquear.
- [ ] Pedido de ajuste sem nota é recusado; com nota, a peça volta para Refinamento e o histórico mostra a nota.
- [ ] Agendar só funciona com a peça em Pronto; publicar exige link `https`; publicar todas as versões leva a peça para Publicado.
- [ ] Dono de outro tenant, cliente do portal e anônimo não leem nem alteram nada (RLS e RPC).
- [ ] Calendário avisa dois posts seguidos do mesmo pilar no mesmo canal.
- [ ] Sem rede, mover uma peça volta ao lugar e mostra o aviso com "Tentar de novo".
- [ ] `supabase test db`, `bun run build`, `bun run lint` e `bun run test` passam.

## Para o Yuri depois de publicar

- Rodar a migração em produção pelo fluxo "Banco de produção" (GitHub Actions).
- Cadastrar as peças já feitas (9 posts e 4 Reels) como Publicado, com link, para o calendário e os resultados começarem completos.
