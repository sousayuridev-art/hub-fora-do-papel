-- TA-1: Central de Tarefas. Mesma tabela do projeto; tarefa interna sem projeto; filtros, atrasadas e resumo no banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

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
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Bem Cuidar', 'Marina', '79900000010');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel');
insert into public.projects (id, tenant_id, client_id, name, status) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sistema de agendamento', 'andamento'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Site antigo', 'concluido');

select set_config('teste.hoje', public._hoje('10000000-0000-0000-0000-000000000001')::text, true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

-- Criar
select is((public.tarefa_criar('Revisar textos', '50000000-0000-0000-0000-000000000001', p_prazo => current_setting('teste.hoje')::date - 2, p_prioridade => 'alta')) ->> 'kind',
  'cliente', 'Tarefa com projeto é de cliente');
select is((public.tarefa_criar('Emitir nota da parcela', p_prazo => current_setting('teste.hoje')::date)) ->> 'kind',
  'interna', 'Sem projeto vira interna');
select is((public.tarefa_criar('Central: aprovar visual', p_tipo => 'hub', p_card => 'TA-0')) ->> 'card_ref', 'TA-0', 'Tarefa do Hub guarda o card');
select throws_ok($$ select public.tarefa_criar('Errada', '50000000-0000-0000-0000-000000000001', p_tipo => 'interna') $$,
  '22023', 'tipo_invalido', 'Projeto não aceita tipo interna');
select throws_ok($$ select public.tarefa_criar('Errada', p_tipo => 'cliente') $$, '22023', 'tipo_invalido', 'Cliente sem projeto é recusado');
select throws_ok($$ select public.tarefa_criar('x') $$, '22023', 'titulo_obrigatorio', 'Título curto é recusado');
select throws_ok($$ select public.tarefa_criar('Prioridade ruim', p_prioridade => 'urgente') $$, '22023', 'prioridade_invalida', 'Prioridade fora da lista');
select lives_ok($$ select public.tarefa_criar('Tarefa de projeto encerrado', '50000000-0000-0000-0000-000000000002') $$, 'Cria em projeto encerrado (histórico)');

-- Projeto e Central veem o mesmo registro
select is((select count(*)::int from public.project_tasks), 4, 'Quatro tarefas, sem cópia');
select is(jsonb_array_length((public.projeto_detalhe('50000000-0000-0000-0000-000000000001')) -> 'tarefas'), 1, 'Projeto vê só a sua');
select is(jsonb_array_length((public.tarefas_listar()) -> 'itens'), 3, 'Central vê todas menos as de projeto encerrado');
select is(jsonb_array_length((public.tarefas_listar('{"incluir_encerrados":true}')) -> 'itens'), 4, 'Com encerrados, vê as 4');

-- Filtros
select is(jsonb_array_length((public.tarefas_listar('{"tipo":"interna"}')) -> 'itens'), 1, 'Filtro por tipo');
select is(jsonb_array_length((public.tarefas_listar('{"prazo":"atrasadas"}')) -> 'itens'), 1, 'Filtro atrasadas');
select is(jsonb_array_length((public.tarefas_listar('{"prazo":"hoje"}')) -> 'itens'), 1, 'Filtro hoje');
select is(jsonb_array_length((public.tarefas_listar('{"cliente":"20000000-0000-0000-0000-000000000001"}')) -> 'itens'), 1, 'Filtro por cliente');
select is(jsonb_array_length((public.tarefas_listar('{"busca":"nota"}')) -> 'itens'), 1, 'Busca no título');
select is((public.tarefas_listar('{"prazo":"atrasadas"}')) -> 'itens' -> 0 -> 'cliente' ->> 'empresa', 'Clínica Bem Cuidar', 'Item traz o cliente');
select is(((public.tarefas_listar('{"prazo":"atrasadas"}')) -> 'itens' -> 0 ->> 'atrasada')::boolean, true, 'Item marca atrasada');
select throws_ok($$ select public.tarefas_listar('{"projeto":"nao-e-uuid"}') $$, '22023', 'filtros_invalidos', 'Filtro inválido é recusado');

-- Resumo
select is((public.tarefas_resumo()) ->> 'atrasadas', '1', 'Resumo: 1 atrasada');
select is((public.tarefas_resumo()) ->> 'abertas', '3', 'Resumo: 3 abertas (sem projeto encerrado)');

-- Editar e mover
select is((public.tarefa_editar((select id from public.project_tasks where title = 'Revisar textos'), '{"prazo":null,"prioridade":"baixa"}')) ->> 'priority',
  'baixa', 'Edita prioridade');
select is((public.tarefas_resumo()) ->> 'atrasadas', '0', 'Sem prazo deixa de estar atrasada');
select throws_ok($$ select public.tarefa_editar((select id from public.project_tasks where title = 'Revisar textos'), '{"tipo":"hub"}') $$,
  '22023', 'tipo_invalido', 'Tarefa de cliente não muda de tipo');
select throws_ok($$ select public.tarefa_editar((select id from public.project_tasks where title = 'Emitir nota da parcela'), '{"responsavel":"00000000-0000-0000-0000-0000000000c1"}') $$,
  '22023', 'responsavel_invalido', 'Cliente do portal não vira responsável');
select ok((public.tarefa_mover((select id from public.project_tasks where title = 'Emitir nota da parcela'), 'pronto')) ->> 'done_at' is not null, 'Pronto grava a conclusão');
select ok((public.tarefa_mover((select id from public.project_tasks where title = 'Emitir nota da parcela'), 'fazendo')) ->> 'done_at' is null, 'Voltar apaga a conclusão');

-- Isolamento e segurança
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is(jsonb_array_length((public.tarefas_listar()) -> 'itens'), 0, 'Outro tenant não vê nada');
select throws_ok($$ select public.tarefa_mover((select id from public.project_tasks limit 1), 'pronto') $$, 'P0002', 'tarefa_inexistente', 'Outro tenant não move');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.tarefas_resumo() $$, '42501', 'precisa_codigo', 'Sem código do app, nada');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.tarefas_listar() $$, '42501', null, 'Cliente do portal não acessa a Central');
reset role;

select * from finish();
rollback;
