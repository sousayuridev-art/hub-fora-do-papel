-- PC-4: páginas editadas na própria página. Dono cria e publica; cliente edita rascunho e publica
-- com seções permitidas, travadas no lugar e sem marcador; conflito de versão; isolamento; leitura pública.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@clinica.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'equipe@clinica.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'marina@plamev.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
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
   'Site da Clínica', 'clinicasol.test', '{paginas}'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'Site da Plamev', 'plamev.test', '{artigos}');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated;
-- Página: capa (livre) + rodapé (travado)
insert into t values ('pagina', '{"root": {"props": {"title": "Início"}}, "content": [
  {"type": "Capa", "props": {"id": "capa-1", "titulo": "Sorrisos leves", "foto": ""}},
  {"type": "Rodape", "props": {"id": "rodape-1", "nome": "Clínica Sol"}}]}');

-- ===== Yuri cria a página, define seções e publica a primeira vez =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.site_pagina_criar('30000000-0000-0000-0000-000000000001', 'Início', 'Início', null) $$,
  '22023', 'caminho_invalido', 'Endereço precisa ser /algo');
insert into t select 'criada', public.site_pagina_criar('30000000-0000-0000-0000-000000000001', 'Página inicial', '/',
  (select valor from t where chave = 'pagina'));
select is((select valor ->> 'versao' from t where chave = 'criada'), '1', 'Página nasce na versão 1');
select throws_ok($$ select public.site_pagina_criar('30000000-0000-0000-0000-000000000001', 'Outra', '/', null) $$,
  '23505', 'caminho_em_uso', 'Mesmo endereço no mesmo site é recusado');
select is(jsonb_array_length(public.site_secoes_definir('30000000-0000-0000-0000-000000000001',
  '[{"tipo": "Capa"}, {"tipo": "Perguntas"}, {"tipo": "Rodape", "travada": true}]')), 3, 'Define 3 seções, uma travada');
select lives_ok(format($$ select public.site_pagina_publicar(%L) $$, (select valor ->> 'id' from t where chave = 'criada')),
  'Yuri publica a primeira versão');
reset role;

-- ===== Responsável da Clínica =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.site_paginas), 1, 'Responsável lê a página do próprio site');
select throws_ok($$ select public.site_pagina_criar('30000000-0000-0000-0000-000000000001', 'Nova', '/nova', null) $$,
  '42501', null, 'Cliente não cria página (vai por pedido de ajuste)');
select throws_ok($$ select public.site_secoes_definir('30000000-0000-0000-0000-000000000001', '[]') $$,
  '42501', null, 'Cliente não muda as seções permitidas');

-- Troca o título e a foto da capa, salva e publica
insert into t select 'v2', public.site_pagina_salvar_rascunho((select (valor ->> 'id')::uuid from t where chave = 'criada'),
  jsonb_set(jsonb_set((select valor from t where chave = 'pagina'), '{content,0,props,titulo}', '"Sorrisos leves o ano todo"'),
            '{content,0,props,foto}', '"https://abc.supabase.co/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000001/capa.webp"'),
  1);
select is((select valor ->> 'versao' from t where chave = 'v2'), '2', 'Rascunho salvo sobe a versão');
select throws_ok(format($$ select public.site_pagina_salvar_rascunho(%L, %L, 1) $$,
  (select valor ->> 'id' from t where chave = 'criada'), (select valor from t where chave = 'pagina')),
  '40001', 'pagina_alterada', 'Versão antiga é recusada (outra pessoa editou)');
select lives_ok(format($$ select public.site_pagina_publicar(%L) $$, (select valor ->> 'id' from t where chave = 'criada')),
  'Responsável publica');

-- Seção não permitida (chamada direta)
select lives_ok(format($$ select public.site_pagina_salvar_rascunho(%L, %L, 2) $$,
  (select valor ->> 'id' from t where chave = 'criada'),
  jsonb_set((select valor from t where chave = 'pagina'), '{content}',
    ((select valor -> 'content' from t where chave = 'pagina') || '[{"type": "Loja", "props": {"id": "loja-1"}}]'::jsonb))),
  'Rascunho aceita salvar (a regra vale na publicação)');
select throws_ok(format($$ select public.site_pagina_publicar(%L) $$, (select valor ->> 'id' from t where chave = 'criada')),
  '42501', 'secao_nao_permitida', 'Publicar com seção não permitida é recusado');

-- Remover a seção travada
select lives_ok(format($$ select public.site_pagina_salvar_rascunho(%L, %L, 3) $$,
  (select valor ->> 'id' from t where chave = 'criada'),
  jsonb_set((select valor from t where chave = 'pagina'), '{content}', jsonb_build_array((select valor -> 'content' -> 0 from t where chave = 'pagina')))),
  'Salva sem o rodapé');
select throws_ok(format($$ select public.site_pagina_publicar(%L) $$, (select valor ->> 'id' from t where chave = 'criada')),
  '42501', 'secao_travada', 'Remover a seção travada é recusado');

-- Mover a seção travada (rodapé para cima)
select lives_ok(format($$ select public.site_pagina_salvar_rascunho(%L, %L, 4) $$,
  (select valor ->> 'id' from t where chave = 'criada'),
  jsonb_set((select valor from t where chave = 'pagina'), '{content}', jsonb_build_array(
    (select valor -> 'content' -> 1 from t where chave = 'pagina'), (select valor -> 'content' -> 0 from t where chave = 'pagina')))),
  'Salva com o rodapé em cima');
select throws_ok(format($$ select public.site_pagina_publicar(%L) $$, (select valor ->> 'id' from t where chave = 'criada')),
  '42501', 'secao_travada', 'Mover a seção travada é recusado');

-- Marcador pendente
select lives_ok(format($$ select public.site_pagina_salvar_rascunho(%L, %L, 5) $$,
  (select valor ->> 'id' from t where chave = 'criada'),
  jsonb_set((select valor from t where chave = 'pagina'), '{content,0,props,titulo}', '"Atendemos [CIDADE]"')),
  'Salva com marcador');
select throws_ok(format($$ select public.site_pagina_publicar(%L) $$, (select valor ->> 'id' from t where chave = 'criada')),
  '22023', 'marcador_pendente', 'Marcador pendente não vai ao ar');

-- Texto longo demais
select throws_ok(format($$ select public.site_pagina_salvar_rascunho(%L, %L, 6) $$,
  (select valor ->> 'id' from t where chave = 'criada'),
  jsonb_set((select valor from t where chave = 'pagina'), '{content,0,props,titulo}', to_jsonb(repeat('a', 2001)))),
  '22023', 'pagina_invalida', 'Texto acima de 2.000 caracteres é recusado');

-- Equipe também edita
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select lives_ok(format($$ select public.site_pagina_salvar_rascunho(%L, %L, 6) $$,
  (select valor ->> 'id' from t where chave = 'criada'), (select valor from t where chave = 'pagina')),
  'Equipe salva o rascunho');

-- ===== Plamev (outra empresa, sem módulo de páginas) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.site_paginas), 0, 'Outra empresa não lê a página');
select throws_ok(format($$ select public.site_pagina_salvar_rascunho(%L, %L, 7) $$,
  (select valor ->> 'id' from t where chave = 'criada'), (select valor from t where chave = 'pagina')),
  'P0002', 'pagina_inexistente', 'Outra empresa não salva a página');
reset role;

select is((select count(*)::int from public.site_paginas_versoes), 2, 'Cada publicação guarda uma versão');
select is((select count(*)::int from public.event_outbox where event = 'site.pagina_publicada'), 2, 'Publicação gera evento');

-- ===== Leitura pública =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(public.site_publico_pagina('www.clinicasol.test', '/') -> 'content' -> 0 -> 'props' ->> 'foto',
  'https://abc.supabase.co/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000001/capa.webp',
  'Site lê a foto nova da capa publicada');
select is(public.site_publico_pagina('plamev.test', '/'), null, 'Outro site não recebe a página');
reset role;

select * from finish();
rollback;
