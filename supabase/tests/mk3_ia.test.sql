-- MK-3: IA que sugere. Preparar (briefing, teto e limite do dia), registrar só pela chave de
-- serviço, custo estimado, usar por campo passando pela revisão da marca, ganchos, revisão e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

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
select is((public.mkt_ia_preparar(current_setting('teste.v')::uuid, 'versao')) -> 'briefing' ->> 'pilar', 'problema', 'Preparar devolve o briefing');
select is((public.mkt_ia_preparar(current_setting('teste.v')::uuid, 'versao')) -> 'versao' ->> 'canal', 'instagram', 'E a versão do canal');
select is((public.mkt_ia_preparar(current_setting('teste.v')::uuid, 'versao')) ->> 'usuario', '00000000-0000-0000-0000-0000000000a1', 'E quem pediu (para o registro de uso)');

-- Registrar: só a chave de serviço
select throws_ok(format($$ select public.mkt_ia_registrar('10000000-0000-0000-0000-000000000001', null, %L, 'versao', 'claude-sonnet-5-5',
    '{}'::jsonb, '{"texto":"x"}'::jsonb, '{}'::jsonb) $$, current_setting('teste.v')),
  '42501', null, 'Dono não grava sugestão nem uso direto');

reset role;
set local role service_role;
select is((public.mkt_ia_registrar('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1',
    current_setting('teste.v')::uuid, 'versao', 'claude-sonnet-5-5',
    '{"entrada":3000,"saida":800,"cache_escrita":0,"cache_leitura":4000}'::jsonb,
    '{"gancho":"A planilha cresceu. E agora?","texto":"Texto com [PREÇO]","slides":[{"titulo":"Um","texto":"a"},{"titulo":"Dois","texto":"b"},{"titulo":"Três","texto":"c"}],"chamada":"marcar_conversa","hashtags":"#gestao"}'::jsonb,
    '{"instrucoes":"marketing-ia v1"}'::jsonb)) ->> 'custo', '148', 'Custo estimado pelo preço do modelo (US$ 0,0148)');
select is((select count(*)::int from public.ai_usage), 1, 'Toda chamada fica em ai_usage');
select lives_ok(format($$ select public.mkt_ia_registrar('10000000-0000-0000-0000-000000000001', null, %L, 'ganchos', 'claude-sonnet-5-5',
    '{"entrada":1000,"saida":200}'::jsonb, '{"ganchos":["Gancho A","Gancho B","Gancho C"]}'::jsonb, '{}'::jsonb) $$, current_setting('teste.v')),
  'Registra os ganchos');
select is((public.mkt_ia_registrar('10000000-0000-0000-0000-000000000001', null, current_setting('teste.v')::uuid, 'versao', 'claude-sonnet-5-5',
    '{"entrada":500}'::jsonb, null, '{}'::jsonb, 'api_fora_do_ar')) ->> 'ok', 'false', 'Falha grava o uso sem sugestão');
select is((select count(*)::int from public.mkt_ai_suggestions), 2, 'Falha não vira sugestão');
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

-- Revisão troca o trecho no texto atual
reset role;
set local role service_role;
select lives_ok(format($$ select public.mkt_ia_registrar('10000000-0000-0000-0000-000000000001', null, %L, 'revisao', 'claude-sonnet-5-5',
    '{"entrada":100,"saida":50}'::jsonb,
    '{"itens":[{"trecho":"[PREÇO]","problema":"Marcador","troca":"o valor sai na proposta"}]}'::jsonb, '{}'::jsonb) $$, current_setting('teste.v')),
  'Registra a revisão');
reset role;
set local role authenticated;
select lives_ok(format($$ select public.mkt_sugestao_usar((select id from public.mkt_ai_suggestions where tipo = 'revisao'), null, 0) $$), 'Aplica a troca');
select is((select body from public.mkt_versions where id = current_setting('teste.v')::uuid), 'Texto com o valor sai na proposta', 'O trecho foi trocado');

-- Teto e limite do dia
reset role;
update public.ai_limits set teto_mensal = 10 where tenant_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'versao') $$, current_setting('teste.v')),
  '22023', 'teto_mensal', 'Teto atingido: a IA não é chamada');
select is((public.ia_uso_do_mes()) ->> 'percentual', '999', 'Acima do teto, o percentual fica no máximo da tela');

-- Isolamento
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select throws_ok(format($$ select public.mkt_ia_preparar(%L, 'versao') $$, current_setting('teste.v')),
  'P0002', 'versao_inexistente', 'Dono de outro tenant não pede sugestão para a peça');
select is((select count(*)::int from public.ai_usage) + (select count(*)::int from public.mkt_ai_suggestions), 0,
  'Nem lê o uso e as sugestões');

select * from finish();
rollback;
