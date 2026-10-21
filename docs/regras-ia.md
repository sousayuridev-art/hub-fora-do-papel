# Regras de uso de IA pela API (todos os projetos)

Decididas em 21/10/2026. Valem para o Hub, o site e todo sistema de cliente.

## 1. Onde a API entra
- Só dentro dos produtos: funções do Hub e dos sistemas de clientes (resumir reunião, classificar solicitação, responder no WhatsApp com revisão humana).
- Nunca no desenvolvimento. O Claude Code usa a assinatura do Claude; não configurar `ANTHROPIC_API_KEY` na máquina nem no Claude Code.

## 2. Uma área por projeto
- No Console da Anthropic, um workspace por projeto, com chave própria e limite de gasto mensal:
  - `fdp-hub` (Hub da Fora do Papel)
  - `fdp-demos` (demonstrações de venda e testes)
  - `cli-<cliente>` (um por cliente: `cli-junior`, `cli-plamev`, …)
- Chave nova a cada projeto; nunca reaproveitar a chave de outro cliente.

## 3. Chave só no servidor
- Nos segredos do Supabase (Edge Functions) ou do servidor do sistema. Nunca no navegador, no repositório, em logs ou em mensagens.
- Chave vazada: revogar no Console na hora e trocar no segredo.

## 4. Qual modelo
- **Haiku** (o mais barato): padrão para classificar, separar, resumir pouco texto e sugerir respostas curtas.
- **Sonnet**: quando o erro custa caro (extrair compromissos, nomes, valores e prazos de reuniões; textos que vão para o cliente).
- **Opus**: só com motivo escrito no card.
- Trocar de modelo é decisão de card, não de código solto.

## 5. Custo sob controle
- Instruções fixas com cache (prompt caching); o que não precisa ser na hora vai em lote (Batch API, metade do preço).
- Toda chamada registra projeto, modelo, tokens e custo estimado numa tabela de uso (no Hub: `ai_usage`).
- Teto mensal no código, além do limite do Console: aos 80% avisa no Painel; aos 100% para e avisa. Nada de chamada sem teto.
- Antes de colocar em produção, medir o custo por uso (por reunião, por conversa, por solicitação) num piloto.

## 6. IA sugere, pessoa decide
- Nada que afete o cliente sai sem revisão humana: tarefa, escopo, valor, mensagem ao cliente, aprovação.
- Toda sugestão mostra de onde veio (trecho, minuto, documento). Sem fonte, não sugere.
- A IA nunca define preço.

## 7. Dados e LGPD
- Mandar para a IA só o necessário; tirar dados sensíveis que não ajudam (saúde, documentos, dados de terceiros).
- Anthropic entra como operadora na política de privacidade de cada sistema que usa IA, e o cliente é informado.

## 8. Quem paga
- Piloto: pode usar o crédito da Fora do Papel, com teto.
- Produção em cliente: o custo de IA entra no preço (franquia dentro da mensalidade) ou a chave fica em nome do cliente, pagando direto. A proposta e o contrato dizem qual dos dois.

## Crédito promocional de US$ 100 (outubro de 2026)
Ver no Console (Billing) se tem data de vencimento; se tiver, priorizar o que entra em uso antes.

| Workspace | Limite | Para quê |
| --- | --- | --- |
| `fdp-hub` | US$ 40 | Reuniões no Hub (cards RE-2 a RE-4) |
| `cli-junior` | US$ 30 | Piloto da IA de agendamento pelo WhatsApp; medir custo por conversa para a mensalidade |
| `cli-plamev` | US$ 10 | Classificação automática de solicitações (Haiku) |
| `fdp-demos` | US$ 20 | Demonstrações de venda e testes de instruções |
