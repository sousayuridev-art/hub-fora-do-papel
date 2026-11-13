-- =====================================================================
-- Hub Fora do Papel · PED-1 · Alerta de pedidos de ajuste no Hub
-- Card: docs/cards/PED-1-alerta-de-pedidos.md
-- pedidos_resumo ganha o que o alerta precisa: pendentes (o que espera a Fora do Papel),
-- novos urgentes e quando chegou o novo mais antigo. As chaves antigas continuam iguais.
-- Segue security invoker sobre v_pedidos: a RLS decide o que cada pessoa conta.
-- =====================================================================
create or replace function public.pedidos_resumo()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'todos', count(*),
    'recebido', count(*) filter (where status = 'recebido'),
    'andamento', count(*) filter (where status in ('em_analise', 'fazendo')),
    'aguardando_cliente', count(*) filter (where status = 'aguardando_cliente'),
    'concluidos', count(*) filter (where status in ('pronto', 'recusado')),
    'adicional_aprovado_cents', coalesce(sum(value_cents) filter (where classification = 'adicional' and client_decision = 'aprovado'), 0),
    -- PED-1: o que espera a Fora do Papel (novos, em análise e fazendo)
    'pendentes', count(*) filter (where status in ('recebido', 'em_analise', 'fazendo')),
    'novos_urgentes', count(*) filter (where status = 'recebido' and urgente),
    'novo_mais_antigo', min(created_at) filter (where status = 'recebido'))
  from public.v_pedidos;
$$;
