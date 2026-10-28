-- CMS-1: banco de conteúdo dos sites. Importação idempotente, RLS e isolamento entre tenants,
-- validações das RPCs, eventos, leitura pública só do publicado, bucket site-midia.
begin;
create extension if not exists pgtap with schema extensions;
select plan(57);

-- ===== Importação (migração gerada por scripts/importar-site.ts) =====
select is((select count(*) from public.site_artigos a join public.sites s on s.id = a.site_id
            where s.dominio = 'www.foradopapel.com.br' and a.situacao = 'publicado')::int, 10,
  'Importação gravou os 10 artigos do site como publicados');
select is((select corpo -> 'pontos' ->> 0 from public.site_artigos where slug = 'da-dor-a-solucao-digital') is not null, true,
  'Corpo importado no formato do site');
select lives_ok($$ select public._site_importar_artigo('foradopapel.com.br', to_jsonb(a)) from public.site_artigos a $$,
  'Importar de novo (domínio sem www) não falha');
select is((select count(*) from public.site_artigos)::int, 10, 'Importar de novo não duplica');
select is((select count(*) from public.event_outbox where event like 'site.%')::int, 0, 'Importação não gera evento');

-- ===== Cenário =====
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra-agencia@test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@sorriso.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Agência', 'outra-agencia');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso Leve', 'Paula', '79900000001');
insert into public.client_members (client_id, user_id, tenant_id) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001');
insert into public.sites (id, tenant_id, client_id, nome, dominio) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, 'Fora do Papel', 'www.foradopapel.com.br'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', null, 'Outra', 'outra.test');

select throws_ok($$ insert into public.sites (tenant_id, nome, dominio)
                    values ('10000000-0000-0000-0000-000000000002', 'Cópia', 'foradopapel.com.br') $$,
  '23505', null, 'Mesmo domínio com ou sem www é recusado');
select throws_ok($$ insert into public.sites (tenant_id, client_id, nome, dominio)
                    values ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'X', 'x.test') $$,
  'P0001', null, 'Site não aponta para cliente de outro tenant');

select is((select array[public::text, file_size_limit::text, array_to_string(allowed_mime_types, ',')]
             from storage.buckets where id = 'site-midia'),
  array['true', '2097152', 'image/jpeg,image/png,image/webp'], 'Bucket site-midia público, 2 MB, jpg/png/webp');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

-- Corpo de exemplo (formato ConteudoArtigo)
create temp table c (nome text primary key, corpo jsonb);
grant all on c to authenticated, anon;
insert into c values
  ('ok', '{"pontos": ["Um.", "Dois.", "Três."], "secoes": [{"id": "s1", "titulo": "Começo",
           "blocos": ["Texto com [link](/contato) e **destaque**.", {"lista": ["a", "b"]}, {"passos": ["1", "2"]},
                      {"dica": "Dica."}, {"exemplo": {"titulo": "Exemplo", "texto": "Texto."}}]}]}'),
  ('dois_pontos', '{"pontos": ["Um.", "Dois."], "secoes": []}'),
  ('bloco_ruim', '{"pontos": ["a", "b", "c"], "secoes": [{"id": "s1", "titulo": "T", "blocos": [{"tabela": []}]}]}'),
  ('marcador', '{"pontos": ["Custa [PREÇO] por mês.", "Dois.", "Três."], "secoes": [{"id": "s1", "titulo": "T", "blocos": ["x"]}]}');

-- ===== Visitante anônimo =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select count(*) from public.site_artigos $$, '42501', null, 'Anônimo não lê a tabela de artigos');
select throws_ok($$ select count(*) from public.sites $$, '42501', null, 'Anônimo não lê a tabela de sites');
select throws_ok($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', '{}') $$,
  '42501', null, 'Anônimo não executa RPC de edição');
select is(public.site_publico_artigos('www.foradopapel.com.br'), '[]'::jsonb, 'Sem nada publicado, a lista pública vem vazia');
reset role;

select is((select array_agg(p.proname::text order by p.proname) from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.proname ~ '^_?site_'
              and has_function_privilege('anon', p.oid, 'execute')),
  array['site_publico_artigo', 'site_publico_artigos', 'site_publico_blocos', 'site_publico_pagina',
        'site_registrar_contato'],
  'Anônimo só executa as RPCs públicas do site (e o contato do SITE-1)');
select is(has_function_privilege('authenticated', 'public._site_importar_artigo(text, jsonb)', 'execute'), false,
  'Importação não é executável pelo app');

-- ===== Yuri (dono, sessão forte) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

insert into t select 'rasc', public.site_artigo_salvar('70000000-0000-0000-0000-000000000001',
  jsonb_build_object('slug', 'artigo-novo', 'categoria', 'Organização', 'titulo', 'Artigo novo'));
select is((select valor ->> 'situacao' from t where chave = 'rasc'), 'rascunho', 'Artigo novo nasce rascunho');
select is((select count(*) from public.event_outbox where event = 'site.artigo_salvo')::int, 1, 'Salvar grava evento');

select throws_ok($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001',
  '{"slug": "Com Espaço", "categoria": "X1", "titulo": "Título"}') $$, '22023', 'slug_invalido', 'Slug fora do padrão');
select throws_ok($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001',
  '{"slug": "ab", "categoria": "X1", "titulo": "Título"}') $$, '22023', 'slug_invalido', 'Slug curto demais');
select throws_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('slug', 'seo-longo', 'categoria', 'X1', 'titulo', 'Título', 'titulo_seo', repeat('a', 61))),
  '22023', 'titulo_seo_longo', 'Título SEO acima de 60');
select throws_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('slug', 'desc-longa', 'categoria', 'X1', 'titulo', 'Título', 'descricao', repeat('a', 156))),
  '22023', 'descricao_longa', 'Descrição acima de 155');
select throws_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('slug', 'dois-pontos', 'categoria', 'X1', 'titulo', 'Título', 'corpo', (select corpo from c where nome = 'dois_pontos'))),
  '22023', 'corpo_invalido', 'Pontos precisam ser exatamente 3');
select throws_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('slug', 'bloco-ruim', 'categoria', 'X1', 'titulo', 'Título', 'corpo', (select corpo from c where nome = 'bloco_ruim'))),
  '22023', 'corpo_invalido', 'Bloco fora do formato do site é recusado');
select throws_ok($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001',
  '{"slug": "artigo-novo", "categoria": "X1", "titulo": "Outro"}') $$, '23505', 'slug_em_uso', 'Slug repetido no mesmo site');

-- Rascunho com marcador é aceito; publicar não
select lives_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('id', (select valor ->> 'id' from t where chave = 'rasc'), 'titulo_seo', 'Artigo novo', 'descricao', 'Descrição.',
    'resumo', 'Resumo.', 'corpo', (select corpo from c where nome = 'marcador'))),
  'Rascunho aceita marcador pendente');
select throws_ok(format($$ select public.site_artigo_publicar(%L) $$, (select valor ->> 'id' from t where chave = 'rasc')),
  '22023', 'marcador_pendente', 'Publicar com marcador [PREÇO] é recusado');
select throws_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('id', (select valor ->> 'id' from t where chave = 'rasc'), 'atualizado_em', '2020-01-01T00:00:00Z')),
  '40001', 'artigo_alterado', 'Versão antiga não sobrescreve a mais nova');

select lives_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('id', (select valor ->> 'id' from t where chave = 'rasc'), 'corpo', (select corpo from c where nome = 'ok'))),
  'Corpo com todos os tipos de bloco é aceito');

-- Leitura pública ignora rascunho
select is(public.site_publico_artigo('www.foradopapel.com.br', 'artigo-novo'), null, 'Rascunho não aparece na leitura pública');

insert into t select 'pub', public.site_artigo_publicar((select (valor ->> 'id')::uuid from t where chave = 'rasc'));
select is((select valor ->> 'situacao' from t where chave = 'pub'), 'publicado', 'Artigo publicado');
select isnt((select valor ->> 'publicado_em' from t where chave = 'pub'), null, 'Publicar grava a data');
select is((select payload ->> 'slug' from public.event_outbox where event = 'site.artigo_publicado'), 'artigo-novo',
  'Publicar grava evento com o slug');
select throws_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('id', (select valor ->> 'id' from t where chave = 'rasc'), 'resumo', 'Agora com [VALOR].')),
  '22023', 'marcador_pendente', 'Artigo no ar não recebe marcador ao salvar');
select throws_ok(format($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001', %L) $$,
  jsonb_build_object('id', (select valor ->> 'id' from t where chave = 'rasc'), 'slug', 'outro-endereco')),
  '22023', 'slug_publicado', 'Endereço não muda depois de publicado');
select throws_ok($$ update public.site_artigos set titulo = 'Direto' $$, '42501', null, 'Dono não altera a tabela direto');
select throws_ok($$ insert into public.site_blocos (site_id, tenant_id, chave, valor)
                    values ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'x', '{}') $$,
  '42501', null, 'Dono não grava bloco direto');

-- Blocos
select is((public.site_bloco_salvar('70000000-0000-0000-0000-000000000001', 'quem-somos',
  '{"titulo": "Quem somos", "texto": "Equipe pequena."}')) ->> 'situacao', 'rascunho', 'Bloco novo nasce rascunho');
select throws_ok($$ select public.site_bloco_salvar('70000000-0000-0000-0000-000000000001', 'Chave Ruim!', '{}') $$,
  '22023', 'chave_invalida', 'Chave do bloco fora do padrão');
select lives_ok($$ select public.site_bloco_salvar('70000000-0000-0000-0000-000000000001', 'inicio.topo',
  '{"linha": "Linha", "titulo": "[TÍTULO]", "apoio": "Apoio.", "link_sites": "Sites"}') $$,
  'Bloco em rascunho aceita marcador');
select throws_ok($$ select public.site_bloco_publicar('70000000-0000-0000-0000-000000000001', 'inicio.topo') $$,
  '22023', 'marcador_pendente', 'Bloco com marcador não é publicado');
select lives_ok($$ select public.site_bloco_publicar('70000000-0000-0000-0000-000000000001', 'quem-somos') $$, 'Publica o bloco');
select is((select count(*) from public.event_outbox where event in ('site.bloco_salvo', 'site.bloco_publicado'))::int, 3,
  'Salvar e publicar bloco gravam evento');

-- Storage
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('site-midia', '70000000-0000-0000-0000-000000000001/capa.webp') $$,
  'Dono envia imagem na pasta do próprio site');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('site-midia', '70000000-0000-0000-0000-000000000001/logo.svg') $$,
  '42501', null, 'SVG é recusado');

-- Sessão sem o código do app
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.site_bloco_salvar('70000000-0000-0000-0000-000000000001', 'perguntas', '[]') $$,
  '42501', 'precisa_codigo', 'Sem sessão forte o dono não edita');
select is((select count(*) from public.site_artigos)::int, 0, 'Sem sessão forte o dono não lê');

-- ===== Outra agência =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.site_artigos)::int + (select count(*) from public.site_blocos)::int, 0,
  'Outra agência não lê artigos nem blocos');
select throws_ok($$ select public.site_artigo_salvar('70000000-0000-0000-0000-000000000001',
  '{"slug": "invasao", "categoria": "X1", "titulo": "Invasão"}') $$, 'P0002', 'site_inexistente', 'Outra agência não grava no site alheio');
select throws_ok(format($$ select public.site_artigo_arquivar(%L) $$, (select valor ->> 'id' from t where chave = 'rasc')),
  'P0002', 'artigo_inexistente', 'Outra agência não arquiva artigo alheio');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('site-midia', '70000000-0000-0000-0000-000000000001/x.png') $$,
  '42501', null, 'Outra agência não envia imagem para o site alheio');
select lives_ok($$ select public.site_artigo_publicar((public.site_artigo_salvar('70000000-0000-0000-0000-000000000002',
  jsonb_build_object('slug', 'da-outra', 'categoria', 'X1', 'titulo', 'Da outra', 'titulo_seo', 'Da outra', 'descricao', 'D.',
    'resumo', 'R.', 'corpo', (select corpo from c where nome = 'ok'))) ->> 'id')::uuid) $$,
  'Outra agência publica no próprio site');

-- ===== Cliente do tenant =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.sites)::int, 0, 'Cliente do portal não lê os sites');

-- ===== Leitura pública depois de publicar =====
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select array_agg(e ->> 'slug') from jsonb_array_elements(public.site_publico_artigos('foradopapel.com.br')) e),
  array['artigo-novo'], 'Lista pública só com o publicado do domínio pedido');
select is((select bool_or(e ? 'corpo') from jsonb_array_elements(public.site_publico_artigos('www.foradopapel.com.br')) e), false,
  'Lista pública vem sem corpo');
select is(jsonb_array_length(public.site_publico_artigo('WWW.foradopapel.com.br', 'artigo-novo') -> 'corpo' -> 'pontos'), 3,
  'Artigo público vem com corpo');
select is(public.site_publico_blocos('www.foradopapel.com.br'), '{"quem-somos": {"titulo": "Quem somos", "texto": "Equipe pequena."}}'::jsonb,
  'Blocos públicos só com o publicado');
reset role;

-- Arquivar tira do ar
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select is((public.site_artigo_arquivar((select (valor ->> 'id')::uuid from t where chave = 'rasc'))) ->> 'situacao', 'arquivado',
  'Arquivar muda a situação e grava evento');
reset role;
select is(public.site_publico_artigos('www.foradopapel.com.br'), '[]'::jsonb, 'Arquivado sai da lista pública');

select * from finish();
rollback;
