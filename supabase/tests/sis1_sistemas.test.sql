-- SIS-1: sistemas sob medida. Só o dono (com código) lê e grava; avisos e números vêm do banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente@plamev.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Ana', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Outro cliente', 'Bia', '79900000002'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'De Outra', 'Zé', '79900000009');
insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel', true);
insert into public.projects (id, tenant_id, client_id, name, status) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sistema', 'andamento'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Site', 'andamento');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select is((public.sistema_salvar(jsonb_build_object(
  'client_id', '20000000-0000-0000-0000-000000000001', 'project_id', '50000000-0000-0000-0000-000000000001',
  'nome', ' Sistema Plamev ', 'situacao', 'no_ar'))).nome, 'Sistema Plamev', 'dono cria o sistema');
select ok((select no_ar_desde is not null from public.sistemas where nome = 'Sistema Plamev'), 'no ar ganha a data de hoje');
select throws_ok($$select public.sistema_salvar(jsonb_build_object('client_id', '20000000-0000-0000-0000-000000000002',
  'project_id', '50000000-0000-0000-0000-000000000001', 'nome', 'X'))$$,
  'projeto_de_outro_cliente', 'projeto precisa ser do mesmo cliente');
select throws_ok($$select public.sistema_salvar(jsonb_build_object('client_id', '20000000-0000-0000-0000-000000000009', 'nome', 'Invasão'))$$,
  'cliente_inexistente', 'cliente de outro tenant: invisível');
select throws_ok($$select public.sistema_salvar(jsonb_build_object('client_id', '20000000-0000-0000-0000-000000000001',
  'project_id', '50000000-0000-0000-0000-000000000001', 'nome', 'Segundo'))$$,
  'projeto_ja_tem_sistema', 'um sistema por projeto');
select throws_ok($$select public.sistema_salvar(jsonb_build_object('client_id', '20000000-0000-0000-0000-000000000001',
  'nome', 'Ruim', 'url_producao', 'http://sem-https.test'))$$,
  '23514', null, 'endereço precisa ser https');

-- Serviços (infraestrutura)
select is((public.sistema_servico_salvar((select id from public.sistemas where nome = 'Sistema Plamev'),
  '{"nome": "Supabase", "para_que": "Banco e login", "custo_cents": 12500, "quem_paga": "nos"}'::jsonb)).custo_cents,
  12500, 'serviço em centavos');
select lives_ok($$select public.sistema_servico_salvar((select id from public.sistemas where nome = 'Sistema Plamev'),
  jsonb_build_object('nome', 'Domínio', 'quem_paga', 'cliente', 'custo_cents', 5000, 'vence_em', (current_date + 10)::text))$$,
  'serviço com vencimento');

select is(jsonb_array_length(public.sistemas_resumo()->'itens'), 1, 'a lista traz o sistema');
select is((public.sistemas_resumo()->'itens'->0->>'custo_nosso_cents')::int, 12500, 'custo nosso somado no banco');
select is((public.sistemas_resumo()->'itens'->0->>'custo_cliente_cents')::int, 5000, 'custo do cliente separado');
select is((select array_agg(a->>'tipo') from jsonb_array_elements(public.sistemas_resumo()->'itens'->0->'avisos') a),
  array['servico_vence', 'sem_endereco'], 'avisos: serviço vencendo e no ar sem endereço');
select is((public.sistemas_resumo()->'resumo'->>'no_ar')::int, 1, 'resumo conta os no ar');

select throws_ok($$select public.sistema_capa((select id from public.sistemas where nome = 'Sistema Plamev'),
  '20000000-0000-0000-0000-000000000002/sistema-x.webp')$$, 'caminho_invalido', 'imagem só na pasta do próprio cliente');

-- Sem código, cliente e outro dono: nada
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.sistemas_resumo()$$, '42501', null, 'sem o código do app: recusado');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.sistemas), 0, 'cliente não lê a tabela');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is(jsonb_array_length(public.sistemas_resumo()->'itens'), 0, 'dono de outro tenant não vê');
select throws_ok($$update public.sistemas set nome = 'x'$$, '42501', null, 'escrita direta recusada');

select * from finish();
rollback;
