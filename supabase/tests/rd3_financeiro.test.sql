-- RD-3: gráficos do financeiro. Entradas e saídas por mês, resultado do mês igual ao do painel,
-- mensalidades por mês, planos ativos, sessão forte e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra-agencia@test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Agência', 'outra-agencia');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ótica Visão Clara', 'Bruno', '79900000003');

create temp table d as
  select public._hoje('10000000-0000-0000-0000-000000000001') as hoje,
         date_trunc('month', public._hoje('10000000-0000-0000-0000-000000000001'))::date as mes;
grant select on d to authenticated, anon;

-- Recebido: R$ 3.000 neste mês e R$ 1.000 no mês passado
insert into public.charges (tenant_id, client_id, kind, description, amount_cents, due_date, status,
                            paid_at, paid_cents, paid_method, receipt_number)
select '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'avulsa'::public.charge_kind, 'Pago agora',
       300000, hoje, 'paga'::public.charge_status, hoje, 300000, 'pix'::public.pay_method, 1 from d
union all
select '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'avulsa', 'Pago mês passado',
       100000, (mes - 10), 'paga', (mes - 10), 100000, 'pix', 2 from d;

-- Saídas deste mês: fixa R$ 500 (começa neste mês), avulsa R$ 200, anúncio R$ 100
insert into public.expenses (tenant_id, description, category, amount_cents, kind, start_month)
select '10000000-0000-0000-0000-000000000001', 'Hospedagem', 'hospedagem', 50000, 'fixa', mes from d;
insert into public.expenses (tenant_id, description, category, amount_cents, kind, spent_on)
select '10000000-0000-0000-0000-000000000001', 'Curso', 'outros', 20000, 'avulsa', hoje from d;
insert into public.ad_campaigns (id, tenant_id, platform, name) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'meta', 'Campanha teste');
insert into public.ad_spend (tenant_id, campaign_id, spent_on, amount_cents)
select '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', hoje, 10000 from d;

-- Mensalidade de R$ 400 desde 2 meses atrás (gera 3 cobranças)
insert into public.subscriptions (tenant_id, client_id, plan_name, amount_cents, start_month)
select '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Essencial', 40000,
       (mes - interval '2 months')::date from d;

-- ===== Yuri (sessão forte) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
create temp table g as select public.financeiro_graficos() as v;
create temp table p as select public.financeiro_painel() as v;

select is(jsonb_array_length((select v->'meses' from g)), 6, 'Seis meses no gráfico');
select ok((select (v->'meses'->5->>'atual')::boolean and (v->'meses'->5->>'mes')::date = (select mes from d) from g),
  'Último mês é o atual');
select is((select (v->'resultado_mes'->>'resultado_cents')::int from g), 220000,
  'Resultado do mês: recebido R$ 3.000 − despesas R$ 800 (mensalidade em aberto não conta)');
select is((select (v->'resultado_mes'->>'resultado_cents')::bigint from g),
          (select (v->'numeros'->>'recebido_mes_cents')::bigint - (v->'numeros'->>'despesas_mes_cents')::bigint from p),
  'Resultado do mês bate com recebido e despesas do painel');
select is((select (v->'meses'->5->>'saidas_cents')::int from g), 80000, 'Saídas do mês: fixa + avulsa + anúncio');
select is((select (v->'meses'->4->>'entradas_cents')::int from g), 100000, 'Entradas do mês passado');
select is((select (v->'meses'->4->>'saidas_cents')::int from g), 0, 'Despesa fixa não entra antes de começar');
select is((select (v->'meses'->4->>'resultado_cents')::int from g), 100000, 'Resultado do mês passado');
select is((select array_agg((x->>'mensalidades_cents')::int order by n) from g, jsonb_array_elements(v->'meses') with ordinality a(x, n)),
  array[0, 0, 0, 40000, 40000, 40000], 'Mensalidades cobradas por mês');
select is((select v->'planos' from g), '[{"plano": "Essencial", "quantidade": 1}]'::jsonb, 'Mensalidades ativas por plano');

-- Sessão sem o código do app não lê
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.financeiro_graficos() $$, '42501', null, 'Sessão sem código não vê o financeiro');

-- Outra agência só vê os próprios números
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select is((public.financeiro_graficos() -> 'resultado_mes' ->> 'recebido_cents')::int, 0, 'Outra agência não vê');

-- Visitante sem conta não chama
reset role;
set local role anon;
select throws_ok($$ select public.financeiro_graficos() $$, '42501', null, 'Visitante não chama a RPC');

select * from finish();
rollback;
