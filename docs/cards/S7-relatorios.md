# Card S7 · Relatórios

> **Base visual:** canvas "Hub Fora do Papel · proposta 2", tela `HubRelatorios`, no visual atual (HUB-VIS-2).

**Objetivo:** responder em uma tela onde a agência ganha e perde dinheiro e tempo: o que vende, quanto vale cada hora e se as entregas andam no prazo.
**Depende de:** S1, S2, S3, S4 e S5.
**Não entra:**
- satisfação (avaliação depois do lançamento);
- metas configuráveis (usa o piso e a hora de referência de Configurações);
- exportação em planilha. Fica "Imprimir ou salvar em PDF".

## Requisitos (tudo calculado no banco: RPC `relatorios(p_periodo)`, com `mes`, `3meses` ou `ano`)
1. **"O que mudou":** quatro frases curtas no topo (vendas, margem, entrega e receita), geradas a partir dos números.
2. **Vendas:**
   - **Funil do período:** contatos que chegaram e quantos passaram por cada etapa, com a etapa de maior perda.
   - **Por origem:** contatos, diagnósticos pagos, fechados, conversão e receita.
   - **Motivos de perda:** os mais comuns entre os arquivados.
   - **Tempo médio** do primeiro contato ao aceite.
3. **Receita:**
   - implantação fechada no período;
   - diagnósticos pagos;
   - recebido no período;
   - mensalidades ativas (MRR), ARR e mensalidades encerradas (churn);
   - a receber em 30 dias.
4. **Margem por projeto** (projetos em andamento):
   - valor por hora estimado (valor ÷ horas estimadas) e valor por hora real (valor ÷ horas usadas, depois de 25% das horas);
   - comparação com o piso e o alvo de Configurações;
   - horas de folga até cair abaixo do piso.
5. **Entrega:**
   - tempo médio de aprovação do cliente, em dias;
   - aprovações abertas e há quanto tempo;
   - pedidos por classificação no período;
   - serviços adicionais aprovados (quantidade e valor);
   - horas da mensalidade usadas no mês por cliente, em comparação com o plano.
6. **"Imprimir ou salvar em PDF".**

## Casos de borda
- Período sem dados: cada bloco explica o que precisa acontecer para aparecer número; nunca número inventado.
- Projeto sem horas estimadas ou sem horas lançadas: a margem aparece como "Sem dados suficientes".

## Critérios de aceite
- Os números batem com o Painel e com o Financeiro no mesmo período (mesma base).
- Trocar o período recalcula tudo no banco.
- Celular a 390 px sem rolagem lateral.
- Verificações: build, lint, vitest, pgTAP e e2e passam.

## Notas da implementação (17/10)
- Cada cliente conta uma vez no funil, pela oportunidade mais recente.
- O diagnóstico por origem conta só o que foi pago no período.
- O tempo até o aceite ignora registros com data inconsistente.
