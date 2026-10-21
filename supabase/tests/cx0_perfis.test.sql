-- CX-0: perfis de acesso no portal. Equipe não vê nem decide nada com valor;
-- responsável vê tudo; convite leva o perfil; a empresa nunca fica sem responsável.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marina@bemcuidar.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'paula@bemcuidar.test');
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c3', 'joao@bemcuidar.test', now());
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client');
update public.profiles set full_name = 'Yuri Sousa', whatsapp = '79998341395' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Bem Cuidar', 'Marina Alves', '79900000010');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel');
insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001', 'equipe', true);
insert into public.projects (id, tenant_id, client_id, name, status, plan_name, monthly_cents) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Sistema de agendamento', 'andamento', 'Essencial', 49000);
insert into public.approvals (id, tenant_id, client_id, project_id, title) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001', 'Tela da agenda');
update public.approvals set description = 'Confira o intervalo' where id = '60000000-0000-0000-0000-000000000001';
insert into public.requests (id, tenant_id, client_id, project_id, code, title, status, classification, value_cents) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001', 'P-001', 'Lembrete de retorno', 'aguardando_cliente', 'adicional', 120000);
insert into public.charges (id, tenant_id, client_id, project_id, kind, description, amount_cents, due_date, sequence) values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001', 'parcela', '2ª parcela', 318000, public._hoje('10000000-0000-0000-0000-000000000001') + 4, 2),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001', 'parcela', '3ª parcela', 318000, public._hoje('10000000-0000-0000-0000-000000000001') + 20, 3);
insert into public.charges (id, tenant_id, client_id, project_id, kind, description, amount_cents, due_date, sequence,
                            status, paid_at, paid_cents, paid_method, receipt_number) values
  ('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001', 'parcela', '1ª parcela', 318000, current_date - 3, 1,
   'paga', now(), 318000, 'pix', 1);

set local role authenticated;

-- ===== Equipe (Paula) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select is((public.portal_minha_empresa()) ->> 'perfil', 'equipe', 'Portal sabe que a Paula é da equipe');
select throws_ok($$ select public.portal_pagamentos() $$, '42501', 'sem_permissao_financeiro', 'Equipe não abre Pagamentos');
select throws_ok($$ select public.portal_cobranca_avisar('80000000-0000-0000-0000-000000000001') $$, '42501',
  'sem_permissao_financeiro', 'Equipe não avisa pagamento');
select throws_ok($$ select public.recibo('80000000-0000-0000-0000-000000000003') $$, 'P0002', null, 'Equipe não abre recibo');
select throws_ok($$ select public.portal_adicional_decidir('70000000-0000-0000-0000-000000000001', true) $$, '42501',
  'sem_permissao_financeiro', 'Equipe não decide serviço adicional');
select is(jsonb_array_length((public.portal_aprovacoes()) -> 'adicionais'), 0, 'Equipe não vê serviços adicionais');
select is(jsonb_array_length((public.portal_aprovacoes()) -> 'entregas'), 1, 'Equipe vê as entregas');
select is((public.portal_aprovacoes()) ->> 'perfil', 'equipe', 'Aprovações informam o perfil');
select ok(((public.portal_pedidos()) -> 0 -> 'valor_cents') = 'null'::jsonb, 'Equipe vê o pedido sem o valor');
select is(((public.portal_pendencias()) ->> 'pagamentos')::int, 0, 'Contador da equipe não conta contas');
select is(((public.portal_pendencias()) ->> 'total')::int, 1, 'Contador da equipe: só a entrega');
select is((public.portal_inicio()) ->> 'perfil', 'equipe', 'Início informa o perfil');
select ok((public.portal_inicio()) -> 'projeto' -> 'mensal_cents' = 'null'::jsonb, 'Equipe não vê a mensalidade');
select ok(not ((public.portal_inicio()) -> 'acoes' @> '[{"tipo":"pagamento"}]'), 'Início da equipe sem conta a pagar');
select ok(not ((public.portal_inicio()) -> 'acoes' @> '[{"tipo":"adicional"}]'), 'Início da equipe sem serviço adicional');
select ok((public.portal_inicio()) -> 'acoes' @> '[{"tipo":"aprovacao","detalhe":"Confira o intervalo"}]', 'Destaque traz o que conferir (CX-5)');
select lives_ok($$ select public.portal_aprovar('60000000-0000-0000-0000-000000000001', 'Tudo certo') $$,
  'Equipe com permissão aprova entrega');

-- ===== Responsável (Marina) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((public.portal_minha_empresa()) ->> 'perfil', 'responsavel', 'Marina é responsável');
select lives_ok($$ select public.portal_pagamentos() $$, 'Responsável abre Pagamentos');
select is(((public.portal_pendencias()) ->> 'pagamentos')::int, 1, 'Conta que vence em 4 dias entra; a de 20 dias não');
select ok((public.portal_inicio()) -> 'acoes' @> '[{"tipo":"pagamento","valor_cents":318000}]', 'Início do responsável mostra a parcela');
select is((public.portal_inicio()) ->> 'responsavel_whatsapp', '79998341395', 'Início traz o WhatsApp do responsável da agência');
select is(jsonb_array_length((public.portal_aprovacoes()) -> 'adicionais'), 1, 'Responsável vê o serviço adicional');
select lives_ok($$ select public.recibo('80000000-0000-0000-0000-000000000003') $$, 'Responsável abre recibo');

-- ===== Hub (Yuri) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((public.portal_convidar('20000000-0000-0000-0000-000000000001', 'joao@bemcuidar.test', 'equipe', false)) ->> 'perfil',
  'equipe', 'Convite com perfil');
select throws_ok($$ select public.portal_convidar('20000000-0000-0000-0000-000000000001', 'x@bemcuidar.test', 'dono') $$,
  '22023', 'perfil_invalido', 'Perfil desconhecido é recusado');
select throws_ok($$ select public.portal_acesso_perfil('20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000c1', 'equipe') $$, '22023', 'precisa_responsavel', 'Empresa não fica sem responsável');
select lives_ok($$ select public.portal_acesso_perfil('20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000c2', 'responsavel') $$, 'Hub promove a Paula a responsável');
select is((select count(*) from jsonb_array_elements((public.portal_acessos('20000000-0000-0000-0000-000000000001')) -> 'pessoas') p
            where p ->> 'perfil' = 'responsavel')::int, 2, 'Lista de acessos mostra o perfil');
select lives_ok($$ select public.portal_acesso_perfil('20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000c2', 'equipe', false) $$, 'Paula volta para equipe, sem aprovar');
select throws_ok($$ select public.portal_acesso_remover('20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000c1') $$, '22023', 'precisa_responsavel', 'Não tira o último responsável enquanto há equipe');
select lives_ok($$ select public.portal_acesso_perfil('20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000c2', 'equipe') $$, 'Trocar sem dizer "pode aprovar" mantém o que estava');
select is((select can_approve from public.client_members where user_id = '00000000-0000-0000-0000-0000000000c2'), false,
  '"Pode aprovar" não volta sozinho para sim');
reset role;
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Ótica Nova', 'Rui', '79900000020');
set local role authenticated;
select throws_ok($$ select public.portal_convidar('20000000-0000-0000-0000-000000000002', 'rui@otica.test', 'equipe') $$,
  '22023', 'precisa_responsavel', 'Empresa sem responsável não começa por convite de equipe');

-- ===== João aceita o convite e entra como equipe sem aprovar =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is((public.portal_aceitar_convite()) ->> 'ligados', '1', 'João aceita o convite');
reset role;
select is((select profile || '/' || can_approve::text from public.client_members
            where user_id = '00000000-0000-0000-0000-0000000000c3'), 'equipe/false', 'Acesso nasce com o perfil do convite');

select * from finish();
rollback;
