-- S1: funil, clientes e ficha. Isolamento, escrita só por RPC, versão,
-- linha do tempo + eventos e pedido do site virando contato.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra-agencia@test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@sorriso.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Agência', 'outra-agencia');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso Leve', 'Paula Viana', '79900000001');
insert into public.client_members (client_id, user_id, tenant_id) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

-- ===== Yuri (dono) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

insert into t values ('a', public.funil_criar_contato('Ateliê Maré', 'Lia Fontes', '(79) 9 0000-0101', null,
  'anuncio_meta', 'Primeiro contato pelo WhatsApp', current_date));
select is((select (valor->>'reaproveitado')::boolean from t where chave = 'a'), false, 'Cria ficha e oportunidade');
select is((select stage::text from public.deals where id = (select (valor->>'deal_id')::uuid from t where chave = 'a')),
  'contato', 'Nova oportunidade começa em Contato');
select is((select count(*) from public.deal_events where kind = 'contato_criado')::int, 1, 'Criação vai para a linha do tempo');
select is((select count(*) from public.event_outbox where event = 'contato.criado')::int, 1, 'Criação gera evento para o n8n');

insert into t values ('a2', public.funil_criar_contato('Ateliê Maré', 'Lia', '79900000101', null,
  'instagram', 'Outro passo', current_date));
select is((select (valor->>'reaproveitado')::boolean from t where chave = 'a2'), true, 'Mesmo WhatsApp não duplica');
select is((select count(*) from public.deals)::int, 1, 'Continua uma oportunidade só');

select throws_ok($$ insert into public.deals (tenant_id, client_id, next_step, next_step_at)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'x', now()) $$,
  '42501', null, 'Escrita direta em deals é recusada');
select throws_ok($$ update public.deals set stage = 'fechado' $$, '42501', null, 'Update direto é recusado');

select throws_ok($$ select public.funil_criar_contato('X', 'Y', null, null, 'outro', 'Passo', current_date) $$,
  '22023', null, 'Sem WhatsApp nem e-mail é recusado');
select throws_ok($$ select public.funil_criar_contato('X', 'Y', '79900000999', null, 'outro', null, current_date) $$,
  '22023', null, 'Sem próximo passo é recusado');

-- Mover com versão antiga
select throws_ok(format($$ select public.funil_mover(%L, 'diagnostico', '2000-01-01'::timestamptz) $$,
  (select valor->>'deal_id' from t where chave = 'a')), 'PT409', null, 'Versão antiga é recusada');

-- Mover com versão certa
insert into t select 'm', public.funil_mover(d.id, 'diagnostico', d.updated_at) from public.deals d;
select is((select stage::text from public.deals), 'diagnostico', 'Muda de etapa');
select is((select count(*) from public.deal_events where kind = 'etapa_alterada')::int, 1, 'Etapa na linha do tempo');
select is((select count(*) from public.event_outbox where event = 'oportunidade.etapa_alterada')::int, 1, 'Etapa gera evento');

-- Atualizar: tirar o próximo passo de etapa aberta é recusado
select throws_ok(format($$ select public.funil_atualizar(%L, null, '{"proximo_passo": ""}'::jsonb) $$,
  (select id from public.deals)), '22023', null, 'Etapa aberta sem próximo passo é recusada');
select lives_ok(format($$ select public.funil_atualizar(%L, null, '{"valor_cents": 200000, "diagnostico": "essencial", "diagnostico_pago": true}'::jsonb) $$,
  (select id from public.deals)), 'Atualiza valor e diagnóstico');
select is((select value_cents from public.deals), 200000, 'Valor em centavos');

-- Arquivar
select throws_ok(format($$ select public.funil_arquivar(%L, null, null, null) $$, (select id from public.deals)),
  '22023', null, 'Arquivar sem motivo é recusado');
select throws_ok(format($$ select public.funil_arquivar(%L, 'outro', '  ', null) $$, (select id from public.deals)),
  '22023', null, 'Motivo "outro" exige nota');
select lives_ok(format($$ select public.funil_arquivar(%L, 'preco', null, null) $$, (select id from public.deals)), 'Arquiva com motivo');
select is((public.funil_resumo('arquivados') -> 'filtros' ->> 'arquivados')::int, 1, 'Resumo conta arquivados');
select lives_ok(format($$ select public.funil_desarquivar(%L, null) $$, (select id from public.deals)), 'Desarquiva');
select is((select stage::text from public.deals), 'diagnostico', 'Volta para a etapa em que estava');

select is(jsonb_array_length(public.painel_hoje() -> 'itens'), 1, 'Painel mostra o passo de hoje');
select is((public.clientes_resumo() ->> 'negociacao')::int, 1, 'Resumo de clientes conta quem está em negociação');

-- ===== Outra agência =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*) from public.v_funil)::int, 0, 'Outra agência não vê o funil da Fora do Papel');
select throws_ok(format($$ select public.funil_mover(%L, 'proposta', null) $$, (select (valor->>'deal_id') from t where chave = 'a')),
  'P0002', null, 'Outra agência não move oportunidade alheia');

-- ===== Paula (cliente do portal) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*) from public.deals)::int + (select count(*) from public.deal_events)::int
          + (select count(*) from public.client_notes)::int, 0, 'Cliente do portal não vê nada do funil');
select throws_ok($$ select public.funil_criar_contato('X', 'Y', '79900000888', null, 'outro', 'P', current_date) $$,
  '42501', null, 'Cliente do portal não cria contato');

-- ===== Visitante do site =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select public.site_registrar_contato('horario', 'renata@escola.test', true, 'Renata Prado', '(79) 9 0000-0202',
  'Sistemas sob medida', 'Quero organizar as matrículas', now() + interval '2 days', '{}'::jsonb, '11_50');
reset role;
select is((select d.next_step from public.deals d join public.clients c on c.id = d.client_id where c.email = 'renata@escola.test'),
  'Confirmar horário pelo WhatsApp', 'Pedido de horário do site vira contato com próximo passo');
select is((select origin::text from public.clients where email = 'renata@escola.test'), 'site', 'Origem Site');

select * from finish();
rollback;
