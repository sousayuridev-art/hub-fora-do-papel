-- =====================================================================
-- Hub Fora do Papel · PC-2 · Pedido de ajuste com página e anexo
-- Card: docs/cards/PC-2-pedido-de-ajuste-com-contexto.md
-- Reaproveita requests e o fluxo do S3 (nenhuma fila nova).
-- Anexos são arquivos do cliente (materials, S8) ligados ao pedido por request_id:
-- o cliente envia pela mesma rota de "Arquivos" e manda os ids ao criar o pedido.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colunas novas
-- ---------------------------------------------------------------------
alter table public.requests
  add column site_id  uuid references public.sites (id) on delete set null,
  add column contexto jsonb check (contexto is null or (jsonb_typeof(contexto) = 'object' and length(contexto::text) <= 1000));
create index requests_site_idx on public.requests (site_id) where site_id is not null;

alter table public.materials
  add column request_id uuid references public.requests (id) on delete set null;
create index materials_request_idx on public.materials (request_id) where request_id is not null;

-- ---------------------------------------------------------------------
-- 2. Contexto limpo: só página, seção e tela, em texto curto
-- ---------------------------------------------------------------------
create or replace function public._pedido_contexto(p jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select nullif(jsonb_strip_nulls(jsonb_build_object(
    'pagina', nullif(left(trim(p ->> 'pagina'), 80), ''),
    'secao',  nullif(left(trim(p ->> 'secao'), 80), ''),
    'tela',   case when (p ->> 'tela') ~ '^/[A-Za-z0-9/_.$-]{0,199}$' then p ->> 'tela' end)), '{}'::jsonb)
  where jsonb_typeof(p) = 'object';
$$;
revoke all on function public._pedido_contexto(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. _pedido_novo grava site e contexto; pedido do painel conta como do cliente
-- ---------------------------------------------------------------------
drop function public._pedido_novo(uuid, uuid, uuid, text, text, public.request_origin);
create function public._pedido_novo(
  p_tenant uuid, p_cliente uuid, p_projeto uuid, p_titulo text, p_descricao text, p_origem public.request_origin,
  p_site uuid default null, p_contexto jsonb default null
) returns public.requests language plpgsql security definer set search_path = public as $$
declare r public.requests; v_proj uuid := p_projeto; n int;
begin
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if v_proj is not null and not exists (select 1 from public.projects where id = v_proj and client_id = p_cliente) then
    raise exception 'projeto_inexistente' using errcode = 'P0002';
  end if;
  if v_proj is null then
    select id into v_proj from public.projects where client_id = p_cliente
     order by (status = 'andamento') desc, created_at desc limit 1;
  end if;
  perform pg_advisory_xact_lock(hashtext('pedido:' || p_cliente::text));
  select count(*) + 1 into n from public.requests where client_id = p_cliente;
  insert into public.requests (tenant_id, client_id, project_id, code, title, description, origin, site_id, contexto, created_by)
  values (p_tenant, p_cliente, v_proj, public._sigla_cliente(p_cliente) || '-' || lpad(n::text, 2, '0'),
          left(trim(p_titulo), 120), nullif(left(trim(coalesce(p_descricao, '')), 2000), ''), p_origem,
          p_site, public._pedido_contexto(p_contexto), auth.uid())
  returning * into r;
  perform public._projeto_evento(p_tenant, p_cliente, r.project_id, r.id, 'pedido_recebido',
    jsonb_strip_nulls(jsonb_build_object('codigo', r.code, 'titulo', r.title, 'origem', r.origin,
      'site_id', r.site_id, 'site', (select nome from public.sites where id = r.site_id),
      'pagina', r.contexto ->> 'pagina', 'secao', r.contexto ->> 'secao')),
    case when p_origem in ('portal', 'painel') then 'cliente' else 'hub' end, 'pedido.recebido');
  return r;
end;
$$;
revoke all on function public._pedido_novo(uuid, uuid, uuid, text, text, public.request_origin, uuid, jsonb)
  from public, anon, authenticated;

-- Hub: "painel" também é exclusivo do cliente
create or replace function public.pedido_registrar(
  p_cliente uuid, p_titulo text, p_descricao text default null, p_origem public.request_origin default 'whatsapp',
  p_projeto uuid default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); r public.requests;
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if p_origem in ('portal', 'painel') then p_origem := 'hub'; end if;
  r := public._pedido_novo(t, p_cliente, p_projeto, p_titulo, p_descricao, p_origem);
  return jsonb_build_object('id', r.id, 'codigo', r.code);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Portal: pedido com site, contexto e até 3 anexos
-- ---------------------------------------------------------------------
drop function public.portal_pedido_criar(text, text, uuid);
create function public.portal_pedido_criar(
  p_titulo text, p_descricao text default null, p_cliente uuid default null,
  p_site uuid default null, p_contexto jsonb default null, p_anexos uuid[] default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); t uuid; r public.requests;
        anexos uuid[] := coalesce(p_anexos, '{}'::uuid[]); ctx jsonb := public._pedido_contexto(p_contexto);
begin
  select tenant_id into t from public.clients where id = c;
  if p_site is not null and not exists (select 1 from public.sites where id = p_site and client_id = c and tenant_id = t) then
    raise exception 'site_de_outra_empresa' using errcode = '42501';
  end if;
  if cardinality(anexos) > 3 then raise exception 'muitos_anexos' using errcode = '22023'; end if;
  if cardinality(anexos) > 0 and (
       (select count(distinct a) from unnest(anexos) a) <> cardinality(anexos)
       or (select count(*) from public.materials m
            where m.id = any (anexos) and m.client_id = c and m.origin = 'cliente' and m.kind = 'arquivo'
              and m.uploaded_by = auth.uid() and m.ready_at is not null and m.deleted_at is null and m.request_id is null
              and m.mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
              and m.size_bytes <= 5242880) <> cardinality(anexos)) then
    raise exception 'anexo_invalido' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('pedido:' || c::text));
  -- Limite contra excesso: 20 pedidos por dia por empresa
  if (select count(*) from public.requests where client_id = c and created_at > now() - interval '1 day') >= 20 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;
  r := public._pedido_novo(t, c, null, p_titulo, p_descricao,
         case when p_site is not null or ctx is not null or cardinality(anexos) > 0
              then 'painel'::public.request_origin else 'portal'::public.request_origin end,
         p_site, ctx);
  if cardinality(anexos) > 0 then
    update public.materials set request_id = r.id, project_id = coalesce(project_id, r.project_id) where id = any (anexos);
  end if;
  return jsonb_build_object('id', r.id, 'codigo', r.code);
end;
$$;
revoke all on function public.portal_pedido_criar(text, text, uuid, uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.portal_pedido_criar(text, text, uuid, uuid, jsonb, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Hub: lista de pedidos com site, contexto e anexos
-- ---------------------------------------------------------------------
create or replace view public.v_pedidos with (security_invoker = true) as
select r.id, r.client_id, r.project_id, r.code, r.title, r.description, r.origin, r.status, r.classification,
       r.hours_estimated, r.value_cents, r.owner_note, r.client_decision, r.decided_at, r.decision_note,
       r.done_at, r.created_at, r.updated_at,
       c.company_name, c.contact_name, p.name as project_name, p.status as project_status,
       r.site_id, s.nome as site_nome, s.dominio as site_dominio, r.contexto,
       coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'arquivo', m.file_name, 'caminho', m.storage_path,
                                                     'mime', m.mime_type, 'tamanho', m.size_bytes) order by m.created_at)
                   from public.materials m
                  where m.request_id = r.id and m.deleted_at is null and m.ready_at is not null), '[]'::jsonb) as anexos
  from public.requests r
  join public.clients c on c.id = r.client_id
  left join public.projects p on p.id = r.project_id
  left join public.sites s on s.id = r.site_id;
revoke all on public.v_pedidos from anon;
revoke insert, update, delete, truncate on public.v_pedidos from authenticated;
grant select on public.v_pedidos to authenticated;
