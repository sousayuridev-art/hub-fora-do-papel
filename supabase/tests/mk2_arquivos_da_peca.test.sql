-- MK-2: arquivos da peça. Papel × tipo do arquivo, porta da aprovação com arquivos, lixeira,
-- ordem, arquivo do cliente, aprovação desfeita ao trocar arquivo e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'dona@outra.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'marina@cliente.test');
delete from public.tenants where slug in ('fora-do-papel', 'outra');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Fora do Papel', 'fora-do-papel'),
  ('10000000-0000-0000-0000-000000000002', 'Outra', 'outra');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'client');
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Marina', '79900000010'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Junior Soares', 'Junior', '79900000011');
insert into public.materials (id, tenant_id, client_id, category, kind, origin, title, storage_path, file_name, mime_type, size_bytes, ready_at) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, 'redes', 'arquivo', 'nosso', 'Slide 1', 't/1/s1.png', 's1.png', 'image/png', 10, now()),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', null, 'redes', 'arquivo', 'nosso', 'Slide 2', 't/2/s2.png', 's2.png', 'image/png', 10, now()),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', null, 'redes', 'arquivo', 'nosso', 'Slide 3', 't/3/s3.jpg', 's3.jpg', 'image/jpeg', 10, now()),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', null, 'redes', 'arquivo', 'nosso', 'Vídeo', 't/4/v.mp4', 'v.mp4', 'video/mp4', 10, now()),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', null, 'redes', 'arquivo', 'nosso', 'PDF', 't/5/d.pdf', 'd.pdf', 'application/pdf', 10, now()),
  ('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'cliente', 'arquivo', 'cliente', 'Foto da Plamev', 't/6/f.jpg', 'f.jpg', 'image/jpeg', 10, now()),
  ('70000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', null, 'redes', 'arquivo', 'nosso', 'Da outra', 't/7/o.png', 'o.png', 'image/png', 10, now());

select ok(exists (select 1 from pg_enum where enumtypid = 'public.material_category'::regtype and enumlabel = 'redes'),
  'Materiais ganha a categoria "redes"');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

-- Peça com carrossel no Instagram e Reels
select set_config('teste.peca', (public.mkt_peca_criar('Cinco sinais',
  '[{"canal":"instagram","formato":"carrossel"},{"canal":"instagram","formato":"reels"}]')) ->> 'id', true);
select set_config('teste.car', (select id::text from public.mkt_versions where piece_id = current_setting('teste.peca')::uuid and format = 'carrossel'), true);
select set_config('teste.reel', (select id::text from public.mkt_versions where piece_id = current_setting('teste.peca')::uuid and format = 'reels'), true);
select lives_ok(format($$ select public.mkt_peca_editar(%L, '{"objetivo":"alcance","funil":"descoberta","pilar":"problema","ideia":"Cinco sinais de que a planilha travou."}') $$,
  current_setting('teste.peca')), 'Briefing');
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"Carrossel"}') $$, current_setting('teste.car')), 'Texto do carrossel');
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"Reels"}') $$, current_setting('teste.reel')), 'Texto do Reels');
select lives_ok(format($$ select public.mkt_peca_mover(%L, 'producao') $$, current_setting('teste.peca')), 'Em Produção');

-- Porta: formato visual sem arquivo não vai para aprovação
select throws_ok(format($$ select public.mkt_peca_mover(%L, 'aprovacao') $$, current_setting('teste.peca')),
  '22023', 'revisao_pendente', 'Sem arquivo, não entra em Aprovação');
select ok(((public.mkt_peca_detalhe(current_setting('teste.peca')::uuid)) -> 'falta') ? 'vídeo (Instagram)', 'A peça diz que falta o vídeo');

-- Papel × tipo
select throws_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000005', 'slide') $$, current_setting('teste.car')),
  '22023', 'tipo_do_arquivo', 'PDF não entra como slide');
select throws_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000004', 'capa') $$, current_setting('teste.reel')),
  '22023', 'tipo_do_arquivo', 'MP4 não entra como capa');
select throws_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000007', 'slide') $$, current_setting('teste.car')),
  'P0002', 'material_inexistente', 'Arquivo de outro tenant não entra');
select throws_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000006', 'slide') $$, current_setting('teste.car')),
  '22023', 'arquivo_de_outro_cliente', 'Foto do cliente só na peça daquele cliente');

-- Slides em ordem
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000001', 'slide') $$, current_setting('teste.car')), 'Slide 1');
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000002', 'slide') $$, current_setting('teste.car')), 'Slide 2');
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000003', 'slide') $$, current_setting('teste.car')), 'Slide 3');
select throws_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000001', 'slide') $$, current_setting('teste.car')),
  '22023', 'arquivo_repetido', 'O mesmo arquivo não entra duas vezes');
select is((select array_agg(m.title order by x.position) from public.mkt_version_media x join public.materials m on m.id = x.material_id
            where x.version_id = current_setting('teste.car')::uuid), array['Slide 1', 'Slide 2', 'Slide 3'], 'Entram na ordem do envio');
select lives_ok(format($$ select public.mkt_midia_ordenar(%L, (select array_agg(id order by case material_id
    when '70000000-0000-0000-0000-000000000003' then 0 when '70000000-0000-0000-0000-000000000001' then 1 else 2 end)
    from public.mkt_version_media where version_id = %L)) $$, current_setting('teste.car'), current_setting('teste.car')), 'Sobe o slide 3');
select is((select array_agg(m.title order by x.position) from public.mkt_version_media x join public.materials m on m.id = x.material_id
            where x.version_id = current_setting('teste.car')::uuid), array['Slide 3', 'Slide 1', 'Slide 2'], 'A ordem nova fica gravada');
select throws_ok(format($$ select public.mkt_midia_ordenar(%L, array[gen_random_uuid()]) $$, current_setting('teste.car')),
  '22023', 'ordem_invalida', 'Ordem com lista incompleta é recusada');

-- Com o vídeo, entra em Aprovação e é aprovada
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000004', 'video') $$, current_setting('teste.reel')), 'Vídeo do Reels');
select is((public.mkt_peca_mover(current_setting('teste.peca')::uuid, 'aprovacao')) ->> 'stage', 'aprovacao', 'Com os arquivos, entra em Aprovação');
select is(jsonb_array_length((public.mkt_peca_detalhe(current_setting('teste.peca')::uuid)) -> 'versoes' -> 0 -> 'midias'), 3,
  'A peça traz os arquivos de cada versão');
select lives_ok(format($$ select public.mkt_peca_aprovar(%L) $$, current_setting('teste.peca')), 'Aprovada');

-- Trocar arquivo depois de aprovar desfaz a aprovação
select is((public.mkt_midia_remover((select id from public.mkt_version_media where version_id = current_setting('teste.car')::uuid
            and material_id = '70000000-0000-0000-0000-000000000002'))) ->> 'stage', 'aprovacao', 'Remover slide de peça aprovada volta para Aprovação');

-- Lixeira bloqueia a aprovação
select lives_ok($$ select public.material_lixeira('70000000-0000-0000-0000-000000000003', true) $$, 'Slide 3 vai para a lixeira');
select ok(((public.mkt_peca_detalhe(current_setting('teste.peca')::uuid)) -> 'falta') ? 'restaurar da lixeira um arquivo da peça',
  'Arquivo na lixeira (com o slide exigido ainda presente) bloqueia a aprovação');
select throws_ok(format($$ select public.mkt_peca_aprovar(%L) $$, current_setting('teste.peca')),
  '22023', 'revisao_pendente', 'E a aprovação é recusada');
select lives_ok($$ select public.material_lixeira('70000000-0000-0000-0000-000000000003', false) $$, 'Slide 3 restaurado');

select lives_ok($$ select public.material_lixeira('70000000-0000-0000-0000-000000000004', true) $$, 'Vídeo vai para a lixeira');
select throws_ok($$ select public.material_excluir('70000000-0000-0000-0000-000000000004') $$,
  '22023', 'material_em_uso', 'Arquivo usado numa peça não é excluído de vez');
select ok(not public._material_pode_apagar('t/4/v.mp4'), 'O Storage também recusa apagar o arquivo em uso');

-- Foto do cliente na peça do cliente
select lives_ok(format($$ select public.mkt_peca_editar(%L, '{"cliente":"20000000-0000-0000-0000-000000000001"}') $$, current_setting('teste.peca')), 'Peça do cliente');
select throws_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000006', 'slide') $$, current_setting('teste.car')),
  '22023', 'autorizacao_do_cliente', 'Sem a autorização marcada, a foto do cliente não entra');
select lives_ok(format($$ select public.mkt_peca_editar(%L, '{"autorizacao":true}') $$, current_setting('teste.peca')), 'Autorização marcada');
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000006', 'slide') $$, current_setting('teste.car')),
  'Com autorização, a foto do cliente entra na peça dele');
select lives_ok(format($$ select public.mkt_peca_editar(%L, '{"cliente":"20000000-0000-0000-0000-000000000002","autorizacao":true}') $$, current_setting('teste.peca')),
  'Peça passa para outro cliente');
select ok(((public.mkt_peca_detalhe(current_setting('teste.peca')::uuid)) -> 'falta') ? 'trocar os arquivos de outro cliente',
  'Foto do cliente anterior bloqueia a aprovação');

-- Ligar e ordenar também desfazem a aprovação
select set_config('teste.p2', (public.mkt_peca_criar('Post simples', '[{"canal":"instagram","formato":"post_unico"}]')) ->> 'id', true);
select set_config('teste.p2v', (select id::text from public.mkt_versions where piece_id = current_setting('teste.p2')::uuid), true);
select lives_ok(format($$ select public.mkt_peca_editar(%L, '{"objetivo":"alcance","funil":"descoberta","pilar":"bastidores","ideia":"Uma tela do Hub em uso."}') $$,
  current_setting('teste.p2')), 'Briefing da peça 2');
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"Texto"}') $$, current_setting('teste.p2v')), 'Texto da peça 2');
select lives_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000001', 'imagem') $$, current_setting('teste.p2v')), 'Imagem da peça 2');
select lives_ok(format($$ select public.mkt_peca_mover(%L, 'aprovacao') $$, current_setting('teste.p2')), 'Peça 2 em Aprovação');
select lives_ok(format($$ select public.mkt_peca_aprovar(%L) $$, current_setting('teste.p2')), 'Peça 2 aprovada');
select is((public.mkt_midia_ligar(current_setting('teste.p2v')::uuid, '70000000-0000-0000-0000-000000000002', 'imagem')) ->> 'stage',
  'aprovacao', 'Ligar arquivo em peça aprovada volta para Aprovação');
select lives_ok(format($$ select public.mkt_peca_aprovar(%L) $$, current_setting('teste.p2')), 'Peça 2 aprovada de novo');
select is((public.mkt_midia_ordenar(current_setting('teste.p2v')::uuid, (select array_agg(id order by position desc) from public.mkt_version_media
            where version_id = current_setting('teste.p2v')::uuid))) ->> 'stage', 'aprovacao', 'Ordenar em peça aprovada volta para Aprovação');
select is((select array_agg(position order by position) from public.mkt_version_media where version_id = current_setting('teste.p2v')::uuid),
  array[0, 1]::smallint[], 'Posições ficam de 0 a n-1');

-- Versão publicada sem arquivo não trava a aprovação das outras (peças de antes do MK-2)
select set_config('teste.p3', (public.mkt_peca_criar('Antes do MK-2', '[{"canal":"instagram","formato":"reels"},{"canal":"linkedin","formato":"texto"}]')) ->> 'id', true);
reset role;
update public.mkt_versions set body = 'Texto', published_at = now() - interval '1 day', published_url = 'https://instagram.com/p/x'
 where piece_id = current_setting('teste.p3')::uuid and format = 'reels';
update public.mkt_versions set body = 'Texto' where piece_id = current_setting('teste.p3')::uuid and format = 'texto';
update public.mkt_pieces set objective = 'alcance', funnel = 'descoberta', pillar = 'bastidores', core_idea = 'Peça publicada pela metade.', stage = 'aprovacao'
 where id = current_setting('teste.p3')::uuid;
set local role authenticated;
select is((public.mkt_peca_detalhe(current_setting('teste.p3')::uuid)) -> 'falta', '[]'::jsonb, 'Reels publicado sem arquivo não exige vídeo');
select lives_ok(format($$ select public.mkt_peca_aprovar(%L) $$, current_setting('teste.p3')), 'A peça publicada pela metade é aprovada');

-- Isolamento
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.mkt_version_media), 0, 'Dono de outro tenant não lê os arquivos das peças');
select throws_ok(format($$ select public.mkt_midia_ligar(%L, '70000000-0000-0000-0000-000000000007', 'slide') $$, current_setting('teste.car')),
  'P0002', 'versao_inexistente', 'Dono de outro tenant não liga arquivo na peça');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.mkt_version_media), 0, 'Cliente do portal não lê os arquivos das peças');

select * from finish();
rollback;
