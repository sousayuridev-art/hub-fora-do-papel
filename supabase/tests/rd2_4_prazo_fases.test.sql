-- RD2-4: prazo com data por fase, só o dono do projeto.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Rouse', '79900000001');
insert into public.projects (id, tenant_id, client_id, name, status) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sistema', 'andamento');
insert into public.project_phases (id, tenant_id, project_id, position, name, status) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 'Protótipo', 'andamento');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.projeto_fase_prazo('60000000-0000-0000-0000-000000000001', '2026-11-30') $$,
  'P0002', null, 'Dono de outra agência não mexe no prazo');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select is((public.projeto_fase_prazo('60000000-0000-0000-0000-000000000001', '2026-11-30')) ->> 'due_date', '2026-11-30', 'Dono define o prazo');
select throws_ok($$ select public.projeto_fase_prazo('60000000-0000-0000-0000-000000000001', '1990-01-01') $$,
  '22023', null, 'Data absurda é recusada');
select is((public.projeto_fase_prazo('60000000-0000-0000-0000-000000000001', null)) ->> 'due_date', null, 'Tirar o prazo');

select * from finish();
rollback;
