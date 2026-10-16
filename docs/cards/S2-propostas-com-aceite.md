# Card S2 · Propostas com aceite pelo link

> **Base visual:** canvas "Hub Fora do Papel · proposta 2", telas `HubPropostas`, `HubPrecos` e `PortalProposta`, no visual atual do Hub (HUB-VIS-2).
> **Decisões do Yuri (16/10):** aceite por **link seguro, sem login**; Propostas antes do Tráfego pago.
> **Valores iniciais de preço:** vêm do canvas da proposta 2 (hora R$ 300, piso R$ 250, diagnóstico R$ 2.000/R$ 4.500, planos R$ 400/R$ 1.200/R$ 3.000…). Ficam editáveis em Configurações › Preços; o Yuri confere antes do primeiro envio.

**Objetivo:** montar a proposta no Hub com o valor calculado pelas regras da agência e mandar um link pelo WhatsApp. O cliente lê no celular, preenche os dados do contrato e aceita. O aceite fecha a oportunidade no funil.
**Depende de:** S1 (clientes, funil, linha do tempo, eventos).
**Não entra:** modelos por pacote (S2b), contrato em PDF e envio por e-mail (falta provedor de e-mail e SPF), cobrança (S4), projeto criado no aceite (S3), "O que é seu no fim" (falta a política de propriedade: não vai ao ar com marcador).

## Visão de negócio
Hoje a proposta sai em documento solto e o aceite fica no WhatsApp. Com o S2 o preço segue a regra (sem desconto escondido), o cliente aceita em um lugar só e o funil fecha sozinho.
**Indicadores (no banco):** propostas enviadas, aceitas e recusadas no mês; taxa de aceite; tempo entre envio e aceite; valor por hora médio das aceitas; propostas abertas pelo cliente e ainda sem resposta.

## Requisitos

### 1. Banco (`supabase/migrations/20261016100000_s2_propostas.sql`)
- `pricing_settings` (uma linha por tenant): hora de referência, piso, alvo (= hora), preço e horas dos diagnósticos, dias para descontar o diagnóstico (30), parcelas (até R$ 10.000: 50/50; acima: 40/30/30), formas (Pix, boleto, cartão com taxa repassada), multa 2%, juros 1% ao mês, validade 15 dias, reajuste (IPCA), infraestrutura pelo custo.
- `pricing_plans`: Essencial, Evolução, Parceria (horas/mês, preço/mês, contrato mínimo, ordem, ativo).
- `deals.diagnostic_paid_at`: preenchido sozinho quando o diagnóstico vira pago.
- `proposals`: cliente, oportunidade, situação (`rascunho`, `enviada`, `aceita`, `recusada`), versão, título e apresentação, tipo de projeto, "o que ouvimos" (até 3 frases + conclusão), itens (nome, descrição, horas, destaque), "não está incluído" (item + motivo), fases (nome + quando), lançamento previsto, complexidade (1,0 · 1,15 · 1,3), contingência (10 · 15 · 20%), desconto + motivo, plano de mensalidade, infraestrutura/mês, conferências manuais (escopo, prazo, contato), link (`token`), enviada/vence/vista/aceita/recusada em, dados do aceite e o retrato congelado (`snapshot`) do que foi enviado.
- **Conta (no banco, `_proposta_calcular`)**: horas × hora × complexidade, + contingência, arredondado para cima a cada R$ 500, − diagnóstico pago nos últimos 30 dias, − desconto. Valor por hora = (total + diagnóstico) ÷ horas. Abaixo do piso exige motivo com 15 letras ou mais. Parcelas pela regra; a última leva o resto dos centavos.
- **RLS:** só o dono do tenant lê `proposals`, `pricing_*`. Escrita só por RPC. O visitante (anon) só chega por `proposta_publica(token)` e `proposta_aceitar/recusar(token, …)`.
- **RPCs (dono):** `proposta_criar(p_deal)`, `proposta_salvar(p_id, p_versao, p_doc)` (devolve a conta e as pendências), `proposta_enviar(p_id, p_versao)`, `proposta_reabrir(p_id)` (nova versão; o link mostra "em atualização"), `proposta_marcar_recusada(p_id, p_motivo)`, `proposta_resumo()`, `precos_salvar(p_campos, p_planos)`.
- **Enviar:** congela o retrato com os preços do dia, gera o link, conta a validade, leva a oportunidade para "Proposta" com valor = total e próximo passo "Retorno da proposta" em 3 dias, grava linha do tempo e `proposta.enviada` no `event_outbox` (o n8n manda o WhatsApp depois).
- **Aceitar (anon, pelo link):** só proposta enviada e no prazo; exige nome, e-mail, CPF ou CNPJ válido, razão social ou nome completo, endereço, e-mail de cobrança e "Li e concordo". Grava os dados de contrato na ficha (regra C2), fecha a oportunidade com o valor, grava linha do tempo (`origem: cliente`) e `proposta.aceita`. Aceitar duas vezes devolve o mesmo comprovante.
- **Recusar (anon):** motivo opcional; avisa o Yuri pela linha do tempo e `proposta.recusada`. A oportunidade continua aberta para ele decidir.
- **Vista:** a primeira abertura do link registra "Cliente abriu a proposta".
- **Testes pgTAP:** isolamento; anon sem acesso às tabelas; conta igual aos exemplos do canvas (Ótica R$ 16.500; Sorriso R$ 14.000 − R$ 2.000 = R$ 12.000); envio travado com pendência; abaixo do piso sem motivo travado; aceite fora do prazo recusado; documento inválido recusado; aceite fecha a oportunidade; aceite repetido não duplica; link de rascunho não abre.

### 2. Configurações › Preços (`/app/configuracoes`)
Seções do canvas: Valor da hora e piso, Diagnóstico, Mensalidade, Condições de pagamento, Validade e reajuste. "Salvar alterações" só com mudança pendente. Aviso: "O que já foi enviado ao cliente mantém o valor combinado."

### 3. Propostas (`/app/propostas`)
- Cabeçalho com resumo do banco e "Nova proposta" (escolhe uma oportunidade aberta sem proposta).
- Coluna esquerda: abas Rascunho · Enviadas · Aceitas · Recusadas com contagem; lista virtualizada.
- Centro (editor com salvamento automático e aviso "Salvo"): cabeçalho, apresentação, o que ouvimos, itens de entrega (horas só no Hub), como chegamos ao valor, o que não está incluído, mensalidade, como vamos trabalhar (fases e lançamento), pagamento e validade.
- Direita: valor da proposta com a conta linha a linha, régua do valor por hora (piso e alvo), "Antes de enviar" (4 automáticas + 3 conferências), **Enviar proposta** (âmbar, travado com pendência) e **Ver como o cliente vê**.
- Enviada: copiar link, abrir WhatsApp com a mensagem pronta, "Editar e reenviar", "Marcar como recusada".
- Ficha do cliente e funil: "Criar proposta" na oportunidade.

### 4. Página do cliente (`/proposta/$token`, pública, sem login)
Seções do `PortalProposta`: topo com investimento, o que ouvimos, o que vamos fazer, o que não está incluído, como vamos trabalhar, investimento (parcelas e formas), depois do lançamento, aceite. Celular conforme o card P (M2 `ActionBar` "Aceitar proposta" leva ao bloco de aceite, M5 campos, M6 botões, M7 seções recolhidas). Estados: válida, aceita (comprovante com "Imprimir ou salvar em PDF"), recusada, vencida, em atualização, link inválido. Sem índice em buscadores (`noindex`).

## Casos de borda
Proposta sem itens; cliente sem e-mail nem WhatsApp; oportunidade arquivada ou fechada; dois rascunhos para a mesma oportunidade (só um aberto); preço mudou depois do envio (vale o retrato); link vencido; aceite com a aba aberta há dias (confere de novo no banco); CNPJ com pontuação; Yuri edita enquanto o cliente aceita (versão).

## Critérios de aceite
- Conta igual aos exemplos do canvas, feita só no banco.
- Proposta com pendência não envia; o botão diz o que falta.
- Aceite pelo celular a 390 px sem rolagem lateral; o funil mostra a oportunidade em "Fechado" na hora.
- Anon não lê nenhuma tabela; só o link certo abre a proposta certa.
- `bun run build`, `bun run lint`, vitest, pgTAP e e2e passam.
