-- SEG-2: link de primeiro acesso só para conta sem senha, do próprio tenant, pedido pelo dono com código.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, encrypted_password) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test', 'hash'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test', 'hash'),
  ('00000000-0000-0000-0000-0000000000c1', 'marta@clinica.test', ''),
  ('00000000-0000-0000-0000-0000000000c2', 'joao@clinica.test', 'hash'),
  ('00000000-0000-0000-0000-0000000000c3', 'ze@deoutra.test', '');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c3', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica', 'Marta', '79900000001'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'De Outra', 'Zé', '79900000009');
insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel', true),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001', 'equipe', true),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000c3', '10000000-0000-0000-0000-000000000002', 'responsavel', true);
insert into public.portal_invites (tenant_id, client_id, email, profile) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'nova@clinica.test', 'equipe'),
  -- Convite para um e-mail que já é cliente de OUTRO tenant: não pode virar link
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'ze@deoutra.test', 'equipe'),
  -- Convite para o e-mail do dono de outro tenant
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'dona@outra.test', 'equipe');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select is(public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', ' Nova@Clinica.test '),
  '{"email": "nova@clinica.test", "existe": false}'::jsonb, 'convidado sem conta: conta nova');
select is(public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'marta@clinica.test'),
  '{"email": "marta@clinica.test", "existe": true}'::jsonb, 'quem já entra pelo link mágico e não tem senha');
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'joao@clinica.test')$$,
  'ja_tem_senha', 'quem já tem senha não recebe link (usa Esqueci a senha)');
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'ze@deoutra.test')$$,
  'conta_de_outro', 'conta de cliente de outro tenant: recusado');
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'dona@outra.test')$$,
  'ja_tem_senha', 'dono de outro tenant (com senha): recusado');
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'qualquer@um.test')$$,
  'sem_convite', 'sem convite nem acesso: recusado');
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000009', 'ze@deoutra.test')$$,
  'cliente_inexistente', 'cliente de outro tenant: invisível');
select is((select count(*)::int from public.event_outbox where event = 'portal.primeiro_acesso'), 2,
  'cada link gerado fica registrado');
select is(public.portal_acesso_tem_senha('20000000-0000-0000-0000-000000000001'),
  '{"00000000-0000-0000-0000-0000000000c1": false, "00000000-0000-0000-0000-0000000000c2": true}'::jsonb,
  'o Hub sabe quem já criou a senha');

-- Sem código (aal1): nada
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'nova@clinica.test')$$,
  null, null, 'sem o código do app: recusado');

-- Cliente não gera link para ninguém
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'marta@clinica.test')$$,
  null, null, 'cliente não gera link');
select throws_ok($$select public.portal_acesso_tem_senha('20000000-0000-0000-0000-000000000001')$$,
  null, null, 'cliente não lê quem tem senha');

-- Dono de outro tenant não alcança o cliente
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'marta@clinica.test')$$,
  'cliente_inexistente', 'dono de outro tenant: invisível');

reset role;
set local role anon;
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'marta@clinica.test')$$,
  '42501', null, 'anônimo: sem permissão');

select * from finish();
rollback;
