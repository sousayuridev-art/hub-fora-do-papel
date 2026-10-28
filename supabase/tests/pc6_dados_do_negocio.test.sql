-- PC-6: dados do negócio e Google. Responsável e equipe salvam; outra empresa não lê nem grava;
-- validação de horário, telefone e limites do Google; leitura pública devolve o salvo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'paula@clinica.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'equipe@clinica.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'marina@plamev.test');
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'client'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Clínica Sol', 'Paula', '79900000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Marina', '79900000002');
insert into public.client_members (client_id, user_id, tenant_id, profile) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'responsavel'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-000000000001', 'equipe'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-000000000001', 'responsavel');
insert into public.sites (id, tenant_id, client_id, nome, dominio, modulos) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Site da Clínica', 'clinicasol.test', '{paginas}');

create temp table dados (negocio jsonb);
grant all on dados to authenticated;
insert into dados values ('{"nome": "Clínica Sol", "whatsapp": "(79) 99999-0001", "endereco": "Rua A, 10, Aracaju",
  "instagram": "@clinicasol", "horario": [{"dias": "Segunda a sexta", "abre": "08:00", "fecha": "18:00"},
  {"dias": "Sábado", "abre": "09:00", "fecha": "14:00"}, {"dias": "Domingo", "fechado": true}]}');

-- ===== Responsável =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((public.site_negocio_salvar('30000000-0000-0000-0000-000000000001', (select negocio from dados))) ->> 'whatsapp',
  '79999990001', 'Salva o negócio com o WhatsApp só em números');
select is((public.site_negocio_salvar('30000000-0000-0000-0000-000000000001', (select negocio from dados))) ->> 'instagram',
  'clinicasol', 'Instagram sem o @');
select throws_ok($$ select public.site_negocio_salvar('30000000-0000-0000-0000-000000000001',
  '{"nome": "Clínica Sol", "horario": [{"dias": "Sábado", "abre": "14:00", "fecha": "09:00"}]}') $$,
  '22023', 'negocio_invalido', 'Abrir depois de fechar é recusado');
select throws_ok($$ select public.site_negocio_salvar('30000000-0000-0000-0000-000000000001',
  '{"nome": "Clínica Sol", "whatsapp": "1234"}') $$, '22023', 'negocio_invalido', 'WhatsApp curto é recusado');
select throws_ok($$ select public.site_google_salvar('30000000-0000-0000-0000-000000000001',
  jsonb_build_object('titulo', repeat('a', 61))) $$, '22023', 'google_invalido', 'Título com 61 caracteres é recusado');
select throws_ok($$ select public.site_google_salvar('30000000-0000-0000-0000-000000000001',
  '{"titulo": "Clínica em [CIDADE]"}') $$, '22023', 'google_invalido', 'Marcador pendente é recusado');
select is((public.site_google_salvar('30000000-0000-0000-0000-000000000001',
  jsonb_build_object('titulo', repeat('a', 60), 'descricao', 'Dentista em Aracaju.'))) ->> 'descricao',
  'Dentista em Aracaju.', 'Título com 60 caracteres passa');
select is(jsonb_array_length((public.portal_ajustes('30000000-0000-0000-0000-000000000001')) -> 'equipe'), 2,
  'Ajustes mostram as 2 pessoas da empresa');

-- ===== Equipe também salva =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$ select public.site_negocio_salvar('30000000-0000-0000-0000-000000000001',
  jsonb_set((select negocio from dados), '{horario,1}', '{"dias": "Sábado", "abre": "09:00", "fecha": "13:00"}')) $$,
  'Equipe salva (não é dinheiro)');

-- ===== Outra empresa =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.portal_ajustes('30000000-0000-0000-0000-000000000001') $$, 'P0002', 'site_inexistente',
  'Outra empresa não lê os dados do negócio');
select throws_ok($$ select public.site_negocio_salvar('30000000-0000-0000-0000-000000000001', '{"nome": "Invasão"}') $$,
  'P0002', 'site_inexistente', 'Outra empresa não grava');
select is((select count(*)::int from public.sites), 0, 'Pessoa do portal não lê a tabela de sites direto');
reset role;

select is((select count(*)::int from public.event_outbox where event = 'site.negocio_atualizado'), 4, 'Cada gravação gera evento');

-- ===== Site (anon) =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(public.site_publico_negocio('www.clinicasol.test') #>> '{negocio,horario,1,fecha}', '13:00',
  'Site lê o horário novo do sábado');
select is(public.site_publico_negocio('naoexiste.test'), null, 'Domínio desconhecido não devolve nada');
reset role;

select * from finish();
rollback;
