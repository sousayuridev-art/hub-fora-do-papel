-- S10: modelo de propriedade e compra do código na proposta. Retrato, travas do envio e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra@test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Agência', 'outra-agencia');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Distribuidora Norte', 'Carla Lima', '79900000011'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Padaria Trigo', 'João Melo', '79900000012'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Loja Faro', 'Rita Faro', '79900000013');
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at, service_line) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'mapeamento', 'Montar proposta', now(), 'sistemas'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'mapeamento', 'Montar proposta', now(), null),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'mapeamento', 'Montar proposta', now(), 'sites');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select public.precos_salvar('{}'::jsonb, null);

insert into t values ('sis', public.proposta_criar('30000000-0000-0000-0000-000000000001'));
insert into t values ('pad', public.proposta_criar('30000000-0000-0000-0000-000000000002'));
insert into t values ('loja', public.proposta_criar('30000000-0000-0000-0000-000000000003'));
insert into t values ('base', jsonb_build_object('tipo', 'Sistema de pedidos', 'titulo', 'Pedidos sem planilha',
  'itens', '[{"nome":"Pedidos","horas":20}]'::jsonb, 'fora', '[{"item":"Fotos"}]'::jsonb,
  'conferencias', '{"escopo":true,"prazo":true,"contato":true}'::jsonb));

-- Padrão pela frente da oportunidade
select is((select ownership_model from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'sis')),
  'licenca', 'Sistema sob medida nasce com código licenciado');
select is((select ownership_model from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'loja')),
  'cliente', 'Site nasce com tudo do cliente');
select is((select ownership_model from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'pad')),
  null, 'Sem frente, nasce sem modelo');

-- Sem modelo: pendência e envio recusado
insert into t select 'pad_s', public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'pad'), null,
  (select valor from t where chave = 'base') || jsonb_build_object('plano_id', (select id from public.pricing_plans where name = 'Essencial')));
select is((select jsonb_agg(x->>'chave') from t, jsonb_array_elements(valor->'calculo'->'pendencias') x where chave = 'pad_s'),
  '["propriedade"]'::jsonb, 'Só falta escolher o que fica com o cliente');
select throws_ok(format($$ select public.proposta_enviar(%L, null) $$, (select valor->>'id' from t where chave = 'pad')),
  '22023', 'proposta_com_pendencias', 'Proposta sem modelo não é enviada');

-- Validações da edição
select throws_ok(format($$ select public.proposta_salvar(%L, null, '{"propriedade":"metade"}') $$, (select valor->>'id' from t where chave = 'pad')),
  '22023', 'propriedade_invalida', 'Modelo fora da lista é recusado');
select throws_ok(format($$ select public.proposta_salvar(%L, null, '{"compra_codigo_cents":-1}') $$, (select valor->>'id' from t where chave = 'pad')),
  '22023', 'compra_codigo_invalida', 'Valor de compra negativo é recusado');

-- Licença sem mensalidade: travada
insert into t select 'sis_s', public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'sis'), null,
  (select valor from t where chave = 'base') || '{"compra_codigo_cents":150000}'::jsonb);
select ok(exists (select 1 from t, jsonb_array_elements(valor->'calculo'->'pendencias') x
                   where chave = 'sis_s' and x->>'chave' = 'licenca'), 'Licença sem mensalidade é pendência');
select throws_ok(format($$ select public.proposta_enviar(%L, null) $$, (select valor->>'id' from t where chave = 'sis')),
  '22023', 'proposta_com_pendencias', 'Código licenciado sem mensalidade não é enviado');

-- Com mensalidade: envia e o retrato leva o modelo e o valor de compra
select public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'sis'), null,
  jsonb_build_object('plano_id', (select id from public.pricing_plans where name = 'Evolução')));
select public.proposta_enviar((select (valor->>'id')::uuid from t where chave = 'sis'), null);
select is((select snapshot->'condicoes'->>'propriedade' from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'sis')),
  'licenca', 'Modelo entra no retrato');
select is((select (snapshot->'condicoes'->>'compra_codigo_cents')::int from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'sis')),
  150000, 'Valor de compra entra no retrato, em centavos');

-- Tudo do cliente: valor de compra guardado não vai ao cliente
select public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'pad'), null,
  '{"propriedade":"cliente","compra_codigo_cents":90000}'::jsonb);
select public.proposta_enviar((select (valor->>'id')::uuid from t where chave = 'pad'), null);
select is((select snapshot->'condicoes'->>'propriedade' from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'pad')),
  'cliente', 'Tudo do cliente no retrato');
select ok((select (snapshot->'condicoes'->'compra_codigo_cents') = 'null'::jsonb from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'pad')),
  'Sem licença, o retrato não leva valor de compra');

-- Reaberta: o retrato novo leva o modelo escolhido na nova versão
select public.proposta_reabrir((select (valor->>'id')::uuid from t where chave = 'pad'));
select public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'pad'), null, '{"propriedade":"licenca","compra_codigo_cents":""}');
select public.proposta_enviar((select (valor->>'id')::uuid from t where chave = 'pad'), null);
select is((select snapshot->'condicoes'->>'propriedade' || ':' || coalesce(snapshot->'condicoes'->>'compra_codigo_cents', 'sob pedido')
             from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'pad')),
  'licenca:sob pedido', 'Nova versão leva o modelo novo; compra vazia = sob pedido');

-- Outra agência não altera
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select throws_ok(format($$ select public.proposta_salvar(%L, null, '{"propriedade":"cliente"}') $$, (select valor->>'id' from t where chave = 'loja')),
  'P0002', null, 'Outra agência não altera o modelo');
select throws_ok($$ update public.proposals set ownership_model = 'licenca' $$, '42501', null, 'Ninguém altera a tabela direto');

-- Dono sem sessão forte também não altera
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok(format($$ select public.proposta_salvar(%L, null, '{"propriedade":"licenca"}') $$, (select valor->>'id' from t where chave = 'loja')),
  'P0002', null, 'Sem o código do app, o dono não altera');

reset role;
select is((select ownership_model from public.proposals where id = (select (valor->>'id')::uuid from t where chave = 'loja')),
  'cliente', 'Modelo da Loja continua o mesmo');

select * from finish();
rollback;
