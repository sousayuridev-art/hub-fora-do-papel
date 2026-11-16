-- SITE-45: o site marca a conversa só com nome e WhatsApp; o e-mail fica opcional nesse caso.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

delete from public.tenants where slug = 'fora-do-papel';
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select isnt(
  public.site_registrar_contato('mensagem', null, true, 'Teste Conversa', '(11) 90000-0001',
    'Primeira conversa', 'Quer marcar a conversa. Melhor período: Tarde.'),
  null, 'conversa só com nome e WhatsApp é gravada');
select is(
  public.site_registrar_contato('mensagem', '', true, 'Teste Conversa', '11900000001'),
  public.site_registrar_contato('mensagem', null, true, 'Teste Conversa', '(11) 90000-0001'),
  'repetição em 1 minuto pelo mesmo WhatsApp devolve o mesmo registro');
select throws_ok(
  $$select public.site_registrar_contato('mensagem', null, true, 'Sem Contato', null)$$,
  '22023', 'email_invalido', 'sem e-mail e sem WhatsApp é recusado');
select throws_ok(
  $$select public.site_registrar_contato('mensagem', null, true, 'Zap Curto', '1234')$$,
  '22023', 'email_invalido', 'sem e-mail e com WhatsApp inválido é recusado');
select throws_ok(
  $$select public.site_registrar_contato('inscricao', null, true, null, '11900000002')$$,
  '22023', 'email_invalido', 'inscrição continua exigindo e-mail');

reset role;
select is(
  (select count(*) from public.site_contatos where email is null and nome = 'Teste Conversa')::int,
  1, 'um contato sem e-mail gravado');
select is(
  (select d.next_step from public.deals d
     join public.site_contatos s on s.id = d.site_contato_id
    where s.nome = 'Teste Conversa'),
  'Primeiro contato pelo WhatsApp', 'o contato entra no funil com o próximo passo pelo WhatsApp');

select * from finish();
rollback;
