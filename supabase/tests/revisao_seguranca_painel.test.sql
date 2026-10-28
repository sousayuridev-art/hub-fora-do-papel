-- Revisão de segurança do painel: cliques no WhatsApp não bloqueiam o formulário;
-- links e fotos das seções validados; eventos de foto sem repetição.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@clinica.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sol', 'Paula', '79900000001');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'equipe');
insert into public.sites (id, tenant_id, client_id, nome, dominio, modulos) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Site da Clínica', 'clinicasol.test', '{paginas,contatos}');
insert into public.site_paginas (id, site_id, tenant_id, nome, caminho, rascunho) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Início', '/', '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi", "link": "/contato"}}]}');

-- ===== Visitante: 70 cliques de vários endereços não impedem o formulário =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare i int;
begin
  for i in 1..70 loop
    perform set_config('request.headers', json_build_object('x-forwarded-for', '10.0.0.' || i)::text, true);
    perform public.site_contato_registrar('clinicasol.test', jsonb_build_object('origem', 'whatsapp', 'pagina', '/'));
  end loop;
end $$;
select set_config('request.headers', '{"x-forwarded-for": "200.1.1.1"}', true);
select lives_ok($$ select public.site_contato_registrar('clinicasol.test',
  '{"origem": "formulario", "nome": "Ana Lima", "telefone": "79999990001"}') $$, 'Formulário entra mesmo com muitos cliques');
select lives_ok($$ select public.site_contato_registrar('clinicasol.test', '{"origem": "whatsapp", "pagina": "/planos"}') $$,
  'Clique em excesso não dá erro');
select lives_ok($$ select public.site_contato_registrar('clinicasol.test', '{"origem": "whatsapp", "pagina": "/planos"}') $$,
  'Mesmo clique repetido não dá erro');
reset role;
select is((select count(*)::int from public.site_cliente_contatos where origem = 'whatsapp'), 60,
  'Cliques param em 60 por site a cada 10 minutos, sem erro');
select is((select count(*)::int from public.site_cliente_contatos where origem = 'formulario'), 1, 'Formulário gravado');

-- ===== Pessoa do portal: link e foto =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.site_pagina_salvar_rascunho('40000000-0000-0000-0000-000000000001',
  '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi", "link": "javascript:alert(1)"}}]}', 1) $$,
  '22023', 'pagina_invalida', 'Link javascript: é recusado');
select throws_ok($$ select public.site_pagina_salvar_rascunho('40000000-0000-0000-0000-000000000001',
  '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi", "foto": "https://rastreio.test/pixel.png"}}]}', 1) $$,
  '22023', 'pagina_invalida', 'Foto de fora do site-midia é recusada');
select throws_ok($$ select public.site_pagina_salvar_rascunho('40000000-0000-0000-0000-000000000001',
  '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi",
    "foto": "https://cjzzbpqwlpjvlawllfqy.supabase.co/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000009/x.webp"}}]}', 1) $$,
  '22023', 'pagina_invalida', 'Foto de outro site é recusada');
select lives_ok($$ select public.site_pagina_salvar_rascunho('40000000-0000-0000-0000-000000000001',
  '{"root": {"props": {}}, "content": [{"type": "Capa", "props": {"id": "c1", "titulo": "Oi", "link": "https://wa.me/5579999990001",
    "foto": "https://cjzzbpqwlpjvlawllfqy.supabase.co/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000001/capa.webp"}}]}', 1) $$,
  'Link https e foto do próprio site passam');
reset role;

select * from finish();
rollback;
