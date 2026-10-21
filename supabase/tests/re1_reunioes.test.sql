-- RE-1: reuniões do Meet no Hub. Só o servidor grava; só o dono lê; vínculo por e-mail
-- só com um cliente; token do Google nunca legível pelo app.
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

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
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Bem Cuidar', 'Marina', '79900000010', 'Marina@BemCuidar.test'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Ótica Nova', 'Rui', '79900000020', 'compartilhado@grupo.test'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Ótica Velha', 'Ana', '79900000030', 'compartilhado@grupo.test'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'Cliente da outra', 'Zé', '79900000090', 'ze@outra.test');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel');
insert into public.deals (id, tenant_id, client_id, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Conversa', now() + interval '1 day'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Conversa', now() + interval '1 day');
insert into public.projects (id, tenant_id, client_id, name, status, plan_name, monthly_cents) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Sistema de agendamento', 'andamento', 'Essencial', 49000);

-- ===== Servidor grava =====
set local role service_role;
select is((public.reuniao_gravar('10000000-0000-0000-0000-000000000001', '{
  "registro": "conferenceRecords/abc-1", "codigo": "tuy-wrbo-myq", "evento_id": "ev1", "titulo": "Diagnóstico Bem Cuidar",
  "inicio": "2026-10-21T16:37:00Z", "fim": "2026-10-21T17:30:00Z",
  "convidados": [{"email": "yuri@foradopapel.test"}, {"email": "marina@bemcuidar.test", "nome": "Marina"}],
  "falas": [{"quem": "Marina", "seg": 4, "texto": "Hoje a agenda é no papel."}, {"quem": "Yuri Sousa", "seg": 9, "texto": "Entendi."}],
  "idioma": "pt-BR"}'::jsonb)) ->> 'nova_transcricao', 'true', 'Grava reunião com transcrição');
reset role;
select is((select client_id from public.meetings where conference_record = 'conferenceRecords/abc-1'),
  '20000000-0000-0000-0000-000000000001'::uuid, 'Liga ao cliente pelo e-mail da ficha (sem diferenciar maiúsculas)');
select is((select deal_id::text || '/' || project_id::text from public.meetings where conference_record = 'conferenceRecords/abc-1'),
  '30000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001', 'Liga oportunidade e projeto únicos');
select is((select linked_by::text || '/' || status::text from public.meetings where conference_record = 'conferenceRecords/abc-1'),
  'email/transcrita', 'Vínculo automático e situação transcrita');
select is((select count(*)::int from public.event_outbox where event = 'reuniao.transcrita'), 1, 'Evento de transcrição na fila');
select is((select count(*)::int from public.event_outbox where event = 'reuniao.vinculada'), 1, 'Evento de vínculo na fila');

set local role service_role;
select is((public.reuniao_gravar('10000000-0000-0000-0000-000000000001', '{
  "registro": "conferenceRecords/abc-1", "inicio": "2026-10-21T16:37:00Z",
  "falas": [{"quem": "X", "seg": 1, "texto": "outra"}]}'::jsonb)) ->> 'nova_transcricao', 'false', 'Mesma reunião não grava transcrição de novo');
select is((public.reuniao_gravar('10000000-0000-0000-0000-000000000001', '{
  "registro": "conferenceRecords/abc-1", "inicio": "2026-10-21T16:37:00Z", "situacao": "sem_transcricao"}'::jsonb)) ->> 'id',
  (select id::text from public.meetings where conference_record = 'conferenceRecords/abc-1'), 'Atualizar devolve a mesma reunião');
select lives_ok($$ select public.reuniao_gravar('10000000-0000-0000-0000-000000000001', '{
  "registro": "conferenceRecords/abc-2", "inicio": "2026-10-20T13:00:00Z", "fim": "2026-10-20T13:30:00Z",
  "convidados": [{"email": "compartilhado@grupo.test"}], "situacao": "sem_transcricao"}'::jsonb) $$, 'Grava reunião sem transcrição');
select lives_ok($$ select public.reuniao_gravar('10000000-0000-0000-0000-000000000001', '{
  "registro": "conferenceRecords/abc-3", "inicio": "2026-10-19T13:00:00Z", "situacao": "aguardando_transcricao"}'::jsonb) $$,
  'Grava reunião sem evento da Agenda');
select lives_ok($$ select public.reuniao_gravar('10000000-0000-0000-0000-000000000002', '{
  "registro": "conferenceRecords/abc-1", "inicio": "2026-10-21T16:37:00Z",
  "convidados": [{"email": "marina@bemcuidar.test"}]}'::jsonb) $$, 'Outra agência pode ter o mesmo registro');
select throws_ok($$ select public.reuniao_gravar('10000000-0000-0000-0000-000000000001', '{"registro": "x/1", "inicio": "2026-10-19T13:00:00Z"}'::jsonb) $$,
  '23514', null, 'Registro do Meet em formato inválido é recusado');
reset role;

select is((select count(*)::int from public.meetings where tenant_id = '10000000-0000-0000-0000-000000000001'), 3, 'Uma linha por reunião');
select is((select count(*)::int from public.meeting_transcripts), 1, 'Uma transcrição só');
select is((select status::text from public.meetings where conference_record = 'conferenceRecords/abc-1'
            and tenant_id = '10000000-0000-0000-0000-000000000001'), 'transcrita', 'Transcrita não volta para sem transcrição');
select ok((select client_id is null from public.meetings where conference_record = 'conferenceRecords/abc-2'),
  'E-mail de dois clientes: fica sem cliente');
select is((select title from public.meetings where conference_record = 'conferenceRecords/abc-3'), 'Reunião de 19/10',
  'Sem título: "Reunião de" e a data');
select is((select client_id from public.meetings where tenant_id = '10000000-0000-0000-0000-000000000002'), null::uuid,
  'Não liga a cliente de outra agência');

-- ===== Dono (Yuri) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(jsonb_array_length((public.reunioes_listar()) -> 'itens'), 3, 'Dono vê as reuniões da agência');
select is(((public.reunioes_listar()) ->> 'sem_cliente')::int, 2, 'Contador de sem cliente');
select is(jsonb_array_length((public.reunioes_listar('sem_transcricao')) -> 'itens'), 1, 'Filtro sem transcrição');
select is(jsonb_array_length((public.reunioes_listar('todas', '20000000-0000-0000-0000-000000000001')) -> 'itens'), 1, 'Reuniões de um cliente');
select is(jsonb_array_length((public.reuniao_abrir((select id from public.meetings where conference_record = 'conferenceRecords/abc-1'))) -> 'falas'),
  2, 'Abrir traz as falas');
select throws_ok($$ select public.reuniao_vincular((select id from public.meetings where conference_record = 'conferenceRecords/abc-2'),
  '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001') $$, '22023', 'oportunidade_invalida',
  'Oportunidade de outro cliente é recusada');
select throws_ok($$ select public.reuniao_vincular((select id from public.meetings where conference_record = 'conferenceRecords/abc-2'),
  '20000000-0000-0000-0000-000000000009') $$, '22023', 'cliente_invalido', 'Cliente de outra agência é recusado');
select throws_ok($$ select public.reuniao_vincular((select id from public.meetings where conference_record = 'conferenceRecords/abc-2'),
  '20000000-0000-0000-0000-000000000002', null, '50000000-0000-0000-0000-000000000001') $$, '22023', 'projeto_invalido',
  'Projeto de outro cliente é recusado');
select is((public.reuniao_vincular((select id from public.meetings where conference_record = 'conferenceRecords/abc-2'),
  '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002')) -> 'cliente' ->> 'nome', 'Ótica Nova',
  'Liga com um clique');
select lives_ok($$ select public.reuniao_vincular((select id from public.meetings where conference_record = 'conferenceRecords/abc-1'
  and tenant_id = '10000000-0000-0000-0000-000000000001'), null) $$, 'Tirar o cliente');
select throws_ok($$ select public.reuniao_gravar('10000000-0000-0000-0000-000000000001', '{"registro": "conferenceRecords/z", "inicio": "2026-10-19T13:00:00Z"}'::jsonb) $$,
  '42501', null, 'App não grava reunião');
select throws_ok($$ select count(*) from public.google_connections $$, '42501', null, 'App não lê a conexão do Google');
select throws_ok($$ select public.google_estado_criar('https://site-malicioso.test') $$, '22023', 'volta_invalida', 'Volta só para o Hub');
select matches(public.google_estado_criar('https://spring-board-kit.lovable.app'), '^[a-f0-9]{64}$', 'Código de ligação com 64 caracteres');
reset role;

set local role service_role;
select is((public.reuniao_gravar('10000000-0000-0000-0000-000000000001', '{
  "registro": "conferenceRecords/abc-1", "inicio": "2026-10-21T16:37:00Z",
  "convidados": [{"email": "marina@bemcuidar.test"}]}'::jsonb)) ->> 'client_id', null, 'Busca não religa o que o Yuri tirou');
select is((public.google_estado_ler((select state from public.google_oauth_states limit 1))) ->> 'volta',
  'https://spring-board-kit.lovable.app', 'Servidor lê o pedido de ligação');
select matches(public.google_estado_guardar((select state from public.google_oauth_states limit 1),
  'Yuri@ForaDoPapel.com.br', 'cifra-de-teste-com-mais-de-vinte'), '^[a-f0-9]{64}$', 'Guarda a permissão e gera código de confirmação');
select is(public.google_estado_guardar((select state from public.google_oauth_states limit 1), 'x@y.test', 'outra-cifra-com-mais-de-vinte'),
  null, 'Pedido só guarda uma vez');
select is((select count(*)::int from public.google_connections), 0, 'Conexão ainda não existe antes de confirmar');
reset role;

-- Outra dona tenta confirmar o pedido do Yuri (permissão dada no navegador errado)
select set_config('teste.codigo', (select confirm_code from public.google_oauth_states limit 1), true) is not null as guardado;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.google_confirmar(current_setting('teste.codigo')) $$,
  '22023', 'pedido_invalido', 'Só quem pediu confirma a ligação');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((public.google_confirmar(current_setting('teste.codigo'))) ->> 'email',
  'yuri@foradopapel.com.br', 'Yuri confirma e o Google fica ligado');
reset role;
select is((select count(*)::int from public.google_oauth_states), 0, 'Pedido some depois de confirmado');

set local role service_role;
select is((select count(*)::int from public.google_conexoes_reservar()), 1, 'Primeira busca reserva a conexão');
select is((select count(*)::int from public.google_conexoes_reservar('10000000-0000-0000-0000-000000000001')), 0,
  'Busca em andamento trava a segunda');
select lives_ok($$ select public.google_busca_concluir('10000000-0000-0000-0000-000000000001', false, 'falha temporária') $$,
  'Falha temporária libera a trava');
select is((select count(*)::int from public.google_conexoes_reservar()), 0,
  'Depois de uma falha, a busca automática espera 10 minutos (não dá para forçar em laço)');
select lives_ok($$ select public.google_busca_concluir('10000000-0000-0000-0000-000000000001', false, 'invalid_grant', true) $$,
  'Permissão revogada marca religar');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((public.google_situacao()) ->> 'situacao', 'religar', 'Configurações mostram "Ligar de novo"');
select ok(not ((public.google_situacao()) ? 'token_cipher'), 'Situação nunca traz o token');

-- ===== Outra agência e pessoa do portal =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.reuniao_abrir((select id from public.meetings where conference_record = 'conferenceRecords/abc-2')) $$,
  'P0002', 'nao_encontrada', 'Outra agência não abre reunião');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.meetings) + (select count(*)::int from public.meeting_transcripts), 0,
  'Pessoa do portal não vê reunião nem transcrição');
reset role;

select * from finish();
rollback;
