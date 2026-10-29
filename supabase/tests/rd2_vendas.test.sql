-- RD2-2: v_funil com proposta e serviço adicional; números do topo e filtros novos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Loja Antiga', 'Ana', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Padaria Nova', 'Rui', '79900000002'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'De Outra', 'Zé', '79900000003');
insert into public.deals (id, tenant_id, client_id, stage, value_cents, next_step, next_step_at, closed_at, archived_at, lost_reason) values
  -- Loja Antiga: fechou um projeto e agora negocia um adicional
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'fechado', 500000, null, null, now() - interval '2 days', null, null),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'proposta', 300000, 'Retornar', now() + interval '1 day', null, null, null),
  -- Padaria Nova: contato novo, passo vencido
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'contato', 100000, 'Ligar', now() - interval '3 days', null, null, null),
  -- Perdida no mês
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'diagnostico', null, 'x', now(), null, now(), 'preco'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'contato', 900000, 'x', now(), null, null, null);
insert into public.proposals (tenant_id, client_id, deal_id, status, sent_at, token, snapshot) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
   'enviada', now() - interval '5 days', repeat('a', 64), '{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select is((select adicional from public.v_funil where id = '30000000-0000-0000-0000-000000000002'), true, 'Nova oportunidade de quem já fechou é serviço adicional');
select is((select adicional from public.v_funil where id = '30000000-0000-0000-0000-000000000001'), false, 'O próprio fechamento não é adicional');
select is((select proposta_status::text from public.v_funil where id = '30000000-0000-0000-0000-000000000002'), 'enviada', 'Situação da proposta no cartão');

select is((public.funil_resumo() ->> 'em_negociacao_cents')::int, 400000, 'Em negociação soma só as abertas (sem fechado, arquivado e outra empresa)');
select is((public.funil_resumo() ->> 'propostas_sem_resposta')::int, 1, 'Proposta enviada há mais de 3 dias conta');
select is((public.funil_resumo() -> 'ganho_mes' ->> 'soma_cents')::int, 500000, 'Ganho no mês');
select is((public.funil_resumo() ->> 'taxa_ganho_90')::int, 50, 'Taxa de ganho: 1 ganho e 1 perdido');
select is((public.funil_resumo() -> 'filtros' ->> 'adicionais')::int, 1, 'Filtro serviço adicional');
select is((public.funil_resumo('fechados') -> 'etapas' -> 'fechado' ->> 'quantidade')::int, 1, 'Filtro Fechados');
select is((public.funil_resumo() -> 'etapas' -> 'fechado' ->> 'quantidade')::int, 0, 'Quadro sem Fechado');

select * from finish();
rollback;
