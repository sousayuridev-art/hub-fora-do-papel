-- S7: relatórios. Funil do período, origem, perdas, receita, margem e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp, origin) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A', 'Ana', '79900000001', 'indicacao'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'B', 'Bia', '79900000002', 'indicacao'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'C', 'Caio', '79900000003', 'anuncio_meta');
insert into public.deals (tenant_id, client_id, stage, next_step, next_step_at, value_cents, closed_at) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'fechado', null, null, 600000, now()),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'proposta', 'Retorno', now(), null, null);
insert into public.deals (tenant_id, client_id, stage, next_step, next_step_at, archived_at, archived_from_stage, lost_reason) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'contato', null, null, now(), 'diagnostico', 'preco');

-- Projeto com 10 h usadas de 20 estimadas, R$ 6.000
insert into public.projects (id, tenant_id, client_id, name, hours_estimated, value_cents)
values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        'Página', 20, 600000);
insert into public.time_entries (tenant_id, project_id, worked_on, minutes)
values ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', current_date, 600);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
create temp table r as select public.relatorios('mes') as v;

select is((select (v->'vendas'->>'contatos')::int from r), 3, 'Três contatos chegaram no período');
select is((select (x->>'chegaram')::int from r, jsonb_array_elements(v->'vendas'->'funil') x where x->>'etapa' = 'diagnostico'), 3,
  'Etapa alcançada considera de onde o arquivado saiu');
select is((select (x->>'chegaram')::int from r, jsonb_array_elements(v->'vendas'->'funil') x where x->>'etapa' = 'fechado'), 1,
  'Um fechado');
select is((select x->>'origem' from r, jsonb_array_elements(v->'vendas'->'por_origem') x limit 1), 'indicacao',
  'Origem com mais contatos aparece primeiro');
select is((select v->'vendas'->'perdas'->0->>'motivo' from r), 'preco', 'Motivo de perda contado');
select is((select (v->'margem'->'projetos'->0->>'vh_real_cents')::int from r), 60000, 'Valor por hora real: R$ 6.000 ÷ 10 h');
select is((select (v->'margem'->'projetos'->0->>'vh_estimado_cents')::int from r), 30000, 'Valor por hora estimado: R$ 6.000 ÷ 20 h');
select is((select (v->'margem'->'projetos'->0->>'folga_horas')::numeric from r), 14.0, 'Folga até o piso: 24 h − 10 h');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(((public.relatorios('mes')) -> 'vendas' ->> 'contatos')::int, 0, 'Outra agência não vê');

select * from finish();
rollback;
