-- CMS-4: páginas editáveis por campos fixos. Importação idempotente que não apaga edições,
-- validação de cada chave nos limites do card, publicação e leitura pública.
begin;
create extension if not exists pgtap with schema extensions;
select plan(65);

-- ===== Importação (migração gerada por scripts/importar-paginas.ts) =====
select is((select array_agg(b.chave order by b.chave) from public.site_blocos b join public.sites s on s.id = b.site_id
            where s.dominio = 'www.foradopapel.com.br' and b.situacao = 'publicado' and b.publicado_em is not null),
  array['inicio.frentes', 'inicio.topo', 'perguntas', 'projetos', 'quem-somos'],
  'Importação gravou as 5 chaves como publicadas');
select is((select count(*) from jsonb_object_keys(public.site_publico_blocos('foradopapel.com.br')))::int, 5,
  'Leitura pública devolve as 5 chaves importadas');
select is(public.site_publico_blocos('www.foradopapel.com.br') -> 'inicio.topo' ->> 'titulo',
  '**Sistemas sob medida** para empresas que cresceram mais rápido que as suas planilhas.',
  'Topo importado com o texto atual do site');
select is((select count(*) from public.site_blocos where public._site_bloco_erro(chave, valor) is not null)::int, 0,
  'Todas as chaves importadas passam na validação');
select is((select count(*) from public.event_outbox where event like 'site.bloco%')::int, 0, 'Importação não gera evento');

-- Valores válidos de base (cópia do importado) para os casos abaixo
create temp table base (chave text primary key, valor jsonb);
insert into base select chave, valor from public.site_blocos;
grant all on base to authenticated, anon;
create temp table t (nome text primary key, valor jsonb);
grant all on t to authenticated, anon;

select is((select array_agg(public._site_importar_bloco('foradopapel.com.br', chave, valor)) from base),
  array[false, false, false, false, false], 'Importar de novo não grava nada (on conflict do nothing)');
select throws_ok($$ select public._site_importar_bloco('www.foradopapel.com.br', 'quem-somos', '{"titulo": "Só título"}') $$,
  '22023', 'bloco_invalido', 'Importação também valida o formato');
select is(has_function_privilege('authenticated', 'public._site_importar_bloco(text, text, jsonb)', 'execute'), false,
  'Importação não é executável pelo app');
select is(has_function_privilege('anon', 'public._site_bloco_erro(text, jsonb)', 'execute'), false,
  'Validação interna não é executável pelo visitante');

-- ===== Validação por chave (limite aceito, limite + 1 recusado) =====
-- inicio.topo
select is(public._site_bloco_erro('inicio.topo', (select valor from base where chave = 'inicio.topo')), null, 'Topo atual é válido');
select is(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{linha}', to_jsonb(repeat('a', 40))) from base where chave = 'inicio.topo')),
  null, 'Topo: linha com 40');
select isnt(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{linha}', to_jsonb(repeat('a', 41))) from base where chave = 'inicio.topo')),
  null, 'Topo: linha com 41 é recusada');
select is(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{titulo}', to_jsonb('**' || repeat('a', 30) || '** ' || repeat('b', 59))) from base where chave = 'inicio.topo')),
  null, 'Topo: título com 90 visíveis (asteriscos não contam)');
select isnt(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{titulo}', to_jsonb(repeat('a', 91))) from base where chave = 'inicio.topo')),
  null, 'Topo: título com 91 é recusado');
select isnt(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{titulo}', '"**um** e **dois**"') from base where chave = 'inicio.topo')),
  null, 'Topo: mais de um destaque é recusado');
select is(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{apoio}', to_jsonb(repeat('a', 300))) from base where chave = 'inicio.topo')),
  null, 'Topo: apoio com 300');
select isnt(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{apoio}', to_jsonb(repeat('a', 301))) from base where chave = 'inicio.topo')),
  null, 'Topo: apoio com 301 é recusado');
select is(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{link_sites}', to_jsonb(repeat('a', 80))) from base where chave = 'inicio.topo')),
  null, 'Topo: link para sites com 80');
select isnt(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{link_sites}', to_jsonb(repeat('a', 81))) from base where chave = 'inicio.topo')),
  null, 'Topo: link para sites com 81 é recusado');
select isnt(public._site_bloco_erro('inicio.topo', (select valor || '{"chamada": "Comprar agora"}' from base where chave = 'inicio.topo')),
  null, 'Topo: a chamada não é editável');
select isnt(public._site_bloco_erro('inicio.topo', (select jsonb_set(valor, '{apoio}', '"   "') from base where chave = 'inicio.topo')),
  null, 'Topo: texto vazio é recusado');

-- inicio.frentes
select is(public._site_bloco_erro('inicio.frentes', (select valor from base where chave = 'inicio.frentes')), null, 'Frentes atuais são válidas');
insert into t select 'frentes_cheias', jsonb_agg(jsonb_build_object('id', f ->> 'id', 'situacao', repeat('s', 90), 'titulo', repeat('t', 40),
  'frase', repeat('f', 160), 'topicos', jsonb_build_array(repeat('1', 90), repeat('2', 90), repeat('3', 90), repeat('4', 90), repeat('5', 90), repeat('6', 90))))
  from base, jsonb_array_elements(valor) f where chave = 'inicio.frentes';
select is(public._site_bloco_erro('inicio.frentes', (select valor from t where nome = 'frentes_cheias')), null,
  'Frentes: situação 90, título 40, frase 160 e 6 tópicos de 90');
select isnt(public._site_bloco_erro('inicio.frentes', (select jsonb_set(valor, '{0,situacao}', to_jsonb(repeat('s', 91))) from t where nome = 'frentes_cheias')),
  null, 'Frentes: situação com 91 é recusada');
select isnt(public._site_bloco_erro('inicio.frentes', (select jsonb_set(valor, '{1,titulo}', to_jsonb(repeat('t', 41))) from t where nome = 'frentes_cheias')),
  null, 'Frentes: título com 41 é recusado');
select isnt(public._site_bloco_erro('inicio.frentes', (select jsonb_set(valor, '{2,frase}', to_jsonb(repeat('f', 161))) from t where nome = 'frentes_cheias')),
  null, 'Frentes: frase com 161 é recusada');
select isnt(public._site_bloco_erro('inicio.frentes', (select jsonb_set(valor, '{3,topicos,0}', to_jsonb(repeat('x', 91))) from t where nome = 'frentes_cheias')),
  null, 'Frentes: tópico com 91 é recusado');
select isnt(public._site_bloco_erro('inicio.frentes', (select jsonb_set(valor, '{0,topicos}', (valor #> '{0,topicos}') || '"sétimo"') from t where nome = 'frentes_cheias')),
  null, 'Frentes: 7 tópicos é recusado');
select isnt(public._site_bloco_erro('inicio.frentes', (select jsonb_set(valor, '{0,topicos}', '[]') from t where nome = 'frentes_cheias')),
  null, 'Frentes: sem tópico é recusado');
select isnt(public._site_bloco_erro('inicio.frentes', (select valor - 3 from t where nome = 'frentes_cheias')),
  null, 'Frentes: 3 frentes é recusado');
select isnt(public._site_bloco_erro('inicio.frentes', (select jsonb_set(valor, '{1,id}', '"sistemas"') from t where nome = 'frentes_cheias')),
  null, 'Frentes: frente repetida é recusada');
select isnt(public._site_bloco_erro('inicio.frentes', (select jsonb_set(valor, '{0,assunto}', '"x"') from t where nome = 'frentes_cheias')),
  null, 'Frentes: assunto do formulário não é editável');

-- perguntas
select is(public._site_bloco_erro('perguntas', (select valor from base where chave = 'perguntas')), null, 'Perguntas atuais são válidas');
insert into t values ('pergunta', jsonb_build_object('pergunta', repeat('p', 120), 'resposta', repeat('r', 600), 'grupo', 'preco', 'inicio', true));
select is(public._site_bloco_erro('perguntas', jsonb_build_array((select valor from t where nome = 'pergunta'))), null,
  'Perguntas: pergunta 120 e resposta 600');
select isnt(public._site_bloco_erro('perguntas', jsonb_build_array((select jsonb_set(valor, '{pergunta}', to_jsonb(repeat('p', 121))) from t where nome = 'pergunta'))),
  null, 'Perguntas: pergunta com 121 é recusada');
select isnt(public._site_bloco_erro('perguntas', jsonb_build_array((select jsonb_set(valor, '{resposta}', to_jsonb(repeat('r', 601))) from t where nome = 'pergunta'))),
  null, 'Perguntas: resposta com 601 é recusada');
select isnt(public._site_bloco_erro('perguntas', jsonb_build_array((select jsonb_set(valor, '{grupo}', '"outro"') from t where nome = 'pergunta'))),
  null, 'Perguntas: grupo desconhecido é recusado');
select isnt(public._site_bloco_erro('perguntas', jsonb_build_array((select jsonb_set(valor, '{inicio}', 'false') from t where nome = 'pergunta'))),
  null, 'Perguntas: nenhuma na página inicial é recusado');
select isnt(public._site_bloco_erro('perguntas', (select jsonb_agg(jsonb_set(e, '{inicio}', 'true')) from base, jsonb_array_elements(valor) e where chave = 'perguntas')),
  null, 'Perguntas: mais de 6 na página inicial é recusado');
select isnt(public._site_bloco_erro('perguntas', '[]'), null, 'Perguntas: lista vazia é recusada');
select isnt(public._site_bloco_erro('perguntas', (select jsonb_build_array(valor, valor) from t where nome = 'pergunta')),
  null, 'Perguntas: pergunta repetida é recusada');

-- projetos
insert into t values ('projeto', jsonb_build_object('nome', repeat('n', 60), 'linha', repeat('l', 120),
  'imagem', 'https://abc.supabase.co/storage/v1/object/public/site-midia/7000/foto-1.webp', 'link', 'https://exemplo.com.br/x'));
select is(public._site_bloco_erro('projetos', (select valor from base where chave = 'projetos')), null, 'Projetos atuais são válidos');
select is(public._site_bloco_erro('projetos', jsonb_build_array((select valor from t where nome = 'projeto'))), null,
  'Projetos: nome 60, linha 120, imagem do site-midia e link https');
select is(public._site_bloco_erro('projetos', jsonb_build_array((select valor || '{"imagem": null, "link": "/artigos"}' from t where nome = 'projeto'))), null,
  'Projetos: sem imagem e com link do próprio site');
select isnt(public._site_bloco_erro('projetos', jsonb_build_array((select jsonb_set(valor, '{linha}', to_jsonb(repeat('l', 121))) from t where nome = 'projeto'))),
  null, 'Projetos: linha com 121 é recusada');
select isnt(public._site_bloco_erro('projetos', jsonb_build_array((select jsonb_set(valor, '{nome}', to_jsonb(repeat('n', 61))) from t where nome = 'projeto'))),
  null, 'Projetos: nome com 61 é recusado');
select isnt(public._site_bloco_erro('projetos', jsonb_build_array((select jsonb_set(valor, '{imagem}', '"https://outro.com/foto.webp"') from t where nome = 'projeto'))),
  null, 'Projetos: imagem de fora do site-midia é recusada');
select isnt(public._site_bloco_erro('projetos', jsonb_build_array((select jsonb_set(valor, '{link}', '"javascript:alert(1)"') from t where nome = 'projeto'))),
  null, 'Projetos: link javascript: é recusado');
select isnt(public._site_bloco_erro('projetos', (select jsonb_build_array(valor, jsonb_set(valor, '{nome}', '"B"'), jsonb_set(valor, '{nome}', '"C"'), jsonb_set(valor, '{nome}', '"D"')) from t where nome = 'projeto')),
  null, 'Projetos: mais de 3 é recusado');

-- quem-somos
select is(public._site_bloco_erro('quem-somos', (select valor from base where chave = 'quem-somos')), null, 'Quem somos atual é válido');
select is(public._site_bloco_erro('quem-somos', jsonb_build_object('titulo', '**' || repeat('t', 60) || '**', 'texto', repeat('x', 300))), null,
  'Quem somos: título 60 e texto 300');
select isnt(public._site_bloco_erro('quem-somos', jsonb_build_object('titulo', repeat('t', 61), 'texto', 'x')), null, 'Quem somos: título com 61 é recusado');
select isnt(public._site_bloco_erro('quem-somos', jsonb_build_object('titulo', 't', 'texto', repeat('x', 301))), null, 'Quem somos: texto com 301 é recusado');
select is(public._site_bloco_erro('rodape', '{}'), 'chave desconhecida', 'Chave fora da lista é desconhecida');

-- ===== Dono no Hub (sessão forte) =====
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'yuri@foradopapel.test');
insert into public.memberships (tenant_id, user_id, role)
  select tenant_id, '00000000-0000-0000-0000-0000000000a1', 'owner' from public.sites where dominio = 'www.foradopapel.com.br';
insert into t select 'site', to_jsonb(id) from public.sites where dominio = 'www.foradopapel.com.br';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

select is((public.site_bloco_salvar((select valor #>> '{}' from t where nome = 'site')::uuid, 'inicio.topo',
    (select jsonb_set(valor, '{titulo}', '"**Título novo** do topo"') from base where chave = 'inicio.topo'))) ->> 'situacao',
  'publicado', 'Mudar o título do topo mantém o bloco no ar');
select is((select count(*) from public.event_outbox where event = 'site.bloco_salvo' and payload ->> 'chave' = 'inicio.topo')::int, 1,
  'Salvar grava evento');
select throws_ok(format($$ select public.site_bloco_salvar(%L, 'inicio.topo', %L) $$, (select valor #>> '{}' from t where nome = 'site'),
    (select jsonb_set(valor, '{titulo}', to_jsonb(repeat('a', 91))) from base where chave = 'inicio.topo')),
  '22023', 'bloco_invalido', 'RPC recusa título acima do limite');
select throws_ok(format($$ select public.site_bloco_salvar(%L, 'rodape', '{"texto": "x"}') $$, (select valor #>> '{}' from t where nome = 'site')),
  '22023', 'chave_invalida', 'RPC recusa chave desconhecida');
select throws_ok(format($$ select public.site_bloco_salvar(%L, 'quem-somos', '{"titulo": "Quem", "texto": "Custa [PREÇO]."}') $$,
    (select valor #>> '{}' from t where nome = 'site')),
  '22023', 'marcador_pendente', 'Bloco no ar não recebe marcador');
select lives_ok(format($$ select public.site_bloco_publicar(%L, 'quem-somos') $$, (select valor #>> '{}' from t where nome = 'site')),
  'Publicar de novo um bloco válido');
reset role;

-- Bloco antigo fora do formato (gravado antes da validação) não é publicado
update public.site_blocos set valor = '{"titulo": "Só título"}', situacao = 'rascunho'
 where chave = 'quem-somos' and site_id = (select (valor #>> '{}')::uuid from t where nome = 'site');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
select throws_ok(format($$ select public.site_bloco_publicar(%L, 'quem-somos') $$, (select valor #>> '{}' from t where nome = 'site')),
  '22023', 'bloco_invalido', 'Publicar confere o formato');
reset role;

-- ===== Site lê o novo título; importar de novo não apaga a edição =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(public.site_publico_blocos('www.foradopapel.com.br') -> 'inicio.topo' ->> 'titulo', '**Título novo** do topo',
  'Leitura pública traz o título editado');
select is((select count(*) from jsonb_object_keys(public.site_publico_blocos('www.foradopapel.com.br')))::int, 4,
  'Bloco em rascunho sai da leitura pública (o site usa a reserva só nessa seção)');
reset role;
select is(public._site_importar_bloco('www.foradopapel.com.br', 'inicio.topo', (select valor from base where chave = 'inicio.topo')), false,
  'Importar de novo depois da edição não grava');
select is((select valor ->> 'titulo' from public.site_blocos where chave = 'inicio.topo'
            and site_id = (select (valor #>> '{}')::uuid from t where nome = 'site')),
  '**Título novo** do topo', 'A edição do Hub continua lá');

select * from finish();
rollback;
