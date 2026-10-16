# Card S5 · Tráfego pago (lançamento manual)

> **Base visual:** canvas "Hub Fora do Papel · proposta 2", tela `HubTrafego`, no visual atual do Hub.
> **Decisão do Yuri (16/10):** começar com **lançamento manual** do investimento; contatos e fechamentos vêm do funil. A leitura automática da Meta e do Google entra depois da liberação da Meta (verificação do negócio e revisão do app).
> **Orçamento inicial:** R$ 500 por mês (Google R$ 300 · Instagram e Facebook R$ 200), único valor real do canvas. Editável na tela.

**Objetivo:** saber quanto cada real de anúncio trouxe em contatos, diagnósticos e contratos, sem planilha.
**Depende de:** S1 (origem "Anúncio" e "Qual anúncio" na ficha) e S2 (fechamento pelo aceite).
**Não entra:** leitura automática das plataformas, comprovante em arquivo (entra com o Storage no S3), criativos em Materiais, ativar ou pausar anúncio na plataforma.

## Visão de negócio
O anúncio custa todo mês, mas o retorno aparece semanas depois. Ligando o gasto ao contato e o contato ao contrato, o Yuri vê qual campanha paga a conta e qual só traz contato barato que não compra.
**Indicadores (no banco):** investido no mês e ritmo do orçamento; contatos de anúncio; custo por contato; custo por diagnóstico vendido; conversão por etapa; retorno por mês de entrada (valor fechado ÷ investido).

## Requisitos

### 1. Banco (`supabase/migrations/20261016200000_s5_trafego.sql`)
- `ad_budgets` (uma linha por tenant): orçamento mensal total e por plataforma.
- `ad_campaigns`: plataforma (`google` = Google busca, `meta` = Instagram e Facebook), nome (único por tenant, sem diferença de maiúsculas), situação (`ativa`, `pausada`).
- `ad_spend`: campanha, data, valor em centavos, cliques (opcional), observação.
- **Ligação com o funil:** contato com origem "Anúncio (Google)" ou "Anúncio (Instagram/Facebook)"; a campanha é o campo "Qual anúncio" da ficha (mesmo nome, sem diferença de maiúsculas). O contato conta no **mês em que chegou**, inclusive os arquivados.
- **RLS:** só o dono lê; escrita só por RPC; anon sem acesso.
- **RPCs:** `trafego_painel(p_periodo)` com `mes`, `3meses` ou `ano` (tudo calculado no banco, no fuso da agência); `trafego_registrar(...)`; `trafego_remover(p_id)`; `trafego_campanha_salvar(...)`; `trafego_orcamento_salvar(...)`. Cada escrita grava em `event_outbox`.
- **Testes pgTAP:** isolamento; anon sem acesso; custo por contato e retorno conferidos com números fixos; contato fora do período não conta; campanha com nome repetido recusada; valor negativo recusado.

### 2. Tela (`/app/trafego`)
Cabeçalho com orçamento e "Registrar investimento" (âmbar). Abas Este mês · 3 meses · Ano. Blocos do canvas: orçamento do mês (ritmo e quanto sobra por dia), 4 indicadores, do clique ao contrato (com a maior perda em uma frase), campanhas, retorno por mês de entrada (com explicação dos termos), contato barato × contato que vira venda, investimentos registrados (com remover). Painéis laterais: registrar investimento, campanha nova ou editar, orçamento.
No "Novo contato" e "Editar ficha", "Qual anúncio" sugere as campanhas cadastradas.

## Casos de borda
Mês sem investimento (custo por contato "—"); contato de anúncio sem campanha ("Sem campanha"); campanha sem contato; divisão por zero; investimento lançado em mês passado; orçamento zerado.

## Critérios de aceite
- Números iguais aos do banco para os mesmos dados (nenhuma soma no navegador).
- A 390 px sem rolagem lateral; tabelas viram cartões.
- `bun run build`, `bun run lint`, vitest, pgTAP e e2e passam.
