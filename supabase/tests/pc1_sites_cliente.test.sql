-- PC-1: site ligado ao cliente com módulos. Só o dono liga; o portal lê os sites da própria empresa;
-- outra empresa e outro tenant recebem lista vazia; o Início traz o site.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marina@plamev.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'equipe@plamev.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'joao@clinica.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'sem.empresa@teste.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Marina', '79900000010'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Clínica Sol', 'João', '79900000011'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Loja da Outra', 'Ana', '79900000012');
insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel', true),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001', 'equipe', false),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-000000000001', 'responsavel', true);
insert into public.sites (id, tenant_id, nome, dominio) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Site da Plamev', 'plamev.test'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Site da Outra', 'outra.test');

select has_column('public', 'sites', 'modulos', 'Site tem módulos');
select is((select modulos from public.sites where id = '30000000-0000-0000-0000-000000000001'),
  array['paginas', 'contatos'], 'Padrão: páginas e contatos');

-- ===== Hub (Yuri) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.site_cliente_definir('30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001', array['paginas', 'blog']) $$, '22023', 'modulo_invalido', 'Módulo fora da lista é recusado');
select throws_ok($$ select public.site_cliente_definir('30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001', array['paginas']) $$, 'P0002', 'site_inexistente', 'Site de outro tenant não é ligado');
select throws_ok($$ select public.site_cliente_definir('30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003', array['paginas']) $$, 'P0002', 'cliente_inexistente', 'Cliente de outro tenant não é ligado');
select is((public.site_cliente_definir('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  array['paginas', 'artigos', 'contatos', 'artigos'])) -> 'modulos', '["artigos", "contatos", "paginas"]'::jsonb,
  'Liga o site à Plamev com módulos sem repetição');
select is((public.site_cliente_criar('20000000-0000-0000-0000-000000000002', 'Site da Clínica',
  'https://WWW.ClinicaSol.test/', array['paginas'])) ->> 'dominio', 'www.clinicasol.test', 'Cria site novo já ligado à clínica');
select throws_ok($$ select public.site_cliente_criar('20000000-0000-0000-0000-000000000002', 'Outro', 'clinicasol.test',
  array['paginas']) $$, '23505', 'dominio_em_uso', 'Domínio repetido (com ou sem www) é recusado');
reset role;
select is((select count(*)::int from public.event_outbox where event = 'site.cliente_definido'), 2, 'Ligação gera evento');

-- ===== Responsável e equipe da Plamev =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select is(jsonb_array_length(public.portal_sites()), 1, 'Responsável vê o site da empresa');
select is(public.portal_sites() -> 0 ->> 'dominio', 'plamev.test', 'Com o domínio');
select is(public.portal_inicio() -> 'site' ->> 'nome', 'Site da Plamev', 'Início traz o site');
select ok((public.portal_inicio() -> 'site' -> 'modulos') ? 'artigos', 'Início traz os módulos');
select throws_ok($$ select public.site_cliente_definir('30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001', array['loja']) $$, '42501', null, 'Cliente não muda os módulos');
select throws_ok($$ select public.site_cliente_criar('20000000-0000-0000-0000-000000000001', 'Novo', 'novo.test',
  array['loja']) $$, '42501', null, 'Cliente não cria site');
select is((select count(*)::int from public.sites), 0, 'Cliente não lê a tabela de sites direto');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal2"}', true);
select is(jsonb_array_length(public.portal_sites()), 1, 'Equipe também vê o site');

-- ===== Outra empresa, outro tenant e quem não é de empresa nenhuma =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal2"}', true);
select is((select string_agg(x ->> 'dominio', ',') from jsonb_array_elements(public.portal_sites()) x),
  'www.clinicasol.test', 'Outra empresa vê só o próprio site');
select is((public.portal_inicio() -> 'site' ->> 'no_ar')::boolean, false, 'Site novo nasce fora do ar');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is(public.portal_sites(), '[]'::jsonb, 'Dona de outro tenant recebe lista vazia');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","aal":"aal2"}', true);
select is(public.portal_sites(), '[]'::jsonb, 'Quem não é de empresa nenhuma recebe lista vazia');
reset role;

select * from finish();
rollback;
