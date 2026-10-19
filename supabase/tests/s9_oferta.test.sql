-- S9: frente da oportunidade (site e Hub), capacidade, planos com o que incluem, garantia na proposta.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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

-- Contato do site com assunto vira oportunidade com a frente
select public.site_registrar_contato('mensagem', 'ana@exemplo.test', true, 'Ana', '79999990000',
  'Automações e integrações', 'Quero parar de copiar dados');
select is((select service_line::text from public.deals d join public.clients c on c.id = d.client_id where c.email = 'ana@exemplo.test'),
  'automacoes', 'Assunto do site vira a frente da oportunidade');
select is(public._frente_do_assunto('Ainda não sei por onde começar'), null, '"Ainda não sei" fica sem frente');
select is(public._frente_do_assunto('Inteligência artificial aplicada')::text, 'ia', 'IA reconhecida');

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated;
insert into t select 'deal', to_jsonb(d.id::text) from public.deals d join public.clients c on c.id = d.client_id where c.email = 'ana@exemplo.test';
insert into t select 'versao', to_jsonb(d.updated_at) from public.deals d join public.clients c on c.id = d.client_id where c.email = 'ana@exemplo.test';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((public.funil_atualizar((select (valor #>> '{}')::uuid from t where chave = 'deal'),
                                  (select (valor #>> '{}')::timestamptz from t where chave = 'versao'),
                                  '{"frente":"sistemas"}')) ->> 'service_line', 'sistemas', 'Yuri troca a frente no Hub');
select is((select frente::text from public.v_funil where id = (select (valor #>> '{}')::uuid from t where chave = 'deal')),
  'sistemas', 'v_funil mostra a frente');

-- Preços: capacidade, garantia e planos com o que incluem
select is(((public.precos_ler()) -> 'precos' ->> 'capacity_hours')::int, 200, 'Capacidade padrão de 200 h');
select is(((public.precos_ler()) -> 'precos' ->> 'warranty_days')::int, 30, 'Garantia padrão de 30 dias');
select ok((select bool_and(includes is not null) from public.pricing_plans where tenant_id = '10000000-0000-0000-0000-000000000001'),
  'Os três planos dizem o que incluem');
select is((select price_cents from public.pricing_plans where tenant_id = '10000000-0000-0000-0000-000000000001' and name = 'Evolução'),
  135000, 'Agência nova nasce com a Evolução a R$ 1.350 (4,5 h × R$ 300)');
select is(((public.precos_salvar('{"capacity_hours":160}',
  jsonb_build_array(jsonb_build_object('id', (select id from public.pricing_plans where tenant_id = '10000000-0000-0000-0000-000000000001' and name = 'Essencial'),
    'includes', 'No ar e seguro')))) -> 'precos' ->> 'capacity_hours')::int, 160, 'Yuri muda a capacidade');
select is(((public.capacidade_resumo()) ->> 'capacidade_h')::int, 160, 'Capacidade no resumo');

-- Outra agência não lê a capacidade da Fora do Papel
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(((public.capacidade_resumo()) ->> 'capacidade_h')::int, 200, 'Outra agência vê só a dela');

select * from finish();
rollback;
