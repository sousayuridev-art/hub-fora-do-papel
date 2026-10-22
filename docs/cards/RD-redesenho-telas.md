# Cards RD · Redesenho das telas do Hub

> **Aprovação (Yuri, 22/10):** visual aprovado no canvas "Hub · Redesenho dos menus" (cópia dos quadros em `docs/redesenho/canvas/`). Análise de origem: `docs/redesenho/analise-8-menus.md`. Decisões do dia: colunas no formato com fio e barra de cor no topo; faixa branca no cabeçalho; título das páginas em azul-marinho #1B2B5C; gráficos no Financeiro e no Tráfego.
>
> **Regra geral:** nenhuma funcionalidade some. Tudo o que a tela faz hoje continua fazendo (listas, painéis, filtros no endereço, ações). Muda a composição. Números e agregações vêm do banco (views/RPC), nunca de `.reduce()` no cliente sobre listas grandes. Dados de exemplo só nos quadros do canvas; na tela, só dado real.

## RD-0 · Base comum (feito antes das telas)
- `CabecalhoPagina`: faixa branca de ponta a ponta com fio embaixo; rótulo do grupo em frase normal (cinza, 12,5 px); título 28 px em `text-titulo` (#1B2B5C); props `migalha` e `abas`.
- `Abas` (sublinhadas, trocam de assunto), `FiltrosChip` (pílulas, filtram a lista), período em controle segmentado.
- `FaixaNumeros`: uma caixa com células divididas por fio; risco/atenção pinta só a célula que pede ação; clique filtra; no celular rola de lado.
- `Quadro` + `ColunaQuadro`: colunas separadas por fio, barra de cor no topo, nome, descrição curta, total, "Nada por aqui" tracejado; no celular, uma coluna por vez com encaixe.
- `GraficoBarras` (agrupado/empilhado, previsto listrado, rodapé por categoria) e `GraficoLinha` (com linha de referência), cores `--serie-1` #2F55D4 e `--serie-2` #C27C0E (validadas para daltonismo), dica ao passar o mouse/tocar e tabela para leitor de tela.
- Critérios: as 12 telas que usam `CabecalhoPagina` mostram a faixa sem rolagem lateral, com o menu escuro por cima.

## RD-1 · Clientes e Ficha do cliente (quadros `Clientes`, `ClientesCel`, `Ficha`)
- Lista: `FaixaNumeros` (Para hoje, Vencidos em risco, Em negociação, Clientes ativos), busca + pílulas numa linha, ordenação visível; tabela atual mantida (virtualizada).
- Ficha: cabeçalho em faixa com migalha "Clientes › Empresa", selo da etapa e ações (WhatsApp, Mais); faixa de números (Etapa, Valor em jogo, Mensalidade prevista, Recebido); abas como hoje.
- Critérios: nada da ficha atual some (oportunidade, propostas, reuniões, projetos, financeiro, portal, anotações, linha do tempo).

## RD-2 · Projetos e Projeto (quadros `Projetos`, `ProjetosCel`, `Projeto`, `ProjetoTarefas`)
- Lista: faixa de números e abas de situação; agrupamento "Pede atenção" / "No ritmo" como hoje.
- Projeto: cabeçalho em faixa com migalha; quadro de tarefas no formato `Quadro`/`ColunaQuadro` (ver TA-2).

## RD-3 · Financeiro (quadros `Financeiro`, `FinanceiroCel`)
- `FaixaNumeros` com 4 números: Em atraso (risco), A receber em 30 dias (+ sem data), Recebido no mês, **Resultado do mês** (recebido − despesas, calculado no banco).
- Gráficos: "Entradas e saídas" (6 meses, barras agrupadas, resultado embaixo de cada mês, mês atual "até hoje") e "Mensalidades por mês" (linha, 6 meses). Dados por RPC nova.
- Abas: Cobranças · Mensalidades (soma no rótulo) · Despesas (total do mês) · Fluxo de caixa. Sem pílulas dentro de abas: "Mostrar recebidas" vira uma caixa de seleção.
- Cobranças agrupadas por urgência: Atrasadas, Esta semana, Próximos 30 dias, Sem data. Botão **"Recebi"** na linha abre o painel curto de pagamento já existente (valor, data e forma) — nunca grava sem confirmação.
- Corrigir o bug "Jul De 26" no fluxo de caixa. Nota do pagamento manual aparece uma vez só.

## RD-4 · Reuniões (quadro `Reunioes`)
- Cabeçalho: situação do Google ("Google ligado · última busca …") e "Buscar agora" (âmbar).
- Bloco "Ligue estas reuniões a um cliente" quando houver reunião sem cliente: cliente sugerido (pelo e-mail dos convidados que bate com cliente cadastrado; sem sugestão, só "Escolher cliente"), "Ligar" em um clique.
- Busca (título, cliente, trecho da transcrição — busca no banco), pílulas Todas / Sem cliente / Sem transcrição, lista agrupada por semana.

## RD-5 · Propostas (quadro `Propostas`)
- Sem proposta aberta: `FaixaNumeros` (Em negociação, Sem abrir há mais de 3 dias em atenção, Aceitas no ano, Taxa de aceite — RPC `propostas_resumo`) e quadro com colunas Rascunhos / Enviadas / Aceitas / Recusadas (cartão: cliente, valor, título, o que falta ou situação de leitura).
- Proposta aberta: editor em largura total com a lista recolhível à esquerda; "Preços" vira link no bloco Valor. Um botão âmbar só.

## RD-6 · Tráfego pago (quadros `Trafego`, `TrafegoCel`)
- Topo: orçamento do mês com barra por plataforma e marca do ritmo; 3 números com variação contra o período anterior (contatos, custo por contato, custo por diagnóstico vendido).
- Gráficos: "Investimento por semana" (8 semanas, empilhado Meta/Google, contatos embaixo) e "Custo por contato" (linha, limite tracejado quando houver limite configurado). RPC nova por semana.
- "Do clique ao contrato" compacto numa linha, maior perda destacada.
- Abas: Campanhas (padrão) · Retorno por mês de entrada · Lançamentos (paginado ou virtualizado). Definições saem do corpo para ajuda no ícone.

## RD-7 · Materiais (quadro `Materiais`)
- Categorias à esquerda (vazias apagadas, sem contagem); busca em destaque; cliente e origem num botão "Filtros".
- Ação rápida na linha: "Copiar" (textos e links), "Baixar" (arquivos); sempre visível no celular.
- Lista com a rolagem da página (sem rolagem interna).

## RD-8 · Relatórios (quadro `Relatorios`)
- Índice no cabeçalho (Vendas, Receita, Margem, Entrega) com rolagem até o bloco; período segmentado; "Salvar em PDF".
- Faixa de números com variação contra o período anterior (calculada no banco).
- Vendas: funil em barras + valor fechado por origem. Receita: recebido (6 meses) e previsto (2 meses, listrado). Margem por projeto com piso e alvo explicados junto da barra. Entrega como hoje.
- Corrigir plurais ("1 aprovações", "1 ativas"). Um título por bloco.

## Critérios de aceite (todas)
- [ ] Mesmo comportamento de antes em cada tela (sem funcionalidade perdida) e filtros no endereço onde já estavam.
- [ ] Faixa branca no cabeçalho, título azul-marinho, âmbar só na ação principal.
- [ ] Celular (390 px): sem rolagem lateral da página, alvos de 44 px, números em linha que rola.
- [ ] Gráficos com legenda (2 séries), dica ao tocar e tabela para leitor de tela; dados do banco.
- [ ] `bun run build`, `bun run lint`, `bun run test` e testes de banco passam.
