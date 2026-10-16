-- S3: projetos, pedidos e portal. Projeto nasce no aceite, aprovação só pelo cliente,
-- serviço adicional só depois do sim, lançamento com checklist, convite e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra-agencia@test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@sorriso.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'estranho@test'),
  ('00000000-0000-0000-0000-0000000000c4', 'estagiaria@sorriso.test');
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c2', 'Bruno@Otica.test', null),
  ('00000000-0000-0000-0000-0000000000c5', 'ana@sorriso.test', now());
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Agência', 'outra-agencia');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ótica Visão Clara', 'Bruno Alves', '79900000003'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso Leve', 'Paula Viana', '79900000001');
insert into public.client_members (client_id, user_id, tenant_id) values
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001');
-- Estagiária: vê o portal, mas não pode aprovar
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c4', 'client');
insert into public.client_members (client_id, user_id, tenant_id, can_approve) values
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c4', '10000000-0000-0000-0000-000000000001', false);
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'proposta', 'Retorno', now());

-- Proposta aceita (atalho: o fluxo do aceite já é coberto no s2)
insert into public.proposals (id, tenant_id, client_id, deal_id, project_type, phases, hours_total, total_cents, launch_date)
values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000002', 'Site com agenda',
        '[{"nome":"Diagnóstico","quando":"feito"},{"nome":"Design","quando":"semana 1"},{"nome":"Construção","quando":"semanas 2 e 3"},{"nome":"Lançamento","quando":"semana 4"}]',
        42, 1200000, current_date + 30);
update public.proposals set status = 'aceita', token = repeat('c', 64), sent_at = now(), accepted_at = now(),
       accept_data = '{"nome":"Paula Viana"}', snapshot = '{"mensalidade":{"nome":"Evolução","cents":120000}}'
 where id = '40000000-0000-0000-0000-000000000001';

-- Proposta com valores no limite também vira projeto (o aceite do cliente nunca falha por isso)
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'proposta', 'Retorno', now());
insert into public.proposals (id, tenant_id, client_id, deal_id, project_type, hours_total, total_cents)
values ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000003', 'X', 99999.9, 2000000000);
update public.proposals set status = 'aceita', token = repeat('e', 64), sent_at = now(), accepted_at = now(),
       accept_data = '{"nome":"Bruno"}', snapshot = '{"mensalidade":{"nome":"Plano grande","cents":90000000}}'
 where id = '40000000-0000-0000-0000-000000000002';
select is((select name || ':' || value_cents || ':' || monthly_cents from public.projects
            where proposal_id = '40000000-0000-0000-0000-000000000002'), 'Projeto:100000000:90000000',
  'Valores no limite não travam o aceite');
delete from public.projects where proposal_id = '40000000-0000-0000-0000-000000000002';

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;
insert into t select 'proj', jsonb_build_object('id', id) from public.projects where proposal_id = '40000000-0000-0000-0000-000000000001';

select is((select count(*) from public.projects where proposal_id = '40000000-0000-0000-0000-000000000001')::int, 1,
  'Aceite cria o projeto sozinho');
select is((select string_agg(status::text, ',' order by position) from public.project_phases
            where project_id = (select (valor->>'id')::uuid from t where chave = 'proj')),
  'concluida,andamento,pendente,pendente', 'Diagnóstico concluído e Design em andamento');
select is((select plan_name || ':' || monthly_cents || ':' || hours_estimated from public.projects
            where proposal_id = '40000000-0000-0000-0000-000000000001'), 'Evolução:120000:42.0', 'Plano, mensal e horas vêm da proposta');
select is((select count(*) from public.launch_items where project_id = (select (valor->>'id')::uuid from t where chave = 'proj'))::int,
  6, 'Checklist padrão com a mensalidade');
select is((select count(*) from public.event_outbox where event = 'projeto.criado'
                and payload->>'proposta_id' = '40000000-0000-0000-0000-000000000001')::int, 1, 'Evento projeto.criado para o n8n');

-- ===== Yuri (dono) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

insert into t select 'ap', public.aprovacao_pedir((select (valor->>'id')::uuid from t where chave = 'proj'), 'Layout da página inicial',
  'Confira o layout', array['Página inicial', 'Cores e fontes'], 'https://previa.foradopapel.test/sorriso',
  (select id from public.project_phases where project_id = (select (valor->>'id')::uuid from t where chave = 'proj') and position = 2));
select throws_ok(format($$ select public.projeto_fase_concluir(%L) $$,
    (select id from public.project_phases where project_id = (select (valor->>'id')::uuid from t where chave = 'proj') and position = 2)),
  '22023', null, 'Fase esperando o cliente não conclui pelo Hub');
select throws_ok(format($$ select public.aprovacao_pedir(%L, 'Prévia', null, null, 'http://inseguro.test') $$,
    (select valor->>'id' from t where chave = 'proj')), '22023', null, 'Prévia só com https');
insert into t select 'pend', public.pendencia_criar((select (valor->>'id')::uuid from t where chave = 'proj'), 'Enviar as fotos da equipe',
  null, current_date - 1);
select lives_ok(format($$ select public.horas_lancar(%L, current_date, 90, 'Layout') $$, (select valor->>'id' from t where chave = 'proj')),
  'Lança 1h30');
select throws_ok(format($$ select public.horas_lancar(%L, current_date, 1500) $$, (select valor->>'id' from t where chave = 'proj')),
  '22023', null, 'Mais de 24 h num lançamento é recusado');
select throws_ok(format($$ select public.horas_lancar(%L, current_date + 2, 60) $$, (select valor->>'id' from t where chave = 'proj')),
  '22023', null, 'Horas no futuro são recusadas');
select throws_ok(format($$ select public.projeto_lancar(%L) $$, (select valor->>'id' from t where chave = 'proj')),
  '22023', null, 'Lançar com checklist incompleto é travado');

insert into t select 'ped', public.pedido_registrar('20000000-0000-0000-0000-000000000002', 'Página de convênios',
  'Uma página nova com os convênios', 'whatsapp');
select is((select valor->>'codigo' from t where chave = 'ped'), 'CS-01', 'Código do pedido com a sigla do cliente');
select is((select (public.pedido_classificar((select (valor->>'id')::uuid from t where chave = 'ped'), 'adicional', 3)) ->> 'value_cents'),
  '90000', 'Serviço adicional: 3 h × hora de referência');
select throws_ok(format($$ select public.pedido_iniciar(%L) $$, (select valor->>'id' from t where chave = 'ped')),
  '22023', null, 'Serviço adicional não começa sem aprovação do cliente');
select is((select (public.pedido_enviar_cliente((select (valor->>'id')::uuid from t where chave = 'ped'))) ->> 'status'),
  'aguardando_cliente', 'Serviço adicional vai para o cliente decidir');
insert into t select 'ped2', public.pedido_registrar('20000000-0000-0000-0000-000000000002', 'Trocar telefone do rodapé', null, 'reuniao');
select is((select (public.pedido_classificar((select (valor->>'id')::uuid from t where chave = 'ped2'), 'escopo', 0.5)) ->> 'status'),
  'fazendo', 'Pedido dentro do combinado vai direto para Fazendo');

insert into t select 'otica', public.projeto_criar('20000000-0000-0000-0000-000000000001', 'Site da ótica', 1650000, 50);
insert into t select 'ap_otica', public.aprovacao_pedir((select (valor->>'id')::uuid from t where chave = 'otica'), 'Catálogo');
select lives_ok($$ select public.portal_convidar('20000000-0000-0000-0000-000000000001', ' bruno@otica.test ') $$, 'Convite por e-mail');
select throws_ok($$ select public.portal_convidar('20000000-0000-0000-0000-000000000001', 'yuri@foradopapel.test') $$,
  '22023', null, 'E-mail de dono não vira cliente');

-- ===== Outra agência =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*) from public.projects)::int + (select count(*) from public.requests)::int, 0,
  'Outra agência não vê projetos nem pedidos');
select throws_ok(format($$ select public.projeto_detalhe(%L) $$, (select valor->>'id' from t where chave = 'proj')),
  'P0002', null, 'Outra agência não abre o projeto');

-- ===== Estagiária (sem permissão de aprovar) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select throws_ok(format($$ select public.portal_aprovar(%L) $$, (select valor->>'id' from t where chave = 'ap')),
  '42501', null, 'Quem não pode aprovar não aprova entrega');
select throws_ok(format($$ select public.portal_adicional_decidir(%L, true) $$, (select valor->>'id' from t where chave = 'ped')),
  '42501', null, 'Quem não pode aprovar não decide serviço adicional');

-- ===== Cliente do portal (Paula, Sorriso) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*) from public.projects)::int + (select count(*) from public.time_entries)::int
        + (select count(*) from public.project_tasks)::int + (select count(*) from public.project_events)::int, 0,
  'Cliente não lê tabelas internas (horas, tarefas, eventos)');
select is((public.portal_pendencias()) ->> 'total', '3', 'Precisa de você: 1 entrega, 1 serviço adicional, 1 pendência');
select ok(not ((public.portal_inicio()) -> 'projeto' ? 'horas_estimadas'), 'Início do portal sem horas internas');
select throws_ok(format($$ select public.portal_aprovar(%L) $$, (select valor->>'id' from t where chave = 'ap_otica')),
  'P0002', null, 'Cliente não aprova entrega de outra empresa');
select is((public.portal_aprovar((select (valor->>'id')::uuid from t where chave = 'ap'), 'Ficou ótimo')) ->> 'repetido', 'false',
  'Cliente aprova a entrega');
select is((public.portal_aprovar((select (valor->>'id')::uuid from t where chave = 'ap'))) ->> 'repetido', 'true',
  'Aprovar de novo não muda nada');
select lives_ok(format($$ select public.portal_adicional_decidir(%L, true) $$, (select valor->>'id' from t where chave = 'ped')),
  'Cliente aprova o serviço adicional');
select is((public.portal_pedido_criar('Novo banner de campanha')) ->> 'codigo', 'CS-03', 'Pedido feito pelo portal');

-- ===== Convidado (Bruno, Ótica) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is((public.portal_aceitar_convite()) ->> 'ligados', '0', 'E-mail sem convite não ganha acesso');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select throws_ok($$ select public.portal_pendencias() $$, '42501', null, 'Antes do convite aceito, sem portal');
select is((public.portal_aceitar_convite()) ->> 'ligados', '0', 'E-mail ainda não confirmado não liga o convite');
reset role;
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000c2';
set local role authenticated;
select is((public.portal_aceitar_convite()) ->> 'ligados', '1', 'Primeiro acesso liga o e-mail convidado');
select is((public.portal_inicio()) ->> 'empresa', 'Ótica Visão Clara', 'Convidado vê só a própria empresa');

-- ===== Yuri de novo =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok(format($$ select public.pedido_classificar(%L, 'adicional', 40) $$, (select valor->>'id' from t where chave = 'ped')),
  '22023', null, 'Depois do sim do cliente, o preço não muda');
select is((public.pedido_iniciar((select (valor->>'id')::uuid from t where chave = 'ped'))) ->> 'status', 'fazendo',
  'Depois do sim do cliente, o serviço adicional começa');
select ok(exists (select 1 from jsonb_array_elements((public.painel_novidades()) -> 'novidades') x
                   where x->>'tipo' = 'aprovacao_aprovada'), 'Aprovação do cliente aparece nas Novidades');
select public.encerramento_marcar(id, true) from public.launch_items
 where project_id = (select (valor->>'id')::uuid from t where chave = 'proj');
select is((public.projeto_lancar((select (valor->>'id')::uuid from t where chave = 'proj'))) ->> 'status', 'mensalidade',
  'Com o checklist completo, o projeto vai para a mensalidade');

-- ===== Visitante =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select public.portal_pendencias() $$, '42501', null, 'Anon não usa o portal');
reset role;

select is((select string_agg(status::text, ',' order by position) from public.project_phases
            where project_id = (select (valor->>'id')::uuid from t where chave = 'proj')),
  'concluida,concluida,concluida,concluida', 'Aprovação concluiu o Design e o lançamento fechou as fases');

select * from finish();
rollback;
