# Card S3 · Projetos, Pedidos e Portal do cliente

> **Base visual:** canvas "Hub Fora do Papel · proposta 2", telas `HubProjetos`, `HubProjeto`, `HubPedidos`, `PortalInicio`, `PortalAprovacoes` e `PortalPedidos`, no visual atual (HUB-VIS-2) e com as regras do card P (portal no celular).
> **Decisões do Yuri (16/10):**
> - O cliente participa **pelo portal, com login** (link de acesso no e-mail).
> - Entram agora **fases, marcos, encerramento, horas e quadro de tarefas por ciclo**. Parcelas e cobranças ficam para o S4.
> - Entrega enviada para aprovação **nunca é aprovada sozinha**: fica como pendência até o cliente responder.

**Objetivo:** do aceite ao lançamento sem planilha. O projeto nasce sozinho no aceite da proposta, o Yuri acompanha fases, tarefas e horas, e o cliente aprova entregas, resolve pendências e faz pedidos pelo portal.
**Depende de:** S1 (clientes), S2 (proposta aceita), REV-1.
**Não entra:** parcelas, cobranças e mensalidade como receita (S4); envio de arquivos (Storage, S3b); avisos por WhatsApp (S6); avaliação depois do lançamento.

## Visão de negócio
Hoje, depois do aceite, o andamento fica na memória do Yuri e no WhatsApp. Com o S3:
- nada some;
- o cliente vê o que depende dele;
- toda mudança fora do combinado vira serviço adicional aprovado antes de começar.

**Indicadores (no banco):**
- projetos em andamento;
- horas usadas sobre as estimadas;
- pendências do cliente atrasadas;
- tempo de aprovação das entregas;
- pedidos por classificação (dentro do combinado, mensalidade, serviço adicional);
- valor de serviços adicionais aprovados.

## Requisitos

### 1. Banco (`supabase/migrations/20261016400000_s3_projetos_pedidos.sql`)

**Tabelas**
- `projects` (projetos):
  - cliente, oportunidade e proposta de origem (única);
  - nome e tipo;
  - situação (`andamento`, `mensalidade`, `concluido`);
  - lançamento previsto;
  - horas estimadas;
  - valor;
  - plano de mensalidade e valor mensal (da proposta);
  - datas de início e de lançamento.
- `project_phases` (fases): nome, quando, ordem, situação (`pendente`, `andamento`, `concluida`), datas.
- `approvals` (entregas para aprovar):
  - título, descrição, "o que fizemos" (lista), link da prévia;
  - fase que a aprovação conclui (opcional);
  - situação (`aguardando`, `aprovada`, `ajuste`);
  - quem decidiu, quando e o comentário.
- `client_tasks` (pendências do cliente): título, detalhe, prazo, situação (`aberta`, `feita`).
- `project_tasks` (quadro):
  - ciclo, área, título, descrição;
  - situação (`a_fazer`, `fazendo`, `para_aprovar`, `pronto`);
  - pedido de origem (opcional).
- `time_entries` (horas): projeto, pessoa, dia, minutos, nota.
- `launch_items` (encerramento): checklist do lançamento.
- `requests` (pedidos):
  - código por cliente (sigla + número);
  - título e descrição;
  - origem (`portal`, `whatsapp`, `reuniao`, `hub`);
  - situação (`recebido`, `em_analise`, `aguardando_cliente`, `fazendo`, `pronto`, `recusado`);
  - classificação (`escopo`, `mensalidade`, `adicional`);
  - horas estimadas e valor;
  - decisão do cliente.
- `project_events` (linha do tempo do projeto).
- `portal_invites` (convites): cliente, e-mail, convidado por, aceito em.

**Regras no banco**
- **Projeto nasce no aceite** (gatilho):
  - fases copiadas da proposta, com "Diagnóstico" e "Proposta" já concluídas;
  - a fase seguinte fica em andamento;
  - horas, valor e plano vêm do retrato da proposta;
  - checklist de lançamento padrão;
  - evento `projeto.criado`.
- **Projeto manual** (`projeto_criar`): para cliente que já existia antes do Hub.
- **Fases:**
  - concluir uma fase inicia a próxima;
  - a aprovação ligada a uma fase só conclui a fase quando o cliente aprova.
- **Aprovação nunca é automática:**
  - "Pedir ajuste" volta o item para o Yuri com o comentário;
  - uma nova aprovação pode ser enviada depois.
- **Pedido de serviço adicional:**
  - valor = horas × hora de referência (mínimo de 1 h), calculado no banco;
  - só começa depois da aprovação do cliente no portal;
  - recusado fica registrado.
- **Pedido dentro do combinado ou da mensalidade:** vai direto para "Fazendo".
- **Lançar projeto:**
  - só com o checklist completo;
  - situação vira `mensalidade` (se há plano) ou `concluido`;
  - grava o lançamento.
- **Horas:**
  - lançamento por projeto e dia (até 24 h por lançamento);
  - total usado e a semana calculados no banco.
- **Portal (convite):**
  - o dono convida pelo e-mail na ficha do cliente;
  - no primeiro acesso com aquele e-mail (link de acesso), `portal_aceitar_convite()` liga a pessoa ao cliente (papel `client`);
  - convite vale 30 dias;
  - o dono pode cancelar o convite e tirar o acesso.
- **RLS:**
  - dono lê tudo do seu tenant;
  - cliente do portal lê só projetos, fases, aprovações, pendências e pedidos da própria empresa;
  - cliente do portal não lê horas, tarefas internas nem eventos internos;
  - escrita só por RPC;
  - anon nada.
- **Eventos:** cada ação grava em `event_outbox` (`projeto.*`, `aprovacao.*`, `pedido.*`, `portal.*`).

**Testes pgTAP**
- projeto nasce no aceite com as fases certas;
- cliente aprova só o que é da empresa dele;
- outra agência não vê;
- serviço adicional não começa sem aprovação;
- lançamento travado com checklist incompleto;
- convite liga só o e-mail certo;
- cliente não lê horas.

### 2. Hub
- **Projetos (`/app/projetos`):**
  - abas Em andamento, Em mensalidade e Concluídos;
  - cartão por projeto com fases, horas usadas, pendências com o cliente, próximo marco e encerramento (quando na última fase);
  - "Lançar horas" (âmbar);
  - "Horas desta semana".
- **Projeto (`/app/projetos/$id`):**
  - cabeçalho;
  - linha de fases com "Concluir fase e pedir aprovação" (âmbar);
  - números: horas, valor e lançamento;
  - aba **Andamento:** aguardando o cliente (aprovações, pendências e serviços adicionais) e quadro do ciclo, com nova tarefa e mover tarefa;
  - aba **Pedidos do projeto**;
  - aba **Horas**;
  - aba **Encerramento:** checklist e "Lançar projeto";
  - aba **Linha do tempo**.
  - Painéis laterais: pedir aprovação, nova pendência do cliente, nova tarefa, lançar horas.
- **Pedidos (`/app/pedidos`):**
  - os 3 passos (classificar, estimar, enviar ao cliente);
  - abas por situação e filtro por cliente;
  - busca e lista virtualizada;
  - painel do pedido: classificar, estimar horas (valor calculado), enviar ao cliente, iniciar, concluir, recusar;
  - "Registrar pedido" (âmbar).
- **Ficha do cliente:** "Acesso ao portal" (convidar por e-mail, ver quem tem acesso, cancelar) e lista de projetos.
- **Painel:** "Aguardando o cliente" e pedidos novos entram nas Novidades.

### 3. Portal do cliente (`/portal`, card P)
- **Início:**
  - bloco escuro com os 3 números (aprovações, pendências, pedidos em andamento);
  - fases do projeto;
  - "Precisa da sua ação";
  - próximo marco.
- **Aprovações:**
  - entregas e serviços adicionais aguardando;
  - "Aprovar" (com confirmação) e "Pedir ajuste" (com comentário);
  - as já decididas.
- **Pedidos:** lista com as 5 etapas e "Fazer um pedido".
- **Pendências:** marcar como feita.
- Pagamentos e Arquivos continuam "em preparação".
- Os selos das abas usam a mesma conta do "Precisa de você" (`portal_pendencias()`).

## Casos de borda
- Proposta aceita sem fases.
- Cliente com dois projetos (o portal mostra o mais recente em andamento e deixa trocar).
- Pedido sem projeto (cliente em mensalidade).
- Convite para e-mail que já é dono.
- Pessoa com convite de duas empresas.
- Aprovação respondida duas vezes (só a primeira vale).
- Horas negativas ou acima de 24 h.
- Lançar sem checklist.
- Projeto concluído recebendo pedido (vai para a mensalidade).

## Critérios de aceite
- **Aceite gera projeto:** aceitar uma proposta cria o projeto com fases e checklist, sem ação manual.
- **Aprovação no portal:** o cliente entra no portal pelo link de acesso e aprova uma entrega. A fase avança e o Yuri vê a decisão no Hub e no Painel.
- **Serviço adicional:** o cliente aprova no portal o serviço com o valor calculado. Só então o pedido vai para "Fazendo".
- **Horas e encerramento:** horas lançadas aparecem no projeto e na semana. "Lançar projeto" só libera com o checklist completo.
- **Celular:** a 390 px, sem rolagem lateral no Hub e no portal.
- **Verificações:** build, lint, vitest, pgTAP e e2e passam.

## Notas da implementação (16/10)
- **Revisão de segurança independente** (antes de publicar). Corrigido:
  - preço do serviço adicional não muda depois do sim do cliente;
  - só quem tem "pode aprovar" decide no portal (os outros só acompanham);
  - convite só liga e-mail confirmado;
  - limite de pedidos sem corrida;
  - aceite da proposta nunca falha por valor no limite;
  - convites com limite diário;
  - tirar acesso cancela convites abertos.
- **Ficou para depois** (registrado, sem risco hoje):
  - troca de empresa ou de projeto no portal (pessoa com duas empresas ou cliente com dois projetos vê a primeira empresa e o projeto mais recente);
  - quem tem mais de uma agência soma pedidos das duas em `pedidos_resumo`.
- **Supabase de produção:** o login do cliente usa link de acesso. Se o convidado não conseguir entrar, confira em Authentication › Sign In / Providers se "Allow new users to sign up" está ligado.
