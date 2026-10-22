-- =====================================================================
-- Hub Fora do Papel · RD-3 · Financeiro redesenhado
-- Card: docs/cards/RD-redesenho-telas.md (RD-3)
-- Dados novos da tela, todos calculados no banco:
--   · resultado do mês (recebido − despesas, mesma conta do financeiro_painel);
--   · entradas e saídas dos últimos 6 meses (mês atual "até hoje") com o resultado de cada mês;
--   · mensalidades cobradas por mês (6 meses) e mensalidades ativas por plano.
-- Só leitura. Dono validado por _tenant_do_dono() (que já exige sessão aal2).
-- =====================================================================

-- Despesas de um mês: fixas ativas no mês + avulsas do mês + anúncios lançados até p_ate.
-- Mesma regra do número "Despesas do mês" do financeiro_painel.
create or replace function public._despesas_do_mes(p_tenant uuid, p_mes date, p_ate date)
returns bigint language sql stable security definer set search_path = public as $$
  select (select coalesce(sum(amount_cents), 0) from public.expenses
           where tenant_id = p_tenant
             and ((kind = 'avulsa' and public._mes_de(spent_on) = p_mes)
               or (kind = 'fixa' and start_month <= p_mes and (end_month is null or end_month >= p_mes))))
       + (select coalesce(sum(amount_cents), 0) from public.ad_spend
           where tenant_id = p_tenant and spent_on >= p_mes and spent_on < (p_mes + interval '1 month')::date
             and spent_on <= p_ate)::bigint;
$$;
revoke all on function public._despesas_do_mes(uuid, date, date) from public, anon, authenticated;

create or replace function public.financeiro_graficos()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); hoje date; atual date; m date; i int;
        meses jsonb := '[]'::jsonb; recebido bigint; saidas bigint; mensal bigint;
        rec_mes bigint; desp_mes bigint;
begin
  perform public._mensalidades_gerar(t);
  hoje := public._hoje(t); atual := public._mes_de(hoje);
  for i in -5..0 loop
    m := (atual + make_interval(months => i))::date;
    select coalesce(sum(paid_cents), 0) into recebido from public.charges
     where tenant_id = t and status = 'paga' and paid_at >= m and paid_at < (m + interval '1 month')::date;
    saidas := public._despesas_do_mes(t, m, hoje);
    -- Mensalidades cobradas no mês (as que geraram cobrança e não foram canceladas)
    select coalesce(sum(amount_cents), 0) into mensal from public.charges
     where tenant_id = t and kind = 'mensalidade' and period = m and status <> 'cancelada';
    meses := meses || jsonb_build_object('mes', m, 'atual', i = 0,
      'entradas_cents', recebido, 'saidas_cents', saidas, 'resultado_cents', recebido - saidas,
      'mensalidades_cents', mensal);
    if i = 0 then rec_mes := recebido; desp_mes := saidas; end if;
  end loop;
  return jsonb_build_object(
    'hoje', hoje,
    'resultado_mes', jsonb_build_object('recebido_cents', rec_mes, 'despesas_cents', desp_mes,
                                        'resultado_cents', rec_mes - desp_mes),
    'meses', meses,
    'planos', coalesce((select jsonb_agg(jsonb_build_object('plano', plan_name, 'quantidade', n) order by n desc, plan_name)
       from (select plan_name, count(*) n from public.subscriptions
              where tenant_id = t and status = 'ativa' group by plan_name) q), '[]'::jsonb));
end;
$$;
revoke all on function public.financeiro_graficos() from public, anon;
grant execute on function public.financeiro_graficos() to authenticated;
