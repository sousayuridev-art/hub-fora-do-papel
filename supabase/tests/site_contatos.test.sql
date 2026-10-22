-- SITE-1: o site grava contatos pela RPC, mas ninguém de fora lê.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'outra-agencia@test');
-- A migração já cria a Fora do Papel; o teste usa um id fixo para ela.
delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Agência', 'outra-agencia');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'owner');

-- Visitante anônimo do site
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select isnt(
  public.site_registrar_contato('mensagem', 'Ana@Teste.com', true, 'Ana', '79999999999', 'Site', 'Quero um site'),
  null, 'anônimo grava mensagem pela RPC');
select is(
  public.site_registrar_contato('mensagem', 'ana@teste.com', true, 'Ana', null, null, 'repetida'),
  (select public.site_registrar_contato('mensagem', 'ana@teste.com', true, 'Ana')),
  'repetição em 1 minuto devolve o mesmo registro');
select isnt(
  public.site_registrar_contato('horario', 'bia@teste.com', true, 'Bia', '+55 (79) 99999-0000', null, null, now() + interval '2 days'),
  null, 'anônimo pede horário');
select throws_ok(
  $$select public.site_registrar_contato('mensagem', 'sem-arroba', true, 'Ana')$$,
  '22023', 'email_invalido', 'e-mail inválido é recusado');
select throws_ok(
  $$select public.site_registrar_contato('inscricao', 'c@teste.com', false)$$,
  '22023', 'consentimento_obrigatorio', 'sem consentimento é recusado');
select throws_ok(
  $$select public.site_registrar_contato('horario', 'dani@teste.com', true, 'Dani', null, null, null, now() + interval '2 days')$$,
  '22023', 'whatsapp_invalido', 'horário sem WhatsApp é recusado');
select throws_ok(
  $$select public.site_registrar_contato('mensagem', 'eva@teste.com', true, 'Eva', null, null, null, null, '{}'::jsonb, 'enorme')$$,
  '22023', 'porte_invalido', 'porte fora da lista é recusado');
select isnt(
  public.site_registrar_contato('mensagem', 'fabio@teste.com', true, 'Fábio', null, 'Sistemas', null, null, '{}'::jsonb, '11_50'),
  null, 'porte válido é aceito');
select throws_ok($$ select count(*) from public.site_contatos $$, '42501', null, 'anônimo não lê a tabela');

-- Dono da Fora do Papel
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.site_contatos)::int, 3, 'dono vê os 3 contatos gravados');
select is((select count(*) from public.event_outbox where event = 'site.contato_recebido')::int, 3,
  'cada contato gerou 1 evento');
select is((select porte from public.site_contatos where email = 'fabio@teste.com'), '11_50', 'porte gravado no contato');

-- Dono de outra agência
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.site_contatos)::int, 0, 'outra agência não vê os contatos');

select * from finish();
rollback;
