# Card S9 · Oferta 2026 no Hub

> **Origem:** doc "Revisão da oferta · Fora do Papel" (19/10).
> **Decisões do Yuri (19/10):**
> - 100% de dedicação, 200 h por mês;
> - manter as 4 frentes;
> - diagnóstico pago e abatido, só em projetos grandes;
> - mensalidade vendida por nível, horas como regra interna, horas não usadas valem por mais 1 mês, preços revistos para a hora de referência;
> - domínio, banco, código e contas em nome do cliente;
> - garantia de 30 dias.
>
> **Par no site:** card SITE-5 (repositório `fora-do-papel-blueprint`).

**Objetivo:** o que o site vende, o que a proposta promete e o que o Hub controla passam a usar os mesmos nomes e regras.

**Não entra:**
- saldo de horas por mensalidade (o acúmulo de 1 mês é regra escrita, ainda sem conta automática);
- relatórios por frente;
- modelos de proposta por frente (S2b);
- contrato de tratamento de dados;
- loja-piloto (card LOJA-0).

## Requisitos

### Banco (`supabase/migrations/20261019300000_s9_oferta.sql`)
- **Frente:** `deals.service_line` (`sistemas`, `ia`, `sites`, `automacoes`).
  - O contato novo do site já nasce com a frente do assunto escolhido.
  - Oportunidade que já existia não é alterada pelo visitante (regra do REV-1).
  - `funil_atualizar` aceita `frente`; `v_funil` mostra `frente`.
- **Configurações:**
  - `pricing_settings.capacity_hours` (padrão 200);
  - `pricing_settings.warranty_days` (padrão 30);
  - `precos_salvar` grava os dois.
- **Planos:**
  - `pricing_plans.includes` (o que o cliente recebe, uma linha por item) e `rollover_months` (padrão 1);
  - os três planos existentes recebem um texto inicial editável;
  - agência nova nasce com R$ 450, R$ 1.350 e R$ 3.300 (1,5 h, 4,5 h e 11 h × R$ 300).
- **Proposta:**
  - o plano na conta e no retrato enviado leva `inclui` e `acumula_meses`;
  - o documento do cliente leva `garantia_dias`.
- **Capacidade:** `capacidade_resumo()` devolve:
  - a capacidade;
  - as horas das mensalidades ativas;
  - o que falta nos projetos em andamento;
  - as horas lançadas no mês;
  - o que sobra para vender.

### Telas
- **Configurações › Preços:**
  - "O que o cliente recebe" por plano;
  - "Horas não usadas valem por mais 1 mês";
  - garantia em dias;
  - horas por mês para vender.
- **Ficha do cliente › Oportunidade:** mostra a frente. O painel "Frente, valor e diagnóstico" troca a frente.
- **Painel:** "Capacidade do mês" (mensalidades, projetos em andamento, horas lançadas e o que sobra para vender).
- **Proposta do cliente, em "Depois do lançamento":**
  - a mensalidade lista o que o nível inclui e o acúmulo de horas;
  - "Garantia de 30 dias" e "O que é seu" aparecem nas propostas novas.

## Critérios de aceite
- Contato do site com assunto "Automações e integrações" entra no funil com essa frente.
- Proposta nova mostra a garantia e o que é seu; proposta antiga continua igual.
- Painel mostra a capacidade com as 200 h.
- pgTAP `supabase/tests/s9_oferta.test.sql` passa; build, lint, vitest e e2e passam.

## Para o Yuri depois de publicar
- **Planos:** em Configurações › Preços, conferir os novos preços sugeridos (R$ 450, R$ 1.350 e R$ 3.300), que valem só para agências novas. Os seus planos não mudam sozinhos.
- **Prazo de resposta:** confirmar os 2 dias úteis no texto do Essencial.
