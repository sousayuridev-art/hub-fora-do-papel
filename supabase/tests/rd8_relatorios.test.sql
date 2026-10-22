-- RD-8: resumo dos relatórios. Variação contra o período anterior, valor por hora,
-- lançamentos no prazo, receita recebida e prevista, sessão forte e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

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
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A', 'Ana', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'B', 'Bia', '79900000002');
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'proposta', 'Retorno', now()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'proposta', 'Retorno', now());

create temp table d as
  select public._hoje('10000000-0000-0000-0000-000000000001') as hoje,
         date_trunc('month', public._hoje('10000000-0000-0000-0000-000000000001'))::date as mes;
grant select on d to authenticated, anon;

-- Duas propostas aceitas: R$ 12.000 agora e R$ 6.000 há um mês (período anterior de "Este mês")
insert into public.proposals (id, tenant_id, client_id, deal_id, project_type, total_cents, hours_total) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001', 'Sistema', 1200000, 40),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000002', 'Site', 600000, 20);
update public.proposals set status = 'aceita', token = repeat(right(id::text, 1), 64), sent_at = now(), accepted_at = now(),
       accept_data = '{"nome":"Cliente"}',
       snapshot = jsonb_build_object('investimento', jsonb_build_object('total_cents', total_cents,
                    'parcelas', jsonb_build_array(jsonb_build_object('pct', 100, 'quando', 'no aceite', 'cents', total_cents))))
 where tenant_id = '10000000-0000-0000-0000-000000000001';
update public.proposals set accepted_at = now() - interval '1 month' where id = '40000000-0000-0000-0000-000000000002';

-- Projetos criados no aceite: o 1º tem 20 h lançadas (real R$ 600/h), o 2º só estimado (R$ 300/h)
insert into public.time_entries (tenant_id, project_id, worked_on, minutes)
select '10000000-0000-0000-0000-000000000001', id, current_date, 1200 from public.projects
 where proposal_id = '40000000-0000-0000-0000-000000000001';
-- Lançamentos: um 5 dias depois da data combinada, outro antes
update public.projects set launch_date = (select hoje - 5 from d), launched_at = now()
 where proposal_id = '40000000-0000-0000-0000-000000000001';
update public.projects set launch_date = (select hoje + 10 from d), launched_at = now()
 where proposal_id = '40000000-0000-0000-0000-000000000002';

-- Recebido: R$ 500 agora e R$ 1.000 há um mês
insert into public.charges (tenant_id, client_id, kind, description, amount_cents, due_date, status,
                            paid_at, paid_cents, paid_method, receipt_number)
select '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'avulsa'::public.charge_kind, 'Agora',
       50000, hoje, 'paga'::public.charge_status, hoje, 50000, 'pix'::public.pay_method, 101 from d
union all
select '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'avulsa', 'Mês passado',
       100000, (hoje - interval '1 month')::date, 'paga', (hoje - interval '1 month')::date, 100000, 'pix', 102 from d;
-- Previsto para daqui a 2 meses: cobrança de R$ 900 + mensalidade de R$ 400 que começa lá
insert into public.charges (tenant_id, client_id, kind, description, amount_cents, due_date)
select '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'avulsa', 'Futura',
       90000, (mes + interval '2 months')::date + 4 from d;
insert into public.subscriptions (tenant_id, client_id, plan_name, amount_cents, start_month)
select '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Essencial', 40000,
       (mes + interval '2 months')::date from d;

-- ===== Yuri (sessão forte) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
create temp table r as select public.relatorios_resumo('mes') as v;

select is((select (v->'vendido'->>'atual')::int from r), 1200000, 'Vendido no período');
select is((select (v->'vendido'->>'anterior')::int from r), 600000, 'Vendido no período anterior');
select is((select (v->'vendido'->>'pct')::int from r), 100, 'Variação do vendido em porcentagem');
select is((select (v->'recebido'->>'diferenca')::int from r), -50000, 'Recebido caiu R$ 500');
select is((select (v->'recebido'->>'pct')::int from r), -50, 'Recebido caiu 50%');
select is((select v->'contatos'->>'pct' from r), null, 'Sem porcentagem quando o anterior é zero');
select is((select (v->'valor_hora'->>'media_cents')::int from r), 45000, 'Valor por hora médio: (600 + 300) ÷ 2');
select is((select v->'lancamentos' from r), '{"total": 2, "no_prazo": 1, "sem_data": 0, "maior_atraso_dias": 5}'::jsonb,
  'Lançamentos no prazo e maior atraso');
select is(jsonb_array_length((select v->'receita_meses' from r)), 8, 'Receita: 6 meses e 2 previstos');
select is((select v->'receita_meses'->5->>'tipo' from r), 'atual', 'Sexto mês é o atual');
select is((select (v->'receita_meses'->4->>'valor_cents')::int from r), 100000, 'Recebido do mês passado');
select is((select (v->'receita_meses'->7->>'valor_cents')::int from r), 130000,
  'Previsto: cobrança com data + mensalidade ainda sem cobrança');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.relatorios_resumo('mes') $$, '42501', null, 'Sessão sem código não vê');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select is(((public.relatorios_resumo('ano')) -> 'vendido' ->> 'atual')::int, 0, 'Outra agência não vê');

reset role;
set local role anon;
select throws_ok($$ select public.relatorios_resumo('mes') $$, '42501', null, 'Visitante não chama a RPC');

select * from finish();
rollback;
