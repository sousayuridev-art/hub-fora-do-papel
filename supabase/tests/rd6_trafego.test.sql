-- RD-6: tráfego pago redesenhado. Variação contra o período anterior, 8 semanas, lançamentos paginados, isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

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

-- Hoje no fuso da agência; o 1º dia do mês passado sempre cai no trecho comparável
create temp table d as
  select (now() at time zone 'America/Sao_Paulo')::date as hoje,
         (date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date) - interval '1 month' + interval '15 hours') as mes_passado;
grant select on d to authenticated, anon;

-- 3 contatos de anúncio hoje (1 com diagnóstico pago), 1 no 1º dia do mês passado, 1 de outra origem
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp, origin, ad_name, created_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A', 'Ana', '79900000011', 'anuncio_meta', 'Site lento', now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'B', 'Bia', '79900000012', 'anuncio_meta', 'Site lento', now()),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'C', 'Caio', '79900000013', 'anuncio_google', null, now()),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'D', 'Davi', '79900000014', 'anuncio_meta', 'Site lento', (select mes_passado from d)),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'E', 'Eva', '79900000015', 'indicacao', null, now());
insert into public.deals (tenant_id, client_id, stage, next_step, next_step_at, diagnostic_tier, diagnostic_paid, value_cents) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'diagnostico', 'x', now(), 'essencial', true, null),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'contato', 'x', now(), null, false, null);

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

insert into t values ('meta', public.trafego_campanha_salvar(null, 'Site lento', 'meta'));
insert into t values ('google', public.trafego_campanha_salvar(null, 'Criação de site', 'google'));
select public.trafego_registrar((select (valor->>'id')::uuid from t where chave = 'meta'), (select hoje from d), 9000, 100);
select public.trafego_registrar((select (valor->>'id')::uuid from t where chave = 'google'), (select hoje from d), 3000);
select public.trafego_registrar((select (valor->>'id')::uuid from t where chave = 'meta'), (select mes_passado::date from d), 5000);

insert into t values ('painel', public.trafego_painel('mes'));
insert into t values ('tend', public.trafego_tendencia('mes'));

-- ===== Números do topo =====
select is((select (valor->'atual'->>'contatos')::int from t where chave = 'tend'),
          (select (valor->'indicadores'->>'contatos')::int from t where chave = 'painel'),
          'Contatos do topo batem com o painel');
select is((select (valor->'atual'->>'custo_contato_cents')::int from t where chave = 'tend'), 4000,
          'Custo por contato: R$ 120 ÷ 3 = R$ 40');
select is((select (valor->'atual'->>'custo_diagnostico_cents')::int from t where chave = 'tend'),
          (select (valor->'indicadores'->>'custo_diagnostico_cents')::int from t where chave = 'painel'),
          'Custo por diagnóstico bate com o painel');
select is((select (valor->'anterior'->>'contatos')::int from t where chave = 'tend'), 1,
          'Período anterior conta o contato do mês passado');
select is((select (valor->'anterior'->>'inicio') from t where chave = 'tend'),
          (select to_char(date_trunc('month', hoje) - interval '1 month', 'YYYY-MM-DD') from d),
          'Período anterior começa no 1º dia do mês passado');
select ok((select (valor->'anterior'->>'fim')::date < date_trunc('month', hoje)::date from t, d where chave = 'tend'),
          'Período anterior termina antes do mês atual');
select is((select (valor->'variacao'->>'contatos')::int from t where chave = 'tend'), 2,
          'Variação de contatos: 3 − 1 = 2');
select is((select (valor->'variacao'->>'custo_contato_cents')::int from t where chave = 'tend'), -1000,
          'Variação do custo por contato: R$ 40 − R$ 50');
select is((select valor->'variacao'->'custo_diagnostico_cents' from t where chave = 'tend'), 'null'::jsonb,
          'Sem diagnóstico antes: variação fica vazia, não inventa número');
select is((select valor->'limite_custo_contato_cents' from t where chave = 'tend'), 'null'::jsonb,
          'Sem limite configurado: nada de linha de referência');

-- ===== Semanas =====
select is((select jsonb_array_length(valor->'semanas') from t where chave = 'tend'), 8, 'Série com 8 semanas');
select is((select (valor->'semanas'->7->>'inicio')::date from t, d where chave = 'tend'),
          (select date_trunc('week', hoje)::date from d), 'A última semana é a semana corrente');
select is((select (valor->'semanas'->7->>'meta_cents')::int + (valor->'semanas'->7->>'google_cents')::int from t where chave = 'tend'),
          12000, 'Semana corrente soma Meta e Google');
select is((select (valor->'semanas'->7->>'contatos')::int from t where chave = 'tend'), 3, 'Semana corrente conta os contatos de anúncio');

-- ===== Lançamentos =====
insert into t values ('pag', public.trafego_lancamentos('3meses', null, 0, 2));
select is((select (valor->>'total')::int || '/' || jsonb_array_length(valor->'itens') from t where chave = 'pag'), '3/2',
          'Lançamentos paginados: 3 no total, 2 na primeira página');
select is((select (valor->>'total_cents')::int from t where chave = 'pag'), 17000, 'Total dos lançamentos do período');
select is((select (public.trafego_lancamentos('mes', (select (valor->>'id')::uuid from t where chave = 'google'))->>'total')::int), 1,
          'Filtro por campanha');

-- ===== Outra agência e sessão fraca =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select is((select (public.trafego_lancamentos('ano')->>'total')::int + (public.trafego_tendencia('ano')->'atual'->>'contatos')::int), 0,
          'Outra agência não vê lançamentos nem contatos da Fora do Papel');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.trafego_tendencia('mes') $$, '42501', null, 'Sem o código do app, o dono não lê');
select throws_ok($$ select public._trafego_numeros('10000000-0000-0000-0000-000000000001', current_date, current_date) $$,
  '42501', null, 'Função interna não é chamada direto');
set local role anon;
select throws_ok($$ select public.trafego_lancamentos('mes') $$, '42501', null, 'Anon não lê lançamentos');
reset role;

select * from finish();
rollback;
