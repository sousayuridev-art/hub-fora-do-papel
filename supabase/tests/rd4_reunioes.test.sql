-- RD-4: busca de reuniões no banco (título, cliente, trecho falado), semana, sugestão de
-- cliente pelo e-mail dos convidados; RD-1: números novos de clientes_resumo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@bemcuidar.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp, email) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Bem Cuidar', 'Marina', '79900000010', 'marina@bemcuidar.test'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Ótica Nova', 'Rui', '79900000020', 'rui@oticanova.test'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Ótica Velha', 'Ana', '79900000030', 'ana@oticavelha.test'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'Cliente da outra', 'Zé', '79900000090', 'ze@outra.test');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel');
-- Passos: Bem Cuidar vence hoje com hora; Ótica Nova venceu há 3 dias; Ótica Velha venceu há 1 dia
insert into public.deals (id, tenant_id, client_id, value_cents, next_step, next_step_at, next_step_has_time) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 100000, 'Ligar', now(), true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', null, 'Conversa', now() - interval '3 days', false),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', null, 'Conversa', now() - interval '1 day', false);
insert into public.projects (id, tenant_id, client_id, name, status, plan_name, monthly_cents) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Sistema de agendamento', 'andamento', 'Essencial', 49000);
insert into public.subscriptions (tenant_id, client_id, plan_name, amount_cents, start_month) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Essencial', 49000, date_trunc('month', now())::date),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009', 'Essencial', 77700, date_trunc('month', now())::date);

-- Reuniões (gravadas direto, como faria o servidor)
insert into public.meetings (id, tenant_id, conference_record, title, started_at, attendees, status, client_id, linked_by) values
  -- 1: ligada à Bem Cuidar, com transcrição
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'conferenceRecords/r1', 'Diagnóstico inicial',
   now() - interval '1 hour', '[{"email":"marina@bemcuidar.test"}]', 'transcrita', '20000000-0000-0000-0000-000000000001', 'email'),
  -- 2: sem cliente; convidado é o Rui (sugestão: Ótica Nova)
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'conferenceRecords/r2', 'Conversa sobre vitrine',
   now() - interval '2 hours', '[{"email":"yuri@foradopapel.test"},{"email":"RUI@oticanova.test"}]', 'sem_transcricao', null, null),
  -- 3: sem cliente; um convidado de cada ótica (empate: sem sugestão)
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'conferenceRecords/r3', 'Reunião do grupo',
   now() - interval '8 days', '[{"email":"rui@oticanova.test"},{"email":"ana@oticavelha.test"}]', 'aguardando_transcricao', null, null),
  -- 4: sem cliente; só o e-mail do Yuri (dono): sem sugestão
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'conferenceRecords/r4', 'Planejamento interno',
   now() - interval '15 days', '[{"email":"yuri@foradopapel.test"}]', 'aguardando_transcricao', null, null),
  -- 5: Yuri tirou o cliente à mão: sem sugestão
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'conferenceRecords/r5', 'Ligação rápida',
   now() - interval '3 hours', '[{"email":"rui@oticanova.test"}]', 'aguardando_transcricao', null, 'manual'),
  -- 6: sem cliente; convidada do portal da Bem Cuidar (sugestão pelo login do portal)
  ('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'conferenceRecords/r6', 'Alinhamento',
   now() - interval '4 hours', '[{"email":"paula@bemcuidar.test"}]', 'aguardando_transcricao', null, null),
  -- 9: outra agência
  ('60000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'conferenceRecords/r9', 'Diagnóstico da outra',
   now() - interval '1 hour', '[{"email":"rui@oticanova.test"}]', 'aguardando_transcricao', null, null);
insert into public.meeting_transcripts (meeting_id, tenant_id, entries) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '[{"quem":"Marina","seg":4,"texto":"Hoje a agenda é no papel e a recepção perde horários."},
     {"quem":"Yuri Sousa","seg":9,"texto":"Entendi. Vamos olhar o agendamento on-line."}]');

-- ===== Dono (Yuri) com sessão forte =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

-- Busca e filtros
select is(jsonb_array_length(public.reunioes_buscar() -> 'itens'), 6, 'Sem busca: todas as reuniões da agência');
select is((public.reunioes_buscar() ->> 'todas')::int, 6, 'Contador de todas');
select is((public.reunioes_buscar() ->> 'sem_cliente')::int, 5, 'Contador de sem cliente');
select is((public.reunioes_buscar() ->> 'sem_transcricao')::int, 1, 'Contador de sem transcrição');
select is(jsonb_array_length(public.reunioes_buscar('sem_cliente') -> 'itens'), 5, 'Filtro sem cliente');
select is(jsonb_array_length(public.reunioes_buscar('sem_transcricao') -> 'itens'), 1, 'Filtro sem transcrição');
select is(jsonb_array_length(public.reunioes_buscar('todas', null, '20000000-0000-0000-0000-000000000001') -> 'itens'), 1,
  'Reuniões de um cliente');
select is(public.reunioes_buscar('todas', 'VITRINE') -> 'itens' -> 0 ->> 'titulo', 'Conversa sobre vitrine',
  'Busca pelo título sem diferença de maiúsculas');
select is(public.reunioes_buscar('todas', 'clinica') -> 'itens' -> 0 ->> 'titulo', 'Diagnóstico inicial',
  'Busca pelo nome do cliente sem acento');
select is(public.reunioes_buscar('todas', 'clinica') -> 'itens' -> 0 ->> 'trecho', null,
  'Achou pelo cliente: sem trecho');
select is(public.reunioes_buscar('todas', 'recepcao') -> 'itens' -> 0 ->> 'id', '60000000-0000-0000-0000-000000000001',
  'Busca por trecho da transcrição sem acento');
select matches(public.reunioes_buscar('todas', 'recepcao') -> 'itens' -> 0 ->> 'trecho', 'recepção perde',
  'Devolve o trecho falado');
select is(jsonb_array_length(public.reunioes_buscar('todas', 'nada disso aqui') -> 'itens'), 0, 'Busca sem resultado');
select is(jsonb_array_length(public.reunioes_buscar('sem_cliente', 'diagnostico') -> 'itens'), 0,
  'Busca respeita o filtro');
select is(jsonb_array_length(public.reunioes_buscar('todas', '   ') -> 'itens'), 6, 'Busca em branco = sem busca');
select throws_ok($$ select public.reunioes_buscar('qualquer') $$, '22023', 'filtro_invalido', 'Filtro inválido é recusado');

-- Semana
select ok((select bool_and((i ->> 'semanas_atras')::int >= 0 and (i ->> 'semana') is not null)
             from jsonb_array_elements(public.reunioes_buscar() -> 'itens') i), 'Cada reunião traz a semana');
select is((select sum((s ->> 'total')::int)::int from jsonb_array_elements(public.reunioes_buscar() -> 'semanas') s), 6,
  'Totais por semana somam a lista');
select is(public.reunioes_buscar() -> 'itens' -> 5 ->> 'id', '60000000-0000-0000-0000-000000000004',
  'Mais antiga por último');
select ok((public.reunioes_buscar() -> 'itens' -> 5 ->> 'semanas_atras')::int >= 2, 'Reunião de 15 dias atrás: 2 semanas ou mais');

-- Ligue estas reuniões a um cliente
select is((public.reunioes_para_ligar() ->> 'total')::int, 5, 'Bloco conta as reuniões sem cliente');
select is((select i -> 'sugestao' -> 'cliente' ->> 'nome' from jsonb_array_elements(public.reunioes_para_ligar() -> 'itens') i
            where i ->> 'id' = '60000000-0000-0000-0000-000000000002'), 'Ótica Nova',
  'Sugere o cliente pelo e-mail do convidado (fora o e-mail do dono)');
select is((select i -> 'sugestao' ->> 'deal_id' from jsonb_array_elements(public.reunioes_para_ligar() -> 'itens') i
            where i ->> 'id' = '60000000-0000-0000-0000-000000000002'), '30000000-0000-0000-0000-000000000002',
  'Sugere a oportunidade única do cliente');
select is((select i -> 'sugestao' -> 'cliente' ->> 'nome' from jsonb_array_elements(public.reunioes_para_ligar() -> 'itens') i
            where i ->> 'id' = '60000000-0000-0000-0000-000000000006'), 'Clínica Bem Cuidar',
  'Sugere pelo login do portal');
select is((select i -> 'sugestao' -> 'projeto' ->> 'nome' from jsonb_array_elements(public.reunioes_para_ligar() -> 'itens') i
            where i ->> 'id' = '60000000-0000-0000-0000-000000000006'), 'Sistema de agendamento',
  'Sugere o projeto em andamento único');
select is((select count(*)::int from jsonb_array_elements(public.reunioes_para_ligar() -> 'itens') i
            where i ->> 'id' in ('60000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004',
                                 '60000000-0000-0000-0000-000000000005')
              and jsonb_typeof(i -> 'sugestao') = 'null'), 3,
  'Sem sugestão: empate, só e-mail da agência ou cliente tirado à mão');
select is(jsonb_array_length(public.reunioes_para_ligar(2) -> 'itens'), 2, 'Respeita o limite');
select is(jsonb_array_length(public.reunioes_para_ligar(0) -> 'itens'), 1, 'Limite mínimo de 1');

-- Ligar com um clique usa o vínculo de sempre e tira a reunião do bloco
select lives_ok($$ select public.reuniao_vincular('60000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002') $$, 'Liga a sugestão');
select is((public.reunioes_para_ligar() ->> 'total')::int, 4, 'Reunião ligada sai do bloco');

-- RD-1: números da lista de clientes
select is((public.clientes_resumo() ->> 'para_hoje')::int, 1, 'Para hoje');
select is((public.clientes_resumo() ->> 'para_hoje_com_hora')::int, 1, 'Para hoje com horário');
select is((public.clientes_resumo() ->> 'vencidos')::int, 2, 'Vencidos');
select is((public.clientes_resumo() ->> 'vencido_ha_dias')::int, 3, 'O vencido mais antigo, em dias');
select is((public.clientes_resumo() ->> 'mensalidades_cents')::int, 49000, 'Mensalidades ativas só da agência');

-- ===== Sem sessão forte, outra agência, portal e anônimo =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.reunioes_para_ligar() $$, '42501', 'precisa_codigo', 'Sem o código: recusado');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((select string_agg(i ->> 'titulo', ',') from jsonb_array_elements(public.reunioes_buscar() -> 'itens') i),
  'Diagnóstico da outra', 'Outra agência só vê as suas');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.reunioes_buscar() $$, '42501', 'sem_permissao', 'Pessoa do portal não busca reuniões');
select throws_ok($$ select public.reunioes_para_ligar() $$, '42501', 'sem_permissao', 'Pessoa do portal não vê sugestões');
reset role;
set local role anon;
select throws_ok($$ select public.reunioes_buscar() $$, '42501', null, 'Anônimo não executa a busca');
select throws_ok($$ select public.reunioes_para_ligar() $$, '42501', null, 'Anônimo não executa o bloco');
reset role;

select * from finish();
rollback;
