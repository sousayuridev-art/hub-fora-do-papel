# Card S1 · Clientes e Pipeline

> **Decisões (15/10):** V1 menor aprovada (D1: S1 → S2 → S3 → S4 até o primeiro contrato). O funil fica **no Hub** (sem Pipedrive por enquanto).
> **Base visual: o quadro de design "Hub Fora do Papel"** (telas `Pipeline`, `Clientes` e `Cliente` · Área do cliente). Quando este card e o quadro divergirem, vale o quadro, com as exceções escritas aqui.
> **Etapas do quadro:** Contato → Diagnóstico → Mapeamento → Proposta → Fechado. Perdido não é coluna: a oportunidade é arquivada com motivo e some do quadro.
> **Termo:** nas telas do Hub usa-se **"Contato"** (manual de comunicação), nunca "Lead". Onde o quadro diz "Lead", "Novo lead", "Criar lead", "12 leads ativos", a implementação troca por "Contato", "Novo contato", "Criar contato", "12 contatos ativos".

**Objetivo:** todo contato (site, WhatsApp, Instagram, anúncio, indicação) vira um cartão no Pipeline, com pacote, próximo passo com data e histórico. O Yuri trabalha as vendas aqui até a proposta (S2).
**Estimativa:** 3 dias.
**Depende de:** S0 (login, layouts, padrão de avisos) e SITE-2b (`site_contatos` em produção).
**Não entra aqui:** proposta e aceite (S2), projetos, escopo, aditivos, materiais e documentos (S3+), tráfego pago, financeiro, Pipedrive, tempo real entre abas, importação de planilha.

---

## Visão de negócio
Hoje o contato do site cai numa tabela que ninguém vê, e os do WhatsApp ficam no celular. Com o Pipeline, nada se perde, cada contato tem um próximo passo com data e o diagnóstico pago (ver "Precificação e modelos de cobrança") vira etapa do funil.

**Indicadores** (calculados no banco):
- Contatos novos por semana, por origem.
- Tempo até o primeiro contato (criado → saiu de "Contato").
- Conversão por etapa (Contato → Diagnóstico → Proposta → Fechado).
- Motivos de perda mais comuns.
- Valor em propostas e negociações (topo do Pipeline).

## Requisitos

### 1. Banco (migração nova em `supabase/migrations`)
- **`clients`** (já existe) ganha: `segment` (`saude`, `educacao`, `alimentacao`, `varejo`, `construcao`, `servicos`, `outro`), `origin` (`indicacao`, `instagram`, `linkedin`, `anuncio`, `site`, `google`, `outro`), `ad_name` (qual anúncio, quando `anuncio`), `referred_by` (quem indicou), `current_site`, `size_range` (`ate_10`, `11_50`, `51_200`, `mais_200`), `last_activity_at`. `company_name` aceita vazio só para contato vindo do site (a tela mostra o nome da pessoa no lugar); regra: **WhatsApp ou e-mail** precisa existir.
- **`client_notes`** (anotações da Área do cliente): `client_id`, texto, autor, data. Só o operador vê.
- **`deal_stage`** (enum): `contato`, `diagnostico`, `mapeamento`, `proposta`, `fechado`.
- **`package_tier`** (enum): `tracao`, `autonomia`, `recorrencia`.
- **`deals`** (oportunidades): `tenant_id`, `client_id`, `stage`, `package_tier` (opcional), `estimated_value_cents` (opcional), `next_step` + `next_step_at` (**obrigatórios** nas etapas abertas), `suggested_time` (horário pedido no site), `lost_at` + `lost_reason` + `lost_note`, `stage_changed_at`, `site_contato_id` (único), `position`, `created_at`, `updated_at`.
- **`deal_events`** (linha do tempo): etapa de/para, próximo passo alterado, anotação, arquivamento, quem fez, quando, origem (`hub`, `site`).
- **RLS:** só o operador do tenant lê e altera `deals`, `deal_events` e `client_notes`; login de cliente do portal não vê nada disso.
- **RPCs `security definer`** (validam tenant, gravam `deal_events` e `event_outbox` na mesma transação; o cliente nunca faz `update` direto):
  - `pipeline_criar_contato(...)`: cria cliente + oportunidade em "Contato". Mesmo e-mail ou WhatsApp com oportunidade aberta: devolve a existente e registra na linha do tempo, sem duplicar.
  - `pipeline_mover(p_deal, p_etapa, p_versao)`: muda a etapa; recusa se `updated_at` mudou desde a leitura (`p_versao`); evento `deal.etapa_alterada`.
  - `pipeline_arquivar(p_deal, p_motivo, p_nota, p_versao)`: **motivo obrigatório** (`preco`, `prazo`, `escolheu_outro`, `sem_resposta`, `nao_era_o_momento`, `outro` + nota); evento `deal.perdido`. `pipeline_desarquivar` volta para a etapa em que estava.
  - `pipeline_atualizar(p_deal, ...)`, `cliente_salvar(...)`, `cliente_anotar(...)`: mesma checagem de versão.
  - `pipeline_resumo(p_filtro)`: por coluna, quantidade e soma de valor; total de contatos ativos e valor em Diagnóstico + Mapeamento + Proposta; filtros `todos`, `este_mes`, `vencidos`.
  - `clientes_lista(p_filtro, p_busca)`: situação calculada (Contato · Em negociação · Cliente), próximo passo, pacote, última atividade.
- **Gatilho do site:** cada `site_contatos` do tipo `horario` ou `mensagem` cria (ou reaproveita) cliente + oportunidade em "Contato", com origem `site`, porte, assunto como anotação e próximo passo "Primeiro contato por WhatsApp" (ou "Responder por e-mail" quando não há WhatsApp), com data = horário sugerido ou próximo dia útil. Inscrição em artigos **não** vira oportunidade.
- **Testes pgTAP:** isolamento entre tenants; cliente do portal não lê o funil; contato do site vira oportunidade; contato repetido não duplica; arquivar sem motivo é recusado; etapa aberta sem próximo passo é recusada; versão antiga é recusada; cada ação grava linha do tempo e evento.

### 2. Tela Pipeline (`/app/pipeline`) · quadro `Pipeline`
- Como no quadro: menu lateral recolhível, título "Pipeline comercial", linha "N contatos ativos · R$ X em propostas e negociações", filtros **Todos · Este mês · Vencidos**, botão **Novo contato**.
- Cinco colunas (Contato, Diagnóstico, Mapeamento, Proposta, Fechado), cada uma com quantidade e soma de valor.
- Cartão: empresa, contato · origem, selo do pacote, próximo passo com quando (vencido em vermelho, hoje em âmbar, futuro neutro, fechado em verde) e valor.
- **Clique no cartão abre a Área do cliente** (`/app/clientes/$id`).
- Mover: arrastar entre colunas no computador. No celular (até 767 px), as colunas viram abas e cada cartão tem **Mover para**, que abre um painel de baixo (o quadro não tem tela de celular para o Hub; segue o padrão do CLAUDE.md).
- **Arquivar como perdido:** ação no cartão e na Área do cliente; pede motivo (lista + nota em "Outro"); o cartão sai do quadro com aviso "Contato arquivado. Desfazer".
- Atualização otimista com volta automática e aviso "Não foi possível mover. Tentar de novo".
- **Novo contato** (painel lateral, campos do quadro): Empresa *, Nome do contato *, WhatsApp *, E-mail, Segmento, Origem *, Qual anúncio (só com Anúncio), Quem indicou (só com Indicação), Site atual, Próximo passo *, Data *. Ao criar: aviso com o próximo passo e **Desfazer**.

### 3. Tela Clientes (`/app/clientes`) · quadro `Clientes`
- Filtros do quadro: **Todos · Em negociação · Contatos** (o filtro "Projetos ativos" do quadro entra no S3; até lá, "Clientes" para quem está em Fechado).
- Colunas: Cliente (sigla, nome, contato), Situação, Próximo passo, Pacote, Última atividade. "Pendências" entra no S3.
- Busca por nome, empresa, e-mail ou WhatsApp; lista virtualizada (`@tanstack/react-virtual`).
- **Novo cliente** (painel lateral do quadro): contato + dados para contrato e cobrança (tipo empresa/pessoa física, CNPJ/CPF, razão social, endereço, responsável legal, e-mail financeiro). Os dados de contrato só são obrigatórios no aceite da proposta (S2), como o próprio quadro diz.

### 4. Área do cliente (`/app/clientes/$id`) · quadro `Cliente`, recorte do S1
- Cabeçalho: sigla, nome, situação, segmento · cidade · "cliente desde".
- Aba **Visão geral**: contato principal (nome, papel, WhatsApp, e-mail, origem), botão **Abrir conversa no WhatsApp** (`wa.me`), oportunidade aberta com etapa e próximo passo editáveis, **Anotações** ("Só você vê", salvar anotação).
- Aba **Linha do tempo**: `deal_events` + anotações, mais recentes primeiro.
- Abas Escopo e aditivos, Materiais e links, Documentos, blocos de Projetos/Contrato/Recebido e "Ver o portal": **não aparecem** no S1; entram nos cards S2/S3.

### 5. Padrões (CLAUDE.md)
- TanStack Query com chaves `['pipeline', filtro]`, `['pipeline','resumo', filtro]`, `['clientes', filtro, busca]`, `['cliente', id]`, `['cliente', id, 'linha']`; mutações com atualização otimista e rollback.
- Todo erro com `notify.erro(..., { tentarDeNovo })`.
- Componentes: `PipelineBoard`, `PipelineColumn`, `DealCard`, `NovoContatoSheet`, `ArquivarDialog`, `MoverParaSheet`, `ClientesTabela`, `NovoClienteSheet`, `ClienteCabecalho`, `ClienteVisaoGeral`, `ClienteLinhaDoTempo`, `ClienteAnotacoes`.
- Textos: "contato" (não "lead"), "Pipeline", "oportunidade", "próximo passo", "pacote".
- Alvos de toque ≥ 44 px; funciona em 390 px.

## Casos de borda
- Contato do site sem WhatsApp: vira oportunidade com e-mail e próximo passo "Responder por e-mail"; o cartão mostra "Sem WhatsApp".
- Contato do site sem empresa: o cartão mostra o nome da pessoa no lugar da empresa.
- Mesma pessoa pede horário duas vezes: uma oportunidade só, com as duas entradas na linha do tempo.
- Duas abas movem o mesmo cartão: a segunda recebe "Esta oportunidade mudou. Atualize a tela." e recarrega.
- Arrastar para uma etapa aberta sem próximo passo definido: pede o próximo passo antes de concluir.
- Desarquivar: volta para a etapa em que estava, registrado na linha do tempo.
- Coluna com mais de 50 cartões: mostra os 50 mais recentes e "Ver todos".

## Critérios de aceite
- [ ] Telas iguais ao quadro `Pipeline`, `Clientes` e `Cliente` (recorte acima), com "Contato" no lugar de "Lead".
- [ ] `supabase test db` passa com os testes novos e os antigos.
- [ ] Um pedido de horário feito no site aparece em "Contato" com origem Site, porte e próximo passo com data, sem ação manual.
- [ ] Criar, mover, arquivar e desfazer funcionam no computador e a 390 px, com atualização otimista e volta em caso de erro (testado com a rede desligada).
- [ ] Arquivar sem motivo é recusado pelo banco e pela tela.
- [ ] Cada ação aparece na linha do tempo e gera evento em `event_outbox`.
- [ ] Login de cliente do portal não vê nada do funil (banco e tela).
- [ ] Clientes: busca e filtro com 1.000 registros de teste sem travar.
- [ ] `bun run build`, `bun run lint` e `supabase test db` sem erro; migração aplicada em produção pelo workflow (verificar → aplicar).

## Próximo card
S2 · Proposta com aceite (Propostas do operador e Proposta para aceite no portal; ao aceitar, a oportunidade vai para Fechado).
