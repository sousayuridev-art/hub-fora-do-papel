-- REV-2: saúde das entregas (lançamento atrasado, horas, aprovação parada, ajuste) e painel.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ótica Visão Clara', 'Bruno Alves', '79900000003');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
insert into t select 'ok', public.projeto_criar('20000000-0000-0000-0000-000000000001', 'Site em dia', 0, 10, current_date + 30);
insert into t select 'risco', public.projeto_criar('20000000-0000-0000-0000-000000000001', 'Site atrasado', 0, 1, current_date - 2);
select public.horas_lancar((select (valor->>'id')::uuid from t where chave = 'risco'), current_date, 90);

select is((public.projeto_detalhe((select (valor->>'id')::uuid from t where chave = 'ok'))) -> 'saude' ->> 'nivel', 'ok',
  'Projeto em dia está ok');
select is((public.projeto_detalhe((select (valor->>'id')::uuid from t where chave = 'risco'))) -> 'saude' ->> 'nivel', 'risco',
  'Lançamento atrasado e horas estouradas é risco');
select is((select jsonb_array_length(x->'saude'->'motivos') from jsonb_array_elements((public.projetos_lista()) -> 'projetos') x
            where x->>'nome' = 'Site atrasado'), 2, 'Lista traz os dois motivos');

-- Aprovação parada há 4 dias e ajuste pedido
insert into t select 'ap', public.aprovacao_pedir((select (valor->>'id')::uuid from t where chave = 'ok'), 'Layout');
reset role;
update public.approvals set sent_at = now() - interval '4 days' where id = (select (valor->>'id')::uuid from t where chave = 'ap');
set local role authenticated;
select ok(exists (select 1 from jsonb_array_elements((public.projeto_detalhe((select (valor->>'id')::uuid from t where chave = 'ok'))) -> 'saude' -> 'motivos') m
                   where m->>'chave' = 'aprovacao_parada'), 'Aprovação parada há 3 dias ou mais vira atenção');

select is(jsonb_array_length(public.painel_entregas()), 2, 'Painel lista as duas entregas que pedem atenção');
select is((public.painel_entregas()) -> 0 ->> 'nome', 'Site atrasado', 'Risco aparece primeiro');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select is(jsonb_array_length(public.painel_entregas()), 0, 'Outra agência não vê');

select * from finish();
rollback;
