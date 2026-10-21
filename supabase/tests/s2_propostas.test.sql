-- S2: propostas. Conta no banco, envio com pendências, link do cliente,
-- aceite fecha a oportunidade, isolamento e anon sem tabelas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

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
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ótica Visão Clara', 'Bruno Alves', '79900000003'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso Leve', 'Paula Viana', '79900000001');
insert into public.client_members (client_id, user_id, tenant_id) values
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001');
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'mapeamento', 'Montar proposta', now()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'diagnostico', 'Montar proposta', now());
update public.deals set diagnostic_tier = 'essencial', diagnostic_paid = true where id = '30000000-0000-0000-0000-000000000002';

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

select isnt((select diagnostic_paid_at from public.deals where id = '30000000-0000-0000-0000-000000000002'), null,
  'Diagnóstico pago ganha a data sozinho');

-- ===== Yuri (dono) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

insert into t values ('otica', public.proposta_criar('30000000-0000-0000-0000-000000000001'));
insert into t values ('sorriso', public.proposta_criar('30000000-0000-0000-0000-000000000002'));
select is((public.proposta_criar('30000000-0000-0000-0000-000000000001') ->> 'reaproveitada')::boolean, true,
  'Segunda proposta para a mesma oportunidade reaproveita o rascunho');
select is((select count(*) from public.pricing_plans)::int, 3, 'Planos de mensalidade criados para o tenant');

-- Ótica: 50 h × R$ 300, simples, 10% → R$ 16.500
insert into t select 'otica_s', public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'otica'), null,
  '{"itens":[{"nome":"Design das páginas","horas":10},{"nome":"Página inicial","horas":6},{"nome":"Catálogo","horas":10},
            {"nome":"Painel de edição","horas":8},{"nome":"Pedido de orçamento","horas":4},{"nome":"Contato","horas":4},
            {"nome":"Guia do painel","horas":4},{"nome":"Lançamento","horas":4}]}'::jsonb);
select is((select (valor->'calculo'->>'total_cents')::int from t where chave = 'otica_s'), 1650000, 'Ótica: R$ 16.500 como no canvas');
select is((select (valor->'calculo'->>'valor_hora_cents')::int from t where chave = 'otica_s'), 33000, 'Ótica: R$ 330 por hora');
select is((select jsonb_array_length(valor->'calculo'->'parcelas') from t where chave = 'otica_s'), 3, 'Acima de R$ 10.000: 3 partes');
select is((select (valor->'calculo'->'parcelas'->0->>'cents')::int from t where chave = 'otica_s'), 660000, '40% no aceite: R$ 6.600');

-- Sorriso: 42 h → R$ 13.860 → arredonda R$ 14.000 − diagnóstico R$ 2.000 = R$ 12.000
insert into t select 'sorriso_s', public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'sorriso'), null,
  '{"itens":[{"nome":"Site com painel","horas":42}]}'::jsonb);
select is((select (valor->'calculo'->>'projeto_cents')::int from t where chave = 'sorriso_s'), 1400000, 'Sorriso: arredonda para R$ 14.000');
select is((select (valor->'calculo'->>'total_cents')::int from t where chave = 'sorriso_s'), 1200000, 'Sorriso: R$ 12.000 com o diagnóstico descontado');

-- Envio com pendências é travado
select throws_ok(format($$ select public.proposta_enviar(%L, null) $$, (select valor->>'id' from t where chave = 'otica')),
  '22023', null, 'Proposta com pendências não envia');

-- Desconto abaixo do piso sem motivo continua pendente
insert into t select 'otica_d', public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'otica'), null,
  '{"desconto_cents": 500000}'::jsonb);
select ok((select (valor->'calculo'->>'abaixo_do_piso')::boolean from t where chave = 'otica_d'), 'Desconto grande fica abaixo do piso');
select ok(exists (select 1 from t, jsonb_array_elements(valor->'calculo'->'pendencias') x
                   where chave = 'otica_d' and x->>'chave' = 'valor_hora'), 'Abaixo do piso sem motivo é pendência');

-- Completa tudo e envia (preços conferidos em Configurações)
select public.precos_salvar('{}'::jsonb, null);
insert into t select 'otica_ok', public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'otica'), null,
  jsonb_build_object('tipo', 'Site com catálogo', 'titulo', 'Um site que mostra as armações', 'desconto_cents', 0,
    'fora', '[{"item":"Sessão de fotos","motivo":"As fotos vêm da ótica"}]'::jsonb,
    'plano_id', (select id from public.pricing_plans where name = 'Evolução'),
    'conferencias', '{"escopo":true,"prazo":true,"contato":true}'::jsonb));
select ok((select (valor->'calculo'->>'pronto')::boolean from t where chave = 'otica_ok'), 'Sem pendências');
insert into t select 'env', public.proposta_enviar((select (valor->>'id')::uuid from t where chave = 'otica'), null);
select is((select status::text from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'otica')),
  'enviada', 'Proposta enviada');
select is((select stage::text || ':' || value_cents from public.deals where id = '30000000-0000-0000-0000-000000000001'),
  'proposta:1650000', 'Oportunidade vai para Proposta com o valor');
select is((select count(*) from public.event_outbox where event = 'proposta.enviada')::int, 1, 'Envio gera evento para o n8n');
select throws_ok(format($$ select public.proposta_salvar(%L, null, '{"titulo":"x"}') $$, (select valor->>'id' from t where chave = 'otica')),
  '22023', null, 'Proposta enviada não é editada sem reabrir');

-- ===== Outra agência =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*) from public.proposals)::int, 0, 'Outra agência não vê propostas');
select throws_ok(format($$ select public.proposta_detalhe(%L) $$, (select valor->>'id' from t where chave = 'otica')),
  'P0002', null, 'Outra agência não abre a proposta');

-- ===== Cliente do portal =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*) from public.proposals)::int + (select count(*) from public.pricing_settings)::int, 0,
  'Cliente do portal não lê propostas nem preços');

-- ===== Visitante com o link =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select count(*) from public.proposals $$, '42501', null, 'Anon não lê a tabela de propostas');
select is(public.proposta_publica(repeat('a', 64)) ->> 'estado', 'invalido', 'Link errado não abre nada');
select is(public.proposta_publica((select valor->>'token' from t where chave = 'env')) ->> 'estado', 'enviada', 'Link certo abre a proposta');
select ok(not ((public.proposta_publica((select valor->>'token' from t where chave = 'env')) -> 'documento' -> 'itens' -> 0) ? 'horas'),
  'Cliente não vê as horas internas');
select throws_ok(format($$ select public.proposta_aceitar(%L, 1, 'Bruno Alves', 'bruno@otica.test', '111.111.111-11',
    'Ótica Visão Clara Ltda', 'Rua das Flores, 100, Aracaju', null, null, true) $$, (select valor->>'token' from t where chave = 'env')),
  '22023', null, 'Documento inválido é recusado');
select throws_ok(format($$ select public.proposta_aceitar(%L, 1, 'Bruno Alves', 'bruno@otica.test', '11.222.333/0001-81',
    'Ótica Visão Clara Ltda', 'Rua das Flores, 100, Aracaju', null, null, false) $$, (select valor->>'token' from t where chave = 'env')),
  '22023', null, 'Sem "Li e concordo" não aceita');
select is((public.proposta_aceitar((select valor->>'token' from t where chave = 'env'), 1, 'Bruno Alves', 'bruno@otica.test',
    '11.222.333/0001-81', 'Ótica Visão Clara Ltda', 'Rua das Flores, 100, Aracaju', null, null, true)) ->> 'repetido',
  'false', 'Aceite com CNPJ válido');
select is((public.proposta_aceitar((select valor->>'token' from t where chave = 'env'), 1, 'Bruno Alves', 'bruno@otica.test',
    '11.222.333/0001-81', 'Ótica Visão Clara Ltda', 'Rua das Flores, 100, Aracaju', null, null, true)) ->> 'repetido',
  'true', 'Aceitar de novo devolve o mesmo comprovante');
reset role;

-- CX-4: o aceite deixa o portal pronto para quem aceitou
select is((select profile from public.portal_invites where client_id = '20000000-0000-0000-0000-000000000001'
            and email = 'bruno@otica.test' and accepted_at is null), 'responsavel',
  'Aceite cria convite do portal como responsável pelo contrato');
select is((select count(*) from public.portal_invites where client_id = '20000000-0000-0000-0000-000000000001')::int, 1,
  'Aceitar de novo não duplica o convite');
select is(public.proposta_publica((select valor->>'token' from t where chave = 'env')) -> 'aceite' ->> 'email',
  'bruno@otica.test', 'Proposta aceita devolve o e-mail para abrir o portal');

select is((select stage::text from public.deals where id = '30000000-0000-0000-0000-000000000001'), 'fechado',
  'Aceite fecha a oportunidade no funil');
select is((select document_number from public.clients where id = '20000000-0000-0000-0000-000000000001'), '11222333000181',
  'Dados do contrato vão para a ficha');

-- Vencida: aceite recusado
update public.proposals set status = 'enviada', token = repeat('b', 64), sent_at = now() - interval '20 days',
  expires_at = now() - interval '1 day', snapshot = '{}'::jsonb
 where id = (select (valor->>'id')::uuid from t where chave = 'sorriso');
set local role anon;
select throws_ok($$ select public.proposta_aceitar(repeat('b', 64), 1, 'Paula Viana', 'paula@sorriso.test', '529.982.247-25',
    'Paula Viana', 'Av. Beira Mar, 200, Aracaju', null, null, true) $$, '22023', null, 'Proposta vencida não aceita');
reset role;

select * from finish();
rollback;
