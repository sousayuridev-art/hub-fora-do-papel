-- SS-1: módulos no projeto sob medida. Publicar com homologação exige aprovação;
-- 1ª publicação cria a mensalidade uma vez; publicação final marca a garantia; portal vê sem dados internos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marina@plamev.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Marina', '79900000010');
insert into public.client_members (client_id, user_id, tenant_id, profile, can_approve) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel', true);
insert into public.projects (id, tenant_id, client_id, name, status, plan_name, monthly_cents) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Sistema da Plamev', 'andamento', 'Essencial', 40000);

-- ===== Hub (Yuri) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$ select public.modulo_criar('50000000-0000-0000-0000-000000000001', 'RH') $$,
  '22023', 'projeto_nao_sob_medida', 'Projeto padrão não tem módulos');
select is((public.projeto_tipo_definir('50000000-0000-0000-0000-000000000001', 'sob_medida')) ->> 'tipo', 'sob_medida',
  'Projeto vira sob medida');
select lives_ok($$ select public.modulo_criar('50000000-0000-0000-0000-000000000001', 'RH') $$, 'Cria módulo RH');
select lives_ok($$ select public.modulo_criar('50000000-0000-0000-0000-000000000001', 'Financeiro') $$, 'Cria módulo Financeiro');
select lives_ok($$ select public.modulo_criar('50000000-0000-0000-0000-000000000001', 'Estoque') $$, 'Cria módulo Estoque');
select is((select string_agg(name, ',' order by position) from public.project_modules), 'RH,Financeiro,Estoque', 'Módulos em ordem');
select throws_ok($$ select public.projeto_tipo_definir('50000000-0000-0000-0000-000000000001', 'padrao') $$,
  '22023', 'tem_modulos', 'Não volta para padrão com módulos');

select throws_ok($$ select public.modulo_publicar((select id from public.project_modules where name = 'RH'), 'Primeira versão do RH') $$,
  '22023', 'precisa_aprovacao', 'Publicar com homologação sem aprovação é recusado');
select throws_ok($$ select public.modulo_mover((select id from public.project_modules where name = 'RH'), 'publicado') $$,
  '22023', 'movimento_invalido', 'Não pula para publicado');
select lives_ok($$ select public.modulo_mover((select id from public.project_modules where name = 'RH'), 'desenvolvimento') $$,
  'RH em desenvolvimento');
select throws_ok($$ select public.modulo_mover((select id from public.project_modules where name = 'RH'), 'testes', 'http://inseguro.test') $$,
  '22023', 'link_invalido', 'Link de testes precisa ser https');
select is((public.modulo_mover((select id from public.project_modules where name = 'RH'), 'testes', 'https://testes.plamev.test/rh')) ->> 'situacao',
  'testes', 'RH em testes com link');
select lives_ok($$ select public.modulo_pedir_aprovacao((select id from public.project_modules where name = 'RH'), 'Confira a folha de ponto') $$,
  'Pede aprovação do RH');
select is((select status::text || '/' || coalesce(preview_url, '') from public.approvals where module_id = (select id from public.project_modules where name = 'RH')),
  'aguardando/https://testes.plamev.test/rh', 'Aprovação usa o link de testes');
select throws_ok($$ select public.modulo_pedir_aprovacao((select id from public.project_modules where name = 'RH')) $$,
  '22023', 'movimento_invalido', 'Um pedido de aprovação por vez');
reset role;

-- ===== Cliente pede ajuste três vezes =====
do $$
declare i int; v uuid;
begin
  for i in 1..3 loop
    v := (select id from public.approvals where status = 'aguardando');
    perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
    set local role authenticated;
    perform public.portal_pedir_ajuste(v, 'Falta o campo de banco de horas');
    perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
    if i < 3 then
      perform public.modulo_pedir_aprovacao((select id from public.project_modules where name = 'RH'));
    end if;
    reset role;
  end loop;
end $$;
select is((select status::text || '/' || rounds from public.project_modules where name = 'RH'), 'desenvolvimento/3',
  'Ajuste volta o módulo e conta rodadas');
select is((select count(*)::int from public.event_outbox where event = 'modulo.rodadas_demais'), 1, 'Terceira rodada avisa o Yuri');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$ select public.modulo_pedir_aprovacao((select id from public.project_modules where name = 'RH')) $$, 'Pede de novo');
select lives_ok($$ select public.aprovacao_cancelar((select id from public.approvals where status = 'aguardando')) $$, 'Cancela o pedido');
select is((select status::text from public.project_modules where name = 'RH'), 'testes', 'Cancelar volta para testes');
select lives_ok($$ select public.modulo_pedir_aprovacao((select id from public.project_modules where name = 'RH')) $$, 'Pede outra vez');
reset role;
select set_config('teste.aprovacao', (select id::text from public.approvals where status = 'aguardando'), true) is not null as ok_id;
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok($$ select public.portal_aprovar(current_setting('teste.aprovacao')::uuid, 'Pode publicar') $$,
  'Cliente aprova o RH');
select is((select count(*)::int from public.project_modules), 0, 'Pessoa do portal não lê a tabela de módulos');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select status::text from public.project_modules where name = 'RH'), 'aprovado', 'RH aprovado');
select is((public.modulo_publicar((select id from public.project_modules where name = 'RH'), 'Folha de ponto e férias',
  'https://plamev.test/rh')) ->> 'mensalidade_iniciada', 'true', 'Primeira publicação');
reset role;
select is((select count(*)::int from public.subscriptions where project_id = '50000000-0000-0000-0000-000000000001'), 1,
  'Mensalidade nasce na primeira publicação');
select ok((select final_release_at is null from public.projects where id = '50000000-0000-0000-0000-000000000001'),
  'Ainda não é a publicação final');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$ select public.modulo_editar((select id from public.project_modules where name = 'Financeiro'), 'Financeiro', 'direta') $$,
  'Financeiro com publicação direta');
select lives_ok($$ select public.modulo_mover((select id from public.project_modules where name = 'Financeiro'), 'desenvolvimento') $$,
  'Financeiro em desenvolvimento');
select is((public.modulo_publicar((select id from public.project_modules where name = 'Financeiro'), 'Contas a pagar',
  'https://plamev.test/fin')) ->> 'mensalidade_iniciada', 'false', 'Publicação direta sem aprovação');
select lives_ok($$ select public.modulo_mover((select id from public.project_modules where name = 'Estoque'), 'fora_do_escopo') $$,
  'Estoque fora do escopo');
reset role;
select is((select count(*)::int from public.subscriptions where project_id = '50000000-0000-0000-0000-000000000001'), 1,
  'Mensalidade não duplica');
select ok((select final_release_at is not null from public.projects where id = '50000000-0000-0000-0000-000000000001'),
  'Publicação final marcada quando todos estão no ar ou fora');

-- ===== Portal e outra agência =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(jsonb_array_length((public.portal_inicio()) -> 'projeto' -> 'modulos'), 2, 'Portal mostra os módulos (sem os fora do escopo)');
select ok(not ((public.portal_inicio()) -> 'projeto' -> 'modulos' -> 0 ? 'link_testes')
          and (public.portal_inicio()) -> 'projeto' -> 'modulos' -> 0 ->> 'link' = 'https://plamev.test/rh',
  'Portal vê o link de produção e não vê dados internos');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.modulo_criar('50000000-0000-0000-0000-000000000001', 'Invasor') $$,
  'P0002', null, 'Outra agência não mexe nos módulos');
reset role;

select * from finish();
rollback;
