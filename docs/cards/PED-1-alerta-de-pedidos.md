# PED-1 · Alerta de pedidos de ajuste no Hub

> Origem: Yuri, 13/11/2026 ("preciso de um alerta para esses ajustes quando surgir… no menu superior e na lateral a quantidade de ajustes pendentes, igual fica no menu Tarefas").

## Problema

Pedido de ajuste novo (portal, sistema do cliente, revisão do site) só era visto quando alguém abria a tela de pedidos. Os pedidos T-03 e T-04 da RM Telecom ficaram um dia sem classificação.

## O que muda

1. **Número no menu:** "Pedidos de ajuste" mostra quantos estão pendentes, com o mesmo selo de Tarefas.
   - Pendentes são os pedidos novos, em análise e fazendo, ou seja, o que espera a Fora do Papel.
   - "Aguardando o cliente" não conta.
2. **Faixa no topo de todas as telas do Hub**, quando há pedido novo para classificar:
   - texto do tipo "2 pedidos de ajuste novos esperando você, 1 urgente", com "Ver pedidos ›";
   - em tom de atenção; em tom de risco se algum novo for urgente;
   - some na tela de pedidos e quando todos os novos forem classificados.
3. **Atualização:**
   - o número e a faixa conferem o banco a cada 2 minutos e quando a aba volta ao foco;
   - classificar um pedido atualiza os dois na hora.
4. **Banco:** `pedidos_resumo` ganha `pendentes`, `novos_urgentes` e `novo_mais_antigo`, e as chaves antigas não mudam.
   - Continua `security invoker` sobre `v_pedidos`, e a RLS decide o que cada pessoa conta.
   - Migração: `20261113100000_ped1_alerta_pedidos.sql`.

## Critérios de aceite

- [x] Sem pedido novo, não há faixa (teste).
- [x] A faixa conta os novos e os urgentes (teste).
- [x] `bun run build`, `bun run lint` e `bun run test` passam.
- [ ] Conferência no Hub publicado: o número aparece no menu e a faixa no topo.
