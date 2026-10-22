-- RD-5: números do topo e cartões do quadro de propostas, contagem de aberturas do link
-- e isolamento (só o dono do tenant; outra agência, portal e anon não leem).
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

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

-- Um cliente e uma oportunidade por proposta (uma oportunidade aberta por cliente)
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp)
select ('20000000-0000-0000-0000-00000000000' || n)::uuid, '10000000-0000-0000-0000-000000000001',
       (array['Doce Sabor', 'Ótica Nova', 'Clínica Bem Cuidar', 'Casa Aurora', 'Rede Patas', 'Pet Vida', 'Antiga Ltda'])[n],
       'Contato ' || n, '7990000000' || n
  from generate_series(1, 7) n;
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'Cliente da Outra', 'Fulano', '79911111111');
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at)
select ('30000000-0000-0000-0000-00000000000' || n)::uuid, '10000000-0000-0000-0000-000000000001',
       ('20000000-0000-0000-0000-00000000000' || n)::uuid, 'proposta', 'Acompanhar', now()
  from generate_series(1, 7) n;
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000009', 'proposta', 'Acompanhar', now());

-- 1 rascunho (criado pela RPC, abaixo), 3 enviadas (uma sem abrir há 5 dias, uma aberta, uma vencida),
-- 1 aceita no ano, 1 recusada no ano, 1 aceita no ano passado; e uma enviada da outra agência
insert into public.proposals (id, tenant_id, client_id, deal_id, status, title, total_cents, hours_total,
                              token, snapshot, sent_at, expires_at, viewed_at, view_count, last_viewed_at,
                              accepted_at, accept_data, refused_at, refused_reason)
values
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000002', 'enviada', 'Diagnóstico Essencial', 120000, 4,
   repeat('2', 64), '{}'::jsonb, now() - interval '5 days', now() + interval '10 days', null, 0, null, null, null, null, null),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000003', 'enviada', 'Sistema de agendamento', 954000, 30,
   repeat('3', 64), '{}'::jsonb, now() - interval '6 days', now() + interval '8 days', now() - interval '2 days', 2, now() - interval '1 day', null, null, null, null),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000004', 'enviada', 'Loja virtual', 680000, 20,
   repeat('4', 64), '{}'::jsonb, now() - interval '30 days', now() - interval '1 day', null, 0, null, null, null, null, null),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000005', 'aceita', 'Sistema Rede Patas', 1600000, 50,
   repeat('5', 64), '{}'::jsonb, now() - interval '1 hour', now() + interval '14 days', now(), 1, now(), now(), '{"nome":"x"}'::jsonb, null, null),
  ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006',
   '30000000-0000-0000-0000-000000000006', 'recusada', 'Site com agendamento', 480000, 15,
   repeat('6', 64), '{}'::jsonb, now() - interval '2 hours', now() + interval '14 days', null, 0, null, null, null, now(), 'Preço acima do esperado'),
  ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007',
   '30000000-0000-0000-0000-000000000007', 'aceita', 'Projeto antigo', 999900, 30,
   repeat('7', 64), '{}'::jsonb, now() - interval '400 days', now() - interval '386 days', now() - interval '399 days', 1, null,
   now() - interval '398 days', '{"nome":"y"}'::jsonb, null, null),
  ('40000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009',
   '30000000-0000-0000-0000-000000000009', 'enviada', 'Da outra agência', 777700, 20,
   repeat('9', 64), '{}'::jsonb, now() - interval '9 days', now() + interval '5 days', null, 0, null, null, null, null, null);
insert into public.projects (tenant_id, client_id, deal_id, proposal_id, name)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005',
        '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', 'Sistema Rede Patas');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

-- ===== Yuri (dono) =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

insert into t values ('rasc', public.proposta_criar('30000000-0000-0000-0000-000000000001'));
select public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'rasc'), null,
  '{"titulo":"Cardápio digital com pedidos","tipo":"Sistema","itens":[{"nome":"Cardápio","horas":10}]}'::jsonb);
insert into t values ('resumo', public.propostas_resumo());
insert into t values ('quadro', public.propostas_quadro());

select is((select (valor->>'em_negociacao_cents')::bigint from t where chave = 'resumo'), 1074000::bigint,
  'Em negociação: soma das enviadas que ainda valem (vencida fica fora)');
select is((select (valor->>'em_negociacao_qtd')::int from t where chave = 'resumo'), 2, 'Em negociação: 2 propostas');
select is((select (valor->>'sem_abrir_3_dias')::int from t where chave = 'resumo'), 1, 'Sem abrir há mais de 3 dias: 1');
select is((select valor->'sem_abrir_mais_antiga'->>'empresa' from t where chave = 'resumo'), 'Ótica Nova',
  'Apoio mostra a empresa que não abriu');
select is((select (valor->'sem_abrir_mais_antiga'->>'dias')::int from t where chave = 'resumo'), 5, 'Enviada há 5 dias');
select is((select (valor->>'aceitas_no_ano')::int from t where chave = 'resumo'), 1, 'Aceitas no ano: só a deste ano');
select is((select (valor->>'aceitas_no_ano_cents')::bigint from t where chave = 'resumo'), 1600000::bigint,
  'Aceitas no ano com o valor em centavos');
select is((select (valor->>'respondidas_no_ano')::int from t where chave = 'resumo'), 2, 'Respondidas no ano: aceita + recusada');
select is((select (valor->>'taxa_aceite_pct')::int from t where chave = 'resumo'), 50, 'Taxa de aceite: 1 de 2 = 50%');
select is((select (valor->>'aceita')::int || '/' || (valor->>'recusada') || '/' || (valor->>'enviada') || '/' || (valor->>'rascunho')
             from t where chave = 'resumo'), '2/1/3/1', 'Totais por coluna contam tudo do tenant');
select is((select (valor->>'vencidas')::int from t where chave = 'resumo'), 1, 'Uma vencida');

select is((select jsonb_array_length(valor) from t where chave = 'quadro'), 7, 'Quadro tem as 7 propostas do tenant');
select is((select string_agg(x->>'status', ',' order by n) from t, jsonb_array_elements(valor) with ordinality e(x, n)
            where chave = 'quadro'),
  'rascunho,enviada,enviada,enviada,aceita,aceita,recusada', 'Cartões vêm na ordem das colunas');
select is((select x->>'empresa' from t, jsonb_array_elements(valor) x where chave = 'quadro' and x->>'status' = 'enviada'
            order by (x->>'enviada_em')::timestamptz limit 1), 'Casa Aurora', 'Enviadas: a que espera há mais tempo primeiro');
select is((select (x->>'dias_desde_envio')::int || ':' || (x->>'vezes_aberta')
             from t, jsonb_array_elements(valor) x where chave = 'quadro' and x->>'empresa' = 'Ótica Nova'),
  '5:0', 'Cartão da enviada: dias desde o envio e vezes aberta');
select is((select string_agg(x->>'empresa', ',') from t, jsonb_array_elements(valor) x
            where chave = 'quadro' and (x->>'sem_abrir')::boolean), 'Ótica Nova', 'Cartão marca a que não foi aberta há mais de 3 dias');
select is((select (x->>'vezes_aberta')::int from t, jsonb_array_elements(valor) x
            where chave = 'quadro' and x->>'empresa' = 'Clínica Bem Cuidar'), 2, 'Aberta 2 vezes');
select is((select x->>'situacao' from t, jsonb_array_elements(valor) x where chave = 'quadro' and x->>'empresa' = 'Casa Aurora'),
  'vencida', 'Enviada fora do prazo aparece como vencida');
select ok((select x->'falta' @> '["preencher o que não está incluído"]'::jsonb and (x->>'valor_cents')::int > 0
             from t, jsonb_array_elements(valor) x where chave = 'quadro' and x->>'status' = 'rascunho'),
  'Rascunho mostra o que falta e o valor já calculado');
select is((select x->>'titulo' from t, jsonb_array_elements(valor) x where chave = 'quadro' and x->>'status' = 'rascunho'),
  'Cardápio digital com pedidos', 'Rascunho com o título');
select isnt((select x->>'projeto_id' from t, jsonb_array_elements(valor) x where chave = 'quadro' and x->>'empresa' = 'Rede Patas'),
  null, 'Aceita mostra que o projeto foi criado');
select is((select x->>'motivo' from t, jsonb_array_elements(valor) x where chave = 'quadro' and x->>'status' = 'recusada'),
  'Preço acima do esperado', 'Recusada traz o motivo');
select is((select jsonb_array_length(x->'falta') from t, jsonb_array_elements(valor) x
            where chave = 'quadro' and x->>'empresa' = 'Rede Patas'), 0, 'Só rascunho tem lista do que falta');

-- ===== Outra agência: só vê o que é dela =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select is((public.propostas_resumo()->>'em_negociacao_cents')::bigint, 777700::bigint, 'Outra agência vê só o próprio valor');
select is(jsonb_array_length(public.propostas_quadro()), 1, 'Outra agência vê só o próprio cartão');

-- ===== Cliente do portal e sessão fraca =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.propostas_resumo() $$, '42501', null, 'Cliente do portal não lê os números');
select throws_ok($$ select public.propostas_quadro() $$, '42501', null, 'Cliente do portal não lê o quadro');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.propostas_quadro() $$, '42501', null, 'Dono sem a segunda etapa não lê o quadro');

-- ===== Visitante com o link: cada volta conta uma abertura =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select public.propostas_resumo() $$, '42501', null, 'Anon não chama o resumo');
select public.proposta_publica(repeat('2', 64));
select public.proposta_publica(repeat('2', 64));
reset role;
select is((select view_count from public.proposals where id = '40000000-0000-0000-0000-000000000002'), 1,
  'Abrir e recarregar logo em seguida conta uma vez só');
update public.proposals set last_viewed_at = now() - interval '2 hours' where id = '40000000-0000-0000-0000-000000000002';
set local role anon;
select public.proposta_publica(repeat('2', 64));
reset role;
select is((select view_count from public.proposals where id = '40000000-0000-0000-0000-000000000002'), 2,
  'Voltar depois conta outra abertura');
update public.proposals set sent_at = now() where id = '40000000-0000-0000-0000-000000000002';
select is((select view_count from public.proposals where id = '40000000-0000-0000-0000-000000000002'), 0,
  'Novo envio começa a contagem do zero');

select * from finish();
rollback;
