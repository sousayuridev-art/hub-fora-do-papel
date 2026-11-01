-- HUB-CG 2ª parte: validação igual ao contrato, objeto do contrato, endpoint do __CG_REMOTE__ e HTML base.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner');
insert into public.sites (id, tenant_id, nome, dominio, modulos) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Catálogo CG', 'cg.test', '{catalogo}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select public.site_catalogo_importar('30000000-0000-0000-0000-000000000001', $j${
  "config": {"whatsapp": "5579996516350", "endereco": "Rua A, 1", "horario": "Seg a sáb", "instagram": "cgmoda",
             "mostrar_promocoes": false, "marcas": ["Norte", "Cast & Co"],
             "fotos": {"hero": "30000000-0000-0000-0000-000000000001/hero.jpg", "ig1": "30000000-0000-0000-0000-000000000001/ig1.jpg"}},
  "categorias": [{"slug": "moda-social", "nome": "Moda Social", "foto": "30000000-0000-0000-0000-000000000001/cat.jpg"},
                 {"slug": "acessorios", "nome": "Acessórios"}],
  "produtos": [{"codigo": 7, "nome": "Camisa Social", "categoria": "moda-social", "marca": "Cast & Co", "preco_cents": 24990,
                "tamanhos": ["P", "M"], "cores": [{"nome": "Branco", "tom": "#f4f3f1"}], "selo": "promo", "promo_pct": 15, "fotos": []},
               {"codigo": 9, "nome": "Blazer", "categoria": "moda-social", "marca": null, "preco_cents": 59990,
                "tamanhos": ["M"], "cores": [{"nome": "Grafite", "tom": "#3a3a3a"}], "selo": null, "fotos": ["30000000-0000-0000-0000-000000000001/blazer.jpg"]}],
  "depoimentos": [{"texto": "Bom </script><b>x</b> 👍", "autor": "Rafael M."}]
}$j$::jsonb);

select is((select count(*)::int from public.site_catalogo_produtos), 2, 'Importação grava os produtos');
select is((select codigo from public.site_catalogo_produtos where nome = 'Blazer'), 9, 'Importação mantém o id do contrato como código');
select ok(public.site_catalogo_editor('30000000-0000-0000-0000-000000000001') -> 'avisos' @> '["Produto 7 (Camisa Social) está sem foto (o site mostra o desenho padrão)."]', 'Produto sem foto é aviso, não bloqueio');

select throws_ok($$ select public.site_catalogo_publicar('30000000-0000-0000-0000-000000000001', 'https://site-malicioso.test/x/') $$,
  '22023', 'base_fotos_invalida', 'Base das fotos precisa ser o bucket site-midia');
create temp table r as select public.site_catalogo_publicar('30000000-0000-0000-0000-000000000001',
  'https://abc.supabase.co/storage/v1/object/public/site-midia/') as v;
select is((select (v ->> 'versao')::int from r), 1, 'Publica');

create temp table c as select public.site_catalogo_contrato('30000000-0000-0000-0000-000000000001') as v;
select is((select v #>> '{config,whatsappNumber}' from c), '+55 79 99651-6350', 'WhatsApp no formato do contrato');
select is((select v #>> '{config,instagram}' from c), '@cgmoda', 'Instagram com @');
select is((select (v #>> '{config,showPromoBanner}')::boolean from c), false, 'Liga/desliga das promoções');
select is((select v #>> '{products,0,priceCents}' from c), '24990', 'priceCents em centavos');
select is((select v #>> '{products,0,promoPct}' from c), '15', 'promoPct na promoção');
select is((select v -> 'products' -> 1 -> 'badge' from c), 'null'::jsonb, 'badge nulo explícito, como no arquivo');
select is((select v #>> '{img,ig-1}' from c), 'https://abc.supabase.co/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000001/ig1.jpg', 'Fotos fixas com URL e chave ig-1');
select is((select v #>> '{img,cat-moda-social}' from c), 'https://abc.supabase.co/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000001/cat.jpg', 'Capa da categoria em cat-<id>');
select is((select v #>> '{productImgs,9,0}' from c), 'https://abc.supabase.co/storage/v1/object/public/site-midia/30000000-0000-0000-0000-000000000001/blazer.jpg', 'Fotos do produto por id');
select is((select v #>> '{brands,0}' from c), 'Norte', 'Marcas na ordem escolhida (sem reordenar)');

select throws_ok($$ select public.site_catalogo_base_salvar('30000000-0000-0000-0000-000000000001', '<html>sem marcadores</html>') $$,
  '22023', 'html_sem_contrato', 'HTML base precisa ter os marcadores do contrato');

reset role;
set local role anon;
select is((public.site_catalogo_publicado('www.cg.test') #>> '{testimonials,0,quote}'), 'Bom </script><b>x</b> 👍', 'Site lê o contrato pelo domínio (texto intacto)');

select * from finish();
rollback;
