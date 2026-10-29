-- MK-1: Central de conteúdo. Peça com versões por canal, revisão da marca, portas entre etapas,
-- aprovação, agenda, publicação, resultados, calendário e isolamento por tenant.
begin;
create extension if not exists pgtap with schema extensions;
select plan(55);

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
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Plamev', 'Marina', '79900000010');

-- Canais nascem com o tenant (gatilho)
select is((select count(*)::int from public.mkt_channels where tenant_id = '10000000-0000-0000-0000-000000000001'), 4,
  'Tenant novo ganha os 4 canais');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select is(jsonb_array_length(public.mkt_canais_listar()), 4, 'Dono lista os canais');

-- Criar peça com duas versões
select set_config('teste.peca', (public.mkt_peca_criar('Por que a planilha trava',
  '[{"canal":"instagram","formato":"carrossel"},{"canal":"linkedin","formato":"documento"}]')) ->> 'id', true);
select is((public.mkt_peca_detalhe(current_setting('teste.peca')::uuid)) ->> 'stage', 'ideia', 'Peça nasce em Ideia');
select is(jsonb_array_length((public.mkt_peca_detalhe(current_setting('teste.peca')::uuid)) -> 'versoes'), 2, 'Nasce com 2 versões');
select is((public.mkt_peca_detalhe(current_setting('teste.peca')::uuid)) -> 'historico' -> 0 ->> 'tipo', 'criada', 'Histórico registra a criação');
select throws_ok($$ select public.mkt_peca_criar('x') $$, '22023', 'titulo_obrigatorio', 'Título curto é recusado');
select throws_ok($$ select public.mkt_peca_criar('Formato errado', '[{"canal":"linkedin","formato":"reels"}]') $$,
  '22023', 'formato_invalido', 'Reels não é formato do LinkedIn');
select throws_ok($$ select public.mkt_peca_criar('Canal errado', '[{"canal":"orkut","formato":"texto"}]') $$,
  'P0002', 'canal_inexistente', 'Canal fora da lista é recusado');
select lives_ok($$ select public.mkt_peca_criar('Anúncio no TikTok', '[{"canal":"tiktok","formato":"anuncio"}]') $$,
  'Anúncio vale em qualquer canal');

-- Porta do briefing
select throws_ok(format($$ select public.mkt_peca_mover(%L, 'producao') $$, current_setting('teste.peca')),
  '22023', 'briefing_incompleto', 'Sem pilar e objetivo não passa para a criação');
select is(((public.mkt_peca_detalhe(current_setting('teste.peca')::uuid)) -> 'falta') ? 'pilar', true, 'A peça diz que falta o pilar');
select lives_ok(format($$ select public.mkt_peca_editar(%L, '{"objetivo":"conversa","funil":"descoberta","pilar":"problema","frente":"sistemas","ideia":"A planilha cresce e ninguém acha a última versão."}') $$,
  current_setting('teste.peca')), 'Briefing preenchido');
select throws_ok(format($$ select public.mkt_peca_editar(%L, '{"pilar":"meme"}') $$, current_setting('teste.peca')),
  '22023', 'campos_invalidos', 'Pilar fora da lista é recusado');
select is((public.mkt_peca_mover(current_setting('teste.peca')::uuid, 'producao')) ->> 'coluna', 'criacao', 'Com briefing, vai para Criação');

-- Revisão da marca
select set_config('teste.v_ig', (select id::text from public.mkt_versions where piece_id = current_setting('teste.peca')::uuid and channel = 'instagram'), true);
select set_config('teste.v_li', (select id::text from public.mkt_versions where piece_id = current_setting('teste.peca')::uuid and channel = 'linkedin'), true);
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"TUDO em um lugar só. TUDO mesmo! Fale agora! Valor: [PREÇO]","chamada":"marcar_conversa"}') $$,
  current_setting('teste.v_ig')), 'Texto com problemas é salvo');
select ok((select warnings @> '[{"codigo":"marcador","bloqueia":true}]' from public.mkt_versions where id = current_setting('teste.v_ig')::uuid),
  'Marcador vira aviso que bloqueia');
select ok((select warnings @> '[{"codigo":"tudo_repetido","bloqueia":false}]' from public.mkt_versions where id = current_setting('teste.v_ig')::uuid),
  'TUDO duas vezes vira aviso');
select ok((select warnings @> '[{"codigo":"exclamacao"}]' from public.mkt_versions where id = current_setting('teste.v_ig')::uuid),
  'Duas exclamações viram aviso');
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"Mande o lead para o pipeline depois da call."}') $$,
  current_setting('teste.v_li')), 'Texto com termos evitados é salvo');
select ok((select warnings @> '[{"codigo":"termo_evitado"}]' from public.mkt_versions where id = current_setting('teste.v_li')::uuid),
  'Termos em inglês viram aviso');
select throws_ok(format($$ select public.mkt_versao_editar(%L, '{"chamada":"clique_aqui"}') $$, current_setting('teste.v_li')),
  '22023', 'campos_invalidos', 'Chamada fora do manual é recusada');

-- Porta da aprovação
select throws_ok(format($$ select public.mkt_peca_mover(%L, 'aprovacao') $$, current_setting('teste.peca')),
  '22023', 'revisao_pendente', 'Com marcador, não entra em Aprovação');
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"TUDO em um lugar só. Marque uma conversa.","roteiro":[{"tempo":"0-3s","fala":"Planilha travou?","na_tela":"Planilha travou?"}],"slides":[{"titulo":"A planilha cresceu","texto":"E agora?"}]}') $$,
  current_setting('teste.v_ig')), 'Texto corrigido');
select is((select jsonb_array_length(warnings) from public.mkt_versions where id = current_setting('teste.v_ig')::uuid), 0, 'Sem avisos depois da correção');
select is((select script -> 0 ->> 'na_tela' from public.mkt_versions where id = current_setting('teste.v_ig')::uuid), 'Planilha travou?', 'Roteiro guardado');
select is((public.mkt_peca_mover(current_setting('teste.peca')::uuid, 'aprovacao')) ->> 'stage', 'aprovacao', 'Aviso que não bloqueia deixa entrar em Aprovação');

-- Ajuste e aprovação
select throws_ok(format($$ select public.mkt_peca_pedir_ajuste(%L, '') $$, current_setting('teste.peca')),
  '22023', 'nota_obrigatoria', 'Pedido de ajuste sem nota é recusado');
select is((public.mkt_peca_pedir_ajuste(current_setting('teste.peca')::uuid, 'Trocar os termos em inglês do LinkedIn')) ->> 'stage',
  'refinamento', 'Ajuste volta para Refinamento');
select is((select note from public.mkt_events where piece_id = current_setting('teste.peca')::uuid and kind = 'ajuste_pedido'),
  'Trocar os termos em inglês do LinkedIn', 'Histórico guarda a nota do ajuste');
select lives_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"Quando a planilha cresce, a equipe perde tempo procurando a versão certa."}') $$,
  current_setting('teste.v_li')), 'LinkedIn corrigido');
select lives_ok(format($$ select public.mkt_peca_mover(%L, 'aprovacao') $$, current_setting('teste.peca')), 'Volta para Aprovação');
select throws_ok(format($$ select public.mkt_versao_agendar(%L, now() + interval '1 day') $$, current_setting('teste.v_ig')),
  '22023', 'peca_nao_aprovada', 'Não agenda antes de aprovar');
select is((public.mkt_peca_aprovar(current_setting('teste.peca')::uuid)) ->> 'stage', 'pronto', 'Aprovada vai para Pronto');
select throws_ok(format($$ select public.mkt_peca_aprovar(%L) $$, current_setting('teste.peca')),
  '22023', 'etapa_invalida', 'Aprovar de novo é recusado');
select is((select count(*)::int from public.event_outbox where event = 'marketing.peca_aprovada'), 1, 'Aprovação avisa o n8n uma vez');

-- Editar depois de aprovada desfaz a aprovação
select is((public.mkt_versao_editar(current_setting('teste.v_li')::uuid, '{"hashtags":"#sistemas #aracaju"}')) ->> 'stage',
  'aprovacao', 'Editar peça aprovada volta para Aprovação');
select lives_ok(format($$ select public.mkt_peca_aprovar(%L, 'Ok') $$, current_setting('teste.peca')), 'Aprovada de novo');

-- Agenda, publicação e resultados
select lives_ok(format($$ select public.mkt_versao_agendar(%L, now() + interval '1 day') $$, current_setting('teste.v_ig')), 'Agenda a versão');
select throws_ok(format($$ select public.mkt_versao_publicar(%L, 'http://instagram.com/p/x') $$, current_setting('teste.v_ig')),
  '22023', 'link_invalido', 'Publicar exige link https');
select throws_ok(format($$ select public.mkt_versao_publicar(%L, 'https://instagram.com/p/x', now() + interval '1 day') $$, current_setting('teste.v_ig')),
  '22023', 'data_no_futuro', 'Publicação não pode estar no futuro');
select throws_ok(format($$ select public.mkt_versao_resultados(%L, '{"alcance":10}') $$, current_setting('teste.v_ig')),
  '22023', 'versao_nao_publicada', 'Resultados só depois de publicar');
select is((public.mkt_versao_publicar(current_setting('teste.v_ig')::uuid, 'https://instagram.com/p/abc')) ->> 'stage',
  'pronto', 'Uma de duas publicada: segue em Pronto');
select is((public.mkt_versao_publicar(current_setting('teste.v_li')::uuid, 'https://linkedin.com/feed/update/1')) ->> 'stage',
  'publicado', 'Todas publicadas: vai para Publicado');
select throws_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"novo"}') $$, current_setting('teste.v_ig')),
  '22023', 'versao_publicada', 'Versão publicada não muda o texto');
select throws_ok(format($$ select public.mkt_versao_resultados(%L, '{"alcance":-1}') $$, current_setting('teste.v_ig')),
  '22023', 'resultados_invalidos', 'Resultado negativo é recusado');
select lives_ok(format($$ select public.mkt_versao_resultados(%L, '{"alcance":120,"salvamentos":8,"mensagens":2}') $$, current_setting('teste.v_ig')), 'Resultados do Instagram');
select is((public.mkt_versao_resultados(current_setting('teste.v_li')::uuid, '{"alcance":80,"cliques":3}')) ->> 'stage',
  'analisado', 'Todas com resultados: Analisado');
select throws_ok(format($$ select public.mkt_peca_remover(%L) $$, current_setting('teste.peca')),
  '22023', 'peca_publicada', 'Peça publicada não é removida');

-- Calendário: pilar repetido no mesmo canal
select set_config('teste.peca2', (public.mkt_peca_criar('Outro problema', '[{"canal":"instagram","formato":"post_unico"}]')) ->> 'id', true);
reset role;
update public.mkt_pieces set pillar = 'problema', objective = 'alcance', funnel = 'descoberta', core_idea = 'Outro problema da rotina.', stage = 'pronto'
 where id = current_setting('teste.peca2')::uuid;
update public.mkt_versions set body = 'Texto', scheduled_at = now() + interval '2 days' where piece_id = current_setting('teste.peca2')::uuid;
set local role authenticated;
select ok((select bool_or(e -> 'avisos' ? 'pilar_repetido')
             from jsonb_array_elements((public.mkt_calendario(current_date - 2, current_date + 10)) -> 'itens') e
            where e ->> 'peca_id' = current_setting('teste.peca2')),
  'Calendário avisa pilar repetido no Instagram');
select is((public.mkt_resumo()) ->> 'publicadas_mes', '2', 'Resumo conta as publicadas no mês');

-- Isolamento
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.mkt_pieces), 0, 'Dono de outro tenant não lê as peças');
select throws_ok(format($$ select public.mkt_peca_detalhe(%L) $$, current_setting('teste.peca')),
  'P0002', 'peca_inexistente', 'Nem pelo detalhe');
select throws_ok(format($$ select public.mkt_versao_editar(%L, '{"texto":"invadido"}') $$, current_setting('teste.v_ig')),
  'P0002', 'versao_inexistente', 'Nem altera versão de outro tenant');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.mkt_pecas_listar() $$, '42501', 'sem_permissao', 'Cliente do portal não acessa');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.mkt_resumo() $$, '42501', 'precisa_codigo', 'Sem o código do app, recusa');

select * from finish();
rollback;
