-- =====================================================================
-- Hub Fora do Papel · PC-1 · Sites do cliente no portal
-- Card: docs/cards/PC-1-navegacao-e-inicio-do-painel.md
-- O site (CMS-1) ganha os módulos contratados e se está no ar.
-- O Yuri liga o site a um cliente no Hub; o portal monta o menu pelos módulos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Módulos e situação do site
-- ---------------------------------------------------------------------
alter table public.sites
  add column modulos text[] not null default '{paginas,contatos}'
    check (modulos <@ array['paginas', 'artigos', 'portfolio', 'loja', 'contatos']::text[]),
  add column no_ar boolean not null default true;

-- ---------------------------------------------------------------------
-- 2. Hub: ligar o site ao cliente e escolher os módulos (só o dono)
-- ---------------------------------------------------------------------
create or replace function public.site_cliente_definir(
  p_site uuid, p_cliente uuid, p_modulos text[], p_no_ar boolean default true
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.sites;
        mods text[] := array(select distinct m from unnest(coalesce(p_modulos, '{}'::text[])) m order by 1);
begin
  select * into s from public.sites where id = p_site and tenant_id = t for update;
  if s.id is null then raise exception 'site_inexistente' using errcode = 'P0002'; end if;
  if p_cliente is not null and not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if not mods <@ array['paginas', 'artigos', 'portfolio', 'loja', 'contatos']::text[] then
    raise exception 'modulo_invalido' using errcode = '22023';
  end if;
  update public.sites set client_id = p_cliente, modulos = mods, no_ar = coalesce(p_no_ar, true)
   where id = s.id returning * into s;
  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'site.cliente_definido', jsonb_build_object('site_id', s.id, 'dominio', s.dominio,
          'client_id', s.client_id, 'modulos', to_jsonb(s.modulos), 'no_ar', s.no_ar));
  return jsonb_build_object('id', s.id, 'nome', s.nome, 'dominio', s.dominio, 'client_id', s.client_id,
                            'modulos', to_jsonb(s.modulos), 'no_ar', s.no_ar);
end;
$$;

-- Site novo já ligado ao cliente (o Yuri cadastra pela ficha do cliente)
create or replace function public.site_cliente_criar(
  p_cliente uuid, p_nome text, p_dominio text, p_modulos text[], p_no_ar boolean default false
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); novo uuid;
        dom text := regexp_replace(lower(trim(coalesce(p_dominio, ''))), '^(https?://)?([^/]+)/?$', '\2');
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_obrigatorio' using errcode = '22023'; end if;
  if dom !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' or length(dom) > 253 then
    raise exception 'dominio_invalido' using errcode = '22023';
  end if;
  if exists (select 1 from public.sites where regexp_replace(dominio, '^www\.', '') = regexp_replace(dom, '^www\.', '')) then
    raise exception 'dominio_em_uso' using errcode = '23505';
  end if;
  insert into public.sites (tenant_id, client_id, nome, dominio) values (t, null, left(trim(p_nome), 120), dom)
  returning id into novo;
  return public.site_cliente_definir(novo, p_cliente, p_modulos, coalesce(p_no_ar, false));
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Portal: sites da empresa de quem entrou (responsável e equipe)
-- ---------------------------------------------------------------------
create or replace function public._portal_sites_json(c uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'dominio', s.dominio,
                                               'modulos', to_jsonb(s.modulos), 'no_ar', s.no_ar)
                            order by s.criado_em, s.nome), '[]'::jsonb)
    from public.sites s join public.clients cl on cl.id = s.client_id and cl.tenant_id = s.tenant_id
   where s.client_id = c;
$$;
revoke all on function public._portal_sites_json(uuid) from public, anon, authenticated;

create or replace function public.portal_sites(p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid;
begin
  -- Quem não é de nenhuma empresa recebe lista vazia (o menu do portal não quebra)
  begin
    c := public._portal_cliente(p_cliente);
  exception when insufficient_privilege then
    return '[]'::jsonb;
  end;
  return public._portal_sites_json(c);
end;
$$;

-- Início do portal: o primeiro site entra junto (contatos e passos chegam com PC-5 e PC-6)
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.portal_inicio(uuid)'::regprocedure);
  novo := replace(d, '''hoje'', public._hoje(t),',
                     '''hoje'', public._hoje(t),
    ''site'', public._portal_sites_json(c) -> 0,');
  if novo = d then raise exception 'portal_inicio: ponto de troca não encontrado'; end if;
  execute novo;
end $$;

do $$
declare f text;
begin
  foreach f in array array['site_cliente_definir(uuid, uuid, text[], boolean)',
                         'site_cliente_criar(uuid, text, text, text[], boolean)', 'portal_sites(uuid)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
