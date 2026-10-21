# CX-0 · Perfis de acesso no portal

Aprovado em 20/10/2026 (documento "Experiência do cliente · proposta de redesenho", canvas telas 13 e 14).

## Por quê
Quem usa o portal no dia a dia muitas vezes não é quem contratou: é a recepção, a gerência, o marketing. Essas pessoas não devem ver valores, cobranças nem decidir serviços adicionais.

## Requisitos
1. Cada pessoa com acesso ao portal tem um perfil: **Responsável pelo contrato** ou **Equipe** (`client_members.profile`, ao lado de `can_approve`).
2. Equipe não recebe nada com dinheiro, e o banco é quem recusa (`sem_permissao_financeiro`, 42501):
   - `portal_pagamentos`, `portal_cobranca_avisar`, `recibo`;
   - `portal_adicional_decidir`; serviços adicionais somem de `portal_aprovacoes` e de `portal_inicio`;
   - `portal_pedidos` sem valor, horas e nota do Yuri; `portal_inicio` sem mensalidade.
3. Contador "Precisa de você": contas e adicionais só contam para o responsável. Conta a pagar entra com **5 dias** de antecedência (era 3) e aparece no Início como ação `pagamento`.
4. Convite pede o perfil (`portal_convidar(cliente, email, perfil, pode_aprovar)`); quem aceita entra com o perfil do convite.
5. A empresa nunca fica sem responsável enquanto houver equipe:
   - primeiro convite de uma empresa é de responsável;
   - não rebaixa nem remove o último responsável (`precisa_responsavel`), com trava na empresa contra corrida.
6. Hub: a seção "Acesso ao portal" mostra o perfil de cada pessoa, troca o perfil e escolhe o perfil no convite, com o resumo do que a pessoa vai ver.
7. Portal: 5 abas para o responsável, 4 para a equipe (sem Pagamentos). Sem perfil carregado, Pagamentos fica de fora. Se alguém da equipe abrir `/portal/pagamentos` pelo endereço, a tela explica que os pagamentos ficam com o responsável.
8. Quem já tinha acesso vira responsável; o padrão daqui em diante é equipe.

## Critérios de aceite
- [x] `supabase/tests/cx0_perfis.test.sql` cobre os dois perfis, convite, troca, remoção e o primeiro convite (35 testes).
- [x] Testes antigos continuam passando (fixtures marcam como responsável quem já tinha acesso).
- [x] Revisão de segurança por revisor separado; achados corrigidos: corrida na troca de perfil, remoção do último responsável, primeiro convite como equipe, horas e nota dos pedidos, "pode aprovar" voltando sozinho, empresa do perfil diferente da empresa do portal.
- [x] `bun run build`, `bun run lint`, `bun run test`.

## Fora deste card
- Eventos `pedido.adicional_*` no `event_outbox` levam o valor. Quando o n8n for montado (CX-10), avisos com valor vão só para o responsável.
- `CLAUDE.md`: a regra das abas passa a ser "5 abas para o responsável, 4 para a equipe".
