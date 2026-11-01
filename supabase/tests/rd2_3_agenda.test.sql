-- RD2-3: agenda liga eventos do Google ao Hub, sem vazar outra agência.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp, email) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Loja Exemplo', 'Ana', '79900000001', 'ana@loja.test'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'De Outra', 'Zé', '79900000003', 'ze@outra.test');
insert into public.deals (id, tenant_id, client_id, stage, value_cents, next_step, next_step_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'proposta', 1200000, 'Retornar sobre a proposta', now());
insert into public.proposals (tenant_id, client_id, deal_id, status, version, sent_at, viewed_at, token, snapshot) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   'enviada', 2, now() - interval '4 days', now() - interval '2 days', repeat('b', 64), '{}'::jsonb);
insert into public.meetings (tenant_id, conference_record, calendar_event_id, title, started_at, client_id) values
  ('10000000-0000-0000-0000-000000000001', 'conferenceRecords/abc', 'ev-antigo', 'Primeira conversa', now() - interval '10 days',
   '20000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

create temp table r as select public.agenda_ligar('[
  {"id": "ev-novo", "emails": ["ANA@loja.test", "outro@x.test"]},
  {"id": "ev-antigo", "emails": []},
  {"id": "ev-outra", "emails": ["ze@outra.test"]},
  {"id": "ev-sem", "emails": []}
]'::jsonb) as v;

select is((select v -> 'ev-novo' -> 'cliente' ->> 'nome' from r), 'Loja Exemplo', 'Cliente pelo e-mail do convidado (sem diferença de maiúsculas)');
select is((select v -> 'ev-novo' -> 'deal' ->> 'proximo_passo' from r), 'Retornar sobre a proposta', 'Próximo passo da oportunidade aberta');
select is((select (v -> 'ev-novo' -> 'proposta' ->> 'versao')::int from r), 2, 'Versão da proposta');
select isnt((select v -> 'ev-novo' ->> 'ultima_reuniao' from r), null, 'Última reunião com o cliente');
select isnt((select v -> 'ev-antigo' ->> 'reuniao_id' from r), null, 'Evento já gravado liga à reunião');
select is((select v -> 'ev-outra' -> 'cliente' from r), 'null'::jsonb, 'Cliente de outra agência não liga');
select is((select v -> 'ev-sem' -> 'cliente' from r), 'null'::jsonb, 'Evento sem convidado fica sem cliente');
reset role;
select throws_ok($$ set local role authenticated; select public.google_conexao_ler('10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Painel não lê a permissão cifrada do Google');

select * from finish();
rollback;
