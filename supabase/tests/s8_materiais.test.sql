-- S8: materiais. Texto e link, arquivo com envio confirmado, regras do Storage,
-- portal só da própria empresa, envio do cliente fecha a pendência, isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra-agencia@test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@sorriso.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'bruno@otica.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Agência', 'outra-agencia');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ótica Visão Clara', 'Bruno', '79900000003'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso Leve', 'Paula', '79900000001');
insert into public.client_members (client_id, user_id, tenant_id) values
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001');
insert into public.projects (id, tenant_id, client_id, name) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Site');
insert into public.client_tasks (id, tenant_id, client_id, project_id, title) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   '50000000-0000-0000-0000-000000000001', 'Enviar as fotos da equipe');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

select is((select public from storage.buckets where id = 'materiais'), false, 'Bucket de materiais é privado');

-- ===== Yuri =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into t select 'txt', public.material_salvar(null, 'texto', 'textos', 'Boas-vindas', null, 'Olá! Seja bem-vindo.', null, null, false);
insert into t select 'guia', public.material_salvar(null, 'link', 'guias', 'Guia do painel', null, 'https://guia.exemplo.test',
  '20000000-0000-0000-0000-000000000002', null, true);
select throws_ok($$ select public.material_salvar(null, 'link', 'guias', 'Link ruim', null, 'http://inseguro.test', null, null, false) $$,
  '22023', null, 'Link só com https');
select throws_ok($$ select public.material_salvar(null, 'texto', 'textos', 'Sem cliente', null, 'abc', null, null, true) $$,
  '22023', null, 'Compartilhar exige cliente');
insert into t select 'arq', public.material_preparar('entregas', 'Layout aprovado', null, '20000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001', true, 'layout final.pdf', 'application/pdf', 1000);
select throws_ok($$ select public.material_preparar('entregas', 'Programa', null, null, null, false, 'x.exe', 'application/x-msdownload', 10) $$,
  '22023', null, 'Tipo de arquivo não aceito');
select throws_ok(format($$ select public.material_confirmar(%L) $$, (select valor->>'id' from t where chave = 'arq')),
  '22023', null, 'Não confirma antes de o arquivo chegar');
-- Regras do Storage
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner, metadata) values ('materiais', %L, auth.uid(), '{"size": 1234}') $$,
  (select valor->>'caminho' from t where chave = 'arq')), 'Dono envia no caminho reservado');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('materiais', '10000000-0000-0000-0000-000000000001/qualquer/coisa.pdf') $$,
  '42501', null, 'Não envia fora de um caminho reservado');
select is((public.material_confirmar((select (valor->>'id')::uuid from t where chave = 'arq'))) ->> 'tamanho', '1234',
  'Confirmado com o tamanho real do arquivo');
select is(((public.materiais_lista()) -> 'contagem' ->> 'todos')::int, 3, 'Lista do dono com os 3 materiais');

-- ===== Paula (Sorriso) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(jsonb_array_length((public.portal_arquivos()) -> 'da_agencia'), 2, 'Cliente vê o que foi compartilhado com a empresa');
select is((select count(*) from storage.objects where bucket_id = 'materiais')::int, 1, 'Cliente lê o arquivo compartilhado');
select is((select count(*) from public.materials)::int, 0, 'Cliente não lê a tabela de materiais');
insert into t select 'env', public.portal_arquivo_preparar('Fotos', 'equipe.jpg', 'image/jpeg', 2000,
  '60000000-0000-0000-0000-000000000001');
insert into storage.objects (bucket_id, name, owner, metadata)
values ('materiais', (select valor->>'caminho' from t where chave = 'env'), auth.uid(), '{"size": 2000}');
select lives_ok(format($$ select public.material_confirmar(%L) $$, (select valor->>'id' from t where chave = 'env')),
  'Cliente confirma o envio');
select throws_ok($$ select public.portal_arquivo_preparar('Logo', 'logo.svg', 'image/svg+xml', 500) $$,
  '22023', null, 'Cliente não envia SVG (pode ter script)');
select ok((public.portal_arquivo_preparar('x', 'cardapio.pdf', 'application/pdf', 500)) ? 'id',
  'Título curto não impede o envio do cliente');
select throws_ok($$ select public.portal_arquivo_preparar('Ruim', '..', 'application/pdf', 500) $$,
  '22023', null, 'Nome de arquivo só com pontos é recusado');
reset role;
select is((select title from public.materials where file_name = 'cardapio.pdf'), 'cardapio.pdf',
  'Título curto demais vira o nome do arquivo');
select is((select status from public.client_tasks where id = '60000000-0000-0000-0000-000000000001'), 'feita',
  'Envio ligado à pendência marca a pendência como feita');
set local role authenticated;

-- ===== Bruno (Ótica) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select is((select count(*) from storage.objects where bucket_id = 'materiais')::int, 0, 'Outra empresa não lê os arquivos');
select is(jsonb_array_length((public.portal_arquivos()) -> 'da_agencia'), 0, 'Outra empresa não vê os materiais');

-- ===== Lixeira e exclusão (Yuri) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(format($$ select public.material_lixeira(%L, true) $$, (select valor->>'id' from t where chave = 'arq')),
  'Arquivo vai para a lixeira');
select throws_ok(format($$ select public.material_excluir(%L) $$, (select valor->>'id' from t where chave = 'arq')),
  '22023', null, 'Não exclui o registro enquanto o arquivo existe');
-- no Supabase só a API do Storage apaga; ela liga esta chave e aplica as policies (como aqui)
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where name = (select valor->>'caminho' from t where chave = 'arq');
select is((select count(*) from storage.objects where name = (select valor->>'caminho' from t where chave = 'arq'))::int, 0,
  'Dono apaga o arquivo que está na lixeira');
select lives_ok(format($$ select public.material_excluir(%L) $$, (select valor->>'id' from t where chave = 'arq')),
  'Depois de apagar o arquivo, exclui de vez');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(jsonb_array_length((public.portal_arquivos()) -> 'da_agencia'), 1, 'Cliente deixa de ver o que foi excluído');

-- ===== Outra agência =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(((public.materiais_lista()) -> 'contagem' ->> 'todos')::int, 0, 'Outra agência não vê nada');
select throws_ok(format($$ select public.material_lixeira(%L, true) $$, (select valor->>'id' from t where chave = 'txt')),
  'P0002', null, 'Outra agência não mexe');

select * from finish();
rollback;
