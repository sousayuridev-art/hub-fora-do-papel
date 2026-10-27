-- =====================================================================
-- Hub Fora do Papel · PC-2 · Origem "painel" nos pedidos de ajuste
-- Card: docs/cards/PC-2-pedido-de-ajuste-com-contexto.md
-- Em arquivo próprio: o valor novo do enum só pode ser usado depois do commit.
-- =====================================================================

alter type public.request_origin add value if not exists 'painel' after 'portal';
