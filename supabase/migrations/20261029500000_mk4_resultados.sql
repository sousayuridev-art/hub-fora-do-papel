-- =====================================================================
-- Hub Fora do Papel · MK-4 · Resultados e aprendizado (banco)
-- Card: docs/cards/MK-4-resultados-e-aprendizado.md
-- Código de rastreio por versão, link com UTM, peça de origem no cliente (automática pelo
-- formulário do site e manual na ficha) e resultados agregados no banco.
-- Decisões do Yuri (29/10): "contatos" = todo cliente com peça de origem; negócios fechados à parte.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Código de rastreio por versão (6 letras e números, único por tenant, não muda)
-- ---------------------------------------------------------------------
alter table public.mkt_versions add column codigo text;

-- Sem 0/O e 1/I/L, para ditar e digitar sem confusão.
create or replace function public._mkt_novo_codigo(p_tenant uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    select string_agg(substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1), '')
      into c from generate_series(1, 6);
    exit when not exists (select 1 from public.mkt_versions where tenant_id = p_tenant and codigo = c);
  end loop;
  return c;
end;
$$;

do $$
declare r record;
begin
  for r in select id, tenant_id from public.mkt_versions where codigo is null order by created_at loop
    update public.mkt_versions set codigo = public._mkt_novo_codigo(r.tenant_id) where id = r.id;
  end loop;
end;
$$;

alter table public.mkt_versions
  alter column codigo set not null,
  add constraint mkt_versions_codigo_formato check (codigo ~ '^[A-Z2-9]{6}$'),
  add constraint mkt_versions_codigo_unico unique (tenant_id, codigo);

create or replace function public._mkt_versao_codigo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.codigo := public._mkt_novo_codigo(new.tenant_id);
  else
    new.codigo := old.codigo;  -- o link já pode estar na bio: o código nunca muda
  end if;
  return new;
end;
$$;
create trigger mkt_versions_codigo before insert or update of codigo on public.mkt_versions
  for each row execute function public._mkt_versao_codigo();

-- ---------------------------------------------------------------------
-- 2. Link com rastreio (site da agência: o site do tenant sem cliente)
-- ---------------------------------------------------------------------
create or replace function public._mkt_slug(p text)
returns text language sql immutable set search_path = public as $$
  select nullif(left(trim(both '-' from regexp_replace(
           translate(lower(coalesce(p, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
           '[^a-z0-9]+', '-', 'g')), 40), '');
$$;

create or replace function public._mkt_link(v public.mkt_versions)
returns text language sql stable security definer set search_path = public as $$
  select 'https://' || s.dominio || '/?utm_source=' || v.channel || '&utm_medium=social'
         || coalesce('&utm_campaign=' || public._mkt_slug(
              (select c.name from public.mkt_campaigns c join public.mkt_pieces p on p.campaign_id = c.id where p.id = v.piece_id)), '')
         || '&utm_content=' || v.codigo
    from public.sites s
   where s.tenant_id = v.tenant_id and s.client_id is null
   order by s.criado_em
   limit 1;
$$;

-- ---------------------------------------------------------------------
-- 3. Peça de origem no cliente
-- ---------------------------------------------------------------------
alter table public.clients
  add column mkt_version_id uuid references public.mkt_versions (id) on delete set null,
  add column mkt_origem_manual boolean not null default false;
create index clients_mkt_versao_idx on public.clients (mkt_version_id) where mkt_version_id is not null;

-- Automático: o contato do site chegou pelo link de uma versão do mesmo tenant. Roda depois de
-- site_contatos_para_funil (ordem alfabética dos gatilhos), que já criou ou achou o cliente.
-- Só preenche se o cliente ainda não tem peça de origem (vale a primeira; a manual nunca é trocada).
-- Nunca impede o contato de ser gravado.
create or replace function public._mkt_origem_do_contato()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_versao uuid; v_cliente uuid;
begin
  begin
    select v.id into v_versao from public.mkt_versions v
     where v.tenant_id = new.tenant_id and v.codigo = upper(trim(left(new.origem ->> 'utm_content', 20)));
    if v_versao is null then return new; end if;
    select d.client_id into v_cliente from public.deals d where d.site_contato_id = new.id;
    if v_cliente is null then
      select c.id into v_cliente from public.clients c
       where c.tenant_id = new.tenant_id and lower(c.email) = lower(new.email)
       order by c.created_at limit 1;
    end if;
    update public.clients set mkt_version_id = v_versao
     where id = v_cliente and tenant_id = new.tenant_id and mkt_version_id is null;
  exception when others then
    raise warning 'mk4: origem do contato não registrada (%)', sqlstate;
  end;
  return new;
end;
$$;
create trigger site_contatos_z_peca_de_origem after insert on public.site_contatos
  for each row execute function public._mkt_origem_do_contato();

create or replace function public._mkt_origem_json(p_versao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('versao_id', v.id, 'codigo', v.codigo, 'peca_id', p.id, 'titulo', p.title,
                            'canal', v.channel, 'canal_nome', ch.name, 'formato', v.format, 'publicada_em', v.published_at)
    from public.mkt_versions v
    join public.mkt_pieces p on p.id = v.piece_id
    left join public.mkt_channels ch on ch.tenant_id = v.tenant_id and ch.slug = v.channel
   where v.id = p_versao;
$$;

create or replace function public.mkt_cliente_origem(p_cliente uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.clients;
begin
  select * into c from public.clients where id = p_cliente and tenant_id = public._tenant_do_dono();
  if c.id is null then raise exception 'cliente_inexistente' using errcode = 'P0002'; end if;
  return jsonb_build_object('manual', c.mkt_origem_manual,
                            'peca', case when c.mkt_version_id is not null then public._mkt_origem_json(c.mkt_version_id) end);
end;
$$;

-- Manual (ficha do cliente): só versão publicada do mesmo tenant; nulo limpa.
create or replace function public.mkt_cliente_origem_definir(p_cliente uuid, p_versao uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  c public.clients;
begin
  select * into c from public.clients where id = p_cliente and tenant_id = t for update;
  if c.id is null then raise exception 'cliente_inexistente' using errcode = 'P0002'; end if;
  if p_versao is not null and not exists (
       select 1 from public.mkt_versions where id = p_versao and tenant_id = t and published_at is not null) then
    raise exception 'versao_nao_publicada' using errcode = '22023';
  end if;
  update public.clients set mkt_version_id = p_versao, mkt_origem_manual = p_versao is not null where id = c.id;
  return public.mkt_cliente_origem(c.id);
end;
$$;

-- Para escolher a peça na ficha: versões publicadas, mais recentes primeiro, com busca pelo título.
create or replace function public.mkt_versoes_publicadas(p_busca text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public._mkt_origem_json(x.id) order by x.published_at desc), '[]'::jsonb)
    from (select v.id, v.published_at
            from public.mkt_versions v join public.mkt_pieces p on p.id = v.piece_id
           where v.tenant_id = public._tenant_do_dono() and v.published_at is not null
             and (coalesce(trim(p_busca), '') = ''
                  or p.title ilike '%' || replace(replace(replace(left(trim(p_busca), 60), '\', '\\'), '%', '\%'), '_', '\_') || '%'
                  or v.codigo = upper(trim(p_busca)))
           order by v.published_at desc
           limit 30) x;
$$;

-- ---------------------------------------------------------------------
-- 4. Versão e peça passam a trazer código, link e contatos
-- ---------------------------------------------------------------------
create or replace function public._mkt_versao_json(v public.mkt_versions)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(v) - 'tenant_id'
    || jsonb_build_object(
      'canal_nome', (select c.name from public.mkt_channels c where c.tenant_id = v.tenant_id and c.slug = v.channel),
      'limite_texto', (select c.text_limit from public.mkt_channels c where c.tenant_id = v.tenant_id and c.slug = v.channel),
      'midias', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', x.id, 'material_id', m.id, 'papel', x.role, 'posicao', x.position, 'titulo', m.title,
                 'arquivo', m.file_name, 'mime', m.mime_type, 'caminho', m.storage_path, 'origem', m.origin,
                 'na_lixeira', m.deleted_at is not null) order by x.position, x.created_at)
          from public.mkt_version_media x join public.materials m on m.id = x.material_id
         where x.version_id = v.id), '[]'::jsonb),
      'link', public._mkt_link(v),
      'contatos', (select count(*) from public.clients c where c.mkt_version_id = v.id));
$$;

create or replace function public.mkt_peca_detalhe(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.mkt_pieces;
begin
  select * into p from public.mkt_pieces where id = p_id and tenant_id = public._tenant_do_dono();
  if p.id is null then raise exception 'peca_inexistente' using errcode = 'P0002'; end if;
  return public._mkt_peca_json(p) || jsonb_build_object(
    'contatos', (select count(*) from public.clients c join public.mkt_versions v on v.id = c.mkt_version_id where v.piece_id = p.id),
    'negocios_fechados', (select count(*) from public.deals d
                            join public.clients c on c.id = d.client_id
                            join public.mkt_versions v on v.id = c.mkt_version_id
                           where v.piece_id = p.id and d.stage = 'fechado'),
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.kind, 'de', e.from_stage, 'para', e.to_stage, 'nota', e.note,
                                          'versao_id', e.version_id, 'quando', e.created_at) order by e.created_at desc, e.id desc)
        from (select * from public.mkt_events where piece_id = p.id order by created_at desc, id desc limit 100) e), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Resultados (tudo calculado aqui; a tela só mostra)
-- ---------------------------------------------------------------------
-- Uma linha por versão publicada no período (data da publicação no fuso do tenant), com os números
-- registrados e os contatos e negócios ligados a ela.
create or replace function public._mkt_versoes_do_periodo(p_tenant uuid, p_inicio date, p_fim date)
returns table (
  versao_id uuid, peca_id uuid, titulo text, canal text, formato text, pilar text, objetivo text,
  campanha_id uuid, publicada_em timestamptz, tem_resultado boolean,
  alcance bigint, salvamentos bigint, cliques bigint, mensagens bigint,
  contatos bigint, negocios_fechados bigint, valor_fechado bigint
) language sql stable security definer set search_path = public as $$
  with fuso as (select timezone from public.tenants where id = p_tenant)
  select v.id, p.id, p.title, v.channel, v.format, p.pillar, p.objective, p.campaign_id, v.published_at,
         v.results is not null,
         coalesce((v.results ->> 'alcance')::bigint, 0), coalesce((v.results ->> 'salvamentos')::bigint, 0),
         coalesce((v.results ->> 'cliques')::bigint, 0), coalesce((v.results ->> 'mensagens')::bigint, 0),
         (select count(*) from public.clients c where c.mkt_version_id = v.id),
         (select count(*) from public.deals d join public.clients c on c.id = d.client_id
           where c.mkt_version_id = v.id and d.stage = 'fechado'),
         (select coalesce(sum(d.value_cents), 0) from public.deals d join public.clients c on c.id = d.client_id
           where c.mkt_version_id = v.id and d.stage = 'fechado')
    from public.mkt_versions v
    join public.mkt_pieces p on p.id = v.piece_id, fuso
   where v.tenant_id = p_tenant and v.published_at is not null
     and (v.published_at at time zone fuso.timezone)::date between p_inicio and p_fim;
$$;

create or replace function public._mkt_somas(x jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select x || jsonb_build_object('salvamentos_por_mil',
    case when (x ->> 'alcance')::bigint > 0
         then round((x ->> 'salvamentos')::numeric * 1000 / (x ->> 'alcance')::numeric, 1) end);
$$;

create or replace function public.mkt_resultados(p_inicio date, p_fim date, p_agrupar text default 'pilar')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 400 then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;
  if p_agrupar is null or p_agrupar not in ('pilar', 'canal', 'objetivo', 'formato', 'campanha') then
    raise exception 'agrupamento_invalido' using errcode = '22023';
  end if;

  return (
    with base as (select * from public._mkt_versoes_do_periodo(t, p_inicio, p_fim)),
    marcada as (
      select b.*,
             case p_agrupar when 'pilar' then b.pilar when 'canal' then b.canal when 'objetivo' then b.objetivo
                            when 'formato' then b.formato else b.campanha_id::text end as chave
        from base b),
    grupos as (
      select m.chave,
             jsonb_build_object(
               'chave', m.chave,
               'nome', case when p_agrupar = 'campanha' then (select c.name from public.mkt_campaigns c where c.id::text = m.chave)
                            when p_agrupar = 'canal' then (select c.name from public.mkt_channels c where c.tenant_id = t and c.slug = m.chave) end,
               'versoes', count(*), 'com_resultado', count(*) filter (where m.tem_resultado),
               'alcance', sum(m.alcance), 'salvamentos', sum(m.salvamentos), 'cliques', sum(m.cliques),
               'mensagens', sum(m.mensagens), 'contatos', sum(m.contatos),
               'negocios_fechados', sum(m.negocios_fechados), 'valor_fechado', sum(m.valor_fechado)) as linha
        from marcada m group by m.chave)
    select jsonb_build_object(
      'inicio', p_inicio, 'fim', p_fim, 'agrupar', p_agrupar,
      'totais', public._mkt_somas((select jsonb_build_object(
                  'versoes', count(*), 'com_resultado', count(*) filter (where b.tem_resultado),
                  'alcance', coalesce(sum(b.alcance), 0), 'salvamentos', coalesce(sum(b.salvamentos), 0),
                  'cliques', coalesce(sum(b.cliques), 0), 'mensagens', coalesce(sum(b.mensagens), 0),
                  'contatos', coalesce(sum(b.contatos), 0), 'negocios_fechados', coalesce(sum(b.negocios_fechados), 0),
                  'valor_fechado', coalesce(sum(b.valor_fechado), 0)) from base b)),
      'grupos', coalesce((select jsonb_agg(public._mkt_somas(g.linha)
                                           order by (g.linha ->> 'contatos')::bigint desc, (g.linha ->> 'alcance')::bigint desc, g.chave nulls last)
                            from grupos g), '[]'::jsonb))
  );
end;
$$;

-- Melhores peças (contatos; salvamentos por mil com alcance mínimo de 100) e o que falta registrar.
create or replace function public.mkt_resultados_destaques(p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 400 then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;
  return (
    with base as (select * from public._mkt_versoes_do_periodo(t, p_inicio, p_fim)),
    pecas as (
      select b.peca_id, min(b.titulo) as titulo, sum(b.contatos) as contatos, sum(b.alcance) as alcance,
             sum(b.salvamentos) as salvamentos
        from base b group by b.peca_id)
    select jsonb_build_object(
      'por_contatos', coalesce((select jsonb_agg(jsonb_build_object('peca_id', x.peca_id, 'titulo', x.titulo, 'contatos', x.contatos))
                                  from (select * from pecas where contatos > 0 order by contatos desc, alcance desc limit 5) x), '[]'::jsonb),
      'por_salvamentos', coalesce((select jsonb_agg(jsonb_build_object('peca_id', x.peca_id, 'titulo', x.titulo, 'alcance', x.alcance,
                                                                       'salvamentos_por_mil', round(x.salvamentos::numeric * 1000 / x.alcance, 1)))
                                     from (select * from pecas where alcance >= 100
                                            order by salvamentos::numeric / alcance desc, alcance desc limit 5) x), '[]'::jsonb),
      'falta_registrar', coalesce((
        select jsonb_agg(jsonb_build_object('peca_id', p.id, 'titulo', p.title, 'versao_id', v.id, 'canal', v.channel,
                                            'canal_nome', ch.name, 'publicada_em', v.published_at) order by v.published_at)
          from (select * from public.mkt_versions
                 where tenant_id = t and published_at is not null and results is null
                   and published_at < now() - interval '7 days'
                 order by published_at limit 50) v
          join public.mkt_pieces p on p.id = v.piece_id
          left join public.mkt_channels ch on ch.tenant_id = t and ch.slug = v.channel), '[]'::jsonb))
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Permissões
-- ---------------------------------------------------------------------
revoke all on function public._mkt_novo_codigo(uuid) from public, anon, authenticated;
revoke all on function public._mkt_versao_codigo() from public, anon, authenticated;
revoke all on function public._mkt_slug(text) from public, anon, authenticated;
revoke all on function public._mkt_link(public.mkt_versions) from public, anon, authenticated;
revoke all on function public._mkt_origem_do_contato() from public, anon, authenticated;
revoke all on function public._mkt_origem_json(uuid) from public, anon, authenticated;
revoke all on function public._mkt_versao_json(public.mkt_versions) from public, anon, authenticated;
revoke all on function public._mkt_versoes_do_periodo(uuid, date, date) from public, anon, authenticated;
revoke all on function public._mkt_somas(jsonb) from public, anon, authenticated;

revoke all on function public.mkt_cliente_origem(uuid) from public, anon;
revoke all on function public.mkt_cliente_origem_definir(uuid, uuid) from public, anon;
revoke all on function public.mkt_versoes_publicadas(text) from public, anon;
revoke all on function public.mkt_resultados(date, date, text) from public, anon;
revoke all on function public.mkt_resultados_destaques(date, date) from public, anon;
revoke all on function public.mkt_peca_detalhe(uuid) from public, anon;

grant execute on function public.mkt_cliente_origem(uuid) to authenticated;
grant execute on function public.mkt_cliente_origem_definir(uuid, uuid) to authenticated;
grant execute on function public.mkt_versoes_publicadas(text) to authenticated;
grant execute on function public.mkt_resultados(date, date, text) to authenticated;
grant execute on function public.mkt_resultados_destaques(date, date) to authenticated;
grant execute on function public.mkt_peca_detalhe(uuid) to authenticated;
