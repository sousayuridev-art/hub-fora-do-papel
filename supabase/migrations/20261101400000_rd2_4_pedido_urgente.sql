-- =====================================================================
-- RD2-4 · Pedido urgente (decisão do Yuri, 29/10)
-- Marca que sobe o pedido para o topo da coluna, com selo vermelho.
-- =====================================================================
alter table public.requests add column if not exists urgente boolean not null default false;

-- v_pedidos: mesma visão do PC-2, com "urgente" no fim
create or replace view public.v_pedidos with (security_invoker = true) as
select r.id, r.client_id, r.project_id, r.code, r.title, r.description, r.origin, r.status, r.classification,
       r.hours_estimated, r.value_cents, r.owner_note, r.client_decision, r.decided_at, r.decision_note,
       r.done_at, r.created_at, r.updated_at,
       c.company_name, c.contact_name, p.name as project_name, p.status as project_status,
       r.site_id, s.nome as site_nome, s.dominio as site_dominio, r.contexto,
       coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'arquivo', m.file_name, 'caminho', m.storage_path,
                                                     'mime', m.mime_type, 'tamanho', m.size_bytes) order by m.created_at)
                   from public.materials m
                  where m.request_id = r.id and m.deleted_at is null and m.ready_at is not null), '[]'::jsonb) as anexos,
       r.urgente
  from public.requests r
  join public.clients c on c.id = r.client_id
  left join public.projects p on p.id = r.project_id
  left join public.sites s on s.id = r.site_id;
revoke all on public.v_pedidos from anon;
revoke insert, update, delete, truncate on public.v_pedidos from authenticated;
grant select on public.v_pedidos to authenticated;

create or replace function public.pedido_urgente(p_id uuid, p_urgente boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_id for update;
  if r.id is null or not public.is_tenant_owner(r.tenant_id) then
    raise exception 'pedido_inexistente' using errcode = 'P0002';
  end if;
  update public.requests set urgente = coalesce(p_urgente, false)
   where id = p_id returning * into r;
  return jsonb_build_object('id', r.id, 'urgente', r.urgente, 'updated_at', r.updated_at);
end;
$$;
revoke all on function public.pedido_urgente(uuid, boolean) from public, anon;
grant execute on function public.pedido_urgente(uuid, boolean) to authenticated;
