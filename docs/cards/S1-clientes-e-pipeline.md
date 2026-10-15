# Card S1 · Clientes e Pipeline

> **Decisões (15/10):** V1 menor aprovada (D1: S1 → S2 → S3 → S4 até o primeiro contrato). O funil de vendas fica **no Hub** (sem Pipedrive por enquanto). Etapas: **Novo contato → Conversa marcada → Diagnóstico → Proposta enviada → Ganho / Perdido**.

**Objetivo:** todo contato (do site, do WhatsApp, do Instagram ou de indicação) vira um card no funil do Hub, com dono do próximo passo, histórico e origem. É aqui que o Yuri trabalha as vendas até a proposta (S2).
**Estimativa:** 2 a 3 dias.
**Depende de:** S0 (login, layouts, padrão de avisos) e SITE-1/SITE-2b (tabela `site_contatos` em produção).
**Não entra aqui:** proposta e aceite (S2), projetos (S3), Pipedrive, automações do n8n além de gravar eventos, importação de planilha, tráfego pago, tempo real entre abas.

---

## Visão de negócio
Hoje o contato do site cai numa tabela que ninguém vê, e os contatos do WhatsApp ficam na cabeça e no celular. Sem funil, não dá para saber quantas conversas viram proposta nem quem está esperando resposta. O S1 resolve isso com um funil simples, onde nada se perde e cada contato tem um próximo passo.

**Indicadores** (calculados no banco, não no navegador):
- Contatos novos por semana, por origem.
- Tempo até o primeiro contato (criado → saiu de "Novo contato").
- Conversão por etapa (Novo contato → Proposta enviada → Ganho).
- Motivos de perda mais comuns.

## Requisitos

### 1. Banco (migração nova em `supabase/migrations`)
- **`clients`** (já existe): `company_name` passa a aceitar vazio (pessoa física ou contato sem empresa) e `whatsapp` deixa de ser obrigatório; regra nova: **WhatsApp ou e-mail** precisa existir. Novos campos: `origin`, `size_range` (`ate_10`, `11_50`, `51_200`, `mais_200`), `notes`.
- **`deal_stage`** (enum): `novo_contato`, `conversa_marcada`, `diagnostico`, `proposta_enviada`, `ganho`, `perdido`.
- **`deals`** (oportunidades): `tenant_id`, `client_id`, `title` (o que o cliente quer resolver), `stage`, `origin` (`site_horario`, `site_mensagem`, `whatsapp`, `instagram`, `indicacao`, `outro`), `suggested_time timestamptz`, `next_step text`, `next_step_at timestamptz`, `estimated_value_cents integer` (opcional), `lost_reason`, `stage_changed_at`, `site_contato_id` (único, quando veio do site), `position`, `created_at`, `updated_at`.
- **`deal_events`** (histórico): etapa de/para, nota, quem fez, quando.
- **RLS:** só o dono do tenant lê e altera `deals` e `deal_events`; cliente do portal não vê nada do funil.
- **RPCs `security definer`** (validam tenant e gravam evento em `event_outbox` na mesma transação; o cliente nunca faz `update` direto):
  - `pipeline_criar_lead(...)`: cria cliente + oportunidade em "Novo contato". Se já existir cliente com o mesmo e-mail ou WhatsApp e uma oportunidade aberta, devolve a existente e grava uma nota no histórico, sem duplicar.
  - `pipeline_mover(p_deal, p_etapa, p_motivo, p_versao)`: muda a etapa; **Perdido exige motivo**; recusa se `updated_at` mudou desde que a tela leu (`p_versao`); grava histórico e o evento `deal.etapa_alterada`.
  - `pipeline_atualizar(p_deal, ...)` e `cliente_salvar(...)`: edição dos dados, com a mesma checagem de versão.
  - `pipeline_resumo()`: contagem e soma de valor por etapa, contatos novos da semana por origem.
- **Gatilho do site:** cada novo `site_contatos` do tipo `horario` ou `mensagem` cria (ou reaproveita, pela regra acima) cliente + oportunidade em "Novo contato", com origem, assunto, porte e horário sugerido. Inscrição em artigos **não** vira oportunidade.
- **Testes pgTAP:** isolamento entre tenants; cliente do portal não lê o funil; contato do site vira oportunidade; contato repetido não duplica; Perdido sem motivo é recusado; versão antiga é recusada; cada movimento grava histórico e evento.

### 2. Tela Pipeline (`/app/pipeline`)
- Quadro com 4 colunas abertas (Novo contato, Conversa marcada, Diagnóstico, Proposta enviada) e um seletor "Ganhos / Perdidos" para ver as fechadas.
- Cartão: nome do contato, empresa (se houver), selo de origem, o que quer resolver, dias na etapa, próximo passo com data (vermelho se vencido) e selo "Horário sugerido: qua 16/10, 10h" quando veio do agendamento do site.
- Mover: arrastar entre colunas no computador; no celular, botão "Mover para" num painel de baixo (bottom sheet). Atualização otimista com volta automática e aviso "Não foi possível mover. Tentar de novo" em caso de erro.
- Ao mover para **Perdido**, pede o motivo (lista: preço, prazo, escolheu outro, sem resposta, não era o momento, outro + texto).
- Botão **Novo contato** abre painel lateral (Sheet) com: nome, empresa (opcional), WhatsApp, e-mail, origem, o que quer resolver, porte, próximo passo e data.
- Clique no cartão abre o painel de detalhe: dados, histórico, editar, botão **Abrir WhatsApp** (link `wa.me` com o número) e **Marcar perdido**.
- Topo com os números de `pipeline_resumo()` por coluna.

### 3. Tela Clientes (`/app/clientes`)
- Tabela com busca (nome, empresa, e-mail, WhatsApp) e filtro por etapa da oportunidade aberta; lista virtualizada (`@tanstack/react-virtual`).
- Painel lateral para ver e editar cliente, com as oportunidades dele (abertas e fechadas).
- Os campos de contrato (CNPJ/CPF, razão social, endereço) aparecem, mas só serão obrigatórios no aceite da proposta (S2).

### 4. Padrões (CLAUDE.md)
- TanStack Query com chaves `['pipeline']`, `['pipeline','resumo']`, `['clientes']`, `['cliente', id]`; mutações com atualização otimista e rollback.
- Todo erro com aviso pelo `notify.erro(..., { tentarDeNovo })`.
- Componentes pequenos: `PipelineBoard`, `PipelineColumn`, `DealCard`, `DealSheet`, `NovoContatoSheet`, `MotivoPerdaDialog`, `ClientesTabela`, `ClienteSheet`.
- Textos em português do manual: "contato" (não "lead"), "funil de vendas", "oportunidade", "próximo passo".
- Alvos de toque ≥ 44 px; funciona em 390 px.

## Casos de borda
- Contato do site sem WhatsApp (aba "Mandar mensagem"): vira oportunidade com e-mail; o cartão mostra "Sem WhatsApp".
- Mesma pessoa pede horário duas vezes: uma oportunidade só, com as duas entradas no histórico.
- Duas abas movem o mesmo cartão: a segunda recebe "Esta oportunidade mudou. Atualize a tela." e a tela recarrega.
- Voltar de Ganho/Perdido para uma etapa aberta: permitido, registrado no histórico.
- Coluna com muitos cartões (mais de 50): mostra os 50 mais recentes e "Ver todos".
- Cliente apagado: as oportunidades vão junto (cascade); a ação pede confirmação.

## Critérios de aceite
- [ ] `supabase test db` passa com os testes novos e os antigos.
- [ ] Um pedido de horário feito no site aparece em "Novo contato" com origem, assunto, porte e horário sugerido, sem ação manual.
- [ ] Criar, mover, editar e marcar perdido funcionam no computador e no celular (390 px), com atualização otimista e volta em caso de erro (testado com a rede desligada).
- [ ] Perdido sem motivo é recusado pelo banco e pela tela.
- [ ] Cada movimento aparece no histórico e gera um evento em `event_outbox`.
- [ ] Um login de cliente do portal não vê nada do funil (testado no banco e na tela).
- [ ] Clientes: busca e filtro funcionam com 1.000 registros de teste sem travar.
- [ ] `bun run build`, `bun run lint` e `supabase test db` sem erro; migração aplicada em produção pelo workflow (verificar → aplicar).

## Próximo card
S2 · Proposta com aceite (proposta no portal, aceite com dados de contrato e registro do aceite; ao aceitar, a oportunidade vai para Ganho).
