# CX-11 · Contrato depois do aceite

Definido pelo Yuri em 21/10/2026: **a primeira parcela só é cobrada depois do contrato assinado.**

## Por quê
O aceite da proposta registra o "sim" comercial, mas hoje o Hub não gera nem guarda contrato. O trabalho e a cobrança precisam de contrato assinado.

## Fluxo
1. **Antes do aceite:** a proposta tem o link "Ler as condições gerais" (texto padrão da agência: prazos, garantia, propriedade do que é entregue, cancelamento, reajuste). O "Li e concordo" passa a citar as condições gerais. A versão do texto fica guardada no aceite.
2. **No aceite:** o Hub cria o contrato com os dados do aceite e da proposta (razão social, CPF/CNPJ, endereço, responsável legal, escopo, o que fica de fora, valor, partes, mensalidade, prazo). Situação: "Aguardando assinatura".
3. **Assinatura:**
   - assinatura eletrônica por um serviço de assinatura (decisão pendente, abaixo);
   - enquanto não houver serviço escolhido, há o caminho manual: o Yuri envia o PDF assinado no Hub e marca "Assinado".
4. **Depois da assinatura:** a 1ª parcela ganha vencimento (assinatura + 3 dias) e aparece no portal do responsável; o contrato fica em Arquivos.

## Requisitos
- **Condições gerais:** editadas no Hub (Configurações), com versão. A proposta mostra a versão vigente e o aceite guarda qual foi lida. Texto final só depois de revisão de advogado; até lá, marcador e nada vai ao ar.
- **Tabela `contracts`** (com `tenant_id` e RLS):
  - liga cliente, proposta e projeto;
  - situação (`aguardando_assinatura`, `assinado`, `cancelado`);
  - versão das condições gerais, PDF gerado e PDF assinado (Storage), datas, quem assinou e o identificador no serviço de assinatura.
- **Cobrança:** no aceite, as parcelas nascem **sem vencimento**, com o rótulo "após a assinatura do contrato". A RPC `contrato_assinar` dá vencimento à 1ª parte e grava o evento `contrato.assinado` na mesma transação.
- **Hub:** na ficha do cliente e no projeto, o cartão "Contrato" mostra a situação, "Enviar para assinatura", "Reenviar", "Enviar PDF assinado" e "Ver contrato". A fila do Painel lista os contratos parados há mais de 3 dias.
- **Portal:**
  - só o responsável vê "Assinar o contrato" no "Precisa de você" (selo conta igual);
  - depois de assinado, o contrato aparece em Arquivos, só para o responsável;
  - a equipe não vê o contrato (CX-0).
- **Mensagens (CX-1):** "Contrato pronto para assinar" e "Contrato assinado", em WhatsApp e e-mail.
- **Tela depois do aceite (CX-4):** o passo 2 vira "Assinar o contrato" e o passo 3 "Primeira parte do pagamento, depois da assinatura".
- **Webhook do serviço de assinatura:** recebido por uma Edge Function do Supabase com segredo próprio. Chave do serviço nunca no frontend nem em logs.

## Decisão pendente
- **Serviço de assinatura:** comparar 2 ou 3 opções nacionais (custo por documento, validade jurídica, API e webhook, assinatura pelo celular sem criar conta). Até a escolha, vale o caminho manual.
- **Texto:** condições gerais e modelo de contrato revisados por advogado. A parte de propriedade segue o card S10 (licença do código em sistemas sob medida, dados sempre do cliente; decisão de 22/10).

## Casos de borda
- Proposta reaberta depois do aceite: o contrato antigo é cancelado e um novo nasce no próximo aceite.
- Contrato não assinado em 7 dias: aviso ao Yuri; nada é cobrado.
- Projeto cancelado antes da assinatura: o contrato é cancelado junto.
- Aceite repetido não cria segundo contrato.

## Critérios de aceite
- [ ] Teste de banco:
  - parcelas sem vencimento até assinar;
  - `contrato_assinar` dá vencimento à 1ª parte e grava o evento;
  - equipe não vê o contrato;
  - aceite repetido não duplica o contrato.
- [ ] Portal: "Assinar o contrato" no Precisa de você do responsável; contrato em Arquivos depois de assinado.
- [ ] Hub: cartão do contrato com o caminho manual funcionando.
- [ ] `bun run build`, `bun run lint`, `bun run test` e testes de banco.
