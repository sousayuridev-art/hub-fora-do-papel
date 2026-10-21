# Hub Fora do Papel · Análise crítica de 8 menus (21/10/2026)

**Como foi feita**
- As telas foram abertas de verdade, com o código atual, num banco de testes com dados **fictícios**: 12 empresas, 3 projetos, cobranças, campanhas e reuniões. Os números das capturas **não são do negócio real**.
- A leitura usou os critérios de crítica de design, a auditoria do sistema de design e a WCAG 2.1 AA.
- Capturas em `scratchpad/redesign/atual/<menu>-pc.png` (1440×900) e `-cel.png` (390×844).

**Escala das notas (1 a 5):**
1. Clareza.
2. Navegação.
3. Hierarquia.
4. Velocidade da tarefa.
5. Consistência.
6. Percepção premium.
7. Celular.
8. Acessibilidade.
9. Manutenção.

---

## Resumo em uma frase
O Hub já tem uma boa base: paleta própria, menu escuro, selos de situação, painéis laterais e listas virtualizadas. O problema principal **não é cor nem enfeite**, é composição:
- as telas explicam demais e mostram de menos;
- os números importantes ficam espalhados no texto;
- cada menu inventou o seu jeito de filtrar e de mostrar números;
- no celular, quase tudo vira uma pilha longa de cartões antes do que interessa.

---

## 1. Clientes (`/app/clientes` e ficha `/app/clientes/$id`)

**Para que serve:** saber, num olhar, com quem falar hoje, quem está parado e quanto está em jogo. Na ficha, ter o contexto completo de uma empresa e agir: WhatsApp, próximo passo, proposta, portal.

**O que existe hoje.** Não pode se perder no redesenho.

*Lista:*
- **Cabeçalho:** título com rótulo "Vender", resumo com as contagens em texto e o botão âmbar "Novo contato".
- **Busca e filtros:** busca local sem acento. Pílulas de filtro com contagem: Todos, Contatos, Em negociação, Clientes, Arquivados. O filtro fica no endereço da página.
- **Tabela virtualizada (6 colunas):** Nome com sigla e contato, Situação, Próximo passo com selo de prazo, Pacote ou mensalidade, Valor, Última atividade.
- **Rodapé:** "12 de 12" e a soma em negociação e fechada.
- **Estados:** carregando, erro com "Tentar de novo" e vazio.

*Ficha:*
- **Cabeçalho:** sigla, nome, selo e "Abrir WhatsApp"/"Editar ficha".
- **Abas:** Visão geral, Linha do tempo e Reuniões.
- **Coluna principal:** Oportunidade (barra de etapas, frente, valor, próximo passo, ações), Projetos e Propostas.
- **Coluna lateral:** Contato principal, Financeiro (pago e a receber), atalhos para Materiais e Pedidos, Acesso ao portal (convite e perfis) e Anotações.

**Problemas**

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| C1 | Para quem já é cliente, a coluna "Pacote ou mensalidade" diz "Projeto fechado · Detalhes chegam com os projetos". O texto ficou de uma fase antiga: os projetos já existem e a informação útil (projeto, situação, mensalidade) não aparece. | `src/lib/clientes.ts:46`, clientes-pc.png | Alta |
| C2 | Os números do topo ("3 contatos · 5 em negociação · 3 clientes") ficam no meio de um parágrafo e se repetem nas pílulas. O valor em jogo ("R$ 20.000 em negociação") fica no rodapé, abaixo da lista. | clientes/index.tsx:71-84, 141-150 | Média |
| C3 | A coluna "Situação" mistura etapa do funil (Diagnóstico, Proposta) com tipo de relação (Cliente, Contato). Quase todos os selos são neutros, então o olho não separa quem está quente de quem está frio. | clientes.ts:30-41 | Média |
| C4 | As linhas são altas (cerca de 94 px, porque o próximo passo tem selo embaixo) e cabem só 7 empresas por tela no computador. "Última atividade" quebra em duas linhas com um "·" solto. | clientes-pc.png | Média |
| C5 | Não dá para ordenar nem filtrar por prazo vencido ou por frente. A tarefa "quem está atrasado?" exige procurar selo vermelho na lista. | ClientesTabela.tsx | Média |
| C6 | Celular: o resumo ocupa cerca de 200 px antes da busca, as pílulas rolam de lado e escondem "Clientes" e "Arquivados", e cada cartão mostra 6 linhas. | clientes-cel.png | Média |
| C7 | Ficha: a coluna da direita é muito mais longa que a da esquerda e concentra coisas de natureza diferente (dados, dinheiro, acesso ao portal, anotações). Com o negócio fechado, a Oportunidade ainda mostra "Editar próximo passo" com o próximo passo vazio ("—"). | ficha-pc.png | Média |
| C8 | Ficha no celular: as abas cortam "Reuniões". O contato (telefone e e-mail) aparece só depois de Oportunidade, Projetos e Propostas. | ficha-cel.png | Baixa |
| C9 | Acessibilidade: as linhas usam `role="row"` e `columnheader` sem um contêiner `role="table"`. As abas da ficha usam `role="tab"` sem `tabpanel` nem `aria-controls`. | ClientesTabela.tsx:52-75; clientes/$id.tsx:107-135 | Média (WCAG 1.3.1, 4.1.2) |

**Proposta**
- **Cabeçalho enxuto:** título e uma frase curta, com o botão "Novo contato" à direita.
- **Faixa de 4 números clicáveis:** "Para hoje", "Vencidos", "Em negociação (R$)" e "Clientes ativos". Clicar filtra a lista. Isso substitui o texto do resumo e o rodapé.
- **Barra de filtros numa linha:** busca, pílulas (Todos, Contatos, Em negociação, Clientes, Arquivados) e "Ordenar por": prazo do próximo passo, valor ou atividade.
- **Tabela mais densa (cerca de 64 px por linha):**
  - Empresa (com contato);
  - Etapa ou relação (selo com cor por grupo: contato neutro, negociação info, cliente ok, arquivado apagado);
  - Próximo passo com o prazo na mesma linha;
  - Projeto ou mensalidade, agora real: "Sistema de agendamento · em andamento" ou "Evolução · R$ 1.200/mês";
  - Valor;
  - Última atividade.
- **Pré-visualização em painel lateral:** clicar na linha abre a ficha em painel lateral, com "Abrir ficha completa". Isso evita sair da lista para responder um WhatsApp ou ajustar o próximo passo. *(Mudança de comportamento: precisa do seu ok.)*
- **Ficha:**
  - Cabeçalho com uma faixa de contexto: etapa, valor, projeto atual e mensalidade.
  - Coluna principal: "O que fazer agora" (próximo passo, pendências, aprovações), Projetos, Propostas e Reuniões recentes.
  - Coluna lateral: Contato, Financeiro, Portal e Anotações, nessa ordem, cada bloco recolhível no celular.
  - Com o negócio fechado, a oportunidade vira um resumo ("Fechado em 3/10 · R$ 9.540"), sem as ações de funil.
- **Celular:** faixa de números rolando de lado, cartões de 3 linhas (empresa, próximo passo com prazo, valor) e o contato logo depois do cabeçalho.

**Mudanças funcionais (precisam de aprovação):**
- coluna Projeto ou mensalidade real (exige dados novos na `v_clientes`);
- ordenação;
- números que filtram a lista;
- ficha em painel lateral.

**Notas:**

| Clareza | Navegação | Hierarquia | Velocidade | Consistência | Premium | Celular | Acessibilidade | Manutenção |
|---|---|---|---|---|---|---|---|---|
| 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 4 |

---

## 2. Reuniões (`/app/reunioes`)

**Para que serve:** ver o que foi conversado, ligar a reunião ao cliente certo e, depois (RE-2), revisar as sugestões. Hoje, a tarefa principal é tirar reuniões de "Sem cliente".

**O que existe hoje:**
- **Cabeçalho:** título e resumo. Sem rótulo de grupo e sem ação.
- **Filtros:** Todas, Sem cliente e Sem transcrição, com contagem.
- **Lista virtualizada:** título, data e hora, duração, projeto, cliente ou selo "Sem cliente", e situação.
- **Painel lateral da reunião:** vínculo com cliente, oportunidade e projeto; convidados; transcrição virtualizada.
- **Aba "Reuniões" na ficha do cliente.**

**Problemas**

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| R1 | Única tela do menu sem o rótulo de grupo ("Vender"): o cabeçalho é diferente dos outros. | reunioes.tsx:35-38 vs. clientes/index.tsx:70 | Baixa |
| R2 | Não há "Buscar agora" nem a situação da ligação com o Google na tela. Para saber se a busca está funcionando, é preciso ir em Configurações. | reunioes.tsx | Média |
| R3 | Sem busca por título, cliente ou trecho falado. Com dezenas de reuniões, a lista fica difícil de usar. | reunioes.tsx | Média |
| R4 | O selo "Sem cliente" e o selo de situação ficam empilhados à direita e disputam atenção. "Sem cliente" é o que pede ação, mas tem o mesmo peso de "Transcrita". | fin-folha.png (parte de baixo) | Média |
| R5 | Não há agrupamento por dia ou semana. Reuniões de dias diferentes aparecem iguais, numa lista contínua. | ReunioesLista.tsx | Baixa |

**Proposta:**
- Cabeçalho padrão (rótulo "Vender") com "Google ligado como …, última busca 15h15" e o botão "Buscar agora" à direita.
- Uma faixa "Ligue estas reuniões" no topo quando houver reunião sem cliente: cartões compactos com o cliente sugerido e "Ligar" em um clique.
- Busca e filtros numa linha, e lista agrupada por semana ("Esta semana", "Semana passada", …).
- Na linha: cliente em destaque, ou a ação "Ligar a um cliente" no lugar do selo, e a situação como ícone pequeno.
- Painel da reunião: a transcrição ganha mais espaço e busca dentro do texto. O vínculo vira uma linha editável no topo.

**Notas:**

| Clareza | Navegação | Hierarquia | Velocidade | Consistência | Premium | Celular | Acessibilidade | Manutenção |
|---|---|---|---|---|---|---|---|---|
| 4 | 3 | 3 | 3 | 3 | 3 | 4 | 4 | 4 |

---

## 3. Propostas (`/app/propostas`)

**Para que serve:** montar, conferir e enviar propostas, e acompanhar quem abriu, aceitou ou recusou.

**O que existe hoje:**
- **Cabeçalho:** resumo (enviadas, rascunhos, valor em negociação, aceitas no ano) e os botões "Preços" e "Nova proposta" (âmbar).
- **Lista à esquerda:** com abas Rascunho, Enviadas, Aceitas e Recusadas.
- **Área da direita:** editor da proposta em blocos (Apresentação, O que ouvimos, Itens, Fora, Fases, Valor, Mensalidade, Pagamento), "Antes de enviar" com as conferências, ações de proposta enviada (copiar link, Enviar para…) e reabrir ou marcar como recusada.
- **Sem proposta escolhida:** a direita mostra "Escolha uma proposta".

**Problemas**

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| P1 | **As abas "Aceitas" e "Recusadas" ficam escondidas.** A coluna da lista tem cerca de 280 px e as 4 pílulas rolam de lado, então no computador aparecem só "Rascunho" e "Enviadas". O cabeçalho fala em "3 aceitas neste ano", mas não há caminho visível até elas. | propostas-pc.png; propostas.tsx:100-105 | Alta |
| P2 | Sem proposta escolhida, cerca de 75% da tela fica vazia com "Escolha uma proposta" e **um segundo botão âmbar** "Nova proposta". Fere a regra de âmbar só na ação principal e desperdiça espaço. | propostas-pc.png | Média |
| P3 | A lista não mostra o valor nem o tempo desde o envio, e o selo repete o nome da aba. O que importa ("enviada há 3 dias, não abriu") não aparece. | PropostasLista.tsx | Média |
| P4 | Os itens da lista têm um botão "—" sem rótulo visível (recolher?), ambíguo. | propostas-pc.png | Baixa |
| P5 | A nota "O valor vem de Configurações › Preços…" ocupa espaço fixo na lista. É ajuda de uso único. | propostas-pc.png | Baixa |

**Proposta:**
- **Sem proposta aberta:** a tela vira uma lista de largura total, com quatro grupos em colunas ou abas largas: Rascunhos (o que falta para enviar), Enviadas (abriu ou não, há quantos dias, valor), Aceitas (data, valor, projeto criado) e Recusadas (motivo).
- **Ao abrir uma proposta:** o editor ocupa a tela, com uma lista recolhível à esquerda (padrão de caixa de entrada).
- **Indicadores no topo:** em negociação, enviadas sem abrir há mais de 3 dias, aceitas no ano e taxa de aceite.
- "Preços" vira um link no cabeçalho do bloco Valor, não um botão no topo.

**Mudança funcional:** a taxa de aceite e "sem abrir há X dias" precisam de cálculo no banco (`proposta_resumo`).

**Notas:**

| Clareza | Navegação | Hierarquia | Velocidade | Consistência | Premium | Celular | Acessibilidade | Manutenção |
|---|---|---|---|---|---|---|---|---|
| 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |

---

## 4. Tráfego pago (`/app/trafego`)

**Para que serve:** saber se o anúncio está trazendo cliente que paga, quanto ainda dá para gastar no mês e onde cortar.

**O que existe hoje:**
- **Cabeçalho:** resumo do orçamento e o botão âmbar "Registrar investimento".
- **Período:** Este mês, 3 meses e Ano.
- **Blocos:**
  - Orçamento do mês: barra com linha do ritmo, por plataforma, com "Ajustar";
  - 4 indicadores: investido, contatos vindos de anúncio, custo por contato, custo por diagnóstico vendido;
  - "Do clique ao contrato", o funil com 5 etapas, a maior perda e os resultados;
  - Campanhas (tabela: situação, investido, contatos, diagnósticos, custo por contato, editar);
  - Retorno por mês de entrada (tabela e quadro com as definições);
  - "Contato barato × contato que vira venda" (comparação);
  - Investimentos registrados (lista com apagar).

**Problemas**

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| T1 | **A página tem 3.561 px no computador e 5.814 px no celular.** A lista "Investimentos registrados" cresce sem limite, sem paginação nem virtualização, e empurra tudo. | trafego-pc.png, trafego-cel.png; TrafegoInvestimentos.tsx:31 | Alta |
| T2 | Excesso de texto explicativo em todos os blocos, mais o quadro de definições. A tela parece um relatório, não um painel de decisão. | trafego-pc.png | Média |
| T3 | Os indicadores repetem o orçamento (investido aparece no orçamento, nos indicadores e na tabela de retorno) e usam cartões diferentes dos de Financeiro e Projetos. | Cartao.tsx vs. FinanceiroNumeros.tsx vs. ProjetoNumeros.tsx | Média |
| T4 | O bloco "Contato barato × contato que vira venda" fica quase vazio com poucos dados e ocupa meia largura ao lado de uma lista enorme. | trafego-pc.png | Baixa |
| T5 | Rótulos em caixa alta de 12,5 px no funil ("CLIQUES", "DIAGNÓSTICOS VINDOS DE ANÚNCIO") pesam a leitura. | trafego-pc.png | Baixa |
| T6 | Celular: 4 indicadores empilhados (cerca de 500 px) antes do funil, e tabelas largas. | trafego-cel.png | Média |

**Proposta:**
- **Topo de decisão:** orçamento do mês com o ritmo e 3 números (investido, custo por contato, custo por diagnóstico vendido), cada um com a variação contra o período anterior.
- **Funil compacto** numa linha, com a maior perda destacada.
- **Abas:**
  - **Campanhas** (padrão): tabela com ações e o "Registrar investimento" de cada campanha;
  - **Retorno**: tabela por mês de entrada;
  - **Lançamentos**: a lista de investimentos, paginada ou virtualizada, com filtro por campanha.
- As definições saem do corpo e vão para um ícone de ajuda (pequeno texto ao passar o mouse ou tocar).

**Notas:**

| Clareza | Navegação | Hierarquia | Velocidade | Consistência | Premium | Celular | Acessibilidade | Manutenção |
|---|---|---|---|---|---|---|---|---|
| 2 | 3 | 2 | 3 | 2 | 3 | 2 | 3 | 3 |

---

## 5. Projetos (`/app/projetos` e `/app/projetos/$id`)

**Para que serve:**
- **Lista:** o que precisa de mim hoje em cada projeto (risco, cliente devendo resposta, horas estourando) e a semana de horas.
- **Detalhe:** fazer o projeto andar (fases ou módulos, aprovações, tarefas, horas, pedidos, encerramento).

**O que existe hoje:**
- **Lista:**
  - resumo, "Novo projeto" (contorno) e "Lançar horas" (âmbar);
  - abas Em andamento, Em mensalidade e Concluídos;
  - cartões com cliente, nome, fase atual, lançamento e dias que faltam, faixa "Pede atenção" com os motivos, linha de fases, horas usadas, pendências com o cliente, valor, mensalidade prevista e "Abrir projeto";
  - coluna "Horas desta semana".
- **Detalhe:**
  - trilha de navegação, selos (fase, mensalidade), título, linha de contexto, e Editar, Materiais e WhatsApp;
  - bloco Fases, com "Concluir fase e pedir aprovação" em âmbar;
  - 3 cartões: horas, valor (recebido e próximo) e lançamento;
  - abas Andamento (Aguardando o cliente com Avisar, Pendência e Pedir aprovação, mais o quadro de tarefas por ciclo), Pedidos do projeto, Horas, Encerramento e Linha do tempo;
  - painéis: pedir aprovação, pendência, tarefa, editar, cancelar e lançar horas.

**Problemas**

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| J1 | Cartões da lista muito altos: cerca de 350 px no computador e 600 px no celular, cabendo 2 projetos por tela. O botão "Abrir projeto" é redundante, porque o cartão inteiro poderia ser o link. | projetos-pc.png, projetos-cel.png | Média |
| J2 | Detalhe: a data de lançamento aparece **3 vezes** (linha de contexto, bloco Fases e cartão "Lançamento") e o valor aparece 2 vezes. | projeto-pc.png | Média |
| J3 | Excesso de botões: 3 de contorno no cabeçalho, 1 âmbar em Fases, 3 em "Aguardando o cliente", "Nova tarefa" e "Novo ciclo", ou seja, **9 ações visíveis**. "Concluir fase e pedir aprovação" e "Pedir aprovação" fazem quase a mesma coisa em lugares diferentes. | projeto-pc.png | Média |
| J4 | Quadro de tarefas: colunas vazias com altura cheia, rótulo de área em caixa alta em todo cartão ("AGENDA") e menu "…" como única ação no cartão. | projeto-pc.png | Baixa |
| J5 | Celular, detalhe: 3 botões de contorno de largura total empilhados (cerca de 150 px) antes do conteúdo, e cartões de número empilhados. A página tem 3.118 px. | projeto-cel.png | Média |
| J6 | Na lista, a mensalidade "depois do lançamento" aparece no rodapé de todo cartão: informação estável que ocupa a área nobre do cartão. | projetos-pc.png | Baixa |
| J7 | Com o SS-1, o projeto sob medida troca "Fases" por "Módulos". O redesenho precisa prever os dois formatos no mesmo lugar. | card SS-1 | Média |

**Proposta:**
- **Lista em linhas compactas** (uma por projeto): sinal de saúde, cliente e projeto, fase ou módulo atual, lançamento (faltam X dias), horas (barra fina), "com o cliente" (contagem) e valor.
- Os motivos de atenção ficam num selo expansível. Agrupar por saúde ("Pede atenção" primeiro).
- "Horas desta semana" vira um cartão no topo, com o total e o botão "Lançar horas".
- **Detalhe:**
  - cabeçalho com título, selos e um menu "Mais" (Editar, Materiais, Cancelar). Só o WhatsApp fica visível;
  - faixa de 3 números (horas, recebido de total, lançamento);
  - logo abaixo, "O que destrava o projeto": a ação principal única do momento ("Pedir aprovação da fase X" ou "Publicar módulo Y") e o que está com o cliente;
  - fases ou módulos numa linha;
  - abas como hoje;
  - quadro de tarefas com colunas que se ajustam à altura do conteúdo.
- **Celular:** ações num menu de 3 pontos e números numa faixa que rola de lado.

**Notas:**

| Clareza | Navegação | Hierarquia | Velocidade | Consistência | Premium | Celular | Acessibilidade | Manutenção |
|---|---|---|---|---|---|---|---|---|
| 3 | 4 | 3 | 3 | 3 | 4 | 2 | 3 | 3 |

---

## 6. Materiais (`/app/materiais`)

**Para que serve:** achar e copiar rápido um texto pronto, um guia ou um arquivo, e ver o que os clientes mandaram.

**O que existe hoje:**
- **Cabeçalho:** "Enviar material" (âmbar).
- **Coluna de categorias** com contagem, mais "Compartilhados" e "Lixeira".
- **Filtros:** busca, seletor "Todos os clientes" e pílulas Tudo, Nossos e Do cliente.
- **Lista virtualizada:** ícone, título, tipo e cliente, selo "Compartilhado" ou categoria, e data.
- **Painel do material:** ver, baixar ou copiar, editar, lixeira e excluir.

**Problemas**

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| M1 | **Quatro formas de filtrar ao mesmo tempo** (categoria, busca, cliente, origem). "Do cliente" repete a categoria "Enviados pelos clientes". | materiais-pc.png | Média |
| M2 | A tarefa mais comum, copiar um texto pronto, exige abrir o painel. Não há "Copiar" na linha. | MaterialPainel.tsx:41-47 (só no painel) | Média |
| M3 | A lista tem rolagem própria dentro da página (`max-h-[calc(100dvh-300px)]`), com dupla rolagem e o último item cortado. | MateriaisLista.tsx:24; materiais-pc.png | Média |
| M4 | Categorias com 0 itens ocupam o mesmo espaço que as cheias. | materiais-pc.png | Baixa |
| M5 | À direita da linha, categoria e data aparecem em texto suave e somem visualmente. Data em formato curto, sem ano. | materiais-pc.png | Baixa |

**Proposta:**
- Categorias continuam à esquerda no computador (navegação principal). As vazias ficam apagadas, sem contagem.
- Filtros secundários (cliente e origem) num único botão "Filtros". A busca ganha destaque.
- Linha com ação rápida ao passar o mouse e sempre visível no celular: "Copiar" para textos e links, "Baixar" para arquivos, "Compartilhar com cliente".
- Lista sem rolagem interna (rolagem da página, como Clientes, com `useWindowVirtualizer`).
- **Opcional:** visão em grade para "Marca e apresentação" e "Anúncios", com miniatura.

**Notas:**

| Clareza | Navegação | Hierarquia | Velocidade | Consistência | Premium | Celular | Acessibilidade | Manutenção |
|---|---|---|---|---|---|---|---|---|
| 4 | 3 | 4 | 3 | 3 | 4 | 3 | 4 | 4 |

---

## 7. Financeiro (`/app/financeiro`)

**Para que serve:** o que cobrar hoje, quem está atrasado, quanto entra nos próximos 30 dias e se o mês fecha no positivo.

**O que existe hoje:**
- **Cabeçalho:** data por extenso, "Nova despesa" (contorno) e "Nova cobrança" (âmbar).
- **5 cartões de número:** a receber em 30 dias (mais sem data), em atraso, recebido no mês, mensalidades por mês e despesas do mês.
- **Abas:**
  - Cobranças: sub-filtros A receber, Sem data e Recebidas (6 meses); lista virtualizada; painel com pagar, desfazer, cancelar, avisar e recibo;
  - Mensalidades: "Nova mensalidade" e a lista com situação;
  - Despesas: lista com editar e apagar;
  - Fluxo de caixa: tabela por mês com barras, realizado e previsto.
- **Nota de rodapé fixa** sobre o pagamento manual.

**Problemas**

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| F1 | Celular: os **5 cartões ocupam cerca de 650 px** antes das abas. A lista de cobranças, que é o motivo de abrir a tela, fica abaixo da dobra. | financeiro-cel.png | Alta |
| F2 | As ações de criar ficam em lugares diferentes: "Nova despesa" e "Nova cobrança" no cabeçalho de todas as abas, "Nova mensalidade" dentro da aba. | fin-folha.png | Média |
| F3 | Abas com pílulas dentro (Cobranças › A receber/Sem data/Recebidas): dois níveis de navegação com estilos diferentes. No celular, as duas rolam de lado e cortam rótulos. | financeiro-pc.png, financeiro-cel.png | Média |
| F4 | Linha de cobrança sem "Registrar pagamento" direto. Toda baixa exige abrir o painel. | CobrancasLista.tsx:44 | Média |
| F5 | Fluxo de caixa: o mês aparece como "Jul De 26" (o `capitalize` deixa o "De" maiúsculo). | FluxoCaixa.tsx:9 e :84 | Baixa (bug visual) |
| F6 | A nota "Por enquanto o pagamento é registrado à mão…" se repete em todas as abas. | financeiro-pc.png | Baixa |
| F7 | Despesas sem total do mês nem separação entre fixas e avulsas na lista. Mensalidades sem soma. | fin-folha.png | Baixa |

**Proposta:**
- Cartões viram uma **faixa compacta** de 4 números: a receber em 30 dias, em atraso (destaque de risco), recebido no mês e resultado do mês (entradas menos saídas, que hoje não existe). Mensalidades e despesas passam para as próprias abas. No celular, a faixa rola de lado em uma linha.
- Uma ação "Novo" com menu (Cobrança, Mensalidade, Despesa) no cabeçalho, ou a ação da aba ativa.
- Cobranças agrupadas por urgência ("Atrasadas", "Esta semana", "Próximos 30 dias", "Sem data"), com o botão "Recebi" na linha. Recebidas como filtro.
- Fluxo de caixa com gráfico de barras pareadas por mês (entradas e saídas) e a linha do saldo. A tabela fica embaixo.

**Mudança funcional:** "Resultado do mês" e "Recebi" na linha precisam de RPC e de confirmação de valor, data e forma.

**Notas:**

| Clareza | Navegação | Hierarquia | Velocidade | Consistência | Premium | Celular | Acessibilidade | Manutenção |
|---|---|---|---|---|---|---|---|---|
| 4 | 3 | 3 | 3 | 3 | 4 | 2 | 3 | 4 |

---

## 8. Relatórios (`/app/relatorios`)

**Para que serve:** a visão do mês, do trimestre e do ano para decidir onde investir tempo e dinheiro, e para imprimir.

**O que existe hoje:**
- **Cabeçalho:** "Imprimir ou salvar em PDF". Período Este mês, 3 meses e Ano.
- **4 cartões de resumo em frase:** Vendas, Margem, Entrega e Receita.
- **Blocos:**
  - Vendas: funil por etapa com barras e "seguiram", tabela por origem e motivos de perda;
  - Receita: 4 números e próximas entradas;
  - Margem por projeto: barra com piso e alvo;
  - Entrega: aprovações abertas, pedidos por classificação e horas da mensalidade.

**Problemas**

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| L1 | Erros de plural: "1 aprovações abertas", "1 ativas". | relatorios.tsx:65; RelatorioReceita.tsx:26 | Baixa (bug de texto) |
| L2 | Os cartões de resumo usam rótulo âmbar em caixa alta e frase, enquanto cada bloco repete o mesmo rótulo em cinza mais um título. Isso cria dois níveis de título para a mesma coisa. | relatorios-pc.png | Baixa |
| L3 | A página longa (cerca de 2.460 px) não tem índice nem atalhos para os blocos. | relatorios-pc.png | Baixa |
| L4 | A margem por projeto tem marcadores de piso e alvo sem legenda junto da barra (a legenda está no texto acima). | relatorios-pc.png | Baixa |
| L5 | É a tela mais bem resolvida. O que falta é comparação com o período anterior (subiu ou desceu). | — | Melhoria |

**Proposta:**
- Manter a estrutura.
- Unificar o cabeçalho de bloco (um título só).
- Índice fixo no topo (Vendas, Receita, Margem, Entrega) com rolagem até o bloco.
- Variação contra o período anterior nos números.
- Legenda junto da barra de margem.
- Versão de impressão sem o menu.

**Notas:**

| Clareza | Navegação | Hierarquia | Velocidade | Consistência | Premium | Celular | Acessibilidade | Manutenção |
|---|---|---|---|---|---|---|---|---|
| 4 | 3 | 4 | 4 | 3 | 4 | 3 | 3 | 4 |

---

## 9. Entre os menus: sistema de design

**Inconsistências encontradas**

| Elemento | Hoje | Proposta |
|---|---|---|
| Cabeçalho | Rótulo de grupo em 7 telas e ausente em Reuniões. O resumo às vezes é frase, às vezes números em negrito no meio do texto. | `CabecalhoPagina` sempre com o grupo, frase de até 1 linha, ações à direita (1 âmbar no máximo) e números na faixa de indicadores, nunca no texto. |
| Números de destaque | 4 estilos: `FinanceiroNumeros` (cartão grande), `ProjetoNumeros` (rótulo em caixa alta), `Cartao` do Tráfego, e os cartões de Relatórios (rótulo âmbar mais o cinza interno). | Um componente `Indicador`: rótulo normal 13 px, número 24 px, apoio 13 px, tom opcional (risco ou ok), clicável quando filtra. Um `FaixaIndicadores` que vira rolagem lateral no celular. |
| Navegação dentro da tela | Pílulas (`FiltrosChip`), abas sublinhadas (ficha, projeto, financeiro), lista lateral (materiais), seletor de período igual às pílulas, e abas com pílulas dentro (financeiro). | Regra: **abas sublinhadas** para trocar de assunto, **pílulas** para filtrar a mesma lista, **seletor de período** como controle segmentado à direita do cabeçalho. Nunca dois níveis com o mesmo estilo. |
| Listas | Tabela em grade (Clientes), linhas (Materiais, Reuniões, Cobranças), tabela HTML (Campanhas, Fluxo), cartões grandes (Projetos). | `ListaDados` única: modo tabela no computador e cartão de 3 linhas no celular, linha de 56 a 64 px, ação rápida à direita, virtualizada com a rolagem da página. |
| Tipografia | 6 tamanhos de texto pequeno quase iguais: 12,5, 13, 13,5, 14, 14,5 e 15 px (151, 106, 81, 151, 112 e 135 usos). Títulos de 17 a 22 px sem regra. | Escala: 12,5 (rótulo), 13,5 (apoio), 15 (corpo), 17 (título de bloco), 22 (título de seção), 28 a 32 (título da página). Tokens `text-apoio`, `text-corpo` etc. |
| Rótulos em caixa alta | Uso misto ("HORAS USADAS", "WHATSAPP", "AGENDA", "CLIQUES") ao lado de rótulos normais. | Rótulo em frase normal, no tom suave (como já é regra no portal), e caixa alta só no grupo do menu. |
| Âmbar | Duas ações âmbar na mesma tela em Propostas (cabeçalho e estado vazio). Em Projeto, o âmbar fica numa ação de seção enquanto o cabeçalho tem 3 contornos. | Uma ação principal por tela, definida por contexto. |
| Selos | Bons e consistentes (`Selo`). O problema é o uso: muitos selos neutros iguais. | Usar o tom para dizer o estado (info, atenção, risco, ok) e neutro só para "sem novidade". |
| Estados vazios | Bons textos, mas cada tela desenha o seu (borda tracejada, cartão, parágrafo). | Componente `EstadoVazio` (ícone, frase, ação opcional). |
| Rolagem | Materiais tem rolagem interna e as outras listas rolam com a página. | Rolagem sempre da página. |

**Bugs e problemas técnicos encontrados**
1. **Clientes:** texto antigo "Detalhes chegam com os projetos" para quem já é cliente (`src/lib/clientes.ts:46`).
2. **Propostas:** abas "Aceitas" e "Recusadas" escondidas por rolagem lateral numa coluna de 280 px (`propostas.tsx:100`).
3. **Financeiro, Fluxo de caixa:** mês "Jul De 26" por causa do `capitalize` (`FluxoCaixa.tsx:84`).
4. **Relatórios:** plurais "1 aprovações abertas" (`relatorios.tsx:65`) e "1 ativas" (`RelatorioReceita.tsx:26`).
5. **Materiais:** rolagem interna corta o último item (`MateriaisLista.tsx:24`).
6. **Tráfego:** lista de investimentos sem limite nem virtualização (`TrafegoInvestimentos.tsx:31`). Fere a regra de listas longas do `CLAUDE.md`. O mesmo vale para Despesas e Mensalidades (`DespesasLista.tsx:31`, `MensalidadesLista.tsx:35`), que hoje são curtas.
7. **Acessibilidade:**
   - abas sem `tabpanel` nem `aria-controls` em 5 telas (ficha, projeto, financeiro, pedidos, funil);
   - linhas de tabela sem contêiner `role="table"` em Clientes;
   - texto de exemplo nos campos (`#9A9DA3`, cerca de 2,8:1) abaixo de 4,5:1 (`Campo.tsx`).
8. **Robustez:** se a primeira chamada de acesso falha uma vez, a tela inteira vira "Esta página não carregou". Aconteceu uma vez em Relatórios no celular durante os testes, por instabilidade do servidor de teste. Vale tentar de novo sozinho antes de mostrar o erro.

Pontos que estão bons e devem ficar:
- painéis laterais e de baixo;
- alvos de toque de 44 px (botões de editar e apagar com `size-11`);
- listas principais virtualizadas;
- selos com texto, não só cor;
- textos de erro com "Tentar de novo";
- busca sem acento;
- filtro no endereço da página;
- contraste do texto suave (cerca de 5:1).

---

## 10. Prioridade do redesenho

| Ordem | Menu | Por quê |
|---|---|---|
| 1 | **Clientes, lista e ficha** | Tela mais usada do lado Vender. Tem informação errada para clientes (C1), hierarquia fraca e celular ruim. A ficha é o centro que todas as outras telas vão usar (reuniões, solicitações, propostas). |
| 2 | **Projetos, lista e detalhe** | É onde está a operação do dia. O excesso de ações e o celular longo custam tempo todo dia, e o SS-1 (módulos) muda o detalhe agora, então é a hora certa. |
| 3 | **Financeiro** | O celular esconde a lista de cobranças (F1). A baixa de pagamento leva cliques demais. Falta o resultado do mês. |
| 4 | **Tráfego pago** | Página longa demais e com texto demais. Precisa virar painel de decisão. |
| 5 | **Propostas** | O bug das abas escondidas é rápido de corrigir. A mudança maior é o layout de lista em largura total. |
| 6 | **Reuniões** | Tela nova e boa. Ajustes de cabeçalho, busca e a faixa "Ligue estas reuniões" antes do RE-2. |
| 7 | **Materiais** | Funciona. Ganha mais com "Copiar" na linha e com o fim da rolagem dupla. |
| 8 | **Relatórios** | A mais madura. Ajustes de título, plural e comparação com o período anterior. |

**Base comum antes das telas (vale para todas):**
- `Indicador` e `FaixaIndicadores`;
- `ListaDados` (tabela e cartão, virtualizada pela página);
- regra de abas, pílulas e período;
- escala tipográfica em tokens;
- `EstadoVazio`;
- uma ação âmbar por tela.

Com isso, cada menu vira composição, não componente novo.

**Correções rápidas que não dependem do redesenho (meio dia):** bugs 1 a 5 e os plurais.
