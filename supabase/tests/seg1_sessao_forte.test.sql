-- SEG-1: com app autenticador ativado, o dono só age com sessão verificada pelo código (aal2).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marina@cliente.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Bem Cuidar', 'Marina', '79900000010');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel');

set local role authenticated;
-- Sem app ativado, sessão só com link ou senha também não é dona (precisa ativar o app antes).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select ok(not public.is_tenant_owner('10000000-0000-0000-0000-000000000001'), 'Sem app ativado, sessão sem código não é dona');
reset role;

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'Celular', 'totp', 'verified', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'Celular', 'totp', 'verified', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select ok(not public.is_tenant_owner('10000000-0000-0000-0000-000000000001'), 'Com app ativado, sessão sem código não é dono');
select is((select count(*)::int from public.clients), 0, 'Sessão sem código não lê clientes');
select throws_ok($$ select public.reunioes_listar() $$, '42501', 'precisa_codigo', 'RPC de dono pede o código');
select throws_ok($$ select public.google_estado_criar('https://spring-board-kit.lovable.app') $$, '42501', 'precisa_codigo', 'Sessão sem código não grava');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select ok(not public.is_tenant_owner('10000000-0000-0000-0000-000000000001'), 'Token sem nível conta como sem código');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select ok(public.is_tenant_owner('10000000-0000-0000-0000-000000000001'), 'Com código verificado, é dono');
select is((select count(*)::int from public.clients), 1, 'Com código, lê os clientes');
select lives_ok($$ select public.reunioes_listar() $$, 'Com código, RPC de dono funciona');

-- Cliente do portal não depende do código
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((public.portal_minha_empresa()) ->> 'empresa', 'Clínica Bem Cuidar', 'Portal do cliente segue igual');
reset role;

select * from finish();
rollback;
