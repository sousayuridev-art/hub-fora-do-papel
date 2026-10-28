-- PC-2: pedido de ajuste com página e anexo. Site só da própria empresa, até 3 anexos válidos
-- (jpg, png, webp, pdf até 5 MB, do próprio cliente), origem "painel", contexto limpo, Hub vê tudo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marina@plamev.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'equipe@plamev.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'joao@clinica.test');
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
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Marina', '79900000010'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Clínica Sol', 'João', '79900000011');
insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel', true),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001', 'equipe', false),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-000000000001', 'responsavel', true);
insert into public.sites (id, tenant_id, client_id, nome, dominio) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Site da Plamev', 'plamev.test'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Site da Clínica', 'clinicasol.test'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', null, 'Site da Outra', 'outra.test');

-- Arquivos já enviados (S8): print bom, PDF grande, docx, de outra pessoa da empresa e de outra empresa
insert into public.materials (id, tenant_id, client_id, category, kind, origin, title, storage_path, file_name,
                              mime_type, size_bytes, uploaded_by, ready_at) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'cliente', 'arquivo', 'cliente', 'Print do banner', 'x/1/print.png', 'print.png', 'image/png', 200000,
   '00000000-0000-0000-0000-0000000000c1', now()),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'cliente', 'arquivo', 'cliente', 'Manual grande', 'x/2/manual.pdf', 'manual.pdf', 'application/pdf', 6000000,
   '00000000-0000-0000-0000-0000000000c1', now()),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'cliente', 'arquivo', 'cliente', 'Texto', 'x/3/texto.docx', 'texto.docx',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 10000, '00000000-0000-0000-0000-0000000000c1', now()),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'cliente', 'arquivo', 'cliente', 'Da clínica', 'x/4/clinica.png', 'clinica.png', 'image/png', 10000,
   '00000000-0000-0000-0000-0000000000d1', now()),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'cliente', 'arquivo', 'cliente', 'Ainda enviando', 'x/5/meio.png', 'meio.png', 'image/png', 10000,
   '00000000-0000-0000-0000-0000000000c1', null);

select has_column('public', 'requests', 'site_id', 'Pedido tem site');
select has_column('public', 'requests', 'contexto', 'Pedido tem contexto');
select has_column('public', 'materials', 'request_id', 'Arquivo pode ser anexo de pedido');

-- ===== Responsável da Plamev =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);

select throws_ok($$ select public.portal_pedido_criar('Trocar banner', null, null, '30000000-0000-0000-0000-000000000002') $$,
  '42501', 'site_de_outra_empresa', 'Site de outra empresa do mesmo tenant é recusado');
select throws_ok($$ select public.portal_pedido_criar('Trocar banner', null, null, '30000000-0000-0000-0000-000000000003') $$,
  '42501', 'site_de_outra_empresa', 'Site de outro tenant é recusado');
select throws_ok($$ select public.portal_pedido_criar('Trocar banner', null, null, null, null,
  array['40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005']::uuid[]) $$,
  '22023', 'muitos_anexos', 'Mais de 3 anexos é recusado');
select throws_ok($$ select public.portal_pedido_criar('Trocar banner', null, null, null, null,
  array['40000000-0000-0000-0000-000000000002']::uuid[]) $$, '22023', 'anexo_invalido', 'Anexo acima de 5 MB é recusado');
select throws_ok($$ select public.portal_pedido_criar('Trocar banner', null, null, null, null,
  array['40000000-0000-0000-0000-000000000003']::uuid[]) $$, '22023', 'anexo_invalido', 'Anexo em formato fora da lista é recusado');
select throws_ok($$ select public.portal_pedido_criar('Trocar banner', null, null, null, null,
  array['40000000-0000-0000-0000-000000000004']::uuid[]) $$, '22023', 'anexo_invalido', 'Anexo de outra empresa é recusado');
select throws_ok($$ select public.portal_pedido_criar('Trocar banner', null, null, null, null,
  array['40000000-0000-0000-0000-000000000005']::uuid[]) $$, '22023', 'anexo_invalido', 'Anexo que não chegou ao Storage é recusado');
select throws_ok($$ select public.portal_pedido_criar('Trocar banner', null, null, null, null,
  array['40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001']::uuid[]) $$,
  '22023', 'anexo_invalido', 'Anexo repetido é recusado');

select is((public.portal_pedido_criar('Trocar o banner', 'A foto nova está no print', null,
  '30000000-0000-0000-0000-000000000001',
  '{"pagina":"Página inicial","secao":"Capa","tela":"/portal/site/paginas/inicio","valor":"999"}'::jsonb,
  array['40000000-0000-0000-0000-000000000001']::uuid[])) ->> 'codigo', 'P-01', 'Pedido com página e print entra');
select throws_ok($$ select public.portal_pedido_criar('De novo', null, null, null, null,
  array['40000000-0000-0000-0000-000000000001']::uuid[]) $$, '22023', 'anexo_invalido', 'Anexo já usado em outro pedido é recusado');
select is((public.portal_pedido_criar('Mudar telefone')) ->> 'codigo', 'P-02', 'Pedido simples continua funcionando');
select is((public.portal_pedido_criar('Ajustar rodapé', null, null, null,
  '{"pagina":"  Contato  ","tela":"javascript:alert(1)"}'::jsonb)) ->> 'codigo', 'P-03', 'Pedido só com página entra');
reset role;

select is((select count(*)::int from public.requests where title = 'Trocar banner'), 0, 'Nenhum pedido recusado ficou gravado');
select is((select origin::text from public.requests where code = 'P-01'), 'painel', 'Pedido com contexto tem origem painel');
select is((select origin::text from public.requests where code = 'P-02'), 'portal', 'Pedido sem contexto continua com origem portal');
select is((select contexto from public.requests where code = 'P-01'),
  '{"pagina":"Página inicial","secao":"Capa","tela":"/portal/site/paginas/inicio"}'::jsonb, 'Contexto guarda só página, seção e tela');
select is((select contexto from public.requests where code = 'P-03'), '{"pagina":"Contato"}'::jsonb,
  'Tela inválida é descartada e a página é aparada');
select is((select request_id from public.materials where id = '40000000-0000-0000-0000-000000000001'),
  (select id from public.requests where code = 'P-01'), 'Print ficou ligado ao pedido');
select is((select source || '/' || (detail ->> 'pagina') from public.project_events where kind = 'pedido_recebido'
             and request_id = (select id from public.requests where code = 'P-01')),
  'cliente/Página inicial', 'Linha do tempo mostra o pedido como do cliente, com a página');
select is((select payload ->> 'origem' from public.event_outbox where event = 'pedido.recebido'
             and payload ->> 'codigo' = 'P-01'), 'painel', 'Evento do pedido leva a origem painel');

-- ===== Equipe da Plamev também pede =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal2"}', true);
select is((public.portal_pedido_criar('Nova foto da equipe', null, null, '30000000-0000-0000-0000-000000000001',
  '{"pagina":"Sobre"}'::jsonb)) ->> 'codigo', 'P-04', 'Equipe faz pedido com página');

-- ===== Hub (Yuri) vê site, página e anexo =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select is((select site_nome || ' · ' || (contexto ->> 'pagina') || ' · ' || jsonb_array_length(anexos)
             from public.v_pedidos where code = 'P-01'), 'Site da Plamev · Página inicial · 1', 'Hub vê site, página e anexo');
select is((public.pedido_registrar('20000000-0000-0000-0000-000000000001', 'Pedido do WhatsApp', null, 'painel')) ->> 'codigo',
  'P-05', 'Hub registra pedido');
reset role;
select is((select origin::text from public.requests where code = 'P-05'), 'hub', 'Hub não grava origem painel');

-- ===== Dona de outro tenant não vê =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.v_pedidos), 0, 'Outro tenant não vê os pedidos');
reset role;

select * from finish();
rollback;
