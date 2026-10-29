-- =====================================================================
-- Hub Fora do Papel · MK-3 · IA que sugere (banco)
-- Card: docs/cards/MK-3-ia-que-sugere.md · Regras: docs/regras-ia.md
-- A função de servidor `marketing-ia` prepara o pedido com o login do dono (mkt_ia_preparar),
-- chama a API e grava o resultado com a chave de serviço (mkt_ia_registrar). A pessoa decide o
-- que usar (mkt_sugestao_usar), sempre pela mesma regra de edição do MK-1.
-- Teto mensal da Central: US$ 10; as três ações entram agora (decisões do Yuri, 29/10).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Uso, teto e preços
-- ---------------------------------------------------------------------
create table public.ai_usage (
  id                  bigint generated always as identity primary key,
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  workspace           text not null check (workspace in ('fdp-hub', 'fdp-demos')),
  area                text not null check (area ~ '^[a-z_]{2,30}$'),
  recurso             text not null check (length(recurso) between 3 and 60),
  modelo              text not null check (length(modelo) between 3 and 60),
  tokens_entrada      integer not null default 0 check (tokens_entrada >= 0),
  tokens_saida        integer not null default 0 check (tokens_saida >= 0),
  tokens_cache_escrita integer not null default 0 check (tokens_cache_escrita >= 0),
  tokens_cache_leitura integer not null default 0 check (tokens_cache_leitura >= 0),
  -- Centésimos de centavo de dólar (1 = US$ 0,0001): um pedido custa frações de centavo.
  custo_estimado      integer not null default 0 check (custo_estimado >= 0),
  -- Nulo enquanto o pedido está com a IA (reserva); depois, deu certo ou não.
  ok                  boolean,
  erro                text check (erro is null or length(erro) <= 200),
  piece_id            uuid references public.mkt_pieces (id) on delete set null,
  version_id          uuid references public.mkt_versions (id) on delete set null,
  user_id             uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now()
);
create index ai_usage_mes_idx on public.ai_usage (tenant_id, area, created_at);

create table public.ai_limits (
  tenant_id            uuid not null references public.tenants (id) on delete cascade,
  area                 text not null check (area ~ '^[a-z_]{2,30}$'),
  -- Em centésimos de centavo de dólar (100000 = US$ 10).
  teto_mensal          integer not null check (teto_mensal between 0 and 100000000),
  limite_diario        integer not null default 30 check (limite_diario between 0 and 1000),
  updated_at           timestamptz not null default now(),
  primary key (tenant_id, area)
);

-- Preço por milhão de tokens, em centésimos de centavo de dólar (US$ 2 = 20000).
-- Conferir no Console da Anthropic; corrigir aqui sem mexer no código.
create table public.ai_model_prices (
  modelo               text primary key,
  entrada              integer not null check (entrada >= 0),
  saida                integer not null check (saida >= 0),
  cache_escrita        integer not null check (cache_escrita >= 0),
  cache_leitura        integer not null check (cache_leitura >= 0),
  fonte                text not null,
  updated_at           timestamptz not null default now()
);
insert into public.ai_model_prices (modelo, entrada, saida, cache_escrita, cache_leitura, fonte) values
  ('claude-sonnet-5-5', 20000, 100000, 25000, 2000, 'Fonte de terceiros (eesel.ai, 29/10/2026); conferir no Console');

-- Teto da Central para os tenants de hoje e os novos: US$ 10/mês, 30 pedidos/dia.
insert into public.ai_limits (tenant_id, area, teto_mensal, limite_diario)
select id, 'marketing', 100000, 30 from public.tenants
on conflict do nothing;

create or replace function public._ia_limites_padrao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ai_limits (tenant_id, area, teto_mensal, limite_diario)
  values (new.id, 'marketing', 100000, 30) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public._ia_limites_padrao() from public, anon, authenticated;
create trigger tenants_ia_limites after insert on public.tenants
  for each row execute function public._ia_limites_padrao();

-- ---------------------------------------------------------------------
-- 2. Sugestões
-- ---------------------------------------------------------------------
create table public.mkt_ai_suggestions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  piece_id      uuid not null references public.mkt_pieces (id) on delete cascade,
  version_id    uuid not null references public.mkt_versions (id) on delete cascade,
  tipo          text not null check (tipo in ('versao', 'ganchos', 'revisao')),
  conteudo      jsonb not null check (jsonb_typeof(conteudo) = 'object'),
  -- De onde veio: o que foi mandado (briefing, textos) e a versão das instruções.
  base          jsonb not null default '{}'::jsonb,
  usada_em      timestamptz,
  campos_usados text[] not null default '{}',
  descartada_em timestamptz,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  expira_em     timestamptz not null default now() + interval '30 days'
);
create index mkt_ai_suggestions_versao_idx on public.mkt_ai_suggestions (version_id, created_at desc);

-- ---------------------------------------------------------------------
-- 3. RLS: o dono lê; ninguém grava direto (a função grava com a chave de serviço)
-- ---------------------------------------------------------------------
alter table public.ai_usage           enable row level security;
alter table public.ai_limits          enable row level security;
alter table public.ai_model_prices    enable row level security;
alter table public.mkt_ai_suggestions enable row level security;

create policy ai_usage_owner_select on public.ai_usage for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy ai_limits_owner_select on public.ai_limits for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy mkt_ai_suggestions_owner_select on public.mkt_ai_suggestions
  for select to authenticated using (public.is_tenant_owner(tenant_id));
-- Preços não têm dado de tenant, mas só servem à função de servidor.

revoke all on public.ai_usage, public.ai_limits, public.ai_model_prices, public.mkt_ai_suggestions from anon;
revoke insert, update, delete, truncate on public.ai_usage, public.ai_limits, public.ai_model_prices, public.mkt_ai_suggestions
  from authenticated;
revoke select on public.ai_model_prices from authenticated;

-- ---------------------------------------------------------------------
-- 4. Contas do mês e do dia (no fuso do tenant)
-- ---------------------------------------------------------------------
create or replace function public._ia_uso(p_tenant uuid, p_area text)
returns jsonb language sql stable security definer set search_path = public as $$
  with fuso as (select timezone from public.tenants where id = p_tenant),
       lim as (select teto_mensal, limite_diario from public.ai_limits where tenant_id = p_tenant and area = p_area)
  select jsonb_build_object(
    'gasto', coalesce((select sum(u.custo_estimado) from public.ai_usage u, fuso
                        where u.tenant_id = p_tenant and u.area = p_area
                          and date_trunc('month', u.created_at at time zone fuso.timezone)
                              = date_trunc('month', now() at time zone fuso.timezone)), 0),
    'teto', coalesce((select teto_mensal from lim), 0),
    'pedidos_hoje', (select count(*) from public.ai_usage u, fuso
                      where u.tenant_id = p_tenant and u.area = p_area
                        and (u.created_at at time zone fuso.timezone)::date = (now() at time zone fuso.timezone)::date),
    'limite_diario', coalesce((select limite_diario from lim), 0));
$$;
revoke all on function public._ia_uso(uuid, text) from public, anon, authenticated;

-- Para a tela: gasto, teto e percentual do mês (valores em centésimos de centavo de dólar).
create or replace function public.ia_uso_do_mes(p_area text default 'marketing')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare u jsonb := public._ia_uso(public._tenant_do_dono(), p_area); g bigint; t bigint;
begin
  g := (u ->> 'gasto')::bigint; t := (u ->> 'teto')::bigint;
  return u || jsonb_build_object('percentual', case when t > 0 then least(999, floor(g * 100.0 / t))::int else 100 end);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Preparar (com o login do dono) e registrar (só a chave de serviço)
-- ---------------------------------------------------------------------
-- Modelo da Central: Sonnet, porque é texto que vai a público (regra 4). Trocar é decisão de card.
create or replace function public._mkt_ia_modelo()
returns text language sql immutable set search_path = public as $$ select 'claude-sonnet-5-5'::text $$;

-- Teto de saída por ação (o mesmo da função de servidor) e entrada estimada com folga.
create or replace function public._mkt_ia_reserva(p_tipo text, pr public.ai_model_prices)
returns integer language sql immutable set search_path = public as $$
  select ceil((8000::numeric * greatest(pr.entrada, pr.cache_escrita)
               + (case p_tipo when 'versao' then 2000 when 'ganchos' then 600 else 1200 end)::numeric * pr.saida)
              / 1000000)::int;
$$;

-- Confere dono, briefing completo, teto e limite do dia e RESERVA o pedido em ai_usage
-- (custo máximo), com o tenant travado: pedidos em paralelo não furam o teto nem o limite.
-- Cliente só aparece pelo nome quando a peça tem a autorização marcada (regra 7).
create or replace function public.mkt_ia_preparar(p_versao uuid, p_tipo text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  v public.mkt_versions;
  p public.mkt_pieces;
  pr public.ai_model_prices;
  u jsonb;
  falta text[];
  reserva integer;
  uso_id bigint;
begin
  if p_tipo is null or p_tipo not in ('versao', 'ganchos', 'revisao') then raise exception 'tipo_invalido' using errcode = '22023'; end if;
  select * into v from public.mkt_versions where id = p_versao and tenant_id = t;
  if v.id is null then raise exception 'versao_inexistente' using errcode = 'P0002'; end if;
  select * into p from public.mkt_pieces where id = v.piece_id;
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  -- A IA não inventa objetivo, etapa do funil, pilar nem ideia central.
  falta := array_remove(public._mkt_falta_briefing(p), 'pelo menos uma versão');
  if cardinality(falta) > 0 then
    raise exception 'briefing_incompleto' using errcode = '22023', detail = array_to_string(falta, ', ');
  end if;
  if p_tipo = 'revisao' and length(trim(coalesce(v.body, ''))) = 0 and length(trim(coalesce(v.hook, ''))) = 0 then
    raise exception 'sem_texto_para_revisar' using errcode = '22023';
  end if;
  -- Sem preço, o custo daria zero e o teto nunca valeria.
  select * into pr from public.ai_model_prices where modelo = public._mkt_ia_modelo();
  if pr.modelo is null then raise exception 'preco_do_modelo' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ia:' || t::text || ':marketing', 0));
  u := public._ia_uso(t, 'marketing');
  if (u ->> 'gasto')::bigint >= (u ->> 'teto')::bigint then raise exception 'teto_mensal' using errcode = '22023'; end if;
  if (u ->> 'pedidos_hoje')::int >= (u ->> 'limite_diario')::int then raise exception 'limite_diario' using errcode = '22023'; end if;

  reserva := public._mkt_ia_reserva(p_tipo, pr);
  insert into public.ai_usage (tenant_id, workspace, area, recurso, modelo, custo_estimado, ok, piece_id, version_id, user_id)
  values (t, 'fdp-hub', 'marketing',
          'marketing.' || case p_tipo when 'versao' then 'versoes' else p_tipo end,
          pr.modelo, reserva, null, p.id, v.id, auth.uid())
  returning id into uso_id;

  return jsonb_build_object(
    'tenant_id', t, 'usuario', auth.uid(), 'uso_id', uso_id, 'modelo', pr.modelo,
    'peca_id', p.id, 'versao_id', v.id, 'tipo', p_tipo,
    'briefing', jsonb_build_object(
      'titulo', p.title, 'ideia', p.core_idea, 'objetivo', p.objective, 'funil', p.funnel, 'pilar', p.pillar,
      'frente', p.front, 'publico', p.audience, 'serie', p.series, 'direcao_arte', p.art_direction,
      'campanha', (select c.name from public.mkt_campaigns c where c.id = p.campaign_id),
      'cliente', case when p.client_authorized then (select c.company_name from public.clients c where c.id = p.client_id) end),
    'versao', jsonb_build_object(
      'canal', v.channel, 'canal_nome', (select c.name from public.mkt_channels c where c.tenant_id = t and c.slug = v.channel),
      'limite_texto', (select c.text_limit from public.mkt_channels c where c.tenant_id = t and c.slug = v.channel),
      'formato', v.format, 'gancho', v.hook, 'texto', v.body, 'roteiro', v.script, 'slides', v.slides,
      'chamada', v.cta, 'hashtags', v.hashtags),
    -- Outras versões da mesma peça, para a IA não repetir o mesmo texto em todos os canais.
    'outras', coalesce((select jsonb_agg(jsonb_build_object('canal', o.channel, 'formato', o.format, 'gancho', o.hook,
                                                            'texto', left(coalesce(o.body, ''), 600)))
                          from public.mkt_versions o where o.piece_id = p.id and o.id <> v.id), '[]'::jsonb),
    'uso', u);
end;
$$;

-- Fecha a reserva com os tokens reais (sempre) e grava a sugestão (só com sucesso e se a versão
-- ainda existe). No tempo esgotado a API pode ter cobrado: fica a reserva. Só a função de servidor chama.
create or replace function public.mkt_ia_registrar(
  p_uso bigint, p_tokens jsonb, p_conteudo jsonb, p_base jsonb, p_erro text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  r public.ai_usage;
  pr public.ai_model_prices;
  v public.mkt_versions;
  e int := greatest(0, coalesce((p_tokens ->> 'entrada')::int, 0));
  s int := greatest(0, coalesce((p_tokens ->> 'saida')::int, 0));
  ce int := greatest(0, coalesce((p_tokens ->> 'cache_escrita')::int, 0));
  cl int := greatest(0, coalesce((p_tokens ->> 'cache_leitura')::int, 0));
  custo bigint;
  sug public.mkt_ai_suggestions;
  tipo text;
begin
  select * into r from public.ai_usage where id = p_uso and ok is null for update;
  if r.id is null then raise exception 'uso_inexistente' using errcode = 'P0002'; end if;
  select * into pr from public.ai_model_prices where modelo = r.modelo;
  -- Arredonda para cima: o teto nunca fica abaixo do gasto real.
  custo := ceil((e::numeric * coalesce(pr.entrada, 0) + s::numeric * coalesce(pr.saida, 0)
                 + ce::numeric * coalesce(pr.cache_escrita, 0) + cl::numeric * coalesce(pr.cache_leitura, 0)) / 1000000);
  -- Falha sem tokens contados (tempo esgotado, rede caiu, resposta ilegível): a API pode ter cobrado,
  -- então fica a reserva. Só a recusa da API (4xx) não cobra.
  if p_erro is not null and e + s + ce + cl = 0 and p_erro not like 'ia_http_4%' then
    custo := greatest(custo, r.custo_estimado);
  end if;
  update public.ai_usage
     set tokens_entrada = e, tokens_saida = s, tokens_cache_escrita = ce, tokens_cache_leitura = cl,
         custo_estimado = least(custo, 2000000000), ok = p_erro is null and p_conteudo is not null,
         erro = left(coalesce(p_erro, case when p_conteudo is null then 'sem_conteudo' end), 200)
   where id = r.id;

  -- Sugestões vencidas saem de vez (podem ter nome de cliente).
  delete from public.mkt_ai_suggestions where tenant_id = r.tenant_id and expira_em <= now();

  if p_erro is not null or p_conteudo is null then
    return jsonb_build_object('ok', false, 'custo', custo);
  end if;
  select * into v from public.mkt_versions where id = r.version_id;
  if v.id is null then
    update public.ai_usage set ok = false, erro = 'versao_removida' where id = r.id;
    return jsonb_build_object('ok', false, 'custo', custo, 'erro', 'versao_removida');
  end if;
  tipo := case r.recurso when 'marketing.versoes' then 'versao' else substr(r.recurso, 11) end;
  insert into public.mkt_ai_suggestions (tenant_id, piece_id, version_id, tipo, conteudo, base, created_by)
  values (r.tenant_id, v.piece_id, v.id, tipo, p_conteudo, coalesce(p_base, '{}'::jsonb), r.user_id)
  returning * into sug;
  return jsonb_build_object('ok', true, 'custo', custo, 'sugestao', to_jsonb(sug) - 'tenant_id');
end;
$$;

-- ---------------------------------------------------------------------
-- 6. A pessoa decide: listar, usar (por campo) e descartar
-- ---------------------------------------------------------------------
create or replace function public.mkt_sugestoes_listar(p_versao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(s) - 'tenant_id' order by s.created_at desc), '[]'::jsonb)
    from (select * from public.mkt_ai_suggestions s
           where s.version_id = p_versao and s.tenant_id = public._tenant_do_dono()
             and s.descartada_em is null and s.expira_em > now()
           order by s.created_at desc limit 10) s;
$$;

-- Usa os campos escolhidos. Versão: gancho, texto, roteiro, slides, chamada, hashtags.
-- Ganchos: p_opcao escolhe um dos ganchos. Revisão: p_opcao escolhe a troca, que vale no campo
-- apontado (gancho ou texto) e só se o trecho aparece uma vez nele hoje.
-- Trava a peça e a versão antes de ler o texto; tudo passa por mkt_versao_editar.
create or replace function public.mkt_sugestao_usar(p_id uuid, p_campos text[] default null, p_opcao integer default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  s public.mkt_ai_suggestions;
  v public.mkt_versions;
  c jsonb := '{}'::jsonb;
  k text;
  item jsonb;
  usados text[];
  r jsonb;
  campo text;
  atual text;
  trecho text;
begin
  select * into s from public.mkt_ai_suggestions where id = p_id and tenant_id = public._tenant_do_dono();
  if s.id is null or s.descartada_em is not null or s.expira_em <= now() then
    raise exception 'sugestao_inexistente' using errcode = 'P0002';
  end if;
  v := public._mkt_versao_do_dono(s.version_id);
  select * into s from public.mkt_ai_suggestions where id = p_id for update;
  -- De novo com a linha travada: um "Descartar" ao mesmo tempo vence.
  if s.descartada_em is not null or s.expira_em <= now() then
    raise exception 'sugestao_inexistente' using errcode = 'P0002';
  end if;

  if s.tipo = 'versao' then
    usados := coalesce(p_campos, array['gancho', 'texto', 'roteiro', 'slides', 'chamada', 'hashtags']);
    foreach k in array usados loop
      if k not in ('gancho', 'texto', 'roteiro', 'slides', 'chamada', 'hashtags') then
        raise exception 'campo_invalido' using errcode = '22023';
      end if;
      if s.conteudo ? k then c := c || jsonb_build_object(k, s.conteudo -> k); end if;
    end loop;
  else
    if p_opcao is null or p_opcao < 0 then raise exception 'opcao_invalida' using errcode = '22023'; end if;
    if s.tipo = 'ganchos' then
      item := s.conteudo -> 'ganchos' -> p_opcao;
      if item is null or jsonb_typeof(item) <> 'string' then raise exception 'opcao_invalida' using errcode = '22023'; end if;
      c := jsonb_build_object('gancho', item #>> '{}');
      usados := array['gancho:' || p_opcao];
    else
      item := s.conteudo -> 'itens' -> p_opcao;
      if item is null or jsonb_typeof(item) <> 'object' then raise exception 'opcao_invalida' using errcode = '22023'; end if;
      if ('revisao:' || p_opcao) = any (s.campos_usados) then raise exception 'ja_usada' using errcode = '22023'; end if;
      campo := coalesce(item ->> 'campo', 'texto');
      trecho := coalesce(item ->> 'trecho', '');
      if campo not in ('gancho', 'texto') or length(trecho) < 2 then raise exception 'opcao_invalida' using errcode = '22023'; end if;
      atual := coalesce(case campo when 'gancho' then v.hook else v.body end, '');
      if position(trecho in atual) = 0 then raise exception 'trecho_nao_encontrado' using errcode = '22023'; end if;
      -- Trecho repetido: não dá para saber qual trocar.
      if (length(atual) - length(replace(atual, trecho, ''))) / length(trecho) > 1 then
        raise exception 'trecho_repetido' using errcode = '22023';
      end if;
      c := jsonb_build_object(campo, replace(atual, trecho, coalesce(item ->> 'troca', '')));
      usados := array['revisao:' || p_opcao];
    end if;
  end if;

  if c = '{}'::jsonb then raise exception 'nada_para_usar' using errcode = '22023'; end if;
  r := public.mkt_versao_editar(v.id, c);
  update public.mkt_ai_suggestions
     set usada_em = now(), campos_usados = (select array_agg(distinct x) from unnest(campos_usados || usados) x)
   where id = s.id;
  return r;
end;
$$;

create or replace function public.mkt_sugestao_descartar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.mkt_ai_suggestions;
begin
  update public.mkt_ai_suggestions set descartada_em = now()
   where id = p_id and tenant_id = public._tenant_do_dono() and descartada_em is null
  returning * into s;
  if s.id is null then raise exception 'sugestao_inexistente' using errcode = 'P0002'; end if;
  return jsonb_build_object('id', s.id);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Permissões
-- ---------------------------------------------------------------------
revoke all on function public._mkt_ia_reserva(text, public.ai_model_prices) from public, anon, authenticated;
revoke all on function public._mkt_ia_modelo() from public, anon, authenticated;
revoke all on function public.ia_uso_do_mes(text) from public, anon;
revoke all on function public.mkt_ia_preparar(uuid, text) from public, anon;
revoke all on function public.mkt_ia_registrar(bigint, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.mkt_sugestoes_listar(uuid) from public, anon;
revoke all on function public.mkt_sugestao_usar(uuid, text[], integer) from public, anon;
revoke all on function public.mkt_sugestao_descartar(uuid) from public, anon;

grant execute on function public.ia_uso_do_mes(text) to authenticated;
grant execute on function public.mkt_ia_preparar(uuid, text) to authenticated;
grant execute on function public.mkt_ia_registrar(bigint, jsonb, jsonb, jsonb, text) to service_role;
grant execute on function public.mkt_sugestoes_listar(uuid) to authenticated;
grant execute on function public.mkt_sugestao_usar(uuid, text[], integer) to authenticated;
grant execute on function public.mkt_sugestao_descartar(uuid) to authenticated;
