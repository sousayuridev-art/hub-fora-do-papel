# Cards TA · Central de Tarefas

> **Aprovação (Yuri, 22/10):** direção da análise `docs/redesenho/central-de-tarefas.md` (outra forma de ver as mesmas tarefas; lista primeiro; agenda depois; tipo Hub com código do card). Visual nos quadros `Tarefas`, `TarefasKanban`, `TarefaPainel`, `TarefasCel` e `ProjetoTarefas` (`docs/redesenho/canvas/`).

## TA-1 · Banco
- `project_tasks`: `project_id` pode ser vazio; colunas `kind` (cliente | interna | hub), `priority` (alta | normal | baixa, padrão normal), `due_date date`, `assignee_id` (membro do tenant, opcional), `done_at`, `card_ref` (até 20 caracteres). Regra: tipo cliente ⇔ tem projeto.
- RPCs de dono: `tarefa_criar` (projeto opcional, tipo, prazo, prioridade, card), `tarefa_editar` (título, descrição, área, prazo, prioridade, card, responsável), `tarefa_mover` (grava/limpa `done_at`), `tarefa_remover`, `tarefas_listar(filtros)` (cliente, projeto, pedido de origem e "atrasada" já resolvidos; só projetos ativos por padrão; Pronto só dos últimos 7 dias por padrão; limite), `tarefas_resumo()` (contagens por tipo, atrasadas, hoje, semana).
- Atrasada = prazo antes de hoje no fuso do tenant e situação diferente de Pronto.
- Testes pgTAP: isolamento por tenant, aal2 de dono, tarefa interna, regra tipo×projeto, atrasada no fuso, cliente do portal sem acesso.

## TA-2 · Painel da tarefa e quadro do projeto
- `TarefaPainel` (Sheet; bottom sheet no celular): título e descrição editáveis, situação (4 opções), prazo (avisa atraso), prioridade (3), tipo, projeto e cliente com "Abrir projeto", pedido de origem, área, ciclo, "Remover" (com desfazer) e "Marcar como pronta". Salva sozinho (otimista, desfaz no erro).
- Quadro do projeto no formato `Quadro`/`ColunaQuadro`; cartão com área, título, prazo e prioridade; clique abre o painel; atalho "Ver na Central" filtrado pelo projeto; `?tarefa=<id>` abre o ciclo certo com o painel.

## TA-3 · Central de Tarefas (`/app/tarefas`)
- Menu: "Tarefas" logo abaixo do Painel, com o número de atrasadas.
- Cabeçalho em faixa com abas de tipo (Todas, Clientes, Internas, Hub) e vista (Lista | Kanban).
- Atalhos Atrasadas / Hoje / Esta semana; filtros Cliente, Projeto, Prioridade, Situação; tudo no endereço.
- Lista (padrão) agrupada por prazo: Atrasadas, Hoje, Esta semana, Depois, Sem prazo, "Concluídas nos últimos 7 dias" recolhido; concluir em um clique; virtualizada.
- Kanban: as mesmas 4 colunas do projeto; cartão com cliente › projeto.
- Nova tarefa rápida (título + Enter; projeto opcional; sem projeto vira Interna).
- Celular: só lista; filtros num bottom sheet.

## TA-4 · Painel inicial
- Bloco "Tarefas atrasadas e de hoje" com atalho para a Central filtrada.

## Critérios de aceite
- [ ] Mudou na Central, mudou no projeto (mesmo registro; chaves de cache das duas telas atualizadas).
- [ ] Tarefa interna criada sem projeto aparece só na Central.
- [ ] Atrasadas batem com o contador do menu.
- [ ] Build, lint, testes e testes de banco passam.
