-- =====================================================================
-- Hub Fora do Papel · SIS-2 · Origem "sistema" nos pedidos de ajuste
-- Card: docs/cards/SIS-2-pedidos-pelo-sistema.md
-- Em arquivo próprio: o valor novo do enum só pode ser usado depois do commit.
-- =====================================================================

alter type public.request_origin add value if not exists 'sistema' after 'painel';
