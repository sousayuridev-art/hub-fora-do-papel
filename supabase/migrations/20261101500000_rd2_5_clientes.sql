-- =====================================================================
-- Hub Fora do Papel · RD2-5 · Clientes e página do cliente
-- Card: docs/cards/RD2-5-clientes.md
-- 1. Logo do cliente (clients.logo_path, bucket privado logos-clientes, RPC cliente_logo).
-- 2. clientes_agora(): grupo de cada ficha (ativo, ex, contato, arquivado), relação,
--    o que está acontecendo agora e o dinheiro, calculados no banco.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Logo
-- ---------------------------------------------------------------------
alter table public.clients add column if not exists logo_path text
  check (logo_path is null or logo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$');

-- v_clientes ganha logo_path no fim (mesma definição do S1)
create or replace view public.v_clientes with (security_invoker = true) as
select
  c.id, c.company_name, c.contact_name, c.contact_role, c.whatsapp, c.email, c.origin,
  c.segment, c.city, c.ad_name, c.referred_by, c.current_site, c.size_range,
  c.client_since, c.last_activity_at, c.created_at, c.updated_at,
  od.id as deal_id, od.stage, od.value_cents, od.diagnostic_tier, od.diagnostic_paid,
  od.next_step, od.next_step_at, od.next_step_has_time, od.archived_at, od.updated_at as deal_updated_at,
  (od.next_step_at at time zone t.timezone)::date as next_step_date,
  (now() at time zone t.timezone)::date as hoje,
  case
    when exists (select 1 from public.deals f where f.client_id = c.id and f.stage = 'fechado' and f.archived_at is null) then 'cliente'
    when od.id is null then 'sem_oportunidade'
    when od.archived_at is not null then 'arquivado'
    when od.stage = 'contato' then 'contato'
    else 'negociacao'
  end as situacao,
  (select coalesce(sum(f.value_cents), 0) from public.deals f
    where f.client_id = c.id and f.stage = 'fechado' and f.archived_at is null)::bigint as fechado_cents,
  (select ev.kind from public.deal_events ev where ev.client_id = c.id order by ev.created_at desc limit 1) as ultima_atividade,
  c.logo_path
from public.clients c
join public.tenants t on t.id = c.tenant_id
left join lateral (
  select * from public.deals d
   where d.client_id = c.id
   order by (d.archived_at is null and d.stage <> 'fechado') desc, d.created_at desc
   limit 1
) od on true;
revoke all on public.v_clientes from anon;
revoke insert, update, delete, truncate on public.v_clientes from authenticated;
grant select on public.v_clientes to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos-clientes', 'logos-clientes', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Caminho {client_id}/{arquivo.jpg|png|webp}; o cliente tem de ser de um tenant do qual a pessoa é dona
create or replace function public._logo_cliente_do_dono(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$'
     and exists (select 1 from public.clients c
                  where c.id::text = split_part(p_path, '/', 1) and public.is_tenant_owner(c.tenant_id));
$$;
revoke all on function public._logo_cliente_do_dono(text) from public, anon;
grant execute on function public._logo_cliente_do_dono(text) to authenticated;

create policy logos_clientes_ler on storage.objects for select to authenticated
  using (bucket_id = 'logos-clientes' and public._logo_cliente_do_dono(name));
create policy logos_clientes_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'logos-clientes' and public._logo_cliente_do_dono(name));
create policy logos_clientes_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'logos-clientes' and public._logo_cliente_do_dono(name));

-- Grava (ou tira, com null) a logo da ficha. Devolve o caminho anterior para o painel apagar o arquivo.
create or replace function public.cliente_logo(p_cliente uuid, p_caminho text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tenant uuid := public._tenant_do_dono(); c public.clients;
begin
  if v_tenant is null then raise exception 'sem_permissao' using errcode = '42501'; end if;
  select * into c from public.clients where id = p_cliente and tenant_id = v_tenant for update;
  if c.id is null then raise exception 'cliente_nao_encontrado' using errcode = 'P0002'; end if;
  if p_caminho is not null and (
       split_part(p_caminho, '/', 1) <> c.id::text
       or p_caminho !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$') then
    raise exception 'caminho_invalido' using errcode = '22023';
  end if;
  update public.clients set logo_path = p_caminho, updated_at = now() where id = c.id;
  return jsonb_build_object('logo_path', p_caminho, 'anterior', c.logo_path);
end;
$$;
revoke all on function public.cliente_logo(uuid, text) from public, anon;
grant execute on function public.cliente_logo(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. clientes_agora()
-- ---------------------------------------------------------------------
create or replace function public.clientes_agora()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tenant uuid := public._tenant_do_dono(); hoje date; itens jsonb;
begin
  if v_tenant is null then raise exception 'sem_permissao' using errcode = '42501'; end if;
  hoje := public._hoje(v_tenant);

  with base as (
    select c.id,
      exists (select 1 from public.projects p where p.client_id = c.id and p.status = 'andamento') as tem_projeto,
      (select coalesce(sum(s.amount_cents), 0) from public.subscriptions s
        where s.client_id = c.id and s.status in ('ativa', 'pausada'))::bigint as mensalidade_cents,
      exists (select 1 from public.subscriptions s where s.client_id = c.id and s.status in ('ativa', 'pausada')) as tem_mensalidade,
      exists (select 1 from public.charges x where x.client_id = c.id and x.status = 'aberta') as tem_cobranca,
      exists (select 1 from public.projects p where p.client_id = c.id) as teve_projeto,
      exists (select 1 from public.deals f where f.client_id = c.id and f.stage = 'fechado' and f.archived_at is null) as fechou,
      (select d.diagnostic_tier is not null from public.deals d
        where d.client_id = c.id and d.stage = 'fechado' and d.archived_at is null
        order by d.created_at desc limit 1) as diagnostico,
      (select d.archived_at is not null from public.deals d where d.client_id = c.id
        order by (d.archived_at is null and d.stage <> 'fechado') desc, d.created_at desc limit 1) as arquivado
    from public.clients c where c.tenant_id = v_tenant
  ), calc as (
    select b.*,
      case
        when b.tem_projeto or b.tem_mensalidade or b.tem_cobranca then 'ativo'
        when b.teve_projeto or b.fechou then 'ex'
        when coalesce(b.arquivado, false) then 'arquivado'
        else 'contato'
      end as grupo,
      case
        when b.tem_projeto and b.tem_mensalidade then 'projeto_mensalidade'
        when b.tem_projeto then 'projeto'
        when b.tem_mensalidade then 'mensalidade'
        when coalesce(b.diagnostico, false) then 'diagnostico'
        when b.teve_projeto or b.fechou then 'projeto'
        else null
      end as relacao
    from base b
  )
  select coalesce(jsonb_object_agg(k.id, jsonb_build_object(
      'grupo', k.grupo,
      'relacao', k.relacao,
      'mensalidade_cents', k.mensalidade_cents,
      'projeto', (
        select jsonb_build_object(
          'id', p.id, 'nome', p.name,
          'fase_posicao', (select f.position from public.project_phases f
                            where f.project_id = p.id and f.status <> 'concluida' order by f.position limit 1),
          'fase_nome', (select f.name from public.project_phases f
                         where f.project_id = p.id and f.status <> 'concluida' order by f.position limit 1),
          'fases_total', (select count(*) from public.project_phases f where f.project_id = p.id),
          'saude', public._projeto_saude(p.id))
          from public.projects p
         where p.client_id = k.id and p.status = 'andamento'
         order by p.launch_date nulls last, p.started_at limit 1),
      'projetos_andamento', (select count(*) from public.projects p where p.client_id = k.id and p.status = 'andamento'),
      'pedidos_abertos', (select count(*) from public.requests r
                           where r.client_id = k.id and r.status not in ('pronto', 'recusado')),
      'proxima_cobranca', (select min(x.due_date) from public.charges x
                            where x.client_id = k.id and x.status = 'aberta' and x.due_date >= hoje),
      'atrasada_desde', (select min(x.due_date) from public.charges x
                          where x.client_id = k.id and x.status = 'aberta' and x.due_date < hoje),
      'em_atraso_cents', (select coalesce(sum(x.amount_cents), 0) from public.charges x
                           where x.client_id = k.id and x.status = 'aberta' and x.due_date < hoje),
      'recebido_ano_cents', (select coalesce(sum(coalesce(x.paid_cents, x.amount_cents)), 0) from public.charges x
                              where x.client_id = k.id and x.status = 'paga'
                                and extract(year from x.paid_at) = extract(year from hoje))
    )), '{}'::jsonb)
    into itens
    from calc k;

  return jsonb_build_object(
    'itens', itens,
    'resumo', jsonb_build_object(
      'ativo', (select count(*) from jsonb_each(itens) e where e.value ->> 'grupo' = 'ativo'),
      'contato', (select count(*) from jsonb_each(itens) e where e.value ->> 'grupo' = 'contato'),
      'ex', (select count(*) from jsonb_each(itens) e where e.value ->> 'grupo' = 'ex'),
      'arquivado', (select count(*) from jsonb_each(itens) e where e.value ->> 'grupo' = 'arquivado'),
      'mensalidades_cents', (select coalesce(sum(s.amount_cents), 0) from public.subscriptions s
                              where s.tenant_id = v_tenant and s.status = 'ativa'),
      'projetos_andamento', (select count(*) from public.projects p where p.tenant_id = v_tenant and p.status = 'andamento'),
      'clientes_em_atraso', (select count(distinct x.client_id) from public.charges x
                              where x.tenant_id = v_tenant and x.status = 'aberta' and x.due_date < hoje)
    ));
end;
$$;
revoke all on function public.clientes_agora() from public, anon;
grant execute on function public.clientes_agora() to authenticated;
