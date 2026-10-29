-- MK-6: tema do modelo por versão, alternância da capa na grade e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

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

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select set_config('teste.p', (public.mkt_peca_criar('Planilha', '[{"canal":"instagram","formato":"carrossel"},{"canal":"linkedin","formato":"texto"}]')) ->> 'id', true);
select set_config('teste.v', (select id::text from public.mkt_versions where piece_id = current_setting('teste.p')::uuid and channel = 'instagram'), true);

select is((public.mkt_proxima_capa('instagram')) ->> 'sugerida', 'escuro', 'Sem capa anterior: começa pela escura');
select throws_ok(format($$ select public.mkt_versao_modelo(%L, 'roxo', 'ambar') $$, current_setting('teste.v')),
  '22023', 'modelo_invalido', 'Tema fora da marca é recusado');
select is((public.mkt_versao_modelo(current_setting('teste.v')::uuid, 'escuro', 'ambar')) -> 'modelo' ->> 'capa', 'escuro', 'Grava o tema');
select ok(exists (select 1 from public.mkt_events where kind = 'modelo_gerado' and version_id = current_setting('teste.v')::uuid),
  'Fica no histórico');
select is((public.mkt_proxima_capa('instagram')) ->> 'ultima', null, 'Só gerada (rascunho) não conta na grade');
reset role;
update public.mkt_versions set scheduled_at = now() + interval '1 day' where id = current_setting('teste.v')::uuid;
set local role authenticated;
select is((public.mkt_proxima_capa('instagram')) ->> 'ultima', 'escuro', 'Agendada: a última capa no Instagram é escura');
select is((public.mkt_proxima_capa('instagram')) ->> 'sugerida', 'claro', 'Sugere a clara (a grade alterna)');
select is((public.mkt_proxima_capa('instagram', current_setting('teste.v')::uuid)) ->> 'ultima', null,
  'Ignora a própria versão ao gerar de novo');
-- Stories não entram na grade
select lives_ok(format($$ select public.mkt_versao_adicionar(%L, 'instagram', 'stories') $$, current_setting('teste.p')), 'Stories na mesma peça');
select lives_ok(format($$ select public.mkt_versao_modelo(%L, 'ambar', 'ambar') $$,
  (select id from public.mkt_versions where piece_id = current_setting('teste.p')::uuid and format = 'stories')), 'Gera nos Stories');
reset role;
update public.mkt_versions set scheduled_at = now() + interval '2 days' where piece_id = current_setting('teste.p')::uuid and format = 'stories';
set local role authenticated;
select is((public.mkt_proxima_capa('instagram')) ->> 'ultima', 'escuro', 'Stories agendado não muda a grade');
select is((public.mkt_proxima_capa('linkedin')) ->> 'sugerida', 'escuro', 'Cada canal tem a sua grade');

reset role;
update public.mkt_versions set published_at = now(), published_url = 'https://instagram.com/p/1' where id = current_setting('teste.v')::uuid;
set local role authenticated;
select throws_ok(format($$ select public.mkt_versao_modelo(%L, 'claro', 'ambar') $$, current_setting('teste.v')),
  '22023', 'versao_publicada', 'Versão publicada não muda de modelo');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((public.mkt_proxima_capa('instagram')) ->> 'ultima', null, 'Outro tenant não vê a grade');
select throws_ok(format($$ select public.mkt_versao_modelo(%L, 'claro', 'ambar') $$, current_setting('teste.v')),
  'P0002', 'versao_inexistente', 'Nem grava modelo na versão');

select * from finish();
rollback;
