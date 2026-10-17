-- S4: financeiro. Parcelas no aceite, diagnóstico do funil, serviço adicional 50/50,
-- mensalidade sem duplicar, recibo sequencial, portal só da própria empresa, isolamento.
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
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'diagnostico', 'Diagnóstico', now()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'proposta', 'Retorno', now());

-- Proposta aceita com 3 partes
insert into public.proposals (id, tenant_id, client_id, deal_id, project_type, total_cents, hours_total)
values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000002', 'Site com agenda', 1200000, 40);
update public.proposals set status = 'aceita', token = repeat('c', 64), sent_at = now(), accepted_at = now(),
       accept_data = '{"nome":"Paula Viana"}',
       snapshot = '{"investimento":{"total_cents":1200000,"parcelas":[{"pct":40,"quando":"no aceite","cents":480000},{"pct":30,"quando":"na entrega de um ciclo","cents":360000},{"pct":30,"quando":"na entrega final","cents":360000}]},"mensalidade":{"nome":"Evolução","cents":120000,"infra_cents":4500}}'
 where id = '40000000-0000-0000-0000-000000000001';

select is((select count(*) from public.charges where proposal_id = '40000000-0000-0000-0000-000000000001')::int, 3,
  'Aceite cria as 3 parcelas');
select is((select sum(amount_cents) from public.charges where proposal_id = '40000000-0000-0000-0000-000000000001')::int, 1200000,
  'Soma das parcelas igual ao total');
select is((select due_date from public.charges where proposal_id = '40000000-0000-0000-0000-000000000001' and sequence = 1),
  current_date + 3, '1ª parte vence 3 dias depois do aceite');
select ok((select due_date is null and due_label = 'na entrega final' from public.charges
            where proposal_id = '40000000-0000-0000-0000-000000000001' and sequence = 3), 'Última parte fica "na entrega"');
select isnt((select project_id from public.charges where proposal_id = '40000000-0000-0000-0000-000000000001' and sequence = 1), null,
  'Parcela ligada ao projeto criado no aceite');

-- Diagnóstico no funil
update public.deals set diagnostic_tier = 'essencial' where id = '30000000-0000-0000-0000-000000000001';
select is((select amount_cents || ':' || status from public.charges where deal_id = '30000000-0000-0000-0000-000000000001' and kind = 'diagnostico'),
  '200000:aberta', 'Pacote escolhido gera a cobrança do diagnóstico');
update public.deals set diagnostic_paid = true where id = '30000000-0000-0000-0000-000000000001';
select is((select status::text || ':' || receipt_number from public.charges where deal_id = '30000000-0000-0000-0000-000000000001' and kind = 'diagnostico'),
  'paga:1', 'Pago no funil fica pago no financeiro, com recibo 1');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;
insert into t select 'p2', to_jsonb(id::text) from public.charges
 where proposal_id = '40000000-0000-0000-0000-000000000001' and sequence = 2;
insert into t select 'diag', to_jsonb(id::text) from public.charges
 where deal_id = '30000000-0000-0000-0000-000000000001' and kind = 'diagnostico';

-- ===== Yuri =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into t select 'p1', to_jsonb((select id from public.charges where proposal_id = '40000000-0000-0000-0000-000000000001' and sequence = 1)::text);
select is((public.cobranca_pagar((select (valor #>> '{}')::uuid from t where chave = 'p1'), current_date, 480000, 'pix')) ->> 'recibo',
  '2', 'Pagamento registrado ganha o recibo seguinte');
select throws_ok(format($$ select public.cobranca_pagar(%L, current_date, 480000, 'pix') $$, (select valor #>> '{}' from t where chave = 'p1')),
  '22023', null, 'Não paga duas vezes');
select is((public.recibo((select (valor #>> '{}')::uuid from t where chave = 'p1'))) ->> 'numero', '2', 'Recibo abre para o dono');
select throws_ok(format($$ select public.cobranca_atualizar(%L, '{"valor_cents": 100}') $$,
    (select (valor #>> '{}')::uuid from t where chave = 'p2')),
  '22023', null, 'Valor de parcela combinada não muda no financeiro');
select lives_ok(format($$ select public.cobranca_atualizar(%L, jsonb_build_object('vencimento', current_date + 10)) $$,
    (select (valor #>> '{}')::uuid from t where chave = 'p2')),
  'Definir vencimento da 2ª parte');

-- Serviço adicional 50/50
insert into t select 'ped', public.pedido_registrar('20000000-0000-0000-0000-000000000002', 'Versão em inglês', null, 'whatsapp');
select public.pedido_classificar((select (valor->>'id')::uuid from t where chave = 'ped'), 'adicional', 4);
select public.pedido_enviar_cliente((select (valor->>'id')::uuid from t where chave = 'ped'));

-- Mensalidade de cliente antigo, começando no mês passado
insert into t select 'mens', public.mensalidade_criar('20000000-0000-0000-0000-000000000001', 'Essencial', 40000,
  (date_trunc('month', current_date) - interval '1 month')::date, 10, 6);
select public.financeiro_painel();
select public.financeiro_painel();
select is((select count(*) from public.charges where subscription_id = (select (valor->>'id')::uuid from t where chave = 'mens'))::int, 2,
  'Mensalidade gera mês passado e mês atual, uma vez só');
select is(((public.financeiro_painel()) -> 'numeros' ->> 'mrr_cents')::int, 40000, 'MRR soma as mensalidades ativas');

select public.despesa_salvar(null, 'Hospedagem', 'hospedagem', 5000, 'fixa', current_date);
select is(jsonb_array_length((public.financeiro_fluxo()) -> 'meses'), 7, 'Fluxo traz 3 meses para trás, o atual e 3 para frente');
select ok(((public.financeiro_fluxo()) -> 'meses' -> 3 ->> 'despesas_fixas_cents')::int = 5000, 'Despesa fixa entra no mês atual');

-- ===== Paula (cliente) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.portal_adicional_decidir((select (valor->>'id')::uuid from t where chave = 'ped'), true);
reset role;
select is((select string_agg(amount_cents::text || ':' || coalesce(due_date::text, 'entrega'), ',' order by sequence)
             from public.charges where request_id = (select (valor->>'id')::uuid from t where chave = 'ped')),
  '60000:' || (current_date + 3)::text || ',60000:entrega', 'Serviço adicional aprovado: 50% em 3 dias e 50% na entrega');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*) from public.charges)::int + (select count(*) from public.expenses)::int, 0,
  'Cliente não lê as tabelas do financeiro');
select ok(not exists (select 1 from jsonb_array_elements((public.portal_pagamentos()) -> 'cobrancas') x
                       where x->>'client_id' <> '20000000-0000-0000-0000-000000000002'), 'Portal mostra só as cobranças da empresa');
select is(((public.portal_pagamentos()) -> 'projeto' ->> 'pago_cents')::int, 480000, 'Portal mostra quanto já foi pago do projeto');
select is((public.portal_cobranca_avisar((select (valor #>> '{}')::uuid from t where chave = 'p2'))) ->> 'repetido',
  'false', 'Cliente avisa que pagou');
select throws_ok(format($$ select public.portal_cobranca_avisar(%L) $$,
    (select (valor #>> '{}')::uuid from t where chave = 'diag')),
  'P0002', null, 'Cliente não mexe em cobrança de outra empresa');
select throws_ok(format($$ select public.recibo(%L) $$,
    (select (valor #>> '{}')::uuid from t where chave = 'diag')),
  'P0002', null, 'Cliente não abre recibo de outra empresa');
select is((public.recibo((select (valor #>> '{}')::uuid from t where chave = 'p1'))) ->> 'numero', '2', 'Cliente abre o próprio recibo');

-- ===== Outra agência =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(jsonb_array_length((public.financeiro_painel()) -> 'cobrancas'), 0, 'Outra agência não vê cobranças');
select throws_ok(format($$ select public.cobranca_pagar(%L, current_date, 1, 'pix') $$,
    (select (valor #>> '{}')::uuid from t where chave = 'p2')),
  'P0002', null, 'Outra agência não registra pagamento');

-- ===== Visitante =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select public.portal_pagamentos() $$, '42501', null, 'Anon não usa os pagamentos');
reset role;

update public.launch_items set done = true
 where project_id = (select id from public.projects where proposal_id = '40000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.projeto_lancar((select id from public.projects where proposal_id = '40000000-0000-0000-0000-000000000001'));
reset role;
select is((select amount_cents || ':' || start_month from public.subscriptions
            where project_id = (select id from public.projects where proposal_id = '40000000-0000-0000-0000-000000000001')),
  '124500:' || (date_trunc('month', current_date) + interval '1 month')::date::text,
  'Lançar com plano cria a mensalidade (plano + infraestrutura) a partir do mês seguinte');

-- Correções da revisão de segurança
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok(format($$ select public.pedido_enviar_cliente(%L) $$, (select valor->>'id' from t where chave = 'ped')),
  '22023', null, 'Serviço adicional já aprovado não volta para o cliente decidir');
insert into t select 'm3', public.mensalidade_criar('20000000-0000-0000-0000-000000000002', 'Futura', 30000,
  (date_trunc('month', current_date) + interval '1 month')::date, 10, 6);
select public.mensalidade_situacao((select (valor->>'id')::uuid from t where chave = 'm3'), 'encerrada');
reset role;
update public.subscriptions set start_month = start_month where id = (select (valor->>'id')::uuid from t where chave = 'm3');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.financeiro_painel();
reset role;
select is((select count(*) from public.charges where subscription_id = (select (valor->>'id')::uuid from t where chave = 'm3'))::int, 0,
  'Mensalidade encerrada antes de começar não cobra nenhum mês');
-- Pausar e retomar no mesmo mês não deixa mês sem cobrar nem cobra a mais
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.mensalidade_situacao((select (valor->>'id')::uuid from t where chave = 'mens'), 'pausada');
select public.mensalidade_situacao((select (valor->>'id')::uuid from t where chave = 'mens'), 'ativa');
reset role;
select is((select count(*) from public.subscription_pauses where subscription_id = (select (valor->>'id')::uuid from t where chave = 'mens'))::int, 0,
  'Pausa desfeita no mesmo mês some');
-- Mês pausado não é cobrado depois (simula uma pausa no mês passado)
insert into public.subscription_pauses (tenant_id, subscription_id, from_month, to_month)
select tenant_id, id, start_month, start_month from public.subscriptions where id = (select (valor->>'id')::uuid from t where chave = 'mens');
delete from public.charges where subscription_id = (select (valor->>'id')::uuid from t where chave = 'mens');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.financeiro_painel();
reset role;
select is((select count(*) from public.charges where subscription_id = (select (valor->>'id')::uuid from t where chave = 'mens'))::int, 1,
  'Mês pausado não é cobrado (só o mês atual)');
-- Diagnóstico cancelado de propósito não volta numa edição do funil
update public.deals set diagnostic_tier = 'ampliado' where id = '30000000-0000-0000-0000-000000000002';
update public.charges set status = 'cancelada', canceled_reason = 'Cortesia ao cliente'
 where deal_id = '30000000-0000-0000-0000-000000000002' and kind = 'diagnostico';
update public.deals set next_step = 'Outro passo', diagnostic_tier = diagnostic_tier, diagnostic_paid = diagnostic_paid
 where id = '30000000-0000-0000-0000-000000000002';
select is((select count(*) from public.charges where deal_id = '30000000-0000-0000-0000-000000000002'
            and kind = 'diagnostico' and status <> 'cancelada')::int, 0, 'Diagnóstico cancelado não volta sozinho');

select is((select count(*) from public.event_outbox where event = 'financeiro.pagamento')::int, 2,
  'Cada pagamento vai para a fila do n8n');

select * from finish();
rollback;
