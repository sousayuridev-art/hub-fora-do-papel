-- =====================================================================
-- Hub Fora do Papel · MK-1 · Central de conteúdo (banco)
-- Card: docs/cards/MK-1-producao-e-calendario.md · PRD: docs/cards/MK-0-central-de-marketing-prd.md
-- A peça é a ideia; cada canal ganha a sua versão. As regras da marca (marcador, TUDO uma vez,
-- uma exclamação, termos evitados) e as portas entre etapas ficam aqui, não na tela.
-- Leitura só do dono (RLS); escrita só por RPC, que grava o histórico na mesma transação.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------

-- Canais do tenant. Canal novo = linha nova (sem migração).
create table public.mkt_channels (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9_]{2,20}$'),
  name        text not null check (length(trim(name)) between 2 and 40),
  active      boolean not null default true,
  position    smallint not null default 0,
  -- Limite de caracteres do texto principal (legenda/post/descrição) no canal.
  text_limit  integer not null default 2200 check (text_limit between 100 and 20000),
  created_at  timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table public.mkt_campaigns (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  name            text not null check (length(trim(name)) between 2 and 80),
  objective       text check (objective in ('alcance', 'autoridade', 'conversa', 'venda')),
  funnel          text check (funnel in ('descoberta', 'consideracao', 'decisao')),
  front           text check (front in ('sistemas', 'ia', 'sites', 'automacoes', 'diagnostico', 'marca')),
  starts_on       date,
  ends_on         date,
  status          text not null default 'planejada' check (status in ('planejada', 'ativa', 'encerrada')),
  description     text check (description is null or length(description) <= 1000),
  ad_campaign_id  uuid references public.ad_campaigns (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint mkt_campaigns_periodo check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index mkt_campaigns_tenant_idx on public.mkt_campaigns (tenant_id, status);
create trigger mkt_campaigns_touch before update on public.mkt_campaigns
  for each row execute function public.touch_updated_at();

-- A peça: a ideia, com o briefing e a etapa de produção.
create table public.mkt_pieces (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  title              text not null check (length(trim(title)) between 2 and 120),
  core_idea          text check (core_idea is null or length(core_idea) <= 400),
  objective          text check (objective in ('alcance', 'autoridade', 'conversa', 'venda')),
  funnel             text check (funnel in ('descoberta', 'consideracao', 'decisao')),
  pillar             text check (pillar in ('problema', 'escolha_honesta', 'projetos_reais', 'como_trabalhamos', 'bastidores', 'chamada_direta')),
  front              text check (front in ('sistemas', 'ia', 'sites', 'automacoes', 'diagnostico', 'marca')),
  audience           text check (audience is null or length(audience) <= 200),
  series             text check (series is null or length(series) <= 60),
  art_direction      text check (art_direction is null or length(art_direction) <= 2000),
  campaign_id        uuid references public.mkt_campaigns (id) on delete set null,
  client_id          uuid references public.clients (id) on delete set null,
  client_authorized  boolean not null default false,
  due_date           date,
  stage              text not null default 'ideia'
                     check (stage in ('ideia', 'briefing', 'conceito', 'producao', 'refinamento', 'aprovacao', 'pronto', 'publicado', 'analisado')),
  stage_changed_at   timestamptz not null default now(),
  position           double precision not null default extract(epoch from now()),
  created_by         uuid references auth.users (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint mkt_pieces_autorizacao check (client_id is not null or not client_authorized)
);
create index mkt_pieces_quadro_idx on public.mkt_pieces (tenant_id, stage, stage_changed_at desc);
create index mkt_pieces_campanha_idx on public.mkt_pieces (campaign_id);
create trigger mkt_pieces_touch before update on public.mkt_pieces
  for each row execute function public.touch_updated_at();

-- A versão por canal: formato, texto, roteiro ou slides, agenda, publicação e resultados.
create table public.mkt_versions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  piece_id        uuid not null references public.mkt_pieces (id) on delete cascade,
  channel         text not null,
  format          text not null check (format in ('carrossel', 'post_unico', 'reels', 'stories', 'texto', 'documento', 'artigo',
                                                  'video', 'video_curto', 'carrossel_fotos', 'shorts', 'video_longo', 'anuncio')),
  hook            text check (hook is null or length(hook) <= 200),
  body            text check (body is null or length(body) <= 20000),
  -- [{tempo, fala, na_tela}] para vídeo; [{titulo, texto}] para carrossel e documento.
  script          jsonb not null default '[]'::jsonb check (jsonb_typeof(script) = 'array'),
  slides          jsonb not null default '[]'::jsonb check (jsonb_typeof(slides) = 'array'),
  cta             text check (cta in ('marcar_conversa', 'falar_whatsapp', 'quero_algo_assim', 'agendar_diagnostico', 'receber_artigos')),
  hashtags        text check (hashtags is null or length(hashtags) <= 300),
  -- Calculados pelo banco a cada edição (_mkt_avisos). A tela só mostra.
  warnings        jsonb not null default '[]'::jsonb,
  scheduled_at    timestamptz,
  published_at    timestamptz,
  published_url   text check (published_url is null or published_url ~ '^https://[^\s]{4,}$'),
  -- {alcance, salvamentos, cliques, mensagens}: inteiros ≥ 0, registrados depois de publicar.
  results         jsonb,
  ad_campaign_id  uuid references public.ad_campaigns (id) on delete set null,
  position        smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (tenant_id, channel) references public.mkt_channels (tenant_id, slug),
  constraint mkt_versions_publicada check ((published_at is null) = (published_url is null)),
  constraint mkt_versions_resultados check (results is null or published_at is not null)
);
create index mkt_versions_peca_idx on public.mkt_versions (piece_id, position);
create index mkt_versions_agenda_idx on public.mkt_versions (tenant_id, (coalesce(published_at, scheduled_at)))
  where coalesce(published_at, scheduled_at) is not null;
create trigger mkt_versions_touch before update on public.mkt_versions
  for each row execute function public.touch_updated_at();

-- Histórico da peça (aprovação, ajustes, agenda, publicação).
create table public.mkt_events (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  piece_id    uuid not null references public.mkt_pieces (id) on delete cascade,
  version_id  uuid references public.mkt_versions (id) on delete set null,
  kind        text not null check (kind in ('criada', 'etapa', 'aprovada', 'ajuste_pedido', 'reaberta', 'versao_adicionada',
                                            'versao_removida', 'agendada', 'publicada', 'resultados')),
  from_stage  text,
  to_stage    text,
  note        text check (note is null or length(note) <= 1000),
  actor_id    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index mkt_events_peca_idx on public.mkt_events (piece_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. RLS: só o dono lê; ninguém escreve direto
-- ---------------------------------------------------------------------
alter table public.mkt_channels  enable row level security;
alter table public.mkt_campaigns enable row level security;
alter table public.mkt_pieces    enable row level security;
alter table public.mkt_versions  enable row level security;
alter table public.mkt_events    enable row level security;

create policy mkt_channels_owner_select  on public.mkt_channels  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy mkt_campaigns_owner_select on public.mkt_campaigns for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy mkt_pieces_owner_select    on public.mkt_pieces    for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy mkt_versions_owner_select  on public.mkt_versions  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy mkt_events_owner_select    on public.mkt_events    for select to authenticated using (public.is_tenant_owner(tenant_id));

revoke insert, update, delete, truncate on public.mkt_channels, public.mkt_campaigns, public.mkt_pieces, public.mkt_versions, public.mkt_events
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Canais padrão (para os tenants de hoje e para os novos)
-- ---------------------------------------------------------------------
create or replace function public._mkt_canais_padrao(p_tenant uuid)
returns void language sql volatile security definer set search_path = public as $$
  insert into public.mkt_channels (tenant_id, slug, name, position, text_limit) values
    (p_tenant, 'instagram', 'Instagram', 1, 2200),
    (p_tenant, 'linkedin', 'LinkedIn', 2, 3000),
    (p_tenant, 'tiktok', 'TikTok', 3, 4000),
    (p_tenant, 'youtube', 'YouTube', 4, 5000)
  on conflict (tenant_id, slug) do nothing;
$$;
revoke all on function public._mkt_canais_padrao(uuid) from public, anon, authenticated;

select public._mkt_canais_padrao(id) from public.tenants;

create or replace function public._mkt_tenant_novo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._mkt_canais_padrao(new.id);
  return new;
end;
$$;
revoke all on function public._mkt_tenant_novo() from public, anon, authenticated;
create trigger tenants_mkt_canais after insert on public.tenants
  for each row execute function public._mkt_tenant_novo();

-- ---------------------------------------------------------------------
-- 4. Regras (ajudantes internos)
-- ---------------------------------------------------------------------

-- Coluna do quadro a partir da etapa.
create or replace function public._mkt_coluna(p_etapa text)
returns text language sql immutable set search_path = public as $$
  select case
    when p_etapa in ('ideia', 'briefing') then 'planejamento'
    when p_etapa in ('conceito', 'producao', 'refinamento') then 'criacao'
    when p_etapa = 'aprovacao' then 'aprovacao'
    when p_etapa = 'pronto' then 'pronto'
    else 'publicado' end;
$$;

-- Formato aceito no canal. Canal criado pelo dono (fora dos 4) aceita qualquer formato.
create or replace function public._mkt_formato_valido(p_canal text, p_formato text)
returns boolean language sql immutable set search_path = public as $$
  select p_formato = 'anuncio' or case p_canal
    when 'instagram' then p_formato in ('carrossel', 'post_unico', 'reels', 'stories')
    when 'linkedin' then p_formato in ('texto', 'documento', 'artigo', 'video')
    when 'tiktok' then p_formato in ('video', 'carrossel_fotos')
    when 'youtube' then p_formato in ('shorts', 'video_longo')
    else true end;
$$;

-- Revisão da marca (manual de comunicação). bloqueia = impede a aprovação.
create or replace function public._mkt_avisos(
  p_gancho text, p_texto text, p_roteiro jsonb, p_slides jsonb, p_limite integer
) returns jsonb language plpgsql immutable set search_path = public as $$
declare
  v_tudo text := concat_ws(E'\n', p_gancho, p_texto,
    (select string_agg(concat_ws(' ', e ->> 'fala', e ->> 'na_tela'), E'\n') from jsonb_array_elements(coalesce(p_roteiro, '[]')) e),
    (select string_agg(concat_ws(' ', e ->> 'titulo', e ->> 'texto'), E'\n') from jsonb_array_elements(coalesce(p_slides, '[]')) e));
  v_avisos jsonb := '[]'::jsonb;
  v_marcadores text;
  v_termos text;
  v_n int;
begin
  select string_agg(distinct m[1], ', ') into v_marcadores
    from regexp_matches(v_tudo, '(\[[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9 _/-]{1,30}\])', 'g') m;
  if v_marcadores is not null then
    v_avisos := v_avisos || jsonb_build_object('codigo', 'marcador', 'bloqueia', true,
      'texto', 'Tem marcador para preencher: ' || v_marcadores || '.');
  end if;

  v_n := (select count(*) from regexp_matches(v_tudo, '\mTUDO\M', 'g'));
  if v_n > 1 then
    v_avisos := v_avisos || jsonb_build_object('codigo', 'tudo_repetido', 'bloqueia', false,
      'texto', 'TUDO aparece ' || v_n || ' vezes; o manual pede uma vez por peça.');
  end if;

  v_n := length(v_tudo) - length(replace(v_tudo, '!', ''));
  if v_n > 1 then
    v_avisos := v_avisos || jsonb_build_object('codigo', 'exclamacao', 'bloqueia', false,
      'texto', 'Tem ' || v_n || ' exclamações; o manual pede no máximo uma.');
  end if;

  select string_agg(distinct lower(m[1]), ', ') into v_termos
    from regexp_matches(v_tudo, '\m(leads?|call|calls|deploy|pipeline|kickoff|onboarding|discovery|white-?label|high-ticket|ROI)\M', 'gi') m;
  if v_termos is not null then
    v_avisos := v_avisos || jsonb_build_object('codigo', 'termo_evitado', 'bloqueia', false,
      'texto', 'Termos que o manual troca por português: ' || v_termos || '.');
  end if;

  if p_limite is not null and length(coalesce(p_texto, '')) > p_limite then
    v_avisos := v_avisos || jsonb_build_object('codigo', 'texto_longo', 'bloqueia', true,
      'texto', 'O texto passa do limite do canal (' || p_limite || ' caracteres).');
  end if;
  return v_avisos;
end;
$$;

-- Trava a peça e confere o dono.
create or replace function public._mkt_peca_do_dono(p_id uuid)
returns public.mkt_pieces language plpgsql security definer set search_path = public as $$
declare p public.mkt_pieces;
begin
  select * into p from public.mkt_pieces where id = p_id for update;
  if p.id is null or p.tenant_id <> public._tenant_do_dono() then
    raise exception 'peca_inexistente' using errcode = 'P0002';
  end if;
  return p;
end;
$$;

create or replace function public._mkt_versao_do_dono(p_id uuid)
returns public.mkt_versions language plpgsql security definer set search_path = public as $$
declare v public.mkt_versions;
begin
  select * into v from public.mkt_versions where id = p_id for update;
  if v.id is null or v.tenant_id <> public._tenant_do_dono() then
    raise exception 'versao_inexistente' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

create or replace function public._mkt_evento(
  p_peca public.mkt_pieces, p_versao uuid, p_tipo text, p_de text, p_para text, p_nota text
) returns void language sql volatile security definer set search_path = public as $$
  insert into public.mkt_events (tenant_id, piece_id, version_id, kind, from_stage, to_stage, note)
  values (p_peca.tenant_id, p_peca.id, p_versao, p_tipo, p_de, p_para, nullif(left(trim(coalesce(p_nota, '')), 1000), ''));
$$;

-- Troca a etapa e registra. Voltar de Aprovação/Pronto para a criação tira as datas agendadas.
create or replace function public._mkt_trocar_etapa(p public.mkt_pieces, p_para text, p_tipo text, p_nota text)
returns public.mkt_pieces language plpgsql volatile security definer set search_path = public as $$
declare n public.mkt_pieces;
begin
  if p.stage = p_para then return p; end if;
  if p_para not in ('pronto', 'publicado', 'analisado') then
    update public.mkt_versions set scheduled_at = null where piece_id = p.id and scheduled_at is not null;
  end if;
  update public.mkt_pieces set stage = p_para, stage_changed_at = now() where id = p.id returning * into n;
  perform public._mkt_evento(n, null, p_tipo, p.stage, p_para, p_nota);
  return n;
end;
$$;

-- O que falta no briefing para sair do planejamento.
create or replace function public._mkt_falta_briefing(p public.mkt_pieces)
returns text[] language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when p.objective is null then 'objetivo' end,
    case when p.funnel is null then 'etapa do funil' end,
    case when p.pillar is null then 'pilar' end,
    case when length(trim(coalesce(p.core_idea, ''))) < 10 then 'ideia central' end,
    case when not exists (select 1 from public.mkt_versions v where v.piece_id = p.id) then 'pelo menos uma versão' end
  ], null);
$$;

-- O que impede a aprovação (além do briefing).
create or replace function public._mkt_falta_aprovacao(p public.mkt_pieces)
returns text[] language sql stable security definer set search_path = public as $$
  select public._mkt_falta_briefing(p) || array_remove(array[
    case when exists (select 1 from public.mkt_versions v where v.piece_id = p.id and length(trim(coalesce(v.body, ''))) = 0)
         then 'texto em todas as versões' end,
    case when exists (select 1 from public.mkt_versions v, jsonb_array_elements(v.warnings) a
                       where v.piece_id = p.id and (a ->> 'bloqueia')::boolean)
         then 'resolver os avisos que bloqueiam (marcador ou texto longo)' end,
    case when p.client_id is not null and not p.client_authorized then 'autorização do cliente' end
  ], null);
$$;

create or replace function public._mkt_versao_json(v public.mkt_versions)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(v) - 'tenant_id'
    || jsonb_build_object(
      'canal_nome', (select c.name from public.mkt_channels c where c.tenant_id = v.tenant_id and c.slug = v.channel),
      'limite_texto', (select c.text_limit from public.mkt_channels c where c.tenant_id = v.tenant_id and c.slug = v.channel));
$$;

create or replace function public._mkt_peca_json(p public.mkt_pieces)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(p) - 'tenant_id'
    || jsonb_build_object(
      'coluna', public._mkt_coluna(p.stage),
      'campanha', (select jsonb_build_object('id', c.id, 'nome', c.name) from public.mkt_campaigns c where c.id = p.campaign_id),
      'cliente', (select jsonb_build_object('id', c.id, 'empresa', c.company_name) from public.clients c where c.id = p.client_id),
      'versoes', coalesce((select jsonb_agg(public._mkt_versao_json(v) order by v.position, v.created_at)
                             from public.mkt_versions v where v.piece_id = p.id), '[]'::jsonb),
      'falta', to_jsonb(case when p.stage in ('ideia', 'briefing') then public._mkt_falta_briefing(p)
                             when p.stage in ('conceito', 'producao', 'refinamento', 'aprovacao') then public._mkt_falta_aprovacao(p)
                             else '{}'::text[] end));
$$;

-- Todas publicadas → Publicado; todas com resultados → Analisado.
create or replace function public._mkt_avancar_publicacao(p public.mkt_pieces)
returns public.mkt_pieces language plpgsql volatile security definer set search_path = public as $$
begin
  if p.stage = 'pronto' and not exists (select 1 from public.mkt_versions where piece_id = p.id and published_at is null) then
    p := public._mkt_trocar_etapa(p, 'publicado', 'etapa', null);
  end if;
  if p.stage = 'publicado' and not exists (select 1 from public.mkt_versions where piece_id = p.id and results is null) then
    p := public._mkt_trocar_etapa(p, 'analisado', 'etapa', null);
  end if;
  return p;
end;
$$;

-- Editar o conteúdo de uma peça já aprovada desfaz a aprovação.
create or replace function public._mkt_reabrir_se_aprovada(p public.mkt_pieces, p_motivo text)
returns public.mkt_pieces language plpgsql volatile security definer set search_path = public as $$
begin
  if p.stage = 'pronto' then
    return public._mkt_trocar_etapa(p, 'aprovacao', 'reaberta', p_motivo);
  elsif p.stage in ('publicado', 'analisado') then
    raise exception 'peca_publicada' using errcode = '22023';
  end if;
  return p;
end;
$$;

revoke all on function public._mkt_coluna(text) from public, anon;
revoke all on function public._mkt_formato_valido(text, text) from public, anon, authenticated;
revoke all on function public._mkt_avisos(text, text, jsonb, jsonb, integer) from public, anon, authenticated;
revoke all on function public._mkt_peca_do_dono(uuid) from public, anon, authenticated;
revoke all on function public._mkt_versao_do_dono(uuid) from public, anon, authenticated;
revoke all on function public._mkt_evento(public.mkt_pieces, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public._mkt_trocar_etapa(public.mkt_pieces, text, text, text) from public, anon, authenticated;
revoke all on function public._mkt_falta_briefing(public.mkt_pieces) from public, anon, authenticated;
revoke all on function public._mkt_falta_aprovacao(public.mkt_pieces) from public, anon, authenticated;
revoke all on function public._mkt_versao_json(public.mkt_versions) from public, anon, authenticated;
revoke all on function public._mkt_peca_json(public.mkt_pieces) from public, anon, authenticated;
revoke all on function public._mkt_avancar_publicacao(public.mkt_pieces) from public, anon, authenticated;
revoke all on function public._mkt_reabrir_se_aprovada(public.mkt_pieces, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Canais e campanhas
-- ---------------------------------------------------------------------
create or replace function public.mkt_canais_listar()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'nome', c.name, 'ativo', c.active, 'limite_texto', c.text_limit)
                            order by c.position, c.name), '[]'::jsonb)
    from public.mkt_channels c where c.tenant_id = public._tenant_do_dono();
$$;

create or replace function public.mkt_campanha_salvar(p_id uuid, p_campos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_tenant uuid := public._tenant_do_dono(); c public.mkt_campaigns; f jsonb := coalesce(p_campos, '{}'::jsonb);
begin
  if jsonb_typeof(f) <> 'object' then raise exception 'campos_invalidos' using errcode = '22023'; end if;
  if p_id is null then
    if length(trim(coalesce(f ->> 'nome', ''))) < 2 then raise exception 'nome_obrigatorio' using errcode = '22023'; end if;
    insert into public.mkt_campaigns (tenant_id, name) values (v_tenant, left(trim(f ->> 'nome'), 80)) returning * into c;
  else
    select * into c from public.mkt_campaigns where id = p_id and tenant_id = v_tenant for update;
    if c.id is null then raise exception 'campanha_inexistente' using errcode = 'P0002'; end if;
  end if;

  if f ? 'nome' then
    if length(trim(coalesce(f ->> 'nome', ''))) < 2 then raise exception 'nome_obrigatorio' using errcode = '22023'; end if;
    c.name := left(trim(f ->> 'nome'), 80);
  end if;
  if f ? 'objetivo' then c.objective := f ->> 'objetivo'; end if;
  if f ? 'funil' then c.funnel := f ->> 'funil'; end if;
  if f ? 'frente' then c.front := f ->> 'frente'; end if;
  if f ? 'inicio' then c.starts_on := (f ->> 'inicio')::date; end if;
  if f ? 'fim' then c.ends_on := (f ->> 'fim')::date; end if;
  if f ? 'situacao' then c.status := f ->> 'situacao'; end if;
  if f ? 'descricao' then c.description := nullif(left(trim(coalesce(f ->> 'descricao', '')), 1000), ''); end if;
  if f ? 'anuncio' then
    c.ad_campaign_id := (f ->> 'anuncio')::uuid;
    if c.ad_campaign_id is not null and not exists (select 1 from public.ad_campaigns where id = c.ad_campaign_id and tenant_id = v_tenant) then
      raise exception 'anuncio_inexistente' using errcode = 'P0002';
    end if;
  end if;

  update public.mkt_campaigns
     set name = c.name, objective = c.objective, funnel = c.funnel, front = c.front, starts_on = c.starts_on,
         ends_on = c.ends_on, status = c.status, description = c.description, ad_campaign_id = c.ad_campaign_id
   where id = c.id returning * into c;
  return to_jsonb(c) - 'tenant_id';
exception
  when check_violation or invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
    raise exception 'campos_invalidos' using errcode = '22023';
end;
$$;

create or replace function public.mkt_campanha_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.mkt_campaigns;
begin
  delete from public.mkt_campaigns where id = p_id and tenant_id = public._tenant_do_dono() returning * into c;
  if c.id is null then raise exception 'campanha_inexistente' using errcode = 'P0002'; end if;
  return to_jsonb(c) - 'tenant_id';
end;
$$;

create or replace function public.mkt_campanhas_listar()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(c) - 'tenant_id' || jsonb_build_object(
           'anuncio', (select jsonb_build_object('id', a.id, 'nome', a.name) from public.ad_campaigns a where a.id = c.ad_campaign_id),
           'pecas', (select jsonb_build_object(
                       'total', count(*),
                       'planejamento', count(*) filter (where public._mkt_coluna(p.stage) = 'planejamento'),
                       'criacao', count(*) filter (where public._mkt_coluna(p.stage) = 'criacao'),
                       'aprovacao', count(*) filter (where p.stage = 'aprovacao'),
                       'pronto', count(*) filter (where p.stage = 'pronto'),
                       'publicado', count(*) filter (where p.stage in ('publicado', 'analisado')))
                       from public.mkt_pieces p where p.campaign_id = c.id))
           order by (c.status = 'encerrada'), c.starts_on nulls last, c.created_at desc), '[]'::jsonb)
    from public.mkt_campaigns c where c.tenant_id = public._tenant_do_dono();
$$;

-- ---------------------------------------------------------------------
-- 6. Peças
-- ---------------------------------------------------------------------

-- Cria a peça e, se vierem, as versões ([{canal, formato}]).
create or replace function public.mkt_peca_criar(
  p_titulo text,
  p_versoes jsonb default '[]'::jsonb,
  p_campanha uuid default null,
  p_prazo date default null,
  p_ideia text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_tenant uuid := public._tenant_do_dono(); p public.mkt_pieces; e jsonb; n int := 0;
begin
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(p_versoes, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_versoes, '[]'::jsonb)) > 12 then
    raise exception 'versoes_invalidas' using errcode = '22023';
  end if;
  if p_campanha is not null and not exists (select 1 from public.mkt_campaigns where id = p_campanha and tenant_id = v_tenant) then
    raise exception 'campanha_inexistente' using errcode = 'P0002';
  end if;

  insert into public.mkt_pieces (tenant_id, title, campaign_id, due_date, core_idea)
  values (v_tenant, left(trim(p_titulo), 120), p_campanha, p_prazo, nullif(left(trim(coalesce(p_ideia, '')), 400), ''))
  returning * into p;

  for e in select * from jsonb_array_elements(coalesce(p_versoes, '[]'::jsonb)) loop
    if not exists (select 1 from public.mkt_channels where tenant_id = v_tenant and slug = e ->> 'canal' and active) then
      raise exception 'canal_inexistente' using errcode = 'P0002';
    end if;
    if not public._mkt_formato_valido(e ->> 'canal', e ->> 'formato') then
      raise exception 'formato_invalido' using errcode = '22023';
    end if;
    insert into public.mkt_versions (tenant_id, piece_id, channel, format, position)
    values (v_tenant, p.id, e ->> 'canal', e ->> 'formato', n);
    n := n + 1;
  end loop;

  perform public._mkt_evento(p, null, 'criada', null, 'ideia', null);
  return public._mkt_peca_json(p);
end;
$$;

-- Briefing: só as chaves presentes mudam.
create or replace function public.mkt_peca_editar(p_id uuid, p_campos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.mkt_pieces := public._mkt_peca_do_dono(p_id); f jsonb := p_campos;
begin
  if f is null or jsonb_typeof(f) <> 'object' then raise exception 'campos_invalidos' using errcode = '22023'; end if;
  if f ? 'titulo' then
    if length(trim(coalesce(f ->> 'titulo', ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
    p.title := left(trim(f ->> 'titulo'), 120);
  end if;
  if f ? 'ideia' then p.core_idea := nullif(left(trim(coalesce(f ->> 'ideia', '')), 400), ''); end if;
  if f ? 'objetivo' then p.objective := f ->> 'objetivo'; end if;
  if f ? 'funil' then p.funnel := f ->> 'funil'; end if;
  if f ? 'pilar' then p.pillar := f ->> 'pilar'; end if;
  if f ? 'frente' then p.front := f ->> 'frente'; end if;
  if f ? 'publico' then p.audience := nullif(left(trim(coalesce(f ->> 'publico', '')), 200), ''); end if;
  if f ? 'serie' then p.series := nullif(left(trim(coalesce(f ->> 'serie', '')), 60), ''); end if;
  if f ? 'direcao_arte' then p.art_direction := nullif(left(trim(coalesce(f ->> 'direcao_arte', '')), 2000), ''); end if;
  if f ? 'prazo' then p.due_date := (f ->> 'prazo')::date; end if;
  if f ? 'campanha' then
    p.campaign_id := (f ->> 'campanha')::uuid;
    if p.campaign_id is not null and not exists (select 1 from public.mkt_campaigns where id = p.campaign_id and tenant_id = p.tenant_id) then
      raise exception 'campanha_inexistente' using errcode = 'P0002';
    end if;
  end if;
  if f ? 'cliente' then
    p.client_id := (f ->> 'cliente')::uuid;
    if p.client_id is null then
      p.client_authorized := false;
    elsif not exists (select 1 from public.clients where id = p.client_id and tenant_id = p.tenant_id) then
      raise exception 'cliente_inexistente' using errcode = 'P0002';
    end if;
  end if;
  if f ? 'autorizacao' then
    p.client_authorized := coalesce((f ->> 'autorizacao')::boolean, false);
    if p.client_authorized and p.client_id is null then raise exception 'autorizacao_sem_cliente' using errcode = '22023'; end if;
  end if;

  update public.mkt_pieces
     set title = p.title, core_idea = p.core_idea, objective = p.objective, funnel = p.funnel, pillar = p.pillar,
         front = p.front, audience = p.audience, series = p.series, art_direction = p.art_direction, due_date = p.due_date,
         campaign_id = p.campaign_id, client_id = p.client_id, client_authorized = p.client_authorized
   where id = p.id returning * into p;
  return public._mkt_peca_json(p);
exception
  when check_violation or invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
    raise exception 'campos_invalidos' using errcode = '22023';
end;
$$;

-- Move entre as etapas de planejamento, criação e aprovação (com as portas do card).
create or replace function public.mkt_peca_mover(p_id uuid, p_etapa text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.mkt_pieces := public._mkt_peca_do_dono(p_id); v_falta text[];
begin
  if p_etapa is null or p_etapa not in ('ideia', 'briefing', 'conceito', 'producao', 'refinamento', 'aprovacao') then
    raise exception 'etapa_invalida' using errcode = '22023';
  end if;
  if p.stage in ('publicado', 'analisado') then raise exception 'peca_publicada' using errcode = '22023'; end if;
  if exists (select 1 from public.mkt_versions where piece_id = p.id and published_at is not null) then
    raise exception 'peca_publicada' using errcode = '22023';
  end if;
  if p_etapa in ('conceito', 'producao', 'refinamento') then
    v_falta := public._mkt_falta_briefing(p);
    if cardinality(v_falta) > 0 then
      raise exception 'briefing_incompleto' using errcode = '22023', detail = array_to_string(v_falta, ', ');
    end if;
  elsif p_etapa = 'aprovacao' then
    v_falta := public._mkt_falta_aprovacao(p);
    if cardinality(v_falta) > 0 then
      raise exception 'revisao_pendente' using errcode = '22023', detail = array_to_string(v_falta, ', ');
    end if;
  end if;
  p := public._mkt_trocar_etapa(p, p_etapa, 'etapa', null);
  return public._mkt_peca_json(p);
end;
$$;

create or replace function public.mkt_peca_aprovar(p_id uuid, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.mkt_pieces := public._mkt_peca_do_dono(p_id); v_falta text[];
begin
  if p.stage <> 'aprovacao' then raise exception 'etapa_invalida' using errcode = '22023'; end if;
  v_falta := public._mkt_falta_aprovacao(p);
  if cardinality(v_falta) > 0 then
    raise exception 'revisao_pendente' using errcode = '22023', detail = array_to_string(v_falta, ', ');
  end if;
  p := public._mkt_trocar_etapa(p, 'pronto', 'aprovada', p_nota);
  insert into public.event_outbox (tenant_id, event, payload)
  values (p.tenant_id, 'marketing.peca_aprovada', jsonb_build_object('peca_id', p.id, 'titulo', p.title,
    'canais', (select jsonb_agg(distinct v.channel) from public.mkt_versions v where v.piece_id = p.id)));
  return public._mkt_peca_json(p);
end;
$$;

create or replace function public.mkt_peca_pedir_ajuste(p_id uuid, p_nota text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.mkt_pieces := public._mkt_peca_do_dono(p_id);
begin
  if p.stage <> 'aprovacao' then raise exception 'etapa_invalida' using errcode = '22023'; end if;
  if length(trim(coalesce(p_nota, ''))) < 3 then raise exception 'nota_obrigatoria' using errcode = '22023'; end if;
  p := public._mkt_trocar_etapa(p, 'refinamento', 'ajuste_pedido', p_nota);
  return public._mkt_peca_json(p);
end;
$$;

create or replace function public.mkt_peca_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.mkt_pieces := public._mkt_peca_do_dono(p_id);
begin
  if exists (select 1 from public.mkt_versions where piece_id = p.id and published_at is not null) then
    raise exception 'peca_publicada' using errcode = '22023';
  end if;
  delete from public.mkt_pieces where id = p.id;
  return jsonb_build_object('id', p.id, 'titulo', p.title);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Versões
-- ---------------------------------------------------------------------
create or replace function public.mkt_versao_adicionar(p_peca uuid, p_canal text, p_formato text, p_copiar_de uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.mkt_pieces := public._mkt_peca_do_dono(p_peca); o public.mkt_versions; v public.mkt_versions; v_limite int;
begin
  if p.stage in ('publicado', 'analisado') then raise exception 'peca_publicada' using errcode = '22023'; end if;
  select text_limit into v_limite from public.mkt_channels where tenant_id = p.tenant_id and slug = p_canal and active;
  if v_limite is null then raise exception 'canal_inexistente' using errcode = 'P0002'; end if;
  if not public._mkt_formato_valido(p_canal, p_formato) then raise exception 'formato_invalido' using errcode = '22023'; end if;
  if (select count(*) from public.mkt_versions where piece_id = p.id) >= 12 then raise exception 'versoes_demais' using errcode = '22023'; end if;
  if p_copiar_de is not null then
    select * into o from public.mkt_versions where id = p_copiar_de and piece_id = p.id;
    if o.id is null then raise exception 'versao_inexistente' using errcode = 'P0002'; end if;
  end if;

  insert into public.mkt_versions (tenant_id, piece_id, channel, format, hook, body, script, slides, cta, hashtags, position)
  values (p.tenant_id, p.id, p_canal, p_formato, o.hook, o.body, coalesce(o.script, '[]'), coalesce(o.slides, '[]'), o.cta, o.hashtags,
          coalesce((select max(position) + 1 from public.mkt_versions where piece_id = p.id), 0))
  returning * into v;
  update public.mkt_versions set warnings = public._mkt_avisos(v.hook, v.body, v.script, v.slides, v_limite)
   where id = v.id returning * into v;

  perform public._mkt_evento(p, v.id, 'versao_adicionada', null, null, p_canal || ' · ' || p_formato);
  -- Versão nova ainda não foi revisada: peça aprovada ou em aprovação volta para refinamento.
  if p.stage in ('aprovacao', 'pronto') then
    p := public._mkt_trocar_etapa(p, 'refinamento', 'reaberta', 'Versão nova adicionada');
  end if;
  return public._mkt_peca_json(p);
end;
$$;

-- Conteúdo da versão: só as chaves presentes mudam. Recalcula os avisos da marca.
create or replace function public.mkt_versao_editar(p_id uuid, p_campos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions := public._mkt_versao_do_dono(p_id);
  p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
  f jsonb := p_campos; v_limite int; e jsonb;
begin
  if f is null or jsonb_typeof(f) <> 'object' then raise exception 'campos_invalidos' using errcode = '22023'; end if;
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  if f ? 'formato' then
    if not public._mkt_formato_valido(v.channel, f ->> 'formato') then raise exception 'formato_invalido' using errcode = '22023'; end if;
    v.format := f ->> 'formato';
  end if;
  if f ? 'gancho' then v.hook := nullif(left(trim(coalesce(f ->> 'gancho', '')), 200), ''); end if;
  if f ? 'texto' then v.body := nullif(left(coalesce(f ->> 'texto', ''), 20000), ''); end if;
  if f ? 'roteiro' then
    if jsonb_typeof(f -> 'roteiro') <> 'array' or jsonb_array_length(f -> 'roteiro') > 60 then raise exception 'roteiro_invalido' using errcode = '22023'; end if;
    for e in select * from jsonb_array_elements(f -> 'roteiro') loop
      if jsonb_typeof(e) <> 'object' then raise exception 'roteiro_invalido' using errcode = '22023'; end if;
    end loop;
    v.script := (select coalesce(jsonb_agg(jsonb_build_object(
                   'tempo', left(coalesce(x ->> 'tempo', ''), 20), 'fala', left(coalesce(x ->> 'fala', ''), 600),
                   'na_tela', left(coalesce(x ->> 'na_tela', ''), 300))), '[]'::jsonb)
                   from jsonb_array_elements(f -> 'roteiro') x);
  end if;
  if f ? 'slides' then
    if jsonb_typeof(f -> 'slides') <> 'array' or jsonb_array_length(f -> 'slides') > 20 then raise exception 'slides_invalidos' using errcode = '22023'; end if;
    for e in select * from jsonb_array_elements(f -> 'slides') loop
      if jsonb_typeof(e) <> 'object' then raise exception 'slides_invalidos' using errcode = '22023'; end if;
    end loop;
    v.slides := (select coalesce(jsonb_agg(jsonb_build_object(
                   'titulo', left(coalesce(x ->> 'titulo', ''), 120), 'texto', left(coalesce(x ->> 'texto', ''), 600))), '[]'::jsonb)
                   from jsonb_array_elements(f -> 'slides') x);
  end if;
  if f ? 'chamada' then v.cta := f ->> 'chamada'; end if;
  if f ? 'hashtags' then v.hashtags := nullif(left(trim(coalesce(f ->> 'hashtags', '')), 300), ''); end if;
  if f ? 'anuncio' then
    v.ad_campaign_id := (f ->> 'anuncio')::uuid;
    if v.ad_campaign_id is not null and not exists (select 1 from public.ad_campaigns where id = v.ad_campaign_id and tenant_id = v.tenant_id) then
      raise exception 'anuncio_inexistente' using errcode = 'P0002';
    end if;
  end if;

  select text_limit into v_limite from public.mkt_channels where tenant_id = v.tenant_id and slug = v.channel;
  update public.mkt_versions
     set format = v.format, hook = v.hook, body = v.body, script = v.script, slides = v.slides, cta = v.cta,
         hashtags = v.hashtags, ad_campaign_id = v.ad_campaign_id,
         warnings = public._mkt_avisos(v.hook, v.body, v.script, v.slides, v_limite)
   where id = v.id returning * into v;

  -- Mudou só o anúncio ligado: não mexe na aprovação.
  if exists (select 1 from jsonb_object_keys(f) k where k <> 'anuncio') then
    p := public._mkt_reabrir_se_aprovada(p, 'Texto alterado depois da aprovação');
  end if;
  return public._mkt_peca_json(p);
exception
  when check_violation or invalid_text_representation then
    raise exception 'campos_invalidos' using errcode = '22023';
end;
$$;

create or replace function public.mkt_versao_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v public.mkt_versions := public._mkt_versao_do_dono(p_id); p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
begin
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  if (select count(*) from public.mkt_versions where piece_id = p.id) <= 1 then raise exception 'ultima_versao' using errcode = '22023'; end if;
  delete from public.mkt_versions where id = v.id;
  perform public._mkt_evento(p, null, 'versao_removida', null, null, v.channel || ' · ' || v.format);
  -- Pronto com as outras já publicadas: a peça avança.
  p := public._mkt_avancar_publicacao(p);
  return public._mkt_peca_json(p);
end;
$$;

-- Agenda (só com a peça aprovada). null tira a data.
create or replace function public.mkt_versao_agendar(p_id uuid, p_quando timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v public.mkt_versions := public._mkt_versao_do_dono(p_id); p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
begin
  if p.stage <> 'pronto' then raise exception 'peca_nao_aprovada' using errcode = '22023'; end if;
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  if p_quando is not null and p_quando < now() - interval '5 minutes' then raise exception 'data_no_passado' using errcode = '22023'; end if;
  update public.mkt_versions set scheduled_at = p_quando where id = v.id;
  perform public._mkt_evento(p, v.id, 'agendada', null, null,
    case when p_quando is null then 'Data retirada' else to_char(p_quando at time zone (select timezone from public.tenants where id = p.tenant_id), 'DD/MM HH24:MI') end);
  if p_quando is not null then
    insert into public.event_outbox (tenant_id, event, payload)
    values (p.tenant_id, 'marketing.versao_agendada', jsonb_build_object('peca_id', p.id, 'versao_id', v.id,
      'canal', v.channel, 'formato', v.format, 'quando', p_quando));
  end if;
  return public._mkt_peca_json(p);
end;
$$;

-- Publicação feita pela pessoa (até o MK-5): link https e data que não está no futuro.
create or replace function public.mkt_versao_publicar(p_id uuid, p_link text, p_quando timestamptz default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions := public._mkt_versao_do_dono(p_id);
  p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
  v_quando timestamptz := coalesce(p_quando, now());
  v_primeira boolean := v.published_at is null;
begin
  if p.stage not in ('pronto', 'publicado', 'analisado') then raise exception 'peca_nao_aprovada' using errcode = '22023'; end if;
  if coalesce(trim(p_link), '') !~ '^https://[^\s]{4,}$' then raise exception 'link_invalido' using errcode = '22023'; end if;
  if v_quando > now() + interval '5 minutes' then raise exception 'data_no_futuro' using errcode = '22023'; end if;
  update public.mkt_versions set published_at = v_quando, published_url = trim(p_link) where id = v.id;
  if v_primeira then
    perform public._mkt_evento(p, v.id, 'publicada', null, null, v.channel || ' · ' || v.format);
    insert into public.event_outbox (tenant_id, event, payload)
    values (p.tenant_id, 'marketing.versao_publicada', jsonb_build_object('peca_id', p.id, 'versao_id', v.id,
      'canal', v.channel, 'formato', v.format, 'link', trim(p_link), 'quando', v_quando, 'pilar', p.pillar));
  end if;
  p := public._mkt_avancar_publicacao(p);
  return public._mkt_peca_json(p);
end;
$$;

create or replace function public.mkt_versao_resultados(p_id uuid, p_resultados jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions := public._mkt_versao_do_dono(p_id);
  p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
  r jsonb := '{}'::jsonb; k text; n numeric;
begin
  if v.published_at is null then raise exception 'versao_nao_publicada' using errcode = '22023'; end if;
  if p_resultados is null or jsonb_typeof(p_resultados) <> 'object' then raise exception 'resultados_invalidos' using errcode = '22023'; end if;
  foreach k in array array['alcance', 'salvamentos', 'cliques', 'mensagens'] loop
    if p_resultados ? k and jsonb_typeof(p_resultados -> k) <> 'null' then
      if jsonb_typeof(p_resultados -> k) <> 'number' then raise exception 'resultados_invalidos' using errcode = '22023'; end if;
      n := (p_resultados ->> k)::numeric;
      if n < 0 or n <> trunc(n) or n > 2000000000 then raise exception 'resultados_invalidos' using errcode = '22023'; end if;
      r := r || jsonb_build_object(k, n::bigint);
    end if;
  end loop;
  if r = '{}'::jsonb then raise exception 'resultados_invalidos' using errcode = '22023'; end if;
  update public.mkt_versions set results = r || jsonb_build_object('registrado_em', now()) where id = v.id;
  perform public._mkt_evento(p, v.id, 'resultados', null, null, v.channel || ' · ' || v.format);
  p := public._mkt_avancar_publicacao(p);
  return public._mkt_peca_json(p);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Leituras (filtros, contagens e calendário no banco)
-- ---------------------------------------------------------------------

-- p_filtros: campanha (uuid), canal, pilar, objetivo, coluna, busca, publicadas_dias (padrão 30)
create or replace function public.mkt_pecas_listar(p_filtros jsonb default '{}'::jsonb, p_limite integer default 400)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_tenant uuid := public._tenant_do_dono();
  f jsonb := coalesce(p_filtros, '{}'::jsonb);
  v_dias int := greatest(1, least(365, coalesce((f ->> 'publicadas_dias')::numeric, 30)))::int;
  v_busca text := replace(replace(replace(nullif(left(trim(coalesce(f ->> 'busca', '')), 100), ''), '\', '\\'), '%', '\%'), '_', '\_');
  v_itens jsonb;
begin
  select coalesce(jsonb_agg(public._mkt_peca_json(p) order by p.due_date nulls last, p.stage_changed_at desc), '[]'::jsonb)
    into v_itens
    from (
      select p.* from public.mkt_pieces p
       where p.tenant_id = v_tenant
         and (f ->> 'campanha' is null or p.campaign_id = (f ->> 'campanha')::uuid)
         and (f ->> 'pilar' is null or p.pillar = f ->> 'pilar')
         and (f ->> 'objetivo' is null or p.objective = f ->> 'objetivo')
         and (f ->> 'coluna' is null or public._mkt_coluna(p.stage) = f ->> 'coluna')
         and (f ->> 'canal' is null or exists (select 1 from public.mkt_versions v where v.piece_id = p.id and v.channel = f ->> 'canal'))
         and (p.stage not in ('publicado', 'analisado') or p.stage_changed_at >= now() - make_interval(days => v_dias))
         and (v_busca is null or p.title ilike '%' || v_busca || '%' or coalesce(p.core_idea, '') ilike '%' || v_busca || '%')
       order by p.due_date nulls last, p.stage_changed_at desc
       limit greatest(1, least(1000, coalesce(p_limite, 400)))
    ) p;
  return jsonb_build_object('hoje', public._hoje(v_tenant), 'itens', v_itens);
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'filtros_invalidos' using errcode = '22023';
end;
$$;

create or replace function public.mkt_peca_detalhe(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.mkt_pieces;
begin
  select * into p from public.mkt_pieces where id = p_id and tenant_id = public._tenant_do_dono();
  if p.id is null then raise exception 'peca_inexistente' using errcode = 'P0002'; end if;
  return public._mkt_peca_json(p) || jsonb_build_object('historico', coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.kind, 'de', e.from_stage, 'para', e.to_stage, 'nota', e.note,
                                        'versao_id', e.version_id, 'quando', e.created_at) order by e.created_at desc, e.id desc)
      from (select * from public.mkt_events where piece_id = p.id order by created_at desc, id desc limit 100) e), '[]'::jsonb));
end;
$$;

create or replace function public.mkt_resumo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_tenant uuid := public._tenant_do_dono();
  v_fuso text := (select timezone from public.tenants where id = v_tenant);
  v_hoje date := public._hoje(v_tenant);
  r jsonb;
begin
  select jsonb_build_object(
           'hoje', v_hoje,
           'planejamento', count(*) filter (where public._mkt_coluna(p.stage) = 'planejamento'),
           'criacao', count(*) filter (where public._mkt_coluna(p.stage) = 'criacao'),
           'aprovacao', count(*) filter (where p.stage = 'aprovacao'),
           'pronto', count(*) filter (where p.stage = 'pronto'),
           'atrasadas', count(*) filter (where p.due_date < v_hoje and p.stage not in ('pronto', 'publicado', 'analisado')))
    into r from public.mkt_pieces p where p.tenant_id = v_tenant;
  select r || jsonb_build_object(
           'publicadas_mes', count(*) filter (where date_trunc('month', v.published_at at time zone v_fuso) = date_trunc('month', v_hoje::timestamp)),
           'agendadas_semana', count(*) filter (where v.published_at is null
                                                 and (v.scheduled_at at time zone v_fuso)::date between v_hoje and v_hoje + 6),
           'sem_resultados', count(*) filter (where v.published_at is not null and v.results is null))
    into r from public.mkt_versions v where v.tenant_id = v_tenant;
  return r;
end;
$$;

-- Calendário: versões com data (publicada ou agendada) no período, no fuso do tenant.
-- Avisos olham a sequência inteira do canal (não só o período): pilar repetido no feed e
-- chamada direta mais de 1 vez em 5 posts. Stories ficam fora dessas regras.
create or replace function public.mkt_calendario(p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_tenant uuid := public._tenant_do_dono();
  v_fuso text := (select timezone from public.tenants where id = v_tenant);
  v_itens jsonb;
begin
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 62 then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;
  with datadas as (
    select v.*, p.title, p.pillar, p.stage, p.objective,
           coalesce(v.published_at, v.scheduled_at) as quando,
           v.format <> 'stories' as feed
      from public.mkt_versions v join public.mkt_pieces p on p.id = v.piece_id
     where v.tenant_id = v_tenant and coalesce(v.published_at, v.scheduled_at) is not null
  ), sequencia as (
    select d.*,
           lag(d.pillar) over w as pilar_anterior,
           count(*) filter (where d.pillar = 'chamada_direta') over (w rows between 4 preceding and current row) as chamadas_em_5
      from datadas d where d.feed
    window w as (partition by d.channel order by d.quando, d.id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'versao_id', d.id, 'peca_id', d.piece_id, 'titulo', d.title, 'canal', d.channel,
           'canal_nome', (select c.name from public.mkt_channels c where c.tenant_id = v_tenant and c.slug = d.channel),
           'formato', d.format, 'pilar', d.pillar, 'objetivo', d.objective, 'etapa', d.stage,
           'quando', d.quando, 'dia', (d.quando at time zone v_fuso)::date, 'publicada', d.published_at is not null,
           'link', d.published_url,
           'avisos', to_jsonb(array_remove(array[
             case when s.pilar_anterior is not null and s.pilar_anterior = d.pillar then 'pilar_repetido' end,
             case when d.pillar = 'chamada_direta' and s.chamadas_em_5 > 1 then 'chamada_demais' end], null)))
           order by d.quando, d.channel), '[]'::jsonb)
    into v_itens
    from datadas d left join sequencia s on s.id = d.id
   where (d.quando at time zone v_fuso)::date between p_inicio and p_fim;
  return jsonb_build_object('hoje', public._hoje(v_tenant), 'inicio', p_inicio, 'fim', p_fim, 'itens', v_itens);
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Permissões
-- ---------------------------------------------------------------------
revoke all on function public.mkt_canais_listar() from public, anon;
revoke all on function public.mkt_campanha_salvar(uuid, jsonb) from public, anon;
revoke all on function public.mkt_campanha_remover(uuid) from public, anon;
revoke all on function public.mkt_campanhas_listar() from public, anon;
revoke all on function public.mkt_peca_criar(text, jsonb, uuid, date, text) from public, anon;
revoke all on function public.mkt_peca_editar(uuid, jsonb) from public, anon;
revoke all on function public.mkt_peca_mover(uuid, text) from public, anon;
revoke all on function public.mkt_peca_aprovar(uuid, text) from public, anon;
revoke all on function public.mkt_peca_pedir_ajuste(uuid, text) from public, anon;
revoke all on function public.mkt_peca_remover(uuid) from public, anon;
revoke all on function public.mkt_versao_adicionar(uuid, text, text, uuid) from public, anon;
revoke all on function public.mkt_versao_editar(uuid, jsonb) from public, anon;
revoke all on function public.mkt_versao_remover(uuid) from public, anon;
revoke all on function public.mkt_versao_agendar(uuid, timestamptz) from public, anon;
revoke all on function public.mkt_versao_publicar(uuid, text, timestamptz) from public, anon;
revoke all on function public.mkt_versao_resultados(uuid, jsonb) from public, anon;
revoke all on function public.mkt_pecas_listar(jsonb, integer) from public, anon;
revoke all on function public.mkt_peca_detalhe(uuid) from public, anon;
revoke all on function public.mkt_resumo() from public, anon;
revoke all on function public.mkt_calendario(date, date) from public, anon;

grant execute on function public.mkt_canais_listar() to authenticated;
grant execute on function public.mkt_campanha_salvar(uuid, jsonb) to authenticated;
grant execute on function public.mkt_campanha_remover(uuid) to authenticated;
grant execute on function public.mkt_campanhas_listar() to authenticated;
grant execute on function public.mkt_peca_criar(text, jsonb, uuid, date, text) to authenticated;
grant execute on function public.mkt_peca_editar(uuid, jsonb) to authenticated;
grant execute on function public.mkt_peca_mover(uuid, text) to authenticated;
grant execute on function public.mkt_peca_aprovar(uuid, text) to authenticated;
grant execute on function public.mkt_peca_pedir_ajuste(uuid, text) to authenticated;
grant execute on function public.mkt_peca_remover(uuid) to authenticated;
grant execute on function public.mkt_versao_adicionar(uuid, text, text, uuid) to authenticated;
grant execute on function public.mkt_versao_editar(uuid, jsonb) to authenticated;
grant execute on function public.mkt_versao_remover(uuid) to authenticated;
grant execute on function public.mkt_versao_agendar(uuid, timestamptz) to authenticated;
grant execute on function public.mkt_versao_publicar(uuid, text, timestamptz) to authenticated;
grant execute on function public.mkt_versao_resultados(uuid, jsonb) to authenticated;
grant execute on function public.mkt_pecas_listar(jsonb, integer) to authenticated;
grant execute on function public.mkt_peca_detalhe(uuid) to authenticated;
grant execute on function public.mkt_resumo() to authenticated;
grant execute on function public.mkt_calendario(date, date) to authenticated;
