-- Teste de isolamento: rode com `supabase test db`
-- Prova que cliente A não enxerga cliente B, que cliente não altera dados
-- e que um tenant não enxerga o outro.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Pessoas
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra-agencia@test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@sorriso.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'julia@otica.test');

-- Tenants
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Agência', 'outra-agencia');

insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client');

-- Clientes da Fora do Papel
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso Leve', 'Paula Viana', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Ótica Visão Clara', 'Julia Reis', '79900000002');

insert into public.client_members (client_id, user_id, tenant_id) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001');

-- Como a Paula (cliente da Sorriso)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select is((select count(*) from public.clients)::int, 1, 'Paula vê só 1 cliente');
select is((select company_name from public.clients limit 1), 'Clínica Sorriso Leve', 'Paula vê só a própria empresa');
select is((select count(*) from public.client_members)::int, 1, 'Paula vê só o próprio vínculo');
select is((select count(*) from public.event_outbox)::int, 0, 'Paula não lê a fila de eventos');

update public.clients set company_name = 'Hackeado' where id = '20000000-0000-0000-0000-000000000001';
reset role;
select is((select company_name from public.clients where id = '20000000-0000-0000-0000-000000000001'), 'Clínica Sorriso Leve', 'Paula não consegue alterar a empresa');

-- Como o Yuri (dono da Fora do Papel)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*) from public.clients)::int, 2, 'Yuri vê os 2 clientes do seu tenant');
select is((select count(*) from public.tenants)::int, 1, 'Yuri vê só o próprio tenant');

-- Como a outra agência
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*) from public.clients)::int, 0, 'Outra agência não vê clientes da Fora do Papel');
select throws_ok(
  $$ insert into public.clients (tenant_id, company_name, contact_name, whatsapp)
     values ('10000000-0000-0000-0000-000000000001', 'Intruso', 'X', '0') $$,
  '42501', null, 'Outra agência não cria cliente no tenant da Fora do Papel'
);

reset role;
select * from finish();
rollback;
