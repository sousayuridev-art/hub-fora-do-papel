-- REV-1: correções de segurança e regras da revisão geral.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra@test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@sorriso.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp, email, referred_by) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso', 'Paula', '79900000001', 'paula@sorriso.test', 'Fulano, comissão 10%');
insert into public.client_members (client_id, user_id, tenant_id) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001');
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'proposta', 'x', now());

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

-- ===== Dono =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ insert into public.memberships (tenant_id, user_id, role)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'owner') $$,
  '42501', null, 'Dono não dá papel a outra pessoa pelo app');
select throws_ok($$ delete from public.clients $$, '42501', null, 'Apagar cliente direto é recusado');
select throws_ok($$ update public.clients set legal_name = 'x' $$, '42501', null, 'Alterar cliente direto é recusado');

-- Proposta pendente até conferir preços
insert into t values ('p', public.proposta_criar('30000000-0000-0000-0000-000000000001'));
insert into t select 'c1', public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'p'), null,
  jsonb_build_object('tipo', 'Site', 'titulo', 'Site novo', 'itens', '[{"nome":"Site","horas":10}]'::jsonb,
    'fora', '[{"item":"Fotos"}]'::jsonb, 'propriedade', 'cliente', 'plano_id', (select id from public.pricing_plans where name = 'Essencial'),
    'conferencias', '{"escopo":true,"prazo":true,"contato":true}'::jsonb));
select ok(exists (select 1 from t, jsonb_array_elements(valor->'calculo'->'pendencias') x
  where chave = 'c1' and x->>'chave' = 'precos'), 'Preços nunca conferidos travam o envio');
select public.precos_salvar('{}'::jsonb, null);
insert into t select 'env', public.proposta_enviar((select (valor->>'id')::uuid from t where chave = 'p'), null);
select is((select status::text from public.proposals), 'enviada', 'Depois de conferir os preços, envia');

-- ===== Cliente do portal =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.clients)::int, 0, 'Cliente do portal não lê a tabela de clientes');
select is(public.portal_minha_empresa() ->> 'empresa', 'Clínica Sorriso', 'Portal recebe só o nome da empresa');
select ok(not (public.portal_minha_empresa() ? 'referred_by'), 'Portal não vê quem indicou');

-- ===== Visitante =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(format($$ select public.proposta_aceitar(%L, 2, 'Paula Viana', 'paula@sorriso.test', '529.982.247-25',
  'Paula Viana', 'Rua A, 10, Aracaju', null, null, true) $$, (select valor->>'token' from t where chave = 'env')),
  'PT409', null, 'Aceite de outra versão é recusado');
select is((public.proposta_aceitar((select valor->>'token' from t where chave = 'env'), 1, 'Paula Viana', 'paula@sorriso.test',
  '529.982.247-25', 'Paula Viana', 'Rua A, 10, Aracaju', null, null, true)) ->> 'repetido', 'false', 'Aceite da versão vista');
reset role;

-- Fechada por aceite não reabre
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select throws_ok(format($$ select public.funil_mover(%L, 'contato', null, 'Passo', current_date) $$, '30000000-0000-0000-0000-000000000001'),
  '22023', null, 'Oportunidade fechada por aceite não volta para etapa aberta');
select is((public.painel_novidades() -> 'novidades' -> 0 ->> 'tipo'), 'proposta_aceita', 'Painel mostra o aceite em Novidades');
select is((public.painel_novidades() ->> 'fechado_mes_cents')::int > 0, true, 'Painel soma o fechado no mês');
reset role;

-- Formulário do site: limite por agência
insert into public.site_contatos (tenant_id, tipo, email, consentimento_em)
  select '10000000-0000-0000-0000-000000000001', 'inscricao', 'x' || g || '@t.test', now() from generate_series(1, 30) g;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select public.site_registrar_contato('inscricao', 'novo@t.test', true) $$, '54000', null,
  'Mais de 30 envios em 10 minutos são recusados');
reset role;

select * from finish();
rollback;
