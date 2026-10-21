-- REV-3: revisão geral. Permissões, link novo ao reabrir, lançar dá data às parcelas, encerrar mensalidade
-- conclui o projeto, cancelar projeto, adicional recusado depois de pago, fila do Painel, contas no portal,
-- fechado no mês pela proposta aceita e valor travado.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@sorriso.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ótica Visão Clara', 'Bruno Alves', '79900000003'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso Leve', 'Paula Viana', '79900000001');
insert into public.client_members (client_id, user_id, tenant_id) values
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001');
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'proposta', 'Retorno', now()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'proposta', 'Retorno', now());

-- Proposta aceita (Clínica) com 3 partes e plano
insert into public.proposals (id, tenant_id, client_id, deal_id, project_type, total_cents, hours_total)
values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000002', 'Site com agenda', 1200000, 40);
update public.proposals set status = 'aceita', token = repeat('c', 64), sent_at = now(), accepted_at = now(),
       accept_data = '{"nome":"Paula Viana"}',
       snapshot = '{"investimento":{"total_cents":1200000,"parcelas":[{"pct":40,"quando":"no aceite","cents":480000},{"pct":30,"quando":"na entrega de um ciclo","cents":360000},{"pct":30,"quando":"na entrega final","cents":360000}]},"mensalidade":{"nome":"Evolução","cents":120000,"infra_cents":4500}}'
 where id = '40000000-0000-0000-0000-000000000001';
-- Proposta enviada (Ótica)
insert into public.proposals (id, tenant_id, client_id, deal_id, project_type, total_cents, hours_total)
values ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001', 'Loja', 500000, 20);
update public.proposals set status = 'enviada', token = repeat('e', 64), snapshot = '{}', sent_at = now(), expires_at = now() + interval '10 days'
 where id = '40000000-0000-0000-0000-000000000002';

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;
insert into t select 'proj', to_jsonb(id::text) from public.projects where proposal_id = '40000000-0000-0000-0000-000000000001';

-- 1. Permissões
select ok(not has_table_privilege('authenticated', 'public.event_outbox', 'TRUNCATE')
          and not has_table_privilege('authenticated', 'public.event_outbox', 'DELETE'),
  'Ninguém logado apaga a fila de integrações');
select ok(not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                       where n.nspname = 'public' and c.relkind = 'r'
                         and has_table_privilege('authenticated', c.oid, 'TRUNCATE')),
  'Nenhuma tabela aceita TRUNCATE de quem está logado');

-- CX-0: quem tinha acesso antes dos perfis é responsável pelo contrato (quem não aprova fica como equipe)
update public.client_members set profile = 'responsavel' where can_approve;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- 2. Reabrir troca o link
select public.proposta_reabrir('40000000-0000-0000-0000-000000000002');
reset role;
select is((select token from public.proposals where id = '40000000-0000-0000-0000-000000000002'), null,
  'Reabrir apaga o link antigo (o próximo envio gera outro)');

-- 9. Valor travado e fechado do mês
select throws_ok($$ update public.deals set value_cents = 5 where id = '30000000-0000-0000-0000-000000000002' $$,
  '22023', null, 'Valor da oportunidade fechada por aceite não muda');
update public.deals set stage = 'fechado', closed_at = now() where id = '30000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(((public.painel_novidades()) ->> 'fechado_mes_cents')::int, 1200000, 'Fechado no mês usa o total da proposta aceita');

-- 3. Lançar dá data às partes "na entrega"
reset role;
update public.launch_items set done = true where project_id = (select (valor #>> '{}')::uuid from t where chave = 'proj');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.projeto_lancar((select (valor #>> '{}')::uuid from t where chave = 'proj'));
select is((select count(*) from public.charges where project_id = (select (valor #>> '{}')::uuid from t where chave = 'proj')
            and kind = 'parcela' and due_date is null)::int, 0, 'Lançar dá vencimento a todas as partes');
reset role;
select is((select due_date from public.charges where project_id = (select (valor #>> '{}')::uuid from t where chave = 'proj')
            and kind = 'parcela' and sequence = 3), public._hoje('10000000-0000-0000-0000-000000000001') + 3,
  'Parte "na entrega final" vence 3 dias depois do lançamento');

-- 7 e 8. Fila do Painel e contas no portal
update public.charges set due_date = current_date - 5 where proposal_id = '40000000-0000-0000-0000-000000000001' and sequence = 1;
update public.charges set client_reported_at = now() where proposal_id = '40000000-0000-0000-0000-000000000001' and sequence = 2;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select ok((public.painel_fila()) -> 'itens' @> '[{"tipo":"cobranca_atrasada"}]', 'Fila do Painel mostra cobrança atrasada');
select ok((public.painel_fila()) -> 'itens' @> '[{"tipo":"pagamento_avisado"}]', 'Fila do Painel mostra aviso de pagamento');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(((public.portal_pendencias()) ->> 'pagamentos')::int, 2,
  'Portal conta as partes vencidas ou vencendo, menos a que o cliente já avisou');
select is(((public.portal_pendencias()) ->> 'total')::int, ((public.portal_pendencias()) ->> 'aprovacoes')::int
          + ((public.portal_pendencias()) ->> 'pendencias')::int + ((public.portal_pendencias()) ->> 'pagamentos')::int,
  'Total do portal é a soma dos selos');

-- 4. Encerrar a mensalidade conclui o projeto
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.mensalidade_situacao((select id from public.subscriptions
  where project_id = (select (valor #>> '{}')::uuid from t where chave = 'proj')), 'encerrada');
select is((select status::text from public.projects where id = (select (valor #>> '{}')::uuid from t where chave = 'proj')),
  'concluido', 'Encerrar a mensalidade conclui o projeto');

-- 6. Adicional recusado depois de pago
reset role;
insert into public.projects (id, tenant_id, client_id, name) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Loja');
insert into public.requests (id, tenant_id, client_id, project_id, code, title, status, classification, value_cents)
values ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000001', 'P-01', 'Página extra', 'aguardando_cliente', 'adicional', 100000);
update public.requests set client_decision = 'aprovado', decided_at = now(), status = 'fazendo'
 where id = '70000000-0000-0000-0000-000000000001';
update public.charges set status = 'paga', paid_at = current_date, paid_cents = 50000, paid_method = 'pix', receipt_number = 900
 where request_id = '70000000-0000-0000-0000-000000000001' and sequence = 1;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(((public.pedido_recusar('70000000-0000-0000-0000-000000000001', 'Cliente desistiu')) ->> 'pago_cents')::int, 50000,
  'Recusar adicional pago informa o valor já pago');
select ok((public.painel_fila()) -> 'itens' @> '[{"tipo":"adicional_pago_recusado"}]',
  'Fila do Painel lembra de combinar crédito ou devolução');
select is((select status::text from public.charges where request_id = '70000000-0000-0000-0000-000000000001' and sequence = 2),
  'cancelada', '2ª parte do adicional recusado é cancelada');

-- 5. Cancelar projeto
reset role;
insert into public.charges (tenant_id, client_id, project_id, kind, description, amount_cents, due_date)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
        'avulsa', 'Domínio', 9000, current_date + 10);
insert into public.client_tasks (tenant_id, client_id, project_id, title) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Logo');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$ select public.projeto_cancelar('50000000-0000-0000-0000-000000000001', 'ok') $$,
  '22023', null, 'Cancelar exige motivo');
select is(((public.projeto_cancelar_previa('50000000-0000-0000-0000-000000000001')) ->> 'cobrancas')::int, 1,
  'Prévia mostra a cobrança aberta que será cancelada');
select lives_ok($$ select public.projeto_cancelar('50000000-0000-0000-0000-000000000001', 'Cliente desistiu do projeto') $$,
  'Dono cancela o projeto');
reset role;
select ok((select canceled_at is not null and status = 'concluido' from public.projects where id = '50000000-0000-0000-0000-000000000001')
          and not exists (select 1 from public.charges where project_id = '50000000-0000-0000-0000-000000000001' and status = 'aberta')
          and not exists (select 1 from public.client_tasks where project_id = '50000000-0000-0000-0000-000000000001'),
  'Cancelado: sem cobranças abertas nem pendências do cliente');

select * from finish();
rollback;
