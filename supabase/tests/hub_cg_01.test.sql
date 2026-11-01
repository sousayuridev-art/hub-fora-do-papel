-- HUB-CG-01: catálogo preso ao site, escrita só por RPC, preço em centavos, publicação validada, leitura pública.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'CG Moda Masculina', 'Irmão', '79900000001');
insert into public.sites (id, tenant_id, client_id, nome, dominio, modulos) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Catálogo CG', 'cg.test', '{catalogo}'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', null, 'Sem catálogo', 'outro.test', '{paginas}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

create temp table k as select public.site_catalogo_categoria_salvar('30000000-0000-0000-0000-000000000001', '{"nome": "Camisas Polo"}') as v;
select is((select v ->> 'slug' from k), 'camisas-polo', 'Slug nasce do nome (sem acento, com hífen)');
select is((public.site_catalogo_categoria_salvar('30000000-0000-0000-0000-000000000001', '{"nome": "Camisas polo"}') ->> 'slug'), 'camisas-polo-2', 'Slug repetido ganha número');

select throws_ok($$ select public.site_catalogo_produto_salvar('30000000-0000-0000-0000-000000000001',
  '{"nome": "Polo", "categoria": "camisas-polo", "preco_cents": 199.90}') $$, '22023', 'preco_invalido', 'Preço quebrado (199.90) é recusado');
select throws_ok($$ select public.site_catalogo_produto_salvar('30000000-0000-0000-0000-000000000001',
  '{"nome": "Polo", "categoria": "camisas-polo", "preco_cents": 19990, "selo": "promo"}') $$, '22023', 'promo_sem_percentual', 'Promoção sem percentual é recusada');
select throws_ok($$ select public.site_catalogo_produto_salvar('30000000-0000-0000-0000-000000000001',
  '{"nome": "Polo", "categoria": "camisas-polo", "fotos": ["30000000-0000-0000-0000-000000000002/x.webp"]}') $$, '22023', 'foto_invalida', 'Foto de outro site é recusada');

create temp table p as select public.site_catalogo_produto_salvar('30000000-0000-0000-0000-000000000001',
  '{"nome": "Polo Azul", "categoria": "camisas-polo", "marca": "Marca X", "preco_cents": 1999000, "tamanhos": ["P", "M"],
    "cores": [{"nome": "Azul", "tom": "#1F3A93"}], "selo": "promo", "promo_pct": 20,
    "fotos": ["30000000-0000-0000-0000-000000000001/polo.webp"]}') as v;
select is((select (v ->> 'codigo')::int from p), 1, 'Primeiro produto recebe o código 1');
select is((select (v ->> 'preco_cents')::int from p), 1999000, 'Preço gravado em centavos');
select is((select (public.site_catalogo_produto_salvar('30000000-0000-0000-0000-000000000001',
  '{"nome": "Sem preço", "categoria": "camisas-polo", "preco_cents": null, "fotos": ["30000000-0000-0000-0000-000000000001/a.webp"]}') ->> 'preco_cents')), null, 'Preço vazio continua vazio (não vira 0)');
select is((public.site_catalogo_produto_salvar('30000000-0000-0000-0000-000000000001',
  jsonb_build_object('id', (select v ->> 'id' from p), 'nome', 'Polo Azul', 'categoria', 'camisas-polo', 'selo', 'novo', 'promo_pct', 30,
                     'fotos', '["30000000-0000-0000-0000-000000000001/polo.webp"]'::jsonb)) ->> 'promo_pct'), null, 'Sem promoção, o percentual some');

select throws_ok($$ select public.site_catalogo_categoria_apagar((select (v ->> 'id')::uuid from k)) $$, '23503', 'categoria_com_produtos', 'Categoria com produtos não sai');
select is((select produtos from public.v_site_catalogo_categorias where slug = 'camisas-polo'), 2, 'Contagem por categoria na view');

select throws_ok($$ select public.site_catalogo_produto_salvar('30000000-0000-0000-0000-000000000002', '{"nome": "X", "categoria": "x"}') $$,
  '42501', 'catalogo_desligado', 'Site sem o módulo catálogo não recebe produto');

-- Publicação: bloqueada sem WhatsApp; depois publica uma vez só
select is((public.site_catalogo_publicar('30000000-0000-0000-0000-000000000001') ->> 'publicado')::boolean, false, 'Sem WhatsApp não publica');
select ok((public.site_catalogo_publicar('30000000-0000-0000-0000-000000000001') -> 'problemas') ? 'Informe o WhatsApp da loja (com DDD) em Ajustes da loja.', 'Problema explicado em português');
select lives_ok($$ select public.site_catalogo_config_salvar('30000000-0000-0000-0000-000000000001',
  '{"whatsapp": "(79) 99999-0001", "instagram": "@cgmoda", "marcas": ["B", "A", "A"], "fotos": {"hero": "30000000-0000-0000-0000-000000000001/hero.webp"}}') $$, 'Ajustes da loja salvos');
select is((select whatsapp from public.site_catalogo_config where site_id = '30000000-0000-0000-0000-000000000001'), '79999990001', 'WhatsApp só com números');
select is((public.site_catalogo_publicar('30000000-0000-0000-0000-000000000001') ->> 'versao')::int, 1, 'Publica a versão 1');
select is((public.site_catalogo_publicar('30000000-0000-0000-0000-000000000001') ->> 'repetido')::boolean, true, 'Publicar de novo sem mudança não cria versão');
select is((public.site_catalogo_editor('30000000-0000-0000-0000-000000000001') ->> 'mudou')::boolean, false, 'Editor sabe que nada mudou');
select lives_ok($$ select public.site_catalogo_depoimento_salvar('30000000-0000-0000-0000-000000000001',
  '{"texto": "Atendimento ótimo </script><script>alert(1)</script> 👍", "autor": "Cliente real"}') $$, 'Depoimento com </script> e emoji grava');

-- ===== Visitante do site (anon) =====
reset role;
set local role anon;
select is((public.site_publico_catalogo('www.cg.test') #>> '{produtos,0,nome}'), 'Polo Azul', 'Site lê a versão publicada (com ou sem www)');
select is(jsonb_array_length(public.site_publico_catalogo('cg.test') -> 'depoimentos'), 0, 'Rascunho não vai ao ar antes de publicar');
select throws_ok($$ select count(*) from public.site_catalogo_produtos $$, '42501', null, 'Visitante não lê as tabelas');

-- ===== Dona de outra agência =====
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.site_catalogo_produtos), 0, 'Outra agência vê zero produtos');

select * from finish();
rollback;
