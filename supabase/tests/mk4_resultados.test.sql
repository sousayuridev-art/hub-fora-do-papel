-- MK-4: código e link de rastreio, peça de origem (automática e manual), resultados agregados no
-- banco, destaques, "falta registrar" e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

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
insert into public.mkt_campaigns (id, tenant_id, name)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Lançamento Março');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

-- Três peças: problema (Instagram), escolha honesta (LinkedIn) e bastidores (Instagram, sem resultado)
select set_config('teste.p1', (public.mkt_peca_criar('Planilha que trava', '[{"canal":"instagram","formato":"carrossel"}]')) ->> 'id', true);
select set_config('teste.p2', (public.mkt_peca_criar('CRM pronto ou sistema', '[{"canal":"linkedin","formato":"texto"}]')) ->> 'id', true);
select set_config('teste.p3', (public.mkt_peca_criar('Um dia no Hub', '[{"canal":"instagram","formato":"reels"}]')) ->> 'id', true);
reset role;
update public.mkt_pieces set pillar = 'problema', objective = 'conversa', campaign_id = '30000000-0000-0000-0000-000000000001'
 where id = current_setting('teste.p1')::uuid;
update public.mkt_pieces set pillar = 'escolha_honesta', objective = 'autoridade' where id = current_setting('teste.p2')::uuid;
update public.mkt_pieces set pillar = 'bastidores', objective = 'alcance' where id = current_setting('teste.p3')::uuid;
select set_config('teste.v1', (select id::text from public.mkt_versions where piece_id = current_setting('teste.p1')::uuid), true);
select set_config('teste.v2', (select id::text from public.mkt_versions where piece_id = current_setting('teste.p2')::uuid), true);
select set_config('teste.v3', (select id::text from public.mkt_versions where piece_id = current_setting('teste.p3')::uuid), true);
select set_config('teste.c1', (select codigo from public.mkt_versions where id = current_setting('teste.v1')::uuid), true);

-- Código de rastreio
select ok(current_setting('teste.c1') ~ '^[A-Z2-9]{6}$', 'Versão nova ganha código de 6 letras e números');
select is((select count(distinct codigo)::int from public.mkt_versions where tenant_id = '10000000-0000-0000-0000-000000000001'), 3,
  'Códigos diferentes por versão');
update public.mkt_versions set codigo = 'AAAAAA' where id = current_setting('teste.v1')::uuid;
select is((select codigo from public.mkt_versions where id = current_setting('teste.v1')::uuid), current_setting('teste.c1'), 'O código nunca muda');

-- Publicação e resultados (como se registrados na tela)
update public.mkt_versions set published_at = now() - interval '2 days', published_url = 'https://instagram.com/p/1',
       results = '{"alcance":1000,"salvamentos":50,"cliques":10,"mensagens":3}' where id = current_setting('teste.v1')::uuid;
update public.mkt_versions set published_at = now() - interval '3 days', published_url = 'https://linkedin.com/p/2',
       results = '{"alcance":0,"salvamentos":0,"cliques":0,"mensagens":0}' where id = current_setting('teste.v2')::uuid;
update public.mkt_versions set published_at = now() - interval '9 days', published_url = 'https://instagram.com/p/3'
 where id = current_setting('teste.v3')::uuid;

-- Peça de origem automática: contato do site com o código da versão vira negócio
insert into public.clients (id, tenant_id, company_name, contact_name, whatsapp, email) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Loja A', 'Ana', '79900000001', 'a@a.test'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Loja C', 'Caio', '79900000003', 'c@c.test'),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Loja E', 'Eva', '79900000005', 'e@e.test'),
  ('40000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'Outra loja', 'Duda', '79900000009', 'd@d.test');
insert into public.site_contatos (id, tenant_id, tipo, email, consentimento_em, origem) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'mensagem', 'a@a.test', now(),
   jsonb_build_object('utm_content', lower(current_setting('teste.c1')))),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'mensagem', 'b@b.test', now(),
   '{"utm_content":"ZZZZZZ"}'),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'mensagem', 'novo@novo.test', now(),
   jsonb_build_object('utm_content', current_setting('teste.c1'))),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'inscricao', 'e@e.test', now(),
   jsonb_build_object('utm_content', current_setting('teste.c1'))),
  ('50000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'mensagem', 'd@d.test', now(),
   jsonb_build_object('utm_content', current_setting('teste.c1')));
-- O funil criou os negócios; o da Loja A fecha. Um negócio antigo da Loja A (antes da publicação) não conta.
update public.deals set stage = 'fechado', value_cents = 500000, closed_at = now()
 where client_id = '40000000-0000-0000-0000-000000000001';
insert into public.deals (tenant_id, client_id, stage, value_cents, closed_at) values
  ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'fechado', 99, now() - interval '30 days');
select is((select mkt_version_id::text from public.clients where id = '40000000-0000-0000-0000-000000000001'), current_setting('teste.v1'),
  'Contato do site com o código (sem diferença de maiúsculas) liga o cliente à versão');
select is((select mkt_version_id::text from public.clients where lower(email) = 'novo@novo.test'), current_setting('teste.v1'),
  'E-mail novo: o funil cria o cliente e só depois a peça é ligada (ordem dos gatilhos)');
select is((select c.mkt_version_id from public.clients c where lower(c.email) = 'b@b.test'), null, 'Código desconhecido não liga nada');
select is((select mkt_version_id from public.clients where id = '40000000-0000-0000-0000-000000000005'), null,
  'Inscrição na lista não vira negócio e não liga a peça');
select is((select mkt_version_id from public.clients where id = '40000000-0000-0000-0000-000000000009'), null,
  'Código de outro tenant não liga nada');
insert into public.site_contatos (tenant_id, tipo, email, consentimento_em, origem) values
  ('10000000-0000-0000-0000-000000000001', 'mensagem', 'novo@novo.test', now(),
   jsonb_build_object('utm_content', (select codigo from public.mkt_versions where id = current_setting('teste.v2')::uuid)));
select is((select mkt_version_id::text from public.clients where lower(email) = 'novo@novo.test'), current_setting('teste.v1'),
  'A mesma pessoa voltando por outra peça: vale a primeira');

set local role authenticated;
-- Link e contatos na peça
select is((public.mkt_peca_detalhe(current_setting('teste.p1')::uuid)) -> 'versoes' -> 0 ->> 'link',
  'https://www.foradopapel.com.br/?utm_source=instagram&utm_medium=social&utm_campaign=lancamento-marco&utm_content=' || current_setting('teste.c1'),
  'Link com rastreio: canal, campanha e código');
select is((public.mkt_peca_detalhe(current_setting('teste.p1')::uuid)) -> 'versoes' -> 0 ->> 'contatos', '2', 'A versão mostra 2 contatos');
select is((public.mkt_peca_detalhe(current_setting('teste.p1')::uuid)) ->> 'negocios_fechados', '1',
  'E a peça, 1 negócio fechado (o fechado antes da publicação fica de fora)');
select is((public.mkt_peca_detalhe(current_setting('teste.p1')::uuid)) ->> 'contatos', '2', 'E a peça soma os contatos no banco');
select ok((public.mkt_peca_detalhe(current_setting('teste.p2')::uuid)) -> 'versoes' -> 0 ->> 'link' !~ 'utm_campaign',
  'Sem campanha, o link não leva utm_campaign');

-- Manual na ficha
select set_config('teste.u0', (select updated_at::text from public.clients where id = '40000000-0000-0000-0000-000000000003'), true);
select lives_ok(format($$ select public.mkt_cliente_origem_definir('40000000-0000-0000-0000-000000000003', %L) $$, current_setting('teste.v2')),
  'Marca a peça de origem à mão');
select is((select updated_at::text from public.clients where id = '40000000-0000-0000-0000-000000000003'), current_setting('teste.u0'),
  'Peça de origem não muda a versão da ficha (quem está editando não perde o salvamento)');
select is((public.mkt_cliente_origem('40000000-0000-0000-0000-000000000003')) -> 'peca' ->> 'titulo', 'CRM pronto ou sistema', 'A ficha mostra a peça');
select is((public.mkt_cliente_origem('40000000-0000-0000-0000-000000000003')) ->> 'manual', 'true', 'Marcada como manual');
reset role;
insert into public.site_contatos (id, tenant_id, tipo, email, consentimento_em, origem) values
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'mensagem', 'c@c.test', now(),
   jsonb_build_object('utm_content', current_setting('teste.c1')));
select is((select mkt_version_id::text from public.clients where id = '40000000-0000-0000-0000-000000000003'), current_setting('teste.v2'),
  'A origem manual não é trocada pelo automático');
-- Versão sem publicação não pode ser escolhida à mão; peça antiga "1000 visitas" para testar a busca
insert into public.mkt_versions (tenant_id, piece_id, channel, format, position)
values ('10000000-0000-0000-0000-000000000001', current_setting('teste.p2')::uuid, 'instagram', 'carrossel', 1);
set local role authenticated;
select set_config('teste.p4', (public.mkt_peca_criar('1000 visitas no site', '[{"canal":"instagram","formato":"carrossel"}]')) ->> 'id', true);
reset role;
update public.mkt_versions set published_at = now() - interval '60 days', published_url = 'https://instagram.com/p/4',
       results = '{"alcance":10}' where piece_id = current_setting('teste.p4')::uuid;
set local role authenticated;
select throws_ok(format($$ select public.mkt_cliente_origem_definir('40000000-0000-0000-0000-000000000003', %L) $$,
    (select id from public.mkt_versions where piece_id = current_setting('teste.p2')::uuid and published_at is null)),
  '22023', 'versao_nao_publicada', 'Só versão publicada vira peça de origem');
select is(jsonb_array_length(public.mkt_versoes_publicadas(null)), 4, 'Lista as versões publicadas para escolher');
select is(jsonb_array_length(public.mkt_versoes_publicadas('crm')), 1, 'Busca pelo título');
select is(jsonb_array_length(public.mkt_versoes_publicadas(lower(current_setting('teste.c1')))), 1, 'Busca pelo código');
select is(jsonb_array_length(public.mkt_versoes_publicadas('1000')), 1, 'Acha "1000 visitas"');
select is(jsonb_array_length(public.mkt_versoes_publicadas('10%vis')), 0, 'Busca não trata % como curinga');
select is(jsonb_array_length(public.mkt_versoes_publicadas('100_ vis')), 0, 'Nem _');

-- Resultados por pilar (a peça de 60 dias fica fora dos últimos 30)
select set_config('teste.r', public.mkt_resultados(current_date - 30, current_date, 'pilar')::text, true);
select is(current_setting('teste.r')::jsonb -> 'totais' ->> 'versoes', '3', 'Total: 3 versões publicadas no período');
select is(current_setting('teste.r')::jsonb -> 'totais' ->> 'com_resultado', '2', '2 com resultado registrado');
select is(current_setting('teste.r')::jsonb -> 'totais' ->> 'contatos', '3', '3 contatos com peça de origem');
select is(current_setting('teste.r')::jsonb -> 'totais' ->> 'valor_fechado', '500000', 'Valor fechado em centavos (só depois da publicação)');
select is(current_setting('teste.r')::jsonb -> 'grupos' -> 0 ->> 'chave', 'problema', 'Ordenado por contatos');
select is((current_setting('teste.r')::jsonb -> 'grupos' -> 0) - 'chave' - 'nome' - 'salvamentos_por_mil' - 'negocios_fechados' - 'valor_fechado',
  '{"versoes":1,"com_resultado":1,"alcance":1000,"salvamentos":50,"cliques":10,"mensagens":3,"contatos":2}'::jsonb, 'Somas certas do grupo');
select is(current_setting('teste.r')::jsonb -> 'grupos' -> 0 ->> 'salvamentos_por_mil', '50.0', 'Salvamentos por mil calculados no banco');
select is((select g ->> 'salvamentos_por_mil' from jsonb_array_elements(current_setting('teste.r')::jsonb -> 'grupos') g
            where g ->> 'chave' = 'escolha_honesta'), null, 'Alcance zero: salvamentos por mil fica vazio');
select is(jsonb_array_length(current_setting('teste.r')::jsonb -> 'grupos'), 3, 'Uma linha por pilar');
select is((public.mkt_resultados(current_date - 30, current_date, 'campanha')) -> 'grupos' -> 0 ->> 'nome', 'Lançamento Março',
  'Por campanha, com o nome');
select is(jsonb_array_length((public.mkt_resultados(current_date - 5, current_date, 'canal')) -> 'grupos'), 2,
  'Período curto deixa de fora a versão de 9 dias atrás');
select throws_ok($$ select public.mkt_resultados(current_date, current_date - 1, 'pilar') $$, '22023', 'periodo_invalido', 'Período invertido');
select throws_ok($$ select public.mkt_resultados(current_date - 1, current_date, 'senha') $$, '22023', 'agrupamento_invalido', 'Agrupamento fora da lista');

-- Destaques e "falta registrar"
select set_config('teste.d', public.mkt_resultados_destaques(current_date - 30, current_date)::text, true);
select is(current_setting('teste.d')::jsonb -> 'por_contatos' -> 0 ->> 'titulo', 'Planilha que trava', 'Melhor peça por contatos');
select is(jsonb_array_length(current_setting('teste.d')::jsonb -> 'por_salvamentos'), 1, 'Por salvamentos só entra peça com alcance de 100 ou mais');
select is(current_setting('teste.d')::jsonb -> 'falta_registrar' -> 0 ->> 'titulo', 'Um dia no Hub', 'Publicada há 9 dias sem resultado: falta registrar');
select lives_ok(format($$ select public.mkt_versao_resultados(%L, '{"alcance":120,"salvamentos":1}') $$, current_setting('teste.v3')),
  'Registra os números da versão');
select is(jsonb_array_length((public.mkt_resultados_destaques(current_date - 30, current_date)) -> 'falta_registrar'), 0,
  'Depois de registrar, sai de "falta registrar"');

-- Fuso: publicada às 23h do último dia do mês anterior (já é dia 1 em UTC) conta no mês anterior
reset role;
update public.mkt_versions set published_at = (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 hour') at time zone 'America/Sao_Paulo'
 where piece_id = current_setting('teste.p4')::uuid;
update public.mkt_pieces set pillar = 'chamada_direta' where id = current_setting('teste.p4')::uuid;
set local role authenticated;
select ok(not exists (select 1 from jsonb_array_elements((public.mkt_resultados(
    date_trunc('month', now() at time zone 'America/Sao_Paulo')::date,
    (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month - 1 day')::date, 'pilar')) -> 'grupos') g
  where g ->> 'chave' = 'chamada_direta'), 'Não entra no mês atual');
select ok(exists (select 1 from jsonb_array_elements((public.mkt_resultados(
    (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date,
    (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 day')::date, 'pilar')) -> 'grupos') g
  where g ->> 'chave' = 'chamada_direta'), 'Entra no mês anterior');

-- Versão apagada: o cliente fica sem peça de origem
reset role;
update public.clients set mkt_version_id = (select id from public.mkt_versions where piece_id = current_setting('teste.p4')::uuid)
 where id = '40000000-0000-0000-0000-000000000005';
delete from public.mkt_versions where piece_id = current_setting('teste.p4')::uuid;
select is((select mkt_version_id from public.clients where id = '40000000-0000-0000-0000-000000000005'), null,
  'Versão apagada: o cliente fica sem peça de origem');

-- Isolamento
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select is((public.mkt_resultados(current_date - 30, current_date, 'pilar')) -> 'totais' ->> 'versoes', '0', 'Outro tenant não vê os resultados');
select is((public.mkt_resultados_destaques(current_date - 30, current_date)) -> 'por_contatos', '[]'::jsonb, 'Nem os destaques');
select throws_ok($$ select public.mkt_cliente_origem('40000000-0000-0000-0000-000000000001') $$, 'P0002', 'cliente_inexistente',
  'Nem a peça de origem de um cliente meu');
select throws_ok(format($$ select public.mkt_cliente_origem_definir('40000000-0000-0000-0000-000000000009', %L) $$, current_setting('teste.v1')),
  '22023', 'versao_nao_publicada', 'Nem liga o próprio cliente a uma versão minha');

select * from finish();
rollback;
