# Card S4 · Financeiro e Pagamentos no portal

> **Base visual:** canvas "Hub Fora do Papel · proposta 2", telas `HubFinanceiro`, `PortalPagamentos` e `PortalMensalidade`, no visual atual (HUB-VIS-2) e com as regras do card P.
> **Decisões do Yuri (17/10):**
> - Pagamento por **Pix da agência, com registro manual**: o portal mostra o Pix copia e cola e o QR com o valor, e o Yuri marca como pago no Hub. Intermediário de pagamento fica para depois.
> - Entram agora:
>   - parcelas, diagnósticos e serviços adicionais;
>   - mensalidades;
>   - despesas e fluxo de caixa;
>   - recibo para o cliente.
> - **Atraso só mostra e avisa:** o Hub calcula dias, multa e juros para exibir; nada é pausado sozinho.

**Objetivo:** saber o que entra, o que sai e o que vem pela frente sem planilha, e dar ao cliente uma página de pagamentos clara, sem letras miúdas.
**Depende de:** S1 (diagnóstico pago), S2 (parcelas da proposta), S3 (projeto, lançamento, serviço adicional).
**Não entra:** nota fiscal (depois da mudança para ME), intermediário de pagamento (boleto, cartão, baixa automática), conciliação bancária, comissões.

## Visão de negócio
- **Hoje:** as cobranças ficam na cabeça do Yuri e no WhatsApp, e o cliente não sabe quanto falta pagar.
- **Com o S4:** toda cobrança nasce sozinha do que já aconteceu no Hub (aceite, diagnóstico, serviço adicional, lançamento), e o cliente paga pelo Pix sem pedir a chave.
- **Indicadores** (calculados no banco):
  - a receber em 30 dias;
  - em atraso;
  - recebido no mês;
  - MRR (soma das mensalidades ativas) e ARR;
  - despesas do mês;
  - saldo previsto dos próximos 3 meses.

## Requisitos

### 1. Banco (`supabase/migrations/20261017200000_s4_financeiro.sql`)

**Tabelas**
- `finance_settings`: chave Pix, nome de quem recebe, cidade e dia padrão de vencimento da mensalidade.
- `charges` (cobranças):
  - cliente, e opcionalmente projeto, proposta, pedido ou mensalidade;
  - tipo: `parcela`, `diagnostico`, `adicional`, `mensalidade` ou `avulsa`;
  - descrição, valor, vencimento (vazio = "na entrega", com o texto do quando);
  - parte (1 de 3) e mês de referência;
  - situação: `aberta`, `paga` ou `cancelada`;
  - pagamento: data, valor, forma, número do recibo;
  - aviso do cliente ("já paguei").
- `subscriptions` (mensalidades):
  - cliente, projeto, plano, valor (plano + infraestrutura), início, dia de vencimento, mínimo de meses;
  - situação: `ativa`, `pausada` ou `encerrada`.
- `expenses` (despesas):
  - descrição, categoria e valor;
  - `fixa` (todo mês, de um mês até outro) ou `avulsa` (num dia).

**Regras no banco** (cada uma grava evento no `event_outbox`)
- **Aceite da proposta** cria as parcelas com os percentuais e os textos da proposta. A 1ª vence 3 dias depois do aceite; as outras ficam "na entrega" até ganharem data.
- **Diagnóstico:**
  - com o pacote escolhido no funil, nasce a cobrança do diagnóstico, no valor de Configurações;
  - marcar pago no funil marca pago no financeiro, e vice-versa.
- **Serviço adicional aprovado** pelo cliente gera 2 cobranças: 50% em 3 dias e 50% na entrega. Quando o pedido fica pronto, a 2ª ganha vencimento em 3 dias.
- **Lançar projeto com plano** cria a mensalidade a partir do mês seguinte ao lançamento. As cobranças do mês são geradas sozinhas quando o Financeiro ou o portal abrem, sem duplicar.
- **Registrar pagamento:** data, valor e forma. Ganha número de recibo sequencial por agência. Pode desfazer.
- **Cobrança avulsa:** o Yuri cria uma cobrança avulsa para o cliente quando precisar.
- **Alterações** de vencimento ou valor só valem para cobrança aberta. Cancelar pede motivo.
- **Atraso** (só exibição):
  - dias corridos depois do vencimento;
  - multa e juros vêm de Configurações (2% e 1% ao mês, calculados por dia);
  - no 10º dia aparece o selo "trabalho pode ser pausado"; nada é bloqueado sozinho.
- **Fluxo de caixa** (mês a mês, 3 meses para trás e 3 para frente):
  - entradas: pagamentos recebidos e cobranças a receber pelo vencimento;
  - saídas: despesas fixas e avulsas e investimento em anúncios (Tráfego pago).
- **RLS:**
  - dono lê tudo do tenant;
  - cliente só pelas RPCs `portal_*`: as cobranças da empresa dele e o Pix da agência;
  - nunca as despesas nem as cobranças de outros clientes;
  - escrita só por RPC.

**Testes pgTAP**
- O aceite gera as parcelas com a soma igual ao total da proposta.
- Diagnóstico pago no funil é pago no financeiro.
- O serviço adicional aprovado gera 50% + 50%.
- A mensalidade gera um mês uma vez só.
- O pagamento ganha recibo sequencial.
- O cliente não vê despesas nem cobranças de outro cliente.
- Outra agência não vê nada.

### 2. Hub (`/app/financeiro`)
- **Números:**
  - a receber em 30 dias;
  - em atraso;
  - recebido no mês;
  - mensalidades por mês (MRR);
  - despesas do mês.
- **Abas:**
  - **Cobranças:** em aberto, com atraso em destaque; recebidas; e "Sem data", com "Definir vencimento".
  - **Mensalidades.**
  - **Despesas.**
  - **Fluxo de caixa.**
- **Painel lateral da cobrança:**
  - registrar pagamento;
  - desfazer;
  - mudar vencimento ou valor;
  - cancelar;
  - copiar a mensagem de cobrança para o WhatsApp.
- **Ações:**
  - "Nova cobrança" (âmbar);
  - "Nova despesa";
  - "Nova mensalidade", para cliente que já existia antes do Hub.
- **Configurações:** seção "Recebimento" com a chave Pix, o nome e a cidade.
- **Ficha do cliente:** resumo do financeiro (pago, a receber, em atraso).
- **Projeto:** o número "Valor do projeto" passa a mostrar quanto já foi recebido.
- **Painel:** "Cliente avisou pagamento" entra nas Novidades.

### 3. Portal (`/portal/pagamentos`)
- **Bloco escuro:** total do projeto, pago, falta, próxima parte e "Pagar agora".
- **Mensalidade:** plano, valor por mês e o que entra.
- **Listas:**
  - parcelas do projeto, com situação;
  - serviços adicionais;
  - mensalidades em aberto.
- **Pagar:**
  - Pix copia e cola e QR com o valor exato;
  - "Já paguei" avisa o Yuri sem marcar como pago.
- **Recibos:** página imprimível (`/recibo/$id`), para o cliente e para o Yuri.
- **"Se um pagamento atrasar":** as regras, em português claro.

## Casos de borda
- Proposta aceita antes do S4: as parcelas são criadas uma vez pela migração.
- Pagamento parcial: registra o valor pago; a diferença vira nova cobrança aberta, se o Yuri escolher.
- Chave Pix não configurada: o portal esconde o Pix e mostra "Combine o pagamento com o seu responsável".
- Mensalidade encerrada no meio do mês: o mês corrente continua cobrado.
- Despesa fixa sem fim: segue todo mês.

## Critérios de aceite
- **Do aceite ao recibo:** aceitar uma proposta cria as parcelas. Registrar o pagamento da 1ª gera recibo, e o portal mostra "Pago" com o recibo.
- **Pix no portal:** o cliente vê o copia e cola com o valor certo e avisa "Já paguei". O aviso aparece no Painel.
- **Atraso:** uma cobrança vencida aparece em atraso com dias, multa e juros.
- **Fluxo de caixa:** o fluxo dos próximos 3 meses mostra entradas, saídas e saldo.
- **Celular:** a 390 px, sem rolagem lateral.
- **Verificações:** build, lint, vitest, pgTAP e e2e passam.
