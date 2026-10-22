-- S5: tráfego pago. Contas do painel, ligação contato → campanha, isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

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

-- 4 contatos de anúncio neste mês (3 da campanha "Site lento", 1 do Google sem campanha) e 1 do ano passado
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp, origin, ad_name, created_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A', 'Ana', '79900000011', 'anuncio_meta', 'Site lento', now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'B', 'Bia', '79900000012', 'anuncio_meta', ' site LENTO ', now()),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'C', 'Caio', '79900000013', 'anuncio_meta', 'Site lento', now()),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'D', 'Davi', '79900000014', 'anuncio_google', null, now()),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'E', 'Eva', '79900000015', 'anuncio_meta', 'Site lento', now() - interval '400 days'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'F', 'Fábio', '79900000016', 'indicacao', null, now());
insert into public.deals (tenant_id, client_id, stage, next_step, next_step_at, diagnostic_tier, diagnostic_paid, value_cents) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'fechado', null, null, 'essencial', true, 600000),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'diagnostico', 'x', now(), 'essencial', true, 200000),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'contato', 'x', now(), null, false, null),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'contato', 'x', now(), null, false, null);

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

insert into t values ('meta', public.trafego_campanha_salvar(null, 'Site lento', 'meta'));
insert into t values ('google', public.trafego_campanha_salvar(null, 'Criação de site', 'google'));
select throws_ok($$ select public.trafego_campanha_salvar(null, 'SITE LENTO', 'meta') $$, '22023', null, 'Campanha com nome repetido é recusada');
select throws_ok(format($$ select public.trafego_registrar(%L, current_date, -100) $$, (select valor->>'id' from t where chave = 'meta')),
  '22023', null, 'Valor negativo é recusado');
select lives_ok(format($$ select public.trafego_registrar(%L, current_date, 12000, 150) $$, (select valor->>'id' from t where chave = 'meta')),
  'Registra investimento no Instagram e Facebook');
select lives_ok(format($$ select public.trafego_registrar(%L, current_date, 8000, 50) $$, (select valor->>'id' from t where chave = 'google')),
  'Registra investimento no Google');

insert into t values ('painel', public.trafego_painel('mes'));
select is((select (valor->'indicadores'->>'investido_cents')::int from t where chave = 'painel'), 20000, 'Investido no mês: R$ 200');
select is((select (valor->'indicadores'->>'contatos')::int from t where chave = 'painel'), 4, 'Só contatos de anúncio deste mês contam');
select is((select (valor->'indicadores'->>'custo_contato_cents')::int from t where chave = 'painel'), 5000, 'Custo por contato: R$ 50');
select is((select (valor->'indicadores'->>'custo_diagnostico_cents')::int from t where chave = 'painel'), 10000, 'Custo por diagnóstico: R$ 100');
select is((select (valor->'indicadores'->>'retorno')::numeric from t where chave = 'painel'), 30.0, 'Retorno: R$ 6.000 ÷ R$ 200 = 30×');
select is((select (x->>'contatos')::int from t, jsonb_array_elements(valor->'campanhas') x
            where chave = 'painel' and x->>'nome' = 'Site lento'), 3, 'Campanha pega o contato pelo nome, sem diferença de maiúsculas');
select is((select (valor->'sem_campanha'->>'contatos')::int from t where chave = 'painel'), 1, 'Contato sem campanha aparece à parte');
select is((select (valor->'orcamento'->>'gasto_cents')::int from t where chave = 'painel'), 20000, 'Orçamento do mês soma o gasto');

-- ===== Outra agência =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.ad_spend)::int + (select count(*) from public.ad_campaigns)::int, 0,
  'Outra agência não vê o tráfego da Fora do Papel');

-- ===== Anon =====
set local role anon;
select throws_ok($$ select count(*) from public.ad_spend $$, '42501', null, 'Anon não lê investimentos');
reset role;

select * from finish();
rollback;
