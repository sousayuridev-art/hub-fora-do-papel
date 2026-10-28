-- Revisão de segurança do painel, rodada 2: limites por site, IPv6, cliques no formato do site,
-- contatos da empresa anterior, publicar com a versão vista, links e fotos, artigos do portal,
-- e-mails em Ajustes, IP apagado depois de 2 dias, teto de fotos.
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
   'Site da Clínica', 'clinicasol.test', '{paginas,contatos,artigos}'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'Site da Plamev', 'plamev.test', '{contatos}');
insert into public.site_paginas (id, site_id, tenant_id, nome, caminho, rascunho) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Início', '/', '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi"}}]}');

-- ===== Visitantes: limites por endereço valem dentro de cada site =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.headers', '{"cf-connecting-ip": "200.1.1.1"}', true);
select lives_ok($$ select public.site_contato_registrar('clinicasol.test',
  jsonb_build_object('origem', 'formulario', 'nome', 'Pessoa ' || n, 'email', 'p' || n || '@x.test'))
  from generate_series(1, 8) n $$, '8 formulários do mesmo endereço na Clínica');
select throws_ok($$ select public.site_contato_registrar('clinicasol.test',
  '{"origem": "formulario", "nome": "Nona", "email": "nona@x.test"}') $$, 'PT429', 'muitas_tentativas',
  'O nono na mesma hora responde 429');
select lives_ok($$ select public.site_contato_registrar('plamev.test',
  '{"origem": "formulario", "nome": "Outra", "email": "outra@x.test"}') $$,
  'O mesmo endereço ainda envia para outro site (um site não bloqueia o outro)');

-- IPv6: endereços do mesmo /64 contam juntos
do $$
declare i int;
begin
  for i in 1..8 loop
    perform set_config('request.headers', json_build_object('cf-connecting-ip', '2001:db8:1:2::' || i)::text, true);
    perform public.site_contato_registrar('plamev.test',
      jsonb_build_object('origem', 'formulario', 'nome', 'Seis ' || i, 'email', 's' || i || '@x.test'));
  end loop;
end $$;
select set_config('request.headers', '{"cf-connecting-ip": "2001:db8:1:2::ffff"}', true);
select throws_ok($$ select public.site_contato_registrar('plamev.test',
  '{"origem": "formulario", "nome": "Nove", "email": "nove@x.test"}') $$, 'PT429', 'muitas_tentativas',
  'Trocar de endereço dentro do mesmo /64 não fura o limite');

-- Clique no WhatsApp: página fora do formato do site é ignorada
select set_config('request.headers', '{"cf-connecting-ip": "200.2.2.2"}', true);
select lives_ok($$ select public.site_contato_registrar('clinicasol.test', '{"origem": "whatsapp", "pagina": "/x1?a=b"}') $$,
  'Página estranha não dá erro');
select lives_ok($$ select public.site_contato_registrar('clinicasol.test', '{"origem": "whatsapp"}') $$,
  'Sem página não dá erro');
select lives_ok($$ select public.site_contato_registrar('clinicasol.test', '{"origem": "whatsapp", "pagina": "/#semestral"}') $$,
  'Página no formato do site grava');
reset role;
select is((select count(*)::int from public.site_cliente_contatos where origem = 'whatsapp'), 1,
  'Só o clique no formato do site foi gravado');
select is((select ip from public.site_cliente_contatos where nome = 'Seis 1'), '2001:db8:1:2::/64', 'IPv6 guardado como /64');

-- IP some depois de 2 dias
update public.site_cliente_contatos set criado_em = now() - interval '3 days' where nome = 'Pessoa 1';
set local role anon;
select set_config('request.headers', '{"cf-connecting-ip": "200.3.3.3"}', true);
select public.site_contato_registrar('clinicasol.test', '{"origem": "formulario", "nome": "Gatilho", "email": "g@x.test"}');
reset role;
select is((select ip from public.site_cliente_contatos where nome = 'Pessoa 1'), null, 'Endereço IP apagado depois de 2 dias');
select isnt((select ip from public.site_cliente_contatos where nome = 'Gatilho'), null, 'Contato novo guarda o IP');

-- ===== Ajustes: e-mails só para responsável e dono =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from jsonb_array_elements(public.portal_ajustes('30000000-0000-0000-0000-000000000001') -> 'equipe') e
            where e ->> 'email' is not null), 0, 'Equipe não vê os e-mails das pessoas');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from jsonb_array_elements(public.portal_ajustes('30000000-0000-0000-0000-000000000001') -> 'equipe') e
            where e ->> 'email' is not null), 2, 'Responsável vê os e-mails');

-- ===== Links e fotos das seções =====
select throws_ok($$ select public.site_pagina_salvar_rascunho('40000000-0000-0000-0000-000000000001',
  '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi", "link": "//golpe.test"}}]}', 1) $$,
  '22023', 'pagina_invalida', 'Link "//outro.site" não passa como caminho do site');
select throws_ok($$ select public.site_pagina_salvar_rascunho('40000000-0000-0000-0000-000000000001',
  '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi",
    "foto": "https://golpe.test/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000001/x.webp"}}]}', 1) $$,
  '22023', 'pagina_invalida', 'Foto com o caminho certo em outro servidor é recusada');

-- ===== Publicar confere a versão vista =====
select lives_ok($$ select public.site_pagina_salvar_rascunho('40000000-0000-0000-0000-000000000001',
  '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi", "link": "/contato"}}]}', 1) $$,
  'Responsável salva (versão 2)');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.site_pagina_publicar('40000000-0000-0000-0000-000000000001', 1) $$,
  '40001', 'pagina_alterada', 'Publicar com versão antiga é recusado');
select lives_ok($$ select public.site_pagina_publicar('40000000-0000-0000-0000-000000000001', 2) $$,
  'Publicar com a versão vista passa');

-- ===== Artigos editados pela pessoa do portal =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000001',
  '{"slug": "capa-externa", "categoria": "Novidades", "titulo": "Capa externa", "capa": "https://rastreio.test/pixel.png"}') $$,
  '22023', 'artigo_invalido', 'Capa de fora do site é recusada para o portal');
select throws_ok($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000001',
  '{"slug": "link-ruim", "categoria": "Novidades", "titulo": "Link ruim",
    "corpo": {"pontos": ["a", "b", "c"], "secoes": [{"id": "s1", "titulo": "T", "blocos": ["Veja [aqui](javascript:alert(1))"]}]}}') $$,
  '22023', 'artigo_invalido', 'Link javascript: no texto do artigo é recusado');
select lives_ok($$ select public.site_artigo_salvar('30000000-0000-0000-0000-000000000001',
  '{"slug": "link-bom", "categoria": "Novidades", "titulo": "Link bom",
    "corpo": {"pontos": ["a", "b", "c"], "secoes": [{"id": "s1", "titulo": "T", "blocos": ["Veja [aqui](/contato)"]}]}}') $$,
  'Link para página do site passa');
reset role;

-- ===== Site muda de empresa: contatos da anterior ficam com ela =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select lives_ok($$ select public.site_cliente_definir('30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002', '{paginas,contatos}') $$, 'Yuri passa o site da Clínica para a Plamev');
select ok((select (public.portal_contatos('30000000-0000-0000-0000-000000000001', 'todos') -> 'contagem' ->> 'todos')::int > 0),
  'Dono continua vendo os contatos antigos');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select is((public.portal_contatos('30000000-0000-0000-0000-000000000001', 'todos') -> 'contagem' ->> 'todos')::int, 0,
  'Nova empresa não vê os contatos que chegaram para a anterior');
select is((select count(*)::int from public.site_cliente_contatos where site_id = '30000000-0000-0000-0000-000000000001'), 0,
  'Nem lendo a tabela direto');
select throws_ok(format($$ select public.portal_contato_respondido(%L) $$,
  (select id from public.site_cliente_contatos where nome = 'Gatilho')),
  'P0002', 'contato_inexistente', 'Nem marcando como respondido');
reset role;

-- ===== Teto de 300 fotos por site =====
insert into storage.objects (bucket_id, name)
select 'site-midia', '30000000-0000-0000-0000-000000000002/foto-' || n || '.webp' from generate_series(1, 300) n;
update storage.objects set created_at = now() - interval '3 days' where bucket_id = 'site-midia';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select ok(not public._site_midia_pode_enviar_cliente('30000000-0000-0000-0000-000000000002/nova.webp'),
  'Com 300 fotos o site não recebe mais (mesmo antigas)');
reset role;

select * from finish();
rollback;
