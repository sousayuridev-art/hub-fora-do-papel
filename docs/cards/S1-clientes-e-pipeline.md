# Card S1 · Funil de vendas, Clientes e Ficha do cliente

> **Versão 3 (16/10).** Base visual: canvas **"Hub Fora do Papel · proposta 2"** (telas `HubPipeline`, `HubClientes`, `HubCliente`, `HubPainel` e o menu lateral). Decisões de 16/10 valem sobre o canvas. Aprovado para implementar pelo Yuri em 16/10 ("realizar os ajustes diretamente no projeto").
> **Termos na tela:** "Funil de vendas" (o menu pode dizer "Pipeline"), "contato" (nunca "lead"), "próximo passo", "arquivar".

**Objetivo:** todo contato (site, WhatsApp, Instagram, anúncio, indicação) vira uma ficha com oportunidade no funil, próximo passo com data e linha do tempo. O pedido de horário do site entra sozinho. O Painel mostra o que precisa do Yuri hoje.
**Depende de:** S0 (login, layouts, avisos) e SITE-2b (`site_contatos`).
**Não entra:** propostas e aceite (S2); projetos, pedidos, arquivos, portal com dados (S3); financeiro (S4); tráfego pago e Meta (S5); WhatsApp pela API (S6); importação de planilha.

## Visão de negócio
Hoje o contato do site cai numa tabela que ninguém vê. Com o S1 nenhum contato se perde, cada um tem dono do próximo passo e o diagnóstico pago vira etapa medida.
**Indicadores** (no banco): contatos ativos; valor em diagnósticos e propostas; passos vencidos; contatos novos por origem; conversão por etapa; motivos de perda.

## Requisitos

### 1. Banco (`supabase/migrations/20261016000000_s1_funil_clientes.sql`)
- `tenants.timezone` (padrão `America/Sao_Paulo`): "hoje" e "vencido" seguem o fuso da agência.
- `clients` ganha: `contact_role`, `segment`, `city`, `origin` (`indicacao`, `instagram`, `site`, `anuncio_meta`, `anuncio_google`, `outro`), `ad_name`, `referred_by`, `current_site`, `size_range`, `client_since`, `last_activity_at`. `whatsapp` deixa de ser obrigatório, mas WhatsApp **ou** e-mail precisa existir.
- `deals` (oportunidades): etapa (`contato`, `diagnostico`, `mapeamento`, `proposta`, `fechado`), `value_cents`, `diagnostic_tier` (`essencial`, `ampliado`), `diagnostic_paid`, `next_step`, `next_step_at`, `next_step_has_time`, `requested_slot_at` (horário pedido no site), `archived_at`, `lost_reason`, `lost_note`, `stage_changed_at`, `closed_at`, `site_contato_id` (único). Etapa aberta exige próximo passo e data.
- `deal_events` (linha do tempo) e `client_notes` (anotações, só o operador vê).
- **RLS:** só o dono do tenant lê. Escrita só por RPC `security definer` que valida tenant e versão e grava linha do tempo e `event_outbox` na mesma transação.
- **RPCs:** `funil_criar_contato`, `funil_mover`, `funil_atualizar`, `funil_arquivar`, `funil_desarquivar`, `cliente_salvar`, `cliente_anotar`, `funil_resumo`, `painel_hoje`.
- **Views** (`security_invoker`): `v_funil`, `v_clientes`.
- **Gatilho do site:** pedido de horário ou mensagem cria (ou reaproveita, pelo e-mail ou WhatsApp) ficha + oportunidade em "Contato", com origem Site, porte, assunto como anotação e próximo passo "Confirmar horário pelo WhatsApp", "Primeiro contato pelo WhatsApp" ou "Responder por e-mail". Inscrição em artigos não vira contato.
- **Testes pgTAP:** isolamento entre tenants; cliente do portal não lê nada do funil; escrita direta recusada; contato do site vira oportunidade; contato repetido não duplica; arquivar sem motivo recusado; etapa aberta sem próximo passo recusada; versão antiga recusada; cada ação grava linha do tempo e evento.

### 2. Casca do sistema (menu lateral da proposta 2)
Menu escuro de 240 px: Painel · VENDER (Pipeline, Clientes, Propostas, Tráfego pago) · ENTREGAR (Projetos, Pedidos) · BIBLIOTECA (Materiais) · GESTÃO (Financeiro, Relatórios) · rodapé (Configurações, conta). Busca "Buscar… Ctrl K" encontra clientes pelo nome. "Ver como cliente" fica para o S3.

### 3. Funil de vendas (`/app/pipeline`)
- Título, linha "N contatos ativos · R$ X em diagnósticos e propostas", filtros **Todos · Este mês · Vencidos · Arquivados** com contagem, legenda e botão **Novo contato**.
- 5 colunas com quantidade e soma. Cartão: empresa, pessoa · origem, valor ou "Sem valor ainda", selo do diagnóstico (Essencial/Ampliado · pago/a pagar), horário pedido no site, próximo passo com data (vencido vermelho, hoje âmbar, futuro neutro). Proposta com passo vencido ganha a borda vermelha.
- Clique abre a ficha. Menu "…": Mover para, Editar próximo passo, Arquivar.
- Computador: arrastar entre colunas. Celular: colunas em abas e "Mover para" em painel de baixo.
- Arquivar pede motivo (preço, prazo, escolheu outro, sem resposta, não era o momento, outro + nota) e mostra "Contato arquivado. Desfazer" por alguns segundos.
- Atualização otimista com volta e aviso "Não foi possível mover. Tentar de novo".

### 4. Clientes (`/app/clientes`)
Busca, filtros **Todos · Contatos · Em negociação · Clientes · Arquivados**, colunas Nome (sigla), Situação, Próximo passo, Pacote ou mensalidade, Valor, Última atividade; rodapé com totais. Lista virtualizada; no celular, cartões.

### 5. Ficha do cliente (`/app/clientes/$id`)
Cabeçalho (sigla, nome, situação, segmento · cidade · cliente desde) com **Abrir WhatsApp** e **Editar**. Abas **Visão geral** (Oportunidade com etapa, valor, diagnóstico e próximo passo editáveis; Contato principal; Anotações "Só você vê") e **Linha do tempo**. As outras abas da proposta 2 entram com os cards S2 e S3.

### 6. Painel (`/app`)
"Precisa de você hoje": passos vencidos e de hoje, por urgência, com ação (Abrir WhatsApp ou Abrir ficha). Indicadores reais do S1: contatos ativos (com vencidos) e valor em negociação. Projetos e "A receber" aparecem quando existirem (S3/S4), sem números de mentira.

### 7. Padrões
TanStack Query com chaves por recurso, mutações otimistas com volta, `notify` com "Tentar de novo", componentes pequenos, painéis laterais (painel de baixo no celular), alvos de 44 px.

## Casos de borda
- Contato do site sem WhatsApp: entra com "Responder por e-mail" e o cartão mostra "Sem WhatsApp".
- Contato do site sem empresa: a ficha usa o nome da pessoa.
- Mesma pessoa pede horário duas vezes: uma oportunidade só, as duas entradas na linha do tempo.
- Duas abas movem o mesmo cartão: a segunda recebe "Esta oportunidade mudou. Atualize a tela." e recarrega.
- Arrastar para "Fechado": o próximo passo passa a ser opcional.
- Desarquivar volta para a etapa em que estava.

## Critérios de aceite
- [ ] Telas como na proposta 2 (recorte acima), no computador e a 390 px.
- [ ] Pedido de horário do site aparece em "Contato" sem ação manual.
- [ ] Criar, mover, editar, arquivar e desfazer funcionam com atualização otimista e volta em caso de erro.
- [ ] Testes pgTAP novos e antigos passam; `bun run build`, `bun run lint` e `bun run test` sem erro.
- [ ] Login de cliente do portal não vê nada do funil.
- [ ] Migração aplicada em produção pelo workflow (verificar → aplicar), feito pelo Yuri.
