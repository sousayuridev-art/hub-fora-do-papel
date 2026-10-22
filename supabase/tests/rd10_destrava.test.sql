-- RD-10: "O que destrava o projeto" (projeto_destrava): os 6 casos em ordem, o que está com o cliente e o isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marina@cliente.test');
insert into public.profiles (id, full_name) values ('00000000-0000-0000-0000-0000000000c1', 'Marina Costa')
  on conflict (id) do update set full_name = excluded.full_name;
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
update public.tenants set timezone = 'America/Sao_Paulo' where id = '10000000-0000-0000-0000-000000000001';
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Rede Patas', 'Marina Costa', '79900000010');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel');

-- Um projeto para cada caso (1 a 6), mais um vazio
insert into public.projects (id, tenant_id, client_id, name, kind) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Caso 1', 'sob_medida'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Caso 2 módulo', 'sob_medida'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Caso 2 fase', 'padrao'),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Caso 3', 'padrao'),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Caso 4', 'padrao'),
  ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Caso 5', 'padrao'),
  ('50000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Caso 6', 'padrao'),
  ('50000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Vazio', 'padrao');

-- Caso 1: Financeiro aprovado por Marina em 20/10 às 16h12 (Brasília); Estoque em testes (caso 2, perde)
insert into public.project_modules (id, tenant_id, project_id, position, name, status) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 'Financeiro', 'aprovado'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 2, 'Estoque', 'aguardando_aprovacao'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 1, 'Compras', 'testes'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 2, 'Vendas', 'testes');
insert into public.approvals (tenant_id, client_id, project_id, module_id, title, status, sent_at, decided_at, decided_by) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001', 'Módulo Financeiro', 'aprovada', '2026-10-19 12:00+00', '2026-10-20 19:12+00',
   '00000000-0000-0000-0000-0000000000c1'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000002', 'Módulo Estoque', 'aguardando', '2026-10-21 12:00+00', null, null),
  -- Vendas já tem pedido aguardando: só Compras precisa do pedido
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002',
   '60000000-0000-0000-0000-000000000004', 'Módulo Vendas', 'aguardando', '2026-10-21 12:00+00', null, null);
-- Com o cliente no caso 1: parcela vencendo, conteúdo pedido e um adicional para decidir
insert into public.charges (tenant_id, client_id, project_id, kind, description, amount_cents, due_date, sequence, sequence_total) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'parcela', '2ª parcela', 800000, public._hoje('10000000-0000-0000-0000-000000000001') + 2, 2, 3),
  -- vence daqui a 20 dias: ainda não está com o cliente
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'parcela', '3ª parcela', 800000, public._hoje('10000000-0000-0000-0000-000000000001') + 20, 3, 3);
insert into public.client_tasks (tenant_id, client_id, project_id, title) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Enviar a lista de lojas');
insert into public.requests (tenant_id, client_id, project_id, code, title, status, classification, value_cents) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'RP-01', 'Relatório por vendedor', 'aguardando_cliente', 'adicional', 120000);

-- Caso 2 (fase): fase Design em andamento, tarefas prontas para aprovar
insert into public.project_phases (id, tenant_id, project_id, position, name, status) values
  ('61000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 1, 'Design', 'andamento'),
  ('61000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 2, 'Construção', 'pendente');
insert into public.project_tasks (tenant_id, project_id, title, status, cycle) values
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'Telas do agendamento', 'para_aprovar', 1),
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'Logotipo aplicado', 'pronto', 1);

-- Caso 3: pedido recebido sem classificação (e um adicional aprovado, que perde)
insert into public.requests (tenant_id, client_id, project_id, code, title, status, classification, client_decision, decided_at, value_cents, created_at) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004',
   'RP-02', 'Trocar fotos da página inicial', 'recebido', null, null, null, null, '2026-10-19 13:00+00'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004',
   'RP-03', 'Área de cupons', 'em_analise', 'adicional', 'aprovado', '2026-10-20 13:00+00', 90000, '2026-10-18 13:00+00'),
  -- Caso 4: adicional aprovado e não iniciado
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005',
   'RP-04', 'Relatório de giro', 'em_analise', 'adicional', 'aprovado', '2026-10-20 13:00+00', 90000, '2026-10-18 13:00+00'),
  -- já iniciado: não conta
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006',
   'RP-05', 'Integração antiga', 'fazendo', 'adicional', 'aprovado', '2026-10-10 13:00+00', 90000, '2026-10-09 13:00+00');

-- Caso 5: tarefa atrasada (mais uma a fazer, que perde)
insert into public.project_tasks (tenant_id, project_id, title, status, due_date, position) values
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 'Revisar textos', 'fazendo',
   public._hoje('10000000-0000-0000-0000-000000000001') - 3, 1),
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 'Pronta e antiga', 'pronto',
   public._hoje('10000000-0000-0000-0000-000000000001') - 9, 2),
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 'Importar fornecedores', 'a_fazer', null, 3),
  -- Caso 6: só tarefas a fazer; a de prioridade alta vem primeiro
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000007', 'Configurar domínio', 'a_fazer',
   public._hoje('10000000-0000-0000-0000-000000000001') + 5, 5),
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000007', 'Montar a página de serviços', 'a_fazer', null, 1);
update public.project_tasks set priority = 'alta' where title = 'Montar a página de serviços';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

-- 1
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000001') #>> '{acao,tipo}', 'publicar_modulo', '1: módulo aprovado vem primeiro');
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000001') #>> '{acao,titulo}', 'Publicar o módulo Financeiro', '1: título');
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000001') #>> '{acao,apoio}',
  'Aprovado por Marina em 20/10, 16h12. Falta escrever o que entrou nesta versão.', '1: quem aprovou e quando (fuso da agência)');
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000001') #>> '{acao,alvo}', '60000000-0000-0000-0000-000000000001', '1: alvo é o módulo');
-- 2
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000002') #>> '{acao,titulo}', 'Pedir aprovação do módulo Compras', '2: módulo em testes sem pedido');
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000003') #>> '{acao,tipo}', 'pedir_aprovacao_fase', '2: fase pronta sem pedido');
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000003') #>> '{acao,titulo}', 'Pedir aprovação da fase Design', '2: título da fase');
-- 3
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000004') #>> '{acao,tipo}', 'classificar_pedido', '3: pedido novo sem classificação vence o adicional');
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000004') #>> '{acao,titulo}', 'Classificar o pedido de ajuste', '3: título');
-- 4
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000005') #>> '{acao,titulo}', 'Começar o serviço adicional Relatório de giro', '4: adicional aprovado e não iniciado');
-- 5
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000006') #>> '{acao,titulo}', 'Resolver a tarefa atrasada Revisar textos', '5: tarefa atrasada (adicional já iniciado não conta)');
-- 6
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000007') #>> '{acao,titulo}', 'Nada travado. Próximo passo: Montar a página de serviços', '6: primeira tarefa a fazer (prioridade alta)');
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000008') #>> '{acao,botao}', 'Nova tarefa', '6: sem tarefas, sugere criar uma');
select ok(public.projeto_destrava('50000000-0000-0000-0000-000000000008') #> '{acao,alvo}' = 'null'::jsonb, '6: sem tarefa, sem alvo');

-- O que está com o cliente
select is(public.projeto_destrava('50000000-0000-0000-0000-000000000001') ->> 'responsavel', 'Marina', 'Responsável pelo primeiro nome');
select is((select jsonb_agg(x ->> 'texto') from jsonb_array_elements(public.projeto_destrava('50000000-0000-0000-0000-000000000001') -> 'com_cliente') x),
  '["aprovação do módulo Estoque", "pagamento da parcela 2 de 3", "Enviar a lista de lojas", "decisão do serviço adicional \"Relatório por vendedor\""]'::jsonb,
  'Com o cliente: aprovação, parcela que vence em 5 dias, conteúdo e adicional');
select is(jsonb_array_length(public.projeto_destrava('50000000-0000-0000-0000-000000000007') -> 'com_cliente'), 0, 'Nada com o cliente');

-- Só leitura: nada muda
select is((select count(*)::int from public.project_events), 0, 'Não grava linha do tempo');

-- Isolamento
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.projeto_destrava('50000000-0000-0000-0000-000000000001') $$, 'P0002', 'projeto_inexistente', 'Outro tenant é recusado');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.projeto_destrava('50000000-0000-0000-0000-000000000001') $$, 'P0002', 'projeto_inexistente', 'Cliente do portal é recusado');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.projeto_destrava('50000000-0000-0000-0000-000000000001') $$, 'P0002', 'projeto_inexistente', 'Dono sem o código do app é recusado');
reset role;
select ok(not has_function_privilege('anon', 'public.projeto_destrava(uuid)', 'execute'), 'Visitante sem acesso');

select * from finish();
rollback;
