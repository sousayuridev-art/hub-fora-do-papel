-- =====================================================================
-- Hub Fora do Papel · RS-1 · Origem "revisao" para os pedidos de ajuste
-- Card: docs/cards/RS-1-revisar-site-banco.md
-- Valor novo do enum em migração própria (não pode ser usado na mesma transação).
-- =====================================================================
alter type public.request_origin add value if not exists 'revisao' after 'sistema';
