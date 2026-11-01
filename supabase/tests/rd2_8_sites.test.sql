-- RD2-8: lista de sites, atividade, no ar automático e espelho do portal (só leitura, só o dono do tenant).
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marta@clinica.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'joao@clinica.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Exemplo', 'Marta', '79900000001'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'De Outra', 'Zé', '79900000009');
insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve, last_seen_at) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel', true, now() - interval '20 days'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001', 'equipe', false, null);
insert into public.sites (id, tenant_id, client_id, nome, dominio, no_ar) values
  ('30000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', null, 'Fora do Papel', 'foradopapel.test', true),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Clínica', 'clinica.test', false),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', null, 'Da Outra', 'outra.test', true);
insert into public.projects (id, tenant_id, client_id, name, status) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Site', 'andamento');
insert into public.site_cliente_contatos (site_id, tenant_id, client_id, origem, nome, telefone, criado_em) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'formulario', 'Pessoa', '79911111111', now() - interval '3 days');
insert into public.site_paginas (site_id, tenant_id, nome, caminho, publicado, publicado_em) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Início', '/',
   '{"root": {"props": {"cor": "oceano"}}, "content": [{"type": "Capa", "props": {"titulo": "Exames de vista"}}]}', now());
insert into public.event_outbox (tenant_id, event, payload) values
  ('10000000-0000-0000-0000-000000000001', 'site.pagina_publicada',
   jsonb_build_object('site_id', '30000000-0000-0000-0000-000000000001', 'quem', 'cliente', 'por', '00000000-0000-0000-0000-0000000000c1', 'caminho', '/'));

-- ===== Yuri (dono, com código) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
create temp table r as select public.sites_resumo() as v;
select is((select jsonb_array_length(v -> 'itens') from r), 2, 'Só os sites do próprio tenant');
select is((select v #>> '{itens,0,nome}' from r), 'Fora do Papel', 'O nosso site vem primeiro');
select is((select v #>> '{itens,1,situacao}' from r), 'construcao', 'Fora do ar com projeto em andamento = em construção');
select is((select v #>> '{itens,1,capa,secao,props,titulo}' from r), 'Exames de vista', 'Capa = primeira seção publicada da página inicial');
select is((select v #>> '{itens,1,capa,cor}' from r), 'oceano', 'Cor do site na capa');
select ok((select (v #> '{itens,1,avisos}') ? 'contato_parado' from r), 'Aviso: contato sem resposta há mais de 2 dias');
select ok((select (v #> '{itens,1,avisos}') ? 'cliente_sumido' from r), 'Aviso: cliente sem entrar há mais de 14 dias');
select is((select (v #>> '{itens,1,publicacoes_cliente_30d}')::int from r), 1, 'Publicação do cliente contada');
select is((select (public.site_atividade('30000000-0000-0000-0000-000000000001') #>> '{itens,0,nome}')), 'marta', 'Atividade com o nome de quem fez');
select is((select jsonb_array_length(public.site_atividade('30000000-0000-0000-0000-000000000001') -> 'pessoas')), 2, 'Quem usa o painel');
select throws_ok($$ select public.site_atividade('30000000-0000-0000-0000-000000000009') $$, 'P0002', null, 'Atividade de site de outro tenant: não');

-- Espelho: sem abrir, nada; abrindo, lê como responsável; nunca grava como o cliente
select throws_ok($$ select public.portal_inicio('20000000-0000-0000-0000-000000000001') $$, '42501', null, 'Sem espelho aberto, o dono não lê o portal');
select lives_ok($$ select public.portal_espelho_abrir('20000000-0000-0000-0000-000000000001', 'responsavel') $$, 'Dono abre o espelho');
select lives_ok($$ select public.portal_inicio('20000000-0000-0000-0000-000000000001') $$, 'Espelho lê o Início');
select lives_ok($$ select public.portal_pagamentos('20000000-0000-0000-0000-000000000001') $$, 'Espelho como responsável vê Pagamentos');
select is((public.portal_minha_empresa('20000000-0000-0000-0000-000000000001') ->> 'espelho')::boolean, true, 'Empresa marca o espelho');
select throws_ok($$ select public.portal_pedido_criar('Teste', null, '20000000-0000-0000-0000-000000000001') $$, '42501', null, 'Espelho não cria pedido como o cliente');
select throws_ok($$ select public.portal_pendencia_feita('60000000-0000-0000-0000-000000000001') $$, null, null, 'Espelho não marca pendência');
select throws_ok($$ select public.portal_aprovar('60000000-0000-0000-0000-000000000002', null) $$, null, null, 'Espelho não aprova');
select throws_ok($$ select public.portal_pedir_ajuste('60000000-0000-0000-0000-000000000002', 'x') $$, null, null, 'Espelho não pede ajuste');
select throws_ok($$ select public.portal_adicional_decidir('60000000-0000-0000-0000-000000000003', true, null) $$, null, null, 'Espelho não decide serviço adicional');
select throws_ok($$ select public.portal_cobranca_avisar('60000000-0000-0000-0000-000000000004') $$, null, null, 'Espelho não avisa pagamento');
select throws_ok($$ select public.portal_arquivo_preparar('a.pdf', 'application/pdf', null, 100, null, '20000000-0000-0000-0000-000000000001') $$, null, null, 'Espelho não envia arquivo');
select lives_ok($$ select public.portal_espelho_abrir('20000000-0000-0000-0000-000000000001', 'equipe') $$, 'Troca para equipe');
select throws_ok($$ select public.portal_pagamentos('20000000-0000-0000-0000-000000000001') $$, null, null, 'Espelho como equipe não vê Pagamentos');
select is((select count(*)::int from public.event_outbox where event = 'portal.espelho_aberto'), 2, 'Cada abertura fica registrada');
select is((public.portal_pendencias('20000000-0000-0000-0000-000000000001') ->> 'pagamentos'), '0', 'Espelho como equipe: sem pagamentos nas pendências');

-- Sem código (aal1), o espelho para de valer
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.portal_inicio('20000000-0000-0000-0000-000000000001') $$, '42501', null, 'Espelho exige a sessão com código');

-- ===== Dona de outra agência =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.portal_espelho_abrir('20000000-0000-0000-0000-000000000001', 'responsavel') $$, 'P0002', null, 'Outra agência não abre o espelho');
select throws_ok($$ select public.portal_inicio('20000000-0000-0000-0000-000000000001') $$, '42501', null, 'Outra agência não lê o portal do cliente');

-- ===== Projeto lançado → site no ar =====
reset role;
update public.projects set launched_at = now() where id = '50000000-0000-0000-0000-000000000001';
select is((select no_ar from public.sites where id = '30000000-0000-0000-0000-000000000001'), true, 'Lançar o projeto põe o site no ar');

select * from finish();
rollback;
