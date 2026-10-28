-- PC-3: artigos e fotos pelo cliente. Responsável e equipe publicam no site da própria empresa;
-- outra empresa e outro tenant são recusados; módulo não contratado é recusado pelo banco;
-- foto em uso não sai; leitura pública só do domínio certo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@clinica.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'equipe@clinica.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'marina@plamev.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sol', 'Paula', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Marina', '79900000002');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001', 'equipe'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-000000000001', 'responsavel');
insert into public.sites (id, tenant_id, client_id, nome, dominio, modulos) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Site da Clínica', 'clinicasol.test', '{paginas,artigos}'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'Site da Plamev', 'plamev.test', '{paginas}'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', null, 'Site da Outra', 'outra.test', '{paginas,artigos}');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;
create temp table artigo (dados jsonb);
grant all on artigo to authenticated;
insert into artigo values (jsonb_build_object('slug', 'horario-de-verao', 'categoria', 'Novidades', 'titulo', 'Horário de verão',
  'titulo_seo', 'Horário de verão da Clínica', 'descricao', 'Novo horário de atendimento.', 'resumo', 'Mudamos o horário.',
  'corpo', '{"pontos": ["Um.", "Dois.", "Três."], "secoes": [{"id": "s1", "titulo": "Começo", "blocos": ["Texto."]}]}'::jsonb));

select has_function('public', 'pode_editar_site', array['uuid', 'text'], 'Função pode_editar_site existe');

-- ===== Responsável da Clínica =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select ok(public.pode_editar_site('30000000-0000-0000-0000-000000000001', 'artigos'), 'Responsável pode editar o site da empresa');
select ok(not public.pode_editar_site('30000000-0000-0000-0000-000000000002'), 'Responsável não pode editar o site de outra empresa');
insert into t select 'rasc', public.site_artigo_salvar('30000000-0000-0000-0000-000000000001',
  jsonb_build_object('slug', 'rascunho', 'categoria', 'Novidades', 'titulo', 'Rascunho da Clínica'));
select is((select valor ->> 'situacao' from t where chave = 'rasc'), 'rascunho', 'Responsável cria artigo (rascunho)');
insert into t select 'pub', public.site_artigo_publicar((public.site_artigo_salvar('30000000-0000-0000-0000-000000000001',
  (select dados from artigo)) ->> 'id')::uuid);
select is((select valor ->> 'situacao' from t where chave = 'pub'), 'publicado', 'Responsável publica');
select is((select count(*)::int from public.site_artigos), 2, 'Responsável lê os artigos do próprio site');
select throws_ok($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000002',
  '{"slug": "invasao", "categoria": "X1", "titulo": "Invasão"}') $$, 'P0002', 'site_inexistente',
  'Responsável não grava no site de outra empresa');
select throws_ok($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000003',
  '{"slug": "invasao", "categoria": "X1", "titulo": "Invasão"}') $$, 'P0002', 'site_inexistente',
  'Responsável não grava no site de outro tenant');
select throws_ok($$ select public.site_bloco_salvar('30000000-0000-0000-0000-000000000001', 'perguntas', '[]') $$,
  '42501', null, 'Blocos do CMS-4 continuam só do dono');

-- Fotos
select lives_ok($$ insert into storage.objects (bucket_id, name, metadata)
  values ('site-midia', '30000000-0000-0000-0000-000000000001/fachada.webp', '{"size": 120000}') $$,
  'Responsável envia foto para a pasta do site');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('site-midia', '30000000-0000-0000-0000-000000000002/foto.webp') $$, '42501', null,
  'Responsável não envia foto para o site de outra empresa');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('site-midia', '30000000-0000-0000-0000-000000000001/logo.svg') $$, '42501', null, 'SVG é recusado');
select lives_ok($$ select public.site_midia_enviada('30000000-0000-0000-0000-000000000001/fachada.webp') $$, 'Registra o envio');
select is((public.site_midia_descrever('30000000-0000-0000-0000-000000000001/fachada.webp', '  Fachada da clínica  ')) ->> 'descricao',
  'Fachada da clínica', 'Descreve a foto');
-- Usa a foto como capa
select lives_ok(format($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('id', (select valor ->> 'id' from t where chave = 'pub'),
    'capa', 'https://cjzzbpqwlpjvlawllfqy.supabase.co/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000001/fachada.webp')),
  'Usa a foto na capa do artigo');
select is((select (e -> 'usos' -> 0 ->> 'nome') || ' / ' || (e ->> 'descricao')
             from jsonb_array_elements(public.site_midia_lista('30000000-0000-0000-0000-000000000001')) e),
  'Horário de verão / Fachada da clínica', 'Lista mostra onde a foto é usada e a descrição');
select ok(not public._site_midia_pode_apagar_cliente('30000000-0000-0000-0000-000000000001/fachada.webp'),
  'Foto em uso não pode ser apagada pelo cliente');
reset role;

-- ===== Equipe da Clínica também publica =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select throws_ok(format($$ select public.site_artigo_publicar(%L) $$, (select valor ->> 'id' from t where chave = 'rasc')),
  '22023', 'falta_seo', 'Equipe chega à validação de publicação (sem SEO, recusa)');
select lives_ok($$ select public.site_artigo_arquivar((select (valor ->> 'id')::uuid from t where chave = 'pub')) $$,
  'Equipe arquiva');
select lives_ok($$ select public.site_artigo_publicar((select (valor ->> 'id')::uuid from t where chave = 'pub')) $$,
  'Equipe publica de novo');
select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('site-midia', '30000000-0000-0000-0000-000000000001/sobra.png') $$, 'Equipe envia foto');
select ok(public._site_midia_pode_apagar_cliente('30000000-0000-0000-0000-000000000001/sobra.png'),
  'Foto sem uso pode ser apagada');
reset role;

-- ===== Plamev (sem módulo de artigos) e dona de outro tenant =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000002',
  '{"slug": "novo", "categoria": "X1", "titulo": "Novo artigo"}') $$, '42501', 'modulo_nao_contratado',
  'Sem o módulo de artigos, o banco recusa');
select is((select count(*)::int from public.site_artigos), 0, 'Plamev não lê artigos da Clínica');
select throws_ok(format($$ select public.site_artigo_arquivar(%L) $$, (select valor ->> 'id' from t where chave = 'pub')),
  'P0002', 'artigo_inexistente', 'Plamev não arquiva artigo da Clínica');
select throws_ok($$ select public.site_midia_lista('30000000-0000-0000-0000-000000000001') $$, 'P0002', 'site_inexistente',
  'Plamev não lista as fotos da Clínica');
select ok(public.pode_editar_site('30000000-0000-0000-0000-000000000002'), 'Plamev edita fotos do próprio site (sem módulo)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.site_artigos where site_id = '30000000-0000-0000-0000-000000000001'), 0,
  'Dona de outro tenant não lê');
reset role;

-- ===== Yuri (dono) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000001',
  '{"slug": "do-yuri", "categoria": "X1", "titulo": "Do Yuri"}') $$, '42501', 'precisa_codigo', 'Dono sem o código do app não edita');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select lives_ok($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000002',
  '{"slug": "do-yuri", "categoria": "Novidades", "titulo": "Do Yuri"}') $$, 'Dono edita mesmo sem o módulo contratado');
reset role;

select is((select payload ->> 'quem' from public.event_outbox where event = 'site.artigo_publicado' order by id limit 1), 'cliente',
  'Evento diz que foi a pessoa do portal');

-- ===== Leitura pública =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select array_agg(e ->> 'slug') from jsonb_array_elements(public.site_publico_artigos('clinicasol.test')) e),
  array['horario-de-verao'], 'Artigo publicado aparece no site da Clínica');
select is(public.site_publico_artigos('plamev.test'), '[]'::jsonb, 'E não aparece no site de outra empresa');
reset role;

select * from finish();
rollback;
