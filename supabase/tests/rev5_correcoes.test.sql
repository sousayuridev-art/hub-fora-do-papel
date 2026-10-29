-- REV-5: correções urgentes (Fechado com motivo, recusa vira próximo passo, SVG, fila, mensalidades).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sorriso', 'Paula', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Padaria Trigo', 'Rui', '79900000002');
insert into public.deals (id, tenant_id, client_id, stage, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'proposta', 'Ligar', now() + interval '5 days'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'diagnostico', 'Ligar', now());

create temp table t (chave text primary key, valor jsonb);
grant all on t to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

-- 1. Fechado sem proposta aceita
select throws_ok($$ select public.funil_mover('30000000-0000-0000-0000-000000000002', 'fechado', null) $$,
  '22023', 'fechar_sem_proposta', 'Fechado sem proposta aceita e sem motivo é recusado');
select throws_ok($$ select public.funil_mover('30000000-0000-0000-0000-000000000002', 'fechado', null, p_motivo_fechar => '   ') $$,
  '22023', 'fechar_sem_proposta', 'Motivo só com espaços não vale');
select lives_ok($$ select public.funil_mover('30000000-0000-0000-0000-000000000002', 'fechado', null,
  p_motivo_fechar => 'Contrato assinado em papel') $$, 'Com motivo, fecha');
select is((select stage::text from public.deals where id = '30000000-0000-0000-0000-000000000002'), 'fechado', 'Etapa Fechado gravada');
reset role;
select is((select detail ->> 'motivo' from public.deal_events
            where deal_id = '30000000-0000-0000-0000-000000000002' and kind = 'etapa_alterada' order by created_at desc limit 1),
  'Contrato assinado em papel', 'Motivo fica no histórico');
set local role authenticated;
select lives_ok($$ select public.funil_mover('30000000-0000-0000-0000-000000000001', 'mapeamento', null) $$,
  'Etapas abertas seguem como antes');
select public.funil_mover('30000000-0000-0000-0000-000000000001', 'proposta', null);

-- 2. Recusa pelo link vira próximo passo para hoje
insert into t values ('p', public.proposta_criar('30000000-0000-0000-0000-000000000001'));
select public.precos_salvar('{}'::jsonb, null);
insert into t select 'c', public.proposta_salvar((select (valor->>'id')::uuid from t where chave = 'p'), null,
  jsonb_build_object('tipo', 'Site', 'titulo', 'Site novo', 'itens', '[{"nome":"Site","horas":10}]'::jsonb,
    'fora', '[{"item":"Fotos"}]'::jsonb, 'propriedade', 'cliente', 'plano_id', (select id from public.pricing_plans where name = 'Essencial'),
    'conferencias', '{"escopo":true,"prazo":true,"contato":true}'::jsonb));
insert into t select 'env', public.proposta_enviar((select (valor->>'id')::uuid from t where chave = 'p'), null);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((public.proposta_recusar((select valor->>'token' from t where chave = 'env'), 'Achei caro')) ->> 'repetido',
  'false', 'Cliente recusa pelo link');
reset role;
select matches((select next_step from public.deals where id = '30000000-0000-0000-0000-000000000001'),
  '^Proposta recusada', 'Oportunidade ganha o próximo passo da recusa');
select is((select (next_step_at at time zone (select timezone from public.tenants where id = '10000000-0000-0000-0000-000000000001'))::date from public.deals where id = '30000000-0000-0000-0000-000000000001'),
  public._hoje('10000000-0000-0000-0000-000000000001'), 'Próximo passo para hoje');
select is((select archived_at from public.deals where id = '30000000-0000-0000-0000-000000000001'), null,
  'Recusa não arquiva sozinha: o Yuri decide');

-- 3. SVG fora
select ok(not exists (select 1 from storage.buckets where id = 'materiais' and 'image/svg+xml' = any (allowed_mime_types)),
  'Bucket de materiais não aceita SVG');
select ok(not public._material_tipo_ok('image/svg+xml'), 'Regra do banco não aceita SVG');

-- 4. Fila de integrações
insert into public.event_outbox (tenant_id, event) values
  ('10000000-0000-0000-0000-000000000001', 'teste.um');
select is((select count(*) from public.outbox_reservar(500) where event = 'teste.um')::int, 1, 'Servidor reserva o evento');
select is((select count(*) from public.outbox_reservar(500) where event = 'teste.um')::int, 0, 'Evento reservado não sai de novo');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.outbox_reservar(10) $$, '42501', null, 'Usuário do painel não mexe na fila');
reset role;

-- 5. Mensalidades: geração do dia marcada; mudança na mensalidade libera
select public._mensalidades_gerar('10000000-0000-0000-0000-000000000001');
insert into public.subscriptions (tenant_id, client_id, plan_name, amount_cents, start_month)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Essencial', 30000,
        date_trunc('month', public._hoje('10000000-0000-0000-0000-000000000001'))::date);
select is((select count(*) from public.mensalidades_controle)::int, 0, 'Nova mensalidade libera a geração do dia');

select * from finish();
rollback;
