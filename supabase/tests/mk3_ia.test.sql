-- MK-3: IA que sugere. Preparar (briefing, teto, limite do dia e reserva), registrar só pela chave
-- de serviço, custo estimado, usar por campo passando pela revisão da marca, ganchos, revisão e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(54);

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

select is((select teto_mensal from public.ai_limits where tenant_id = '10000000-0000-0000-0000-000000000001' and area = 'marketing'),
  100000, 'Tenant novo ganha o teto de US$ 10 na Central');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select set_config('teste.peca', (public.mkt_peca_criar('Por que a planilha trava', '[{"canal":"instagram","formato":"carrossel"}]')) ->> 'id', true);
select set_config('teste.v', (select id::text from public.mkt_versions where piece_id = current_setting('teste.peca')::uuid), true);

-- Preparar exige briefing
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'versao') $$, current_setting('teste.v')),
  '22023', 'briefing_incompleto', 'Sem briefing, a IA não é chamada');
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'piada') $$, current_setting('teste.v')),
  '22023', 'tipo_invalido', 'Tipo fora da lista é recusado');
select lives_ok(format($$ select public.mkt_peca_editar(%L, '{"objetivo":"conversa","funil":"descoberta","pilar":"problema","ideia":"A planilha cresce e ninguém acha a versão certa."}') $$,
  current_setting('teste.peca')), 'Briefing preenchido');
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'revisao') $$, current_setting('teste.v')),
  '22023', 'sem_texto_para_revisar', 'Revisar sem texto é recusado');
select is((select count(*)::int from public.ai_usage), 0, 'Pedido recusado não reserva nada');

-- Preparar devolve o contexto e reserva o pedido
select set_config('teste.ctx', public.mkt_ia_preparar(current_setting('teste.v')::uuid, 'versao')::text, true);
select is(current_setting('teste.ctx')::jsonb -> 'briefing' ->> 'pilar', 'problema', 'Preparar devolve o briefing');
select is(current_setting('teste.ctx')::jsonb -> 'versao' ->> 'canal', 'instagram', 'E a versão do canal');
select is(current_setting('teste.ctx')::jsonb ->> 'usuario', '00000000-0000-0000-0000-0000000000a1', 'E quem pediu');
select is(current_setting('teste.ctx')::jsonb ->> 'modelo', 'claude-sonnet-5-5', 'E o modelo (Sonnet)');
select ok((select ok is null and custo_estimado > 0 and recurso = 'marketing.versoes' from public.ai_usage
            where id = (current_setting('teste.ctx')::jsonb ->> 'uso_id')::bigint),
  'O pedido fica reservado em ai_usage com o custo máximo antes da chamada');

-- Registrar: só a chave de serviço
select throws_ok(format($$ select public.mkt_ia_registrar(%s, '{}'::jsonb, '{"texto":"x"}'::jsonb, '{}'::jsonb) $$,
    current_setting('teste.ctx')::jsonb ->> 'uso_id'),
  '42501', null, 'Dono não grava sugestão nem uso direto');

reset role;
set local role service_role;
select is((public.mkt_ia_registrar((current_setting('teste.ctx')::jsonb ->> 'uso_id')::bigint,
    '{"entrada":3000,"saida":800,"cache_escrita":0,"cache_leitura":4000}'::jsonb,
    '{"gancho":"A planilha cresceu. E agora?","texto":"Texto com [PREÇO]","slides":[{"titulo":"Um","texto":"a"},{"titulo":"Dois","texto":"b"},{"titulo":"Três","texto":"c"}],"chamada":"marcar_conversa","hashtags":"#gestao"}'::jsonb,
    '{"instrucoes":"marketing-ia v1"}'::jsonb)) ->> 'custo', '148', 'Custo real pelo preço do modelo (US$ 0,0148)');
select is((select custo_estimado from public.ai_usage where id = (current_setting('teste.ctx')::jsonb ->> 'uso_id')::bigint), 148,
  'A linha reservada passa a guardar o custo real');
select throws_ok(format($$ select public.mkt_ia_registrar(%s, '{}'::jsonb, '{"texto":"x"}'::jsonb, '{}'::jsonb) $$,
    current_setting('teste.ctx')::jsonb ->> 'uso_id'),
  'P0002', 'uso_inexistente', 'Reserva já fechada não é usada de novo');
reset role;
set local role authenticated;

select set_config('teste.ctx2', public.mkt_ia_preparar(current_setting('teste.v')::uuid, 'ganchos')::text, true);
select set_config('teste.ctx3', public.mkt_ia_preparar(current_setting('teste.v')::uuid, 'versao')::text, true);
select set_config('teste.ctx4', public.mkt_ia_preparar(current_setting('teste.v')::uuid, 'versao')::text, true);
reset role;
set local role service_role;
select lives_ok(format($$ select public.mkt_ia_registrar(%s, '{"entrada":1000,"saida":200}'::jsonb,
    '{"ganchos":["Gancho A","Gancho B","Gancho C"]}'::jsonb, '{}'::jsonb) $$, current_setting('teste.ctx2')::jsonb ->> 'uso_id'),
  'Registra os ganchos');
select is((public.mkt_ia_registrar((current_setting('teste.ctx3')::jsonb ->> 'uso_id')::bigint, '{"entrada":500}'::jsonb, null, '{}'::jsonb, 'ia_http_500')) ->> 'ok',
  'false', 'Falha fecha o uso sem sugestão');
select lives_ok(format($$ select public.mkt_ia_registrar(%s, '{}'::jsonb, null, '{}'::jsonb, 'ia_tempo_esgotado') $$,
    current_setting('teste.ctx4')::jsonb ->> 'uso_id'), 'Tempo esgotado também fecha o uso');
select ok((select custo_estimado > 0 and ok = false from public.ai_usage where id = (current_setting('teste.ctx4')::jsonb ->> 'uso_id')::bigint),
  'No tempo esgotado fica a reserva (a API pode ter cobrado)');
select is((select count(*)::int from public.mkt_ai_suggestions), 2, 'Falha não vira sugestão');
reset role;
set local role authenticated;

-- Versão apagada durante a chamada: o uso fica registrado mesmo assim
select lives_ok(format($$ select public.mkt_versao_adicionar(%L, 'linkedin', 'texto') $$, current_setting('teste.peca')), 'Segunda versão');
select set_config('teste.v2', (select id::text from public.mkt_versions where piece_id = current_setting('teste.peca')::uuid and channel = 'linkedin'), true);
select set_config('teste.ctx5', public.mkt_ia_preparar(current_setting('teste.v2')::uuid, 'versao')::text, true);
select lives_ok(format($$ select public.mkt_versao_remover(%L) $$, current_setting('teste.v2')), 'Versão removida enquanto a IA escreve');
reset role;
set local role service_role;
select is((public.mkt_ia_registrar((current_setting('teste.ctx5')::jsonb ->> 'uso_id')::bigint, '{"entrada":900,"saida":400}'::jsonb,
    '{"texto":"x"}'::jsonb, '{}'::jsonb)) ->> 'erro', 'versao_removida', 'O registro não falha sem a versão');
select ok((select custo_estimado > 0 and ok = false from public.ai_usage where id = (current_setting('teste.ctx5')::jsonb ->> 'uso_id')::bigint),
  'E o custo conta no teto');
reset role;
set local role authenticated;

-- Listar e usar
select is(jsonb_array_length(public.mkt_sugestoes_listar(current_setting('teste.v')::uuid)), 2, 'Dono vê as sugestões da versão');
select set_config('teste.s', (select id::text from public.mkt_ai_suggestions where tipo = 'versao'), true);
select set_config('teste.g', (select id::text from public.mkt_ai_suggestions where tipo = 'ganchos'), true);
select is((select hook from public.mkt_versions where id = current_setting('teste.v')::uuid), null, 'Nada muda na peça antes de usar');
select throws_ok(format($$ select public.mkt_sugestao_usar(%L, array['senha']) $$, current_setting('teste.s')),
  '22023', 'campo_invalido', 'Campo fora da lista é recusado');
select lives_ok(format($$ select public.mkt_sugestao_usar(%L, array['gancho', 'slides']) $$, current_setting('teste.s')), 'Usa só gancho e slides');
select is((select hook from public.mkt_versions where id = current_setting('teste.v')::uuid), 'A planilha cresceu. E agora?', 'O gancho entrou');
select is((select body from public.mkt_versions where id = current_setting('teste.v')::uuid), null, 'O texto não entrou');
select is((select jsonb_array_length(slides) from public.mkt_versions where id = current_setting('teste.v')::uuid), 3, 'Os slides entraram');
select lives_ok(format($$ select public.mkt_sugestao_usar(%L, array['texto']) $$, current_setting('teste.s')), 'Usa o texto');
select ok((select warnings @> '[{"codigo":"marcador","bloqueia":true}]' from public.mkt_versions where id = current_setting('teste.v')::uuid),
  'Texto usado passa pela revisão da marca (marcador bloqueia)');
select lives_ok(format($$ select public.mkt_sugestao_usar(%L, null, 1) $$, current_setting('teste.g')), 'Escolhe o segundo gancho');
select is((select hook from public.mkt_versions where id = current_setting('teste.v')::uuid), 'Gancho B', 'O gancho escolhido entrou');
select throws_ok(format($$ select public.mkt_sugestao_usar(%L, null, 9) $$, current_setting('teste.g')),
  '22023', 'opcao_invalida', 'Opção que não existe é recusada');
select throws_ok(format($$ select public.mkt_sugestao_usar(%L, null, -1) $$, current_setting('teste.g')),
  '22023', 'opcao_invalida', 'Opção negativa é recusada');

-- Revisão troca o trecho no campo apontado, só se ele aparece uma vez
select set_config('teste.ctx6', public.mkt_ia_preparar(current_setting('teste.v')::uuid, 'revisao')::text, true);
reset role;
set local role service_role;
select lives_ok(format($$ select public.mkt_ia_registrar(%s, '{"entrada":100,"saida":50}'::jsonb,
    '{"itens":[{"campo":"texto","trecho":"[PREÇO]","problema":"Marcador","troca":"o valor sai na proposta"},
               {"campo":"gancho","trecho":"Gancho","problema":"x","troca":"Pergunta"},
               {"campo":"texto","trecho":"o ","problema":"x","troca":"u "}]}'::jsonb, '{}'::jsonb) $$,
    current_setting('teste.ctx6')::jsonb ->> 'uso_id'),
  'Registra a revisão');
reset role;
set local role authenticated;
select set_config('teste.r', (select id::text from public.mkt_ai_suggestions where tipo = 'revisao'), true);
select lives_ok(format($$ select public.mkt_sugestao_usar(%L, null, 0) $$, current_setting('teste.r')), 'Aplica a troca no texto');
select is((select body from public.mkt_versions where id = current_setting('teste.v')::uuid), 'Texto com o valor sai na proposta', 'O trecho foi trocado');
select throws_ok(format($$ select public.mkt_sugestao_usar(%L, null, 0) $$, current_setting('teste.r')),
  '22023', 'ja_usada', 'A mesma troca não se aplica duas vezes');
select lives_ok(format($$ select public.mkt_sugestao_usar(%L, null, 1) $$, current_setting('teste.r')), 'Troca no gancho');
select is((select hook from public.mkt_versions where id = current_setting('teste.v')::uuid), 'Pergunta B', 'A troca caiu no gancho, não no texto');
select throws_ok(format($$ select public.mkt_sugestao_usar(%L, null, 2) $$, current_setting('teste.r')),
  '22023', 'trecho_repetido', 'Trecho que aparece mais de uma vez é recusado');

-- Versão publicada não recebe sugestão
reset role;
update public.mkt_versions set published_at = now() - interval '1 hour', published_url = 'https://instagram.com/p/teste' where id = current_setting('teste.v')::uuid;
set local role authenticated;
select throws_ok(format($$ select public.mkt_sugestao_usar(%L, array['chamada']) $$, current_setting('teste.s')),
  '22023', 'versao_publicada', 'Versão publicada não recebe sugestão');
reset role;
update public.mkt_versions set published_at = null, published_url = null where id = current_setting('teste.v')::uuid;

-- Limite do dia e teto
update public.ai_limits set limite_diario = (select count(*) from public.ai_usage) where tenant_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'versao') $$, current_setting('teste.v')),
  '22023', 'limite_diario', 'Limite do dia atingido: a IA não é chamada');
reset role;
update public.ai_limits set teto_mensal = 10, limite_diario = 30 where tenant_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'versao') $$, current_setting('teste.v')),
  '22023', 'teto_mensal', 'Teto atingido: a IA não é chamada');
select is((public.ia_uso_do_mes()) ->> 'percentual', '999', 'Acima do teto, o percentual fica no máximo da tela');

-- Sem preço do modelo, nada é chamado (o custo daria zero)
reset role;
delete from public.ai_model_prices;
update public.ai_limits set teto_mensal = 100000 where tenant_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'versao') $$, current_setting('teste.v')),
  '22023', 'preco_do_modelo', 'Sem preço do modelo, a IA não é chamada');

-- Isolamento
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'versao') $$, current_setting('teste.v')),
  'P0002', 'versao_inexistente', 'Dono de outro tenant não pede sugestão para a peça');
select is((select count(*)::int from public.ai_usage) + (select count(*)::int from public.mkt_ai_suggestions), 0,
  'Nem lê o uso e as sugestões');
select is(jsonb_array_length(public.mkt_sugestoes_listar(current_setting('teste.v')::uuid)), 0, 'Nem lista as sugestões');
select throws_ok(format($$ select public.mkt_sugestao_usar(%L, array['gancho']) $$, current_setting('teste.s')),
  'P0002', 'sugestao_inexistente', 'Nem usa');
select throws_ok(format($$ select public.mkt_sugestao_descartar(%L) $$, current_setting('teste.s')),
  'P0002', 'sugestao_inexistente', 'Nem descarta');

select * from finish();
rollback;
