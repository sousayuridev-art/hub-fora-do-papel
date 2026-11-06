-- RS-1: revisar o site pelo portal. Rascunho fora do Hub, envio em lote com um aviso só,
-- "Ficou bom" / "Quero outra mudança" com limite, aprovação só do responsável e revisões incluídas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'maria@rocha.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'equipe@rocha.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'joao@clinica.test');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'Maria Rocha'), ('00000000-0000-0000-0000-0000000000c2', 'Bia Santos')
  on conflict (id) do update set full_name = excluded.full_name;
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Rocha Móveis', 'Maria', '79900000020'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Clínica Sol', 'João', '79900000021');
insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel', true),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001', 'equipe', false),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-000000000001', 'responsavel', true);
insert into public.projects (id, tenant_id, client_id, name, status) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Site novo', 'andamento');
insert into public.sites (id, tenant_id, client_id, nome, dominio) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Site da Rocha', 'rocha.test'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Site da Clínica', 'clinicasol.test');
insert into public.site_paginas (id, site_id, tenant_id, nome, caminho) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Página inicial', '/'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Início da clínica', '/');
insert into public.materials (id, tenant_id, client_id, category, kind, origin, title, storage_path, file_name,
                              mime_type, size_bytes, uploaded_by, ready_at) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'cliente', 'arquivo', 'cliente', 'Foto nova', 'x/1/cozinha.jpg', 'cozinha.jpg', 'image/jpeg', 300000,
   '00000000-0000-0000-0000-0000000000c2', now()),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'cliente', 'arquivo', 'cliente', 'Áudio', 'x/2/audio.webm', 'audio.webm', 'audio/webm', 80000,
   '00000000-0000-0000-0000-0000000000c2', now());
create temp table ids (nome text primary key, id uuid);
grant all on ids to authenticated;

-- ===== Equipe marca três ajustes =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
insert into ids select 'a1', (public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001',
  '{"tipo":"texto","pagina_id":"31000000-0000-0000-0000-000000000001","secao_id":"Capa-1","secao":"Capa",
    "posicao":{"x":0.4,"y":0.2},"antes":"Móveis sob medida","depois":"Móveis sob medida para casas e apartamentos"}'::jsonb)->>'id')::uuid;
insert into ids select 'a2', (public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001',
  '{"tipo":"foto","pagina_id":"31000000-0000-0000-0000-000000000001","secao":"O que fazemos",
    "foto_id":"40000000-0000-0000-0000-000000000001","audio_id":"40000000-0000-0000-0000-000000000002"}'::jsonb)->>'id')::uuid;
insert into ids select 'a3', (public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001',
  '{"tipo":"mover","pagina":"Contato","secao":"Rodapé","observacao":"Levar o WhatsApp para o topo"}'::jsonb)->>'id')::uuid;
select is(jsonb_array_length(public.portal_revisao('30000000-0000-0000-0000-000000000001')->'rascunho'->'itens'), 3,
  'rascunho com 3 ajustes');
select is((public.portal_revisao('30000000-0000-0000-0000-000000000001')->'rascunho'->>'numero')::int, 1, 'é a revisão 1');
select is((public.portal_revisao('30000000-0000-0000-0000-000000000001')#>>'{rascunho,itens,0,posicao,x}')::numeric, 0.4,
  'posição em porcentagem da seção');
select throws_ok($$select public.portal_revisao_salvar('30000000-0000-0000-0000-000000000002', '{"tipo":"texto","pagina":"X","depois":"y"}'::jsonb)$$,
  '42501', null, 'site de outra empresa: recusado');
select throws_ok($$select public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001',
  '{"tipo":"texto","pagina_id":"31000000-0000-0000-0000-000000000002","depois":"y"}'::jsonb)$$,
  '42501', null, 'página de outro site: recusada');
select throws_ok($$select public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001', '{"tipo":"virar","pagina":"X","depois":"y"}'::jsonb)$$,
  'ajuste_invalido', 'tipo fora da lista: recusado');
select throws_ok($$select public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001', '{"tipo":"texto","pagina":"X"}'::jsonb)$$,
  'ajuste_invalido', 'ajuste sem dizer o que fazer: recusado');
reset role;
select is((select count(*)::int from public.requests where origin = 'revisao'), 0, 'rascunho não aparece em Pedidos de ajuste');

-- ===== Responsável tira um ajuste da equipe; outro cliente não mexe =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.portal_revisao_tirar((select id from ids where nome = 'a3'))$$,
  'P0002', null, 'outra empresa não tira ajuste');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$select public.portal_revisao_tirar((select id from ids where nome = 'a3'))$$, 'responsável tira ajuste da equipe');
select lives_ok($$select public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001',
  jsonb_build_object('id', (select id from ids where nome = 'a2'), 'tipo', 'foto', 'pagina', 'Página inicial',
    'secao', 'O que fazemos', 'observacao', 'Foto mais clara', 'foto_id', '40000000-0000-0000-0000-000000000001'))$$,
  'responsável edita o ajuste da equipe mantendo a foto dela');
select throws_ok($$select public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001',
  '{"tipo":"foto","pagina":"Página inicial","foto_id":"40000000-0000-0000-0000-000000000001"}'::jsonb)$$,
  'anexo_invalido', 'foto enviada por outra pessoa não entra em ajuste novo');

-- ===== Enviar =====
reset role;
create temp table antes_eventos as select count(*)::int n from public.event_outbox;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select is((public.portal_revisao_enviar((select (public.portal_revisao('30000000-0000-0000-0000-000000000001')#>>'{rascunho,id}')::uuid))->>'ajustes')::int,
  2, 'envia 2 ajustes');
select is((select count(*)::int from public.site_rodadas), 0, 'cliente não lê a tabela de revisões direto');
reset role;
select is((select count(*)::int from public.requests where origin = 'revisao' and rodada_id is not null), 2, 'viram 2 pedidos de ajuste');
select is((select count(*)::int from public.event_outbox) - (select n from antes_eventos), 1, 'um aviso só para o n8n');
select is((select event from public.event_outbox order by id desc limit 1), 'revisao.enviada', 'aviso revisao.enviada');
select is((select request_id from public.materials where id = '40000000-0000-0000-0000-000000000001'),
  (select id from public.requests where marcador_ordem = 2 and origin = 'revisao'), 'foto nova ligada ao pedido');
select is((select contexto->>'antes' from public.requests where marcador_ordem = 1 and origin = 'revisao'),
  'Móveis sob medida', 'pedido guarda o antes');
select is((select count(*)::int from public.site_marcadores), 0, 'rascunho esvaziado');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select is(public.portal_revisao('30000000-0000-0000-0000-000000000001')#>>'{rodadas,0,ajustes,0,situacao}', 'enviado', 'cliente vê "enviado"');

-- ===== Equipe não aprova; com ajuste aberto ninguém aprova =====
select throws_ok($$select public.portal_revisao_aprovar('30000000-0000-0000-0000-000000000001', array[true,true,true])$$,
  'so_responsavel', 'equipe não aprova o site');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.portal_revisao_aprovar('30000000-0000-0000-0000-000000000001', array[true,true])$$,
  'confirmacoes_obrigatorias', 'sem as três confirmações: recusado');
select throws_ok($$select public.portal_revisao_aprovar('30000000-0000-0000-0000-000000000001', array[true,true,true])$$,
  'ajustes_em_aberto', 'com ajuste em aberto: recusado');

-- ===== Yuri entrega; cliente confere =====
reset role;
update public.requests set status = 'pronto', done_at = now() where origin = 'revisao';
insert into ids select 'p' || marcador_ordem, id from public.requests where origin = 'revisao';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select is((public.portal_pendencias()->>'site')::int, 2, 'selo Meu site: 2 para ver');
select lives_ok($$select public.portal_revisao_ficou_bom((select id from ids where nome = 'p1'))$$,
  'equipe diz "Ficou bom"');
select is((public.portal_revisao_outra_mudanca((select id from ids where nome = 'p2'),
  'A foto ficou escura')->>'vez')::int, 1, '"Quero outra mudança" volta para fazendo');
reset role;
update public.requests set status = 'pronto' where marcador_ordem = 2 and origin = 'revisao';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$select public.portal_revisao_outra_mudanca((select id from ids where nome = 'p2'), 'Ainda escura')$$,
  'segunda vez ainda pode');
reset role;
update public.requests set status = 'pronto' where marcador_ordem = 2 and origin = 'revisao';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.portal_revisao_outra_mudanca((select id from ids where nome = 'p2'), 'De novo')$$,
  'limite_refacao', 'terceira vez: limite');
select lives_ok($$select public.portal_revisao_ficou_bom((select id from ids where nome = 'p2'))$$,
  'e depois "Ficou bom"');

-- ===== Responsável aprova; revisão fecha =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((public.portal_revisao_aprovar('30000000-0000-0000-0000-000000000001', array[true,true,true])->>'repetido')::boolean, false,
  'responsável aprova o site');
reset role;
select is((select count(*)::int from public.approvals where title = 'Aprovação final do site' and status = 'aprovada'), 1,
  'fica no histórico de Aprovações');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001', '{"tipo":"texto","pagina":"X","depois":"y"}'::jsonb)$$,
  'revisao_encerrada', 'depois de aprovado, a revisão fecha');
reset role;

-- ===== Da 3ª revisão em diante: provável serviço adicional =====
update public.sites set revisao_aprovada_em = null where id = '30000000-0000-0000-0000-000000000001';
insert into public.site_rodadas (tenant_id, site_id, client_id, numero, situacao, enviada_em)
values ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 2, 'enviada', now());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select public.portal_revisao_salvar('30000000-0000-0000-0000-000000000001', '{"tipo":"incluir","pagina":"Página inicial","depois":"Uma seção de depoimentos"}'::jsonb);
select public.portal_revisao_enviar((select (public.portal_revisao('30000000-0000-0000-0000-000000000001')#>>'{rascunho,id}')::uuid));
reset role;
select is((select (contexto->>'provavel_adicional')::boolean from public.requests where contexto->>'revisao' = '3'), true,
  'revisão 3 marcada como provável serviço adicional');

select * from finish();
rollback;
