-- SEG-2: link de primeiro acesso só para conta em que a pessoa nunca criou senha, só desta empresa,
-- pedido pelo dono com código; conta que recebeu link fica presa ao tenant de quem gerou.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Toda conta criada pelo link do e-mail tem senha aleatória no Auth: encrypted_password não decide nada
insert into auth.users (id, email, encrypted_password) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test', 'hash'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test', 'hash'),
  ('00000000-0000-0000-0000-0000000000c1', 'marta@clinica.test', 'aleatoria-do-otp'),
  ('00000000-0000-0000-0000-0000000000c2', 'joao@clinica.test', 'aleatoria-do-otp'),
  ('00000000-0000-0000-0000-0000000000c3', 'ze@deoutra.test', 'aleatoria-do-otp'),
  ('00000000-0000-0000-0000-0000000000c4', 'solta@nada.test', 'aleatoria-do-otp');
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
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'ze@deoutra.test', 'equipe'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'dona@outra.test', 'equipe'),
  -- Mesmo e-mail convidado pelos dois tenants, conta ainda não existe
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'dupla@x.test', 'equipe'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009', 'dupla@x.test', 'equipe'),
  -- Conta existente sem vínculo nenhum, convidada pelo tenant 1 (e, depois, pelo 2)
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'solta@nada.test', 'equipe');

-- João criou a senha de verdade (troca de senha depois de criada a conta): o gatilho marca
update auth.users set encrypted_password = 'senha-escolhida' where id = '00000000-0000-0000-0000-0000000000c2';
select ok(exists (select 1 from public.portal_senha_criada where user_id = '00000000-0000-0000-0000-0000000000c2'),
  'trocar a senha marca a conta');
select ok(not exists (select 1 from public.portal_senha_criada where user_id = '00000000-0000-0000-0000-0000000000c1'),
  'senha aleatória do link não conta como senha criada');
set local role authenticated;
select throws_ok($$select * from public.portal_senha_criada$$, '42501', null, 'ninguém lê a marca direto');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select is(public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', ' Nova@Clinica.test '),
  '{"email": "nova@clinica.test", "existe": false, "tenant_id": "10000000-0000-0000-0000-000000000001"}'::jsonb,
  'convidado sem conta: conta nova');
select is(public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'marta@clinica.test')->>'existe', 'true',
  'quem entrava pelo link do e-mail e nunca criou senha recebe link');
select is(public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'joao@clinica.test'),
  '{"erro": "usar_entrada"}'::jsonb, 'quem criou senha não recebe link');
select is(public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'ze@deoutra.test'),
  '{"erro": "usar_entrada"}'::jsonb, 'cliente de outro tenant: mesma resposta');
select is(public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'dona@outra.test'),
  '{"erro": "usar_entrada"}'::jsonb, 'dono de outro tenant: mesma resposta');
select is(public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'dupla@x.test'),
  '{"erro": "usar_entrada"}'::jsonb, 'convite aberto em outro tenant: recusado');
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'qualquer@um.test')$$,
  'sem_convite', 'sem convite nem acesso: recusado');
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000009', 'ze@deoutra.test')$$,
  'cliente_inexistente', 'cliente de outro tenant: invisível');
select is((select count(*)::int from public.event_outbox where event = 'portal.primeiro_acesso'), 2,
  'cada link gerado fica registrado');
select is((select count(*)::int from public.event_outbox where event = 'portal.primeiro_acesso_recusado'), 4,
  'recusas também ficam registradas (e contam no limite)');
select is(public.portal_acesso_tem_senha('20000000-0000-0000-0000-000000000001'),
  '{"00000000-0000-0000-0000-0000000000c1": false, "00000000-0000-0000-0000-0000000000c2": true}'::jsonb,
  'o Hub sabe quem já criou a senha');
select throws_ok($$select public.portal_conta_origem_gravar('00000000-0000-0000-0000-0000000000c4', '10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'só a função de servidor prende a conta ao tenant');

-- Sem código (aal1): nada
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'nova@clinica.test')$$,
  '42501', null, 'sem o código do app: recusado');

-- Cliente não gera link nem lê quem tem senha
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'marta@clinica.test')$$,
  '42501', null, 'cliente não gera link');
select throws_ok($$select public.portal_acesso_tem_senha('20000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'cliente não lê quem tem senha');

-- Conta presa ao tenant 1 (link gerado por ele): convite do tenant 2 chega depois e é ignorado
reset role;
select public.portal_conta_origem_gravar('00000000-0000-0000-0000-0000000000c4', '10000000-0000-0000-0000-000000000001');
insert into public.portal_invites (tenant_id, client_id, email, profile) values
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009', 'solta@nada.test', 'equipe');
select throws_ok($$select public.portal_conta_origem_gravar('00000000-0000-0000-0000-0000000000c4', '10000000-0000-0000-0000-000000000002')$$,
  'conta_de_outro', 'conta presa a um tenant não muda de dono');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated","aal":"aal1"}', true);
select is(public.portal_aceitar_convite(), '{"ligados": 1}'::jsonb, 'aceita só o convite do tenant de origem');
reset role;
select is((select array_agg(tenant_id::text order by tenant_id) from public.memberships where user_id = '00000000-0000-0000-0000-0000000000c4'),
  array['10000000-0000-0000-0000-000000000001'], 'nenhum acesso no outro tenant');

set local role anon;
select throws_ok($$select public.portal_primeiro_acesso('20000000-0000-0000-0000-000000000001', 'marta@clinica.test')$$,
  '42501', null, 'anônimo: sem permissão');

select * from finish();
rollback;
