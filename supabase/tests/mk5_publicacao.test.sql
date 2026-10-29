-- MK-5: fila de publicação (ligar, sair da fila ao mudar), pacote para o n8n, registro só pela chave
-- de serviço, números automáticos x manuais e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

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
insert into public.sites (tenant_id, client_id, nome, dominio) values
  ('10000000-0000-0000-0000-000000000001', null, 'Fora do Papel', 'www.foradopapel.com.br');
insert into public.materials (id, tenant_id, kind, category, title, file_name, mime_type, size_bytes, storage_path, ready_at) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'arquivo', 'redes', 'Slide 1', 's1.png', 'image/png', 10,
   '10000000-0000-0000-0000-000000000001/redes/s1.png', now()),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'arquivo', 'redes', 'Slide 2', 's2.png', 'image/png', 10,
   '10000000-0000-0000-0000-000000000001/redes/s2.png', now()),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'arquivo', 'redes', 'Slide 3', 's3.png', 'image/png', 10,
   '10000000-0000-0000-0000-000000000001/redes/s3.png', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select set_config('teste.p', (public.mkt_peca_criar('Planilha que trava', '[{"canal":"instagram","formato":"carrossel"},{"canal":"linkedin","formato":"texto"}]')) ->> 'id', true);
select set_config('teste.v', (select id::text from public.mkt_versions where piece_id = current_setting('teste.p')::uuid and channel = 'instagram'), true);
select set_config('teste.l', (select id::text from public.mkt_versions where piece_id = current_setting('teste.p')::uuid and channel = 'linkedin'), true);
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"gancho":"A planilha cresceu.","texto":"Toda empresa começa numa planilha.","hashtags":"#gestao #aracaju"}') $$,
  current_setting('teste.v')), 'Texto do Instagram');
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"Planilha não é sistema.","hashtags":"#gestao"}') $$,
  current_setting('teste.l')), 'Texto do LinkedIn');
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000001', 'slide') $$, current_setting('teste.v')), 'Slide 1');
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000002', 'slide') $$, current_setting('teste.v')), 'Slide 2');

-- Ligar exige peça aprovada e data
select throws_ok(format($$ select public.mkt_versao_publicar_sozinho(%L, true) $$, current_setting('teste.v')),
  '22023', 'peca_nao_aprovada', 'Sem aprovação não entra na fila');
reset role;
update public.mkt_pieces set stage = 'pronto', objective = 'conversa', funnel = 'descoberta', pillar = 'problema',
       core_idea = 'A planilha cresce e ninguém acha a versão certa.' where id = current_setting('teste.p')::uuid;
set local role authenticated;
select throws_ok(format($$ select public.mkt_versao_publicar_sozinho(%L, true) $$, current_setting('teste.v')),
  '22023', 'sem_data', 'Sem data não entra na fila');
select lives_ok(format($$ select public.mkt_versao_agendar(%L, now() + interval '1 hour') $$, current_setting('teste.v')), 'Agenda');
select lives_ok(format($$ select public.mkt_versao_agendar(%L, now() + interval '1 hour') $$, current_setting('teste.l')), 'Agenda o LinkedIn');
select lives_ok(format($$ select public.mkt_versao_publicar_sozinho(%L, true) $$, current_setting('teste.v')), 'Liga o publicar sozinho');
select is((select publicacao from public.mkt_versions where id = current_setting('teste.v')::uuid), 'na_fila', 'Entra na fila');

-- Mudar a versão tira da fila
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"hashtags":"#gestao"}') $$, current_setting('teste.v')), 'Edita as hashtags');
select is((select publicacao from public.mkt_versions where id = current_setting('teste.v')::uuid), 'manual', 'Editar tira da fila');
select ok((select not publicar_sozinho and publicacao_erro like 'Saiu da fila%' from public.mkt_versions where id = current_setting('teste.v')::uuid),
  'E explica o motivo');
reset role;
update public.mkt_pieces set stage = 'pronto' where id = current_setting('teste.p')::uuid;
update public.mkt_versions set scheduled_at = now() + interval '1 hour' where piece_id = current_setting('teste.p')::uuid; -- aprovada de novo
set local role authenticated;
select is(jsonb_array_length(public.mkt_publicacoes_com_problema()), 1, 'Aparece para o Yuri no Painel');
select lives_ok(format($$ select public.mkt_versao_publicar_sozinho(%L, true) $$, current_setting('teste.v')), 'Liga de novo');
select is(jsonb_array_length(public.mkt_publicacoes_com_problema()), 0, 'O aviso some ao ligar de novo');
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000003', 'slide') $$, current_setting('teste.v')), 'Liga outro slide');
select is((select publicacao from public.mkt_versions where id = current_setting('teste.v')::uuid), 'manual', 'Arquivo novo tira da fila');
reset role;
update public.mkt_pieces set stage = 'pronto' where id = current_setting('teste.p')::uuid;
update public.mkt_versions set scheduled_at = now() + interval '1 hour' where piece_id = current_setting('teste.p')::uuid;
set local role authenticated;
select lives_ok(format($$ select public.mkt_versao_publicar_sozinho(%L, true) $$, current_setting('teste.v')), 'Liga de novo');
select lives_ok(format($$ select public.mkt_versao_publicar_sozinho(%L, true) $$, current_setting('teste.l')), 'Liga o LinkedIn');

-- O n8n: só a chave de serviço
select throws_ok($$ select public.mkt_publicacoes_devidas() $$, '42501', null, 'Dono não lê a fila do n8n');
select throws_ok(format($$ select public.mkt_publicacao_iniciar(%L) $$, current_setting('teste.v')), '42501', null, 'Nem inicia');
select throws_ok(format($$ select public.mkt_publicacao_registrar(%L, 'publicada', 'https://instagram.com/p/x') $$, current_setting('teste.v')),
  '42501', null, 'Nem registra');

reset role;
set local role service_role;
select is(jsonb_array_length(public.mkt_publicacoes_devidas()), 0, 'Antes da hora, nada a publicar');
select is(public.mkt_publicacao_iniciar(current_setting('teste.v')::uuid), null, 'Iniciar antes da hora não envia');
reset role;
update public.mkt_versions set scheduled_at = now() - interval '1 minute' where piece_id = current_setting('teste.p')::uuid;
set local role service_role;
select is(jsonb_array_length(public.mkt_publicacoes_devidas()), 0, 'Mudar a data (mesmo no banco) tira da fila');
reset role;
update public.mkt_versions set publicacao = 'na_fila', publicar_sozinho = true, publicacao_erro = null
 where piece_id = current_setting('teste.p')::uuid;
set local role service_role;
select is(jsonb_array_length(public.mkt_publicacoes_devidas()), 2, 'Na hora: as duas versões');
select set_config('teste.pac', public.mkt_publicacao_iniciar(current_setting('teste.v')::uuid)::text, true);
select is(jsonb_array_length(current_setting('teste.pac')::jsonb -> 'arquivos'), 3, 'Pacote com os 3 slides');
select is(current_setting('teste.pac')::jsonb -> 'arquivos' -> 0 ->> 'caminho', '10000000-0000-0000-0000-000000000001/redes/s1.png', 'Na ordem');
select is(current_setting('teste.pac')::jsonb ->> 'legenda', E'Toda empresa começa numa planilha.\n\n#gestao', 'Legenda do Instagram sem link');
select is(public.mkt_publicacao_iniciar(current_setting('teste.v')::uuid), null, 'Iniciar de novo não publica duas vezes');
select ok((public.mkt_publicacao_iniciar(current_setting('teste.l')::uuid)) ->> 'legenda' ~ 'utm_content=',
  'LinkedIn leva o link com rastreio');

select lives_ok(format($$ select public.mkt_publicacao_registrar(%L, 'enviada', null, 'req-123') $$, current_setting('teste.v')), 'Registra enviada');
select lives_ok(format($$ select public.mkt_publicacao_registrar(%L, 'publicada', 'https://instagram.com/p/abc', 'ig-999') $$, current_setting('teste.v')),
  'Registra publicada');
select ok((select published_url = 'https://instagram.com/p/abc' and publicacao = 'publicada' and id_externo = 'ig-999'
             from public.mkt_versions where id = current_setting('teste.v')::uuid), 'Versão publicada com o link');
select lives_ok(format($$ select public.mkt_publicacao_registrar(%L, 'falhou', null, null, 'Conta desconectada') $$, current_setting('teste.l')),
  'LinkedIn falhou');
select ok(exists (select 1 from public.event_outbox where event = 'marketing.publicacao_falhou'), 'Falha vai para a fila do n8n (aviso)');

-- Números
select is((public.mkt_resultados_automaticos(current_setting('teste.v')::uuid, '{"alcance":1200,"salvamentos":40,"comentarios":5,"lixo":"x"}')) ->> 'ok',
  'true', 'Grava os números da rede');
select ok((select resultados_fonte = 'automatico' and (results ->> 'alcance')::int = 1200 and not results ? 'lixo'
             from public.mkt_versions where id = current_setting('teste.v')::uuid), 'Com a fonte e só as chaves conhecidas');
reset role;
set local role authenticated;
select lives_ok(format($$ select public.mkt_versao_resultados(%L, '{"alcance":1500}') $$, current_setting('teste.v')), 'Pessoa corrige à mão');
reset role;
set local role service_role;
select is((public.mkt_resultados_automaticos(current_setting('teste.v')::uuid, '{"alcance":1300}')) ->> 'motivo', 'manual_recente',
  'O automático não passa por cima do que foi digitado nas últimas 24 h');

select * from finish();
rollback;
