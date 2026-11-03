-- SIS-2: pedidos que chegam dos sistemas pela chave de integração.
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente@rm.test');
insert into public.profiles (id, full_name) values ('00000000-0000-0000-0000-0000000000a1', 'Yuri Sousa')
  on conflict (id) do update set full_name = excluded.full_name;
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'RM Telecom', 'Ana', '79900000001'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'De Outra', 'Zé', '79900000009');
insert into public.projects (id, tenant_id, client_id, name, status) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Orga CRM', 'andamento');
insert into public.sistemas (id, tenant_id, client_id, project_id, nome, situacao) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001', 'Orga CRM', 'no_ar'),
  ('60000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009',
   null, 'Da Outra', 'no_ar');

-- Dono gera a chave (com código)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
create temp table k as select public.sistema_chave_gerar('60000000-0000-0000-0000-000000000001') as r;
select matches((select r->>'chave' from k), '^fdp_[0-9a-f]{64}$', 'chave no formato certo');
select is((public.sistema_integracao('60000000-0000-0000-0000-000000000001')->>'ligada')::boolean, true, 'integração ligada');
select is(public.sistema_integracao('60000000-0000-0000-0000-000000000001')->>'prefixo', (select left(r->>'chave', 10) from k), 'Hub mostra só o prefixo');
select throws_ok($$select * from public.sistema_integracoes$$, '42501', null, 'o hash não é legível');
select throws_ok($$select public._sis_por_chave('x')$$, '42501', null, 'dono não chama as funções de serviço');
select throws_ok($$select public.sistema_chave_gerar('60000000-0000-0000-0000-000000000009')$$,
  'sistema_inexistente', 'chave só de sistema do próprio tenant');
reset role;

-- A função de servidor (service_role) acha o sistema pela chave
grant select on k to service_role;
set local role service_role;
select is((public._sis_por_chave((select r->>'chave' from k))->>'sistema_id'), '60000000-0000-0000-0000-000000000001', 'chave certa acha o sistema');
select is(public._sis_por_chave('fdp_' || repeat('0', 64)), null, 'chave errada não acha nada');
select is(public._sis_por_chave('qualquer coisa'), null, 'formato errado não acha nada');

-- Criar
create temp table p1 as select public._sis_pedido_criar('60000000-0000-0000-0000-000000000001',
  '{"titulo": "Fila não atualiza", "descricao": "Ao mover o contato a fila fica igual.", "tipo": "erro",
    "prioridade": "urgente", "solicitante": {"nome": "Cleyde", "id": "abc"}}'::jsonb) as r;
grant select on p1 to authenticated;
select is((select r->>'situacao' from p1), 'recebido', 'pedido novo chega como recebido');
select is((select r->>'situacao_rotulo' from p1), 'Recebido', 'com rótulo em português');
select is((select origin::text from public.requests where id = (select (r->>'id')::uuid from p1)), 'sistema', 'origem sistema');
select is((select urgente from public.requests where id = (select (r->>'id')::uuid from p1)), true, 'urgente vira urgente no Hub');
select is((select project_id from public.requests where id = (select (r->>'id')::uuid from p1)),
  '50000000-0000-0000-0000-000000000001'::uuid, 'ligado ao projeto do sistema');
select is((select source from public.project_events where request_id = (select (r->>'id')::uuid from p1) limit 1),
  'cliente', 'na linha do tempo conta como do cliente');
select throws_ok($$select public._sis_pedido_criar('60000000-0000-0000-0000-000000000001', '{"titulo": "Sem nome"}'::jsonb)$$,
  'solicitante_obrigatorio', 'sem quem pediu: recusado');
select throws_ok($$select public._sis_pedido_criar('60000000-0000-0000-0000-000000000001',
  '{"titulo": "X y", "situacao": "pronto", "solicitante": {"nome": "A"}}'::jsonb)$$,
  'situacao_invalida', 'situação só na importação, e nunca pronto');

-- Importação idempotente com situação e data de origem
select is((public._sis_pedido_criar('60000000-0000-0000-0000-000000000001',
  '{"titulo": "Relatório de comissão", "externo_id": "orga-1", "situacao": "em_analise", "criado_em": "2026-10-20T10:00:00Z",
    "solicitante": {"nome": "Ana"}}'::jsonb))->>'situacao', 'em_analise', 'importado mantém a situação');
select throws_ok($$select public._sis_pedido_criar('60000000-0000-0000-0000-000000000001',
  '{"titulo": "Pular a triagem", "externo_id": "orga-9", "situacao": "fazendo", "solicitante": {"nome": "A"}}'::jsonb)$$,
  'situacao_invalida', 'importação nunca entra como fazendo (a triagem é do Yuri)');
select is((public._sis_pedido_criar('60000000-0000-0000-0000-000000000001',
  '{"titulo": "Relatório de comissão", "externo_id": "orga-1", "solicitante": {"nome": "Ana"}}'::jsonb))->>'externo_id', 'orga-1',
  'importar de novo devolve o mesmo pedido');
select is((select count(*)::int from public.requests where externo_id = 'orga-1'), 1, 'sem duplicar');
select is((select created_at::date from public.requests where externo_id = 'orga-1'), '2026-10-20'::date, 'mantém a data de origem');
reset role;
update public.sistema_integracoes set importacao_ate = now() - interval '1 minute';
set local role service_role;
select throws_ok($$select public._sis_pedido_criar('60000000-0000-0000-0000-000000000001',
  '{"titulo": "Tarde demais", "externo_id": "orga-2", "situacao": "em_analise", "solicitante": {"nome": "A"}}'::jsonb)$$,
  'situacao_invalida', 'passada a janela da importação, não aceita situação');
select isnt((public._sis_pedido_criar('60000000-0000-0000-0000-000000000001',
  '{"titulo": "Datado para trás", "externo_id": "orga-3", "criado_em": "2026-01-01T00:00:00Z", "solicitante": {"nome": "A"}}'::jsonb))->>'criado_em',
  null, 'cria o pedido');
select ok((select created_at > now() - interval '1 minute' from public.requests where externo_id = 'orga-3'),
  'passada a janela, ignora a data de origem');

-- Conversa, prints, lista e detalhe
select is((public._sis_mensagem('60000000-0000-0000-0000-000000000001', (select (r->>'id')::uuid from p1),
  '{"autor_nome": "Cleyde", "texto": "Aconteceu de novo hoje."}'::jsonb))->>'autor', 'cliente', 'cliente comenta');
select lives_ok($$select public._sis_anexo('60000000-0000-0000-0000-000000000001', (select (r->>'id')::uuid from p1),
  '10000000-0000-0000-0000-000000000001/' || (select r->>'id' from p1) || '/70000000-0000-0000-0000-000000000001.png', 'image/png', 1000)$$,
  'print registrado');
select throws_ok($$select public._sis_anexo('60000000-0000-0000-0000-000000000001', (select (r->>'id')::uuid from p1),
  '10000000-0000-0000-0000-000000000002/' || (select r->>'id' from p1) || '/70000000-0000-0000-0000-000000000002.png', 'image/png', 1000)$$,
  'caminho_invalido', 'print fora da pasta do pedido: recusado');
select is(jsonb_array_length(public._sis_pedidos('60000000-0000-0000-0000-000000000001')), 3, 'lista os pedidos do sistema');
select is(jsonb_array_length(public._sis_pedidos('60000000-0000-0000-0000-000000000009')), 0, 'outro sistema não vê');
select throws_ok($$select public._sis_pedido('60000000-0000-0000-0000-000000000009', (select (r->>'id')::uuid from p1))$$,
  'PT404', null, 'detalhe só do próprio sistema (404)');
reset role;

-- Dono responde; resposta aparece no detalhe que o sistema lê
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select is((public.pedido_mensagem_enviar((select (r->>'id')::uuid from p1), 'Já estou vendo.')).autor_nome, 'Yuri', 'dono responde com o primeiro nome');
select is((select count(*)::int from public.request_mensagens), 2, 'dono lê a conversa');
-- Cliente do portal não lê a conversa direto
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.request_mensagens), 0, 'cliente não lê a tabela');
reset role;
set local role service_role;
select is(jsonb_array_length(public._sis_pedido('60000000-0000-0000-0000-000000000001', (select (r->>'id')::uuid from p1))->'conversa'), 2,
  'o sistema vê a conversa com a resposta');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select lives_ok($$select public.sistema_chave_revogar('60000000-0000-0000-0000-000000000001')$$, 'dono desliga');
reset role;
set local role service_role;
select is(public._sis_por_chave((select r->>'chave' from k)), null, 'chave revogada para de valer na hora');

select * from finish();
rollback;
