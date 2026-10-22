# Central de Tarefas · análise e proposta

> Pedido do Yuri (22/10): acompanhar toda a operação sem entrar projeto por projeto, sem cadastro duplicado e sem perder as telas de projeto que ficaram boas. Este documento é análise; nada foi implementado.

## 1. Como está hoje (levantado no código)

| Peça | O que existe | O que falta para a Central |
| --- | --- | --- |
| Tabela `project_tasks` | título, descrição, área, ciclo, situação (A fazer, Fazendo, Para aprovar, Pronto), posição, ligação opcional com um pedido de ajuste | responsável, prioridade, prazo, data de conclusão; tarefa sem projeto (interna) |
| Gravação | RPCs `tarefa_criar`, `tarefa_mover`, `tarefa_remover` (dono, `security definer`) | `tarefa_editar` (hoje não dá para corrigir uma tarefa, só mover ou remover) |
| Leitura | só dentro de `projeto_detalhe` (JSON do projeto inteiro) | uma consulta da operação inteira com filtros e paginação |
| Tela | `QuadroCiclo` + `ColunaTarefas` + `TarefaCartao` na página do projeto; mover pelo menu "Mover para" | painel de detalhes da tarefa; arrastar entre colunas |
| Quem usa | só a página do projeto (portal, relatórios e painel não leem tarefas) | — |
| Papéis | `owner` e `client` | não existe papel de equipe; hoje "responsável" seria sempre o Yuri |

Outras coisas que parecem tarefa, mas são outra coisa (e não devem virar tarefa):
- **Pedidos de ajuste** (`requests`): o que o cliente pediu. Já têm fila própria, cruzando projetos. A tarefa é o trabalho que nasce do pedido (`request_id` já liga os dois).
- **Pendências do cliente** (`client_tasks`): o que está esperando o cliente. Não é trabalho nosso.
- **Aprovações e módulos**: etapas do projeto, com regras próprias.

Conclusão: o risco não é técnico (a mudança atinge uma tabela usada por uma tela só); o risco é de produto, de a Central virar um quarto lugar para "coisas a fazer" competindo com Pedidos de ajuste, Pendências e o Painel.

## 2. Recomendação (e onde ela muda o pedido original)

**A Central não é um módulo novo: é outra forma de ver a mesma tabela.** Uma tarefa é sempre um único registro em `project_tasks` (que passa a se chamar só "tarefas" na interface). A página do projeto mostra as tarefas daquele projeto; a Central mostra todas. Como é o mesmo registro, não existe sincronização a fazer: mudou num lugar, mudou no outro.

Ajustes à proposta original, com o motivo:

1. **Lista como vista padrão, não o Kanban.** Com muitos projetos, a pergunta do dia é "o que vence e o que está atrasado", e isso se lê melhor numa lista agrupada por prazo. O Kanban continua sendo a vista natural dentro do projeto e fica como segunda vista na Central.
2. **Calendário depois, como "Agenda".** Hoje nenhuma tarefa tem prazo; um calendário nasce vazio. Primeiro o prazo passa a ser usado; depois de algumas semanas, entra a vista de agenda (semana e mês).
3. **Responsável entra no banco, mas some da tela enquanto só houver uma pessoa.** Filtro de responsável com uma pessoa só é ruído. Quando entrar alguém na equipe, isso vira um card próprio (papel "equipe" no banco, que mexe em toda a segurança, não só nas tarefas).
4. **Menu: "Tarefas" logo abaixo do Painel, fora do grupo "Entregar".** Tarefas internas e do Hub não são entrega de cliente; e a Central é a tela de trabalho diário, ao lado do Painel.
5. **Pedidos de ajuste continuam separados.** Pedido = o que o cliente pediu e decide; tarefa = o trabalho para atender. Na Central, a tarefa mostra o código do pedido de origem.

## 3. Desenho recomendado

### Navegação
```
Painel
Tarefas            ← novo (contador de atrasadas no item)
Vender ▸ Funil · Clientes · Reuniões · Propostas · Tráfego
Entregar ▸ Projetos · Pedidos de ajuste
...
```
- Endereço `/app/tarefas`, com filtros e vista na URL (`?vista=lista&tipo=cliente&prazo=atrasadas`): o botão voltar funciona e dá para salvar um filtro nos favoritos.
- Da tarefa para o projeto: "Abrir projeto" leva a `/app/projetos/<id>?tarefa=<id>`, que abre o ciclo certo com a tarefa destacada.
- Do projeto para a Central: "Ver na Central" no cabeçalho do quadro abre a Central já filtrada por aquele projeto.

### Tela (computador)
```
Tarefas                                             [+ Nova tarefa]
[Todas 42] [Clientes 31] [Internas 8] [Hub 3]          Lista | Kanban
[Atrasadas 4] [Hoje 3] [Esta semana]   Cliente ▾  Projeto ▾  Prioridade ▾  Situação ▾   Limpar

Atrasadas · 4
  ○  Ajustar relatório de giro por loja   Mercado do Sítio › Sistema   ▲ Alta   Fazendo   venceu 20/10
  ○  ...
Hoje · 3
Esta semana · 9
Depois · 12
Sem prazo · 14
Concluídas nos últimos 7 dias (recolhido)
```
- Abas de tipo (Todas, Clientes, Internas, Hub) como controle segmentado: um clique.
- Atalhos de prazo como fichas (Atrasadas, Hoje, Esta semana); o resto em menus.
- Cada linha: círculo para concluir em um clique, título, cliente › projeto (texto discreto), prioridade só quando for Alta (o resto não polui), situação, prazo (vermelho quando atrasada).
- Clique na linha abre o painel lateral (Sheet) com os detalhes.
- Lista virtualizada (`@tanstack/react-virtual`), como pede o CLAUDE.md.

### Kanban da Central
- As mesmas 4 colunas do projeto. O cartão é o mesmo `TarefaCartao`, com uma linha a mais: cliente › projeto.
- "Pronto" mostra só as concluídas dos últimos 7 dias, para a coluna não crescer para sempre.
- Ciclo não aparece como coluna; vira um selo no cartão (ciclo é assunto do projeto).

### Painel lateral da tarefa (o mesmo no projeto e na Central)
Título e descrição editáveis no lugar, situação, prioridade, prazo, tipo, projeto (só leitura depois de criada), pedido de origem, ciclo, "Abrir projeto", "Remover". No celular vira bottom sheet.

### Nova tarefa
Campo rápido no topo da lista ("Nova tarefa…" + Enter) com projeto opcional; sem projeto, vira Interna. O painel completo fica para quando quiser preencher prazo e prioridade.

### Celular
Lista como vista única (Kanban fica no computador e dentro do projeto), filtros num bottom sheet, botão "Nova tarefa" em largura total, alvos de 44 px.

## 4. Regras de funcionamento

- **Tipo:** Cliente (tem projeto; definido sozinho), Interna (sem projeto: emitir nota, preparar proposta) ou Hub (melhorias do próprio sistema). A especificação das melhorias continua no card em `docs/cards`; a tarefa do tipo Hub só acompanha o andamento e pode guardar o código do card (ex.: SS-2).
- **Prioridade:** três níveis (Alta, Normal, Baixa), padrão Normal. Urgência vem do prazo, não da prioridade.
- **Prazo:** data (sem hora). Atrasada = prazo antes de hoje (fuso do tenant) e situação diferente de Pronto. Calculado no banco, nunca no navegador.
- **Concluir:** marcar Pronto grava a data de conclusão; desfazer volta para A fazer e apaga a data.
- **Projeto cancelado ou encerrado:** as tarefas abertas somem das vistas padrão (filtro "projetos ativos"), sem apagar nada.
- **Remover:** só pelo painel, com confirmação de um toque ("Desfazer" no aviso por 5 s).
- **Segurança:** tudo passa por RPC de dono, com `tenant_id` e RLS; tarefa interna (sem projeto) valida o tenant pelo dono, não pelo projeto.

## 5. Impactos técnicos

**Banco (uma migração):**
- `project_tasks`: `project_id` passa a aceitar vazio; novas colunas `kind` (cliente, interna, hub), `priority` (alta, normal, baixa), `due_date date`, `assignee_id` (só membros do tenant), `done_at`, `card_ref`; regra "tipo cliente exige projeto e o contrário".
- Índices: `(tenant_id, status, due_date)` e `(tenant_id, kind)`.
- RPCs: `tarefa_criar` com tipo, prazo e prioridade e projeto opcional; `tarefa_editar` (nova); `tarefa_mover` grava `done_at`; `tarefas_listar(filtros, limite)` com cliente, projeto e "atrasada" já resolvidos; `tarefas_resumo()` com contagens para as abas e o menu.
- `projeto_detalhe` continua igual (as colunas novas entram sozinhas no JSON).
- Testes pgTAP: isolamento por tenant, tarefa interna, atrasada no fuso, cliente do portal sem acesso.

**Frontend:**
- `Tarefa` ganha os campos novos; chaves do TanStack Query por recurso (`tarefas.lista(filtros)`, `tarefas.resumo`), e toda mudança atualiza de forma otimista a lista da Central e o detalhe do projeto, e desfaz se der erro.
- Componentes reaproveitados: `TarefaCartao`, `ColunaTarefas`. Novos: `TarefaPainel` (detalhes e edição, usado também no projeto), `TarefasLista`, `TarefaLinha`, `FiltrosTarefas`, `AbasTipo`.
- A página do projeto não muda de layout: ganha prazo e prioridade no cartão e o painel de detalhes ao clicar.
- Tempo real (Supabase Realtime) fica para quando houver equipe; com uma pessoa, atualizar ao voltar para a aba resolve.

**Riscos:** confundir tarefa com pedido de ajuste (mitigado pela seção 2.5); lista grande (virtualização e limite por consulta); prazo sem uso (o calendário só entra depois).

## 6. Sequência sugerida

| Card | Entrega | Depende de |
| --- | --- | --- |
| TA-0 | Visual no canvas: Central (lista, Kanban, painel, celular) e o painel da tarefa dentro do projeto, para aprovar antes do código | — |
| TA-1 | Banco: colunas, regras, RPCs, testes | TA-0 aprovado |
| TA-2 | Painel da tarefa (detalhes e edição) e prazo/prioridade no Kanban do projeto | TA-1 |
| TA-3 | Central de Tarefas: rota, menu com contador, lista agrupada por prazo, filtros na URL, abas de tipo, nova tarefa rápida, Kanban | TA-2 |
| TA-4 | Painel inicial: bloco "Tarefas atrasadas e de hoje" com atalho para a Central | TA-3 |
| TA-5 | Agenda (semana e mês) | algumas semanas de uso de prazo |
| Depois | Papel "equipe", responsável visível, tempo real, lembrete de atraso pelo n8n | decisão de contratar |

Métrica de sucesso: o Yuri decide o dia pela Central sem abrir projetos (meta: abrir a Central pelo menos 1 vez por dia útil e zero tarefas atrasadas há mais de 7 dias).
