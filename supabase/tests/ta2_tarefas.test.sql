-- TA-2/TA-3: resumo da Central com os mesmos filtros da lista (contagens das abas e dos atalhos).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marina@cliente.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Bem Cuidar', 'Marina', '79900000010'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Rede Patas', 'Paula', '79900000011');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel');
insert into public.projects (id, tenant_id, client_id, name, status) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Agendamento', 'andamento'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Sistema', 'andamento'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Site antigo', 'concluido');

select set_config('teste.hoje', public._hoje('10000000-0000-0000-0000-000000000001')::text, true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select public.tarefa_criar('Revisar textos', '50000000-0000-0000-0000-000000000001', p_prazo => current_setting('teste.hoje')::date - 1, p_prioridade => 'alta');
select public.tarefa_criar('Relatório de giro', '50000000-0000-0000-0000-000000000002', p_prazo => current_setting('teste.hoje')::date - 3);
select public.tarefa_criar('Importar fornecedores', '50000000-0000-0000-0000-000000000002', p_prazo => current_setting('teste.hoje')::date + 2);
select public.tarefa_criar('Emitir nota', p_prazo => current_setting('teste.hoje')::date - 2);
select public.tarefa_criar('Aprovar visual', p_tipo => 'hub', p_card => 'TA-0', p_prazo => current_setting('teste.hoje')::date);
select public.tarefa_criar('Histórico', '50000000-0000-0000-0000-000000000003', p_prazo => current_setting('teste.hoje')::date - 9);

-- Sem filtros: igual ao de antes (é o número do menu)
select is((public.tarefas_resumo()) ->> 'atrasadas', '3', 'Sem filtro: 3 atrasadas (projeto encerrado fora)');
select is((public.tarefas_resumo('{}')) ->> 'atrasadas', (public.tarefas_resumo()) ->> 'atrasadas', 'Objeto vazio = sem filtro');
select is(((public.tarefas_resumo()) ->> 'atrasadas')::int,
  jsonb_array_length((public.tarefas_listar('{"prazo":"atrasadas"}')) -> 'itens'), 'Menu bate com a lista de atrasadas');

-- Com filtros
select is((public.tarefas_resumo('{"tipo":"cliente"}')) ->> 'atrasadas', '2', 'Clientes: 2 atrasadas');
select is((public.tarefas_resumo('{"tipo":"hub"}')) ->> 'para_hoje', '1', 'Hub: 1 para hoje');
select is((public.tarefas_resumo('{"cliente":"20000000-0000-0000-0000-000000000002"}')) ->> 'abertas', '2', 'Por cliente');
select is((public.tarefas_resumo('{"projeto":"50000000-0000-0000-0000-000000000001"}')) ->> 'atrasadas', '1', 'Por projeto');
select is((public.tarefas_resumo('{"prioridade":"alta"}')) ->> 'abertas', '1', 'Por prioridade');
select is((public.tarefas_resumo('{"incluir_encerrados":true}')) ->> 'atrasadas', '4', 'Com encerrados');
select throws_ok($$ select public.tarefas_resumo('{"cliente":"x"}') $$, '22023', 'filtros_invalidos', 'Filtro inválido é recusado');

-- Isolamento e segurança
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((public.tarefas_resumo('{"tipo":"cliente"}')) ->> 'abertas', '0', 'Outro tenant não conta nada');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.tarefas_resumo('{}') $$, '42501', null, 'Cliente do portal não acessa o resumo');
reset role;

select * from finish();
rollback;
