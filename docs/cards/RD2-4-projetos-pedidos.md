# RD2-4 · Projetos e Pedidos no layout novo

Parte do redesenho RD2 (`docs/cards/RD2-redesenho-areas.md`). Aprovado no canvas de design (P07, P07b e Pedidos).

## Visão de negócio
A página do projeto misturava números e trabalho na mesma coluna; o que falta para avançar ficava escondido. Os pedidos de ajuste eram só uma lista: não dava para ver de relance o que está parado nem o que é urgente.

## Requisitos
1. Página do projeto em duas colunas no computador: trabalho à esquerda (destrava, saúde, abas), resumo à direita (andamento, ida ao ar, horas, recebido, mensalidade, contato com WhatsApp e pedidos abertos). No celular, uma coluna.
2. Prazo com data por fase (`project_phases.due_date`, RPC `projeto_fase_prazo`, só o dono). Botão "Prazos" nas fases abre painel lateral; salva ao escolher a data, com volta no erro. A fase não concluída mostra "Prazo 25/10 · 3 dias de atraso" (vermelho) ou "vence hoje".
3. Pedido urgente (`requests.urgente`, RPC `pedido_urgente`, só o dono). Botão no painel do pedido; selo vermelho no painel e faixa no cartão.
4. Pedidos em quadro por padrão: Novos, Em análise, Aguardando o cliente, Fazendo, Prontos (inclui recusados). Colunas brancas e neutras; urgentes no topo, depois os mais antigos. Prontos mostra os 5 últimos e "Ver todos" leva à lista de concluídos.
5. Idade do pedido no cartão: hoje neutro, 1 dia âmbar, 3 dias ou mais vermelho.
6. Alternar Quadro | Lista (`?vista=lista`). No quadro, filtro Todos | Urgentes; na lista, os filtros de situação de antes.

## Casos de borda
- Fase concluída não mostra atraso. Data fora de 2020–2100 é recusada pelo banco.
- Pedido pronto ou recusado não oferece "Marcar como urgente".
- Outra agência não marca urgente nem muda prazo (testes de banco).

## Critérios de aceite
- [x] `supabase/tests/rd2_4_prazo_fases.test.sql` e `rd2_4_pedido_urgente.test.sql` passam.
- [x] `src/test/rd2-4.test.ts` passa (idade e colunas).
- [x] Build, lint e testes passam; conferido no navegador em computador e celular.

## Métrica de sucesso
Pedidos parados há 3 dias ou mais: zero no fim de cada semana.
