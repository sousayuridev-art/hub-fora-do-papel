-- PC-5: contatos do site do cliente. Site registra (anon) pela RPC; só a empresa do site vê;
-- módulo exigido; "já respondi"; limite por endereço; não entra no Funil da Fora do Papel.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@clinica.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'marina@plamev.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sol', 'Paula', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Marina', '79900000002');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'equipe'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-000000000001', 'responsavel');
insert into public.sites (id, tenant_id, client_id, nome, dominio, modulos) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Site da Clínica', 'clinicasol.test', '{paginas,contatos}'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'Site da Plamev', 'plamev.test', '{paginas}');

-- ===== Visitante do site (anon) =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.headers', '{"x-forwarded-for": "200.1.1.1"}', true);
select throws_ok($$ select count(*) from public.site_cliente_contatos $$, '42501', null, 'Anônimo não lê os contatos');
select is(public.site_contato_registrar('www.clinicasol.test',
  '{"origem": "formulario", "nome": "Ana Lima", "telefone": "(79) 99999-0001", "pagina": "/", "mensagem": "Quero marcar uma limpeza."}'),
  '{"ok": true}'::jsonb, 'Formulário do site registra o contato');
select lives_ok($$ select public.site_contato_registrar('clinicasol.test', '{"origem": "whatsapp", "pagina": "/contato", "nome": "Ignorado"}') $$,
  'Clique no WhatsApp registra');
select throws_ok($$ select public.site_contato_registrar('clinicasol.test', '{"origem": "formulario", "nome": "Sem contato"}') $$,
  '22023', 'dados_incompletos', 'Formulário sem telefone nem e-mail é recusado');
select throws_ok($$ select public.site_contato_registrar('clinicasol.test',
  '{"origem": "formulario", "nome": "Bia", "telefone": "123"}') $$, '22023', 'telefone_invalido', 'Telefone curto é recusado');
select throws_ok($$ select public.site_contato_registrar('plamev.test',
  '{"origem": "formulario", "nome": "Bia", "telefone": "79999990002"}') $$, 'P0002', 'site_inexistente',
  'Site sem o módulo de contatos não recebe');
select throws_ok($$ select public.site_contato_registrar('naoexiste.test',
  '{"origem": "formulario", "nome": "Bia", "telefone": "79999990002"}') $$, 'P0002', 'site_inexistente', 'Domínio desconhecido é recusado');
-- Limite: 8 formulários por endereço por hora (1 já foi)
select lives_ok($$ select public.site_contato_registrar('clinicasol.test',
  jsonb_build_object('origem', 'formulario', 'nome', 'Repetido ' || n, 'email', 'r' || n || '@x.test'))
  from generate_series(1, 7) n $$, 'Mais 7 formulários do mesmo endereço entram');
select throws_ok($$ select public.site_contato_registrar('clinicasol.test',
  '{"origem": "formulario", "nome": "Nono", "email": "nono@x.test"}') $$, '54000', 'muitas_tentativas',
  'O nono formulário na hora é recusado');
reset role;
select is((select count(*)::int from public.site_cliente_contatos), 9, 'Recusado não grava');
select is((select telefone from public.site_cliente_contatos where nome = 'Ana Lima'), '79999990001', 'Telefone só com números');
select is((select nome from public.site_cliente_contatos where origem = 'whatsapp'), null, 'Clique no WhatsApp não guarda dados da pessoa');
select is((select count(*)::int from public.deals), 0, 'Contato do cliente não entra no Funil da Fora do Papel');
select is((select count(*)::int from public.event_outbox where event = 'site.contato_recebido'), 9, 'Cada contato gera evento');

-- ===== Equipe da Clínica =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((public.portal_contatos('30000000-0000-0000-0000-000000000001')) -> 'contagem',
  '{"esperando": 8, "todos": 9}'::jsonb, 'Equipe vê 8 esperando e 9 no total');
select is((public.portal_pendencias()) ->> 'contatos', '8', 'Contador do portal traz os contatos sem resposta');
select is((public.portal_contato_respondido((select id from public.site_cliente_contatos where nome = 'Ana Lima'))) ->> 'respondido',
  'true', 'Marca como respondido');
select is(jsonb_array_length((public.portal_contatos('30000000-0000-0000-0000-000000000001', 'esperando')) -> 'itens'), 7,
  'Sai da aba Esperando resposta');

-- ===== Plamev (outra empresa, sem módulo) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.portal_contatos('30000000-0000-0000-0000-000000000001') $$, 'P0002', 'site_inexistente',
  'Outra empresa não lista os contatos da Clínica');
select throws_ok($$ select public.portal_contatos('30000000-0000-0000-0000-000000000002') $$, '42501', 'modulo_nao_contratado',
  'Sem o módulo de contatos, o banco recusa');
reset role;

select * from finish();
rollback;
