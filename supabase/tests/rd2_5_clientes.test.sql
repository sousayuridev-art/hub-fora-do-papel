-- RD2-5: grupos de clientes, "agora" e logo, sem vazar outra agência.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ativa', 'Ana', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Antiga', 'Bia', '79900000002'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Nova', 'Caio', '79900000003'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Desistiu', 'Duda', '79900000004'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'De Outra', 'Zé', '79900000009');
insert into public.deals (tenant_id, client_id, stage, next_step, next_step_at) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'contato', 'Ligar', now());
insert into public.deals (tenant_id, client_id, stage, archived_at, lost_reason) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'proposta', now(), 'preco');
insert into public.projects (id, tenant_id, client_id, name, status) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sistema', 'andamento'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Site', 'concluido');
insert into public.project_phases (tenant_id, project_id, position, name, status) values
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 'Descoberta', 'concluida'),
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 2, 'Protótipo', 'andamento'),
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 3, 'Publicação', 'pendente');
insert into public.subscriptions (tenant_id, client_id, plan_name, amount_cents, start_month)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Essencial', 150000,
        date_trunc('month', now())::date);
insert into public.charges (tenant_id, client_id, kind, description, amount_cents, due_date)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'avulsa', 'Atrasada', 50000, current_date - 10),
       ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'avulsa', 'Próxima', 70000, current_date + 5);
insert into public.requests (tenant_id, client_id, code, title, origin) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'P-001', 'Trocar foto', 'hub');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
create temp table r as select public.clientes_agora() as v;

select is((select v #>> '{itens,20000000-0000-0000-0000-000000000001,grupo}' from r), 'ativo', 'Projeto em andamento = ativo');
select is((select v #>> '{itens,20000000-0000-0000-0000-000000000001,relacao}' from r), 'projeto_mensalidade', 'Projeto + mensalidade');
select is((select (v #>> '{itens,20000000-0000-0000-0000-000000000001,projeto,fase_posicao}')::int from r), 2, 'Fase atual é a primeira não concluída');
select is((select (v #>> '{itens,20000000-0000-0000-0000-000000000001,projeto,fases_total}')::int from r), 3, 'Total de fases');
select is((select (v #>> '{itens,20000000-0000-0000-0000-000000000001,pedidos_abertos}')::int from r), 1, 'Pedidos abertos');
select is((select (v #>> '{itens,20000000-0000-0000-0000-000000000001,em_atraso_cents}')::int from r), 50000, 'Valor em atraso');
select isnt((select v #>> '{itens,20000000-0000-0000-0000-000000000001,proxima_cobranca}' from r), null, 'Próxima cobrança');
select is((select v #>> '{itens,20000000-0000-0000-0000-000000000002,grupo}' from r), 'ex', 'Só projeto concluído = ex-cliente');
select is((select v #>> '{itens,20000000-0000-0000-0000-000000000003,grupo}' from r), 'contato', 'Contato');
select is((select v #>> '{itens,20000000-0000-0000-0000-000000000004,grupo}' from r), 'arquivado', 'Oportunidade arquivada');
select is((select v -> 'itens' -> '20000000-0000-0000-0000-000000000009' from r), null, 'Outra agência não aparece');
select is((select (v #>> '{resumo,clientes_em_atraso}')::int from r), 1, 'Resumo: clientes com cobrança atrasada');

select throws_ok($$ select public.cliente_logo('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002/logo.png') $$,
  '22023', null, 'Logo só no caminho do próprio cliente');
select throws_ok($$ select public.cliente_logo('20000000-0000-0000-0000-000000000009', null) $$,
  'P0002', null, 'Não mexe na logo de outra agência');

select lives_ok($$ insert into storage.objects (bucket_id, name) values ('logos-clientes', '20000000-0000-0000-0000-000000000001/logo.webp') $$,
  'Envia a logo do próprio cliente');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('logos-clientes', '20000000-0000-0000-0000-000000000009/logo.webp') $$,
  '42501', null, 'Não envia logo para cliente de outra agência');
select is((select public.cliente_logo('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001/logo.webp') ->> 'logo_path'),
  '20000000-0000-0000-0000-000000000001/logo.webp', 'Grava a logo na ficha');

select * from finish();
rollback;
