-- =====================================================================
-- Hub Fora do Papel · TA-2/TA-3 · ajustes da Central de Tarefas
-- Card: docs/cards/TA-central-de-tarefas.md
-- O resumo passa a aceitar os mesmos filtros da lista (tipo, cliente, projeto, prioridade,
-- incluir_encerrados), para que as contagens das abas e dos atalhos venham do banco
-- e batam com a lista filtrada. Sem filtros, devolve o mesmo de antes (menu).
-- =====================================================================

drop function if exists public.tarefas_resumo();

create or replace function public.tarefas_resumo(p_filtros jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_tenant uuid := public._tenant_do_dono();
  v_hoje date := public._hoje(v_tenant);
  f jsonb := coalesce(p_filtros, '{}'::jsonb);
  r jsonb;
begin
  if jsonb_typeof(f) <> 'object' then raise exception 'filtros_invalidos' using errcode = '22023'; end if;
  select jsonb_build_object(
           'hoje', v_hoje,
           'abertas', count(*) filter (where t.status <> 'pronto'),
           'cliente', count(*) filter (where t.status <> 'pronto' and t.kind = 'cliente'),
           'interna', count(*) filter (where t.status <> 'pronto' and t.kind = 'interna'),
           'hub', count(*) filter (where t.status <> 'pronto' and t.kind = 'hub'),
           'atrasadas', count(*) filter (where t.status <> 'pronto' and t.due_date < v_hoje),
           'para_hoje', count(*) filter (where t.status <> 'pronto' and t.due_date = v_hoje),
           'semana', count(*) filter (where t.status <> 'pronto' and t.due_date between v_hoje and v_hoje + 6),
           'fazendo', count(*) filter (where t.status = 'fazendo'),
           'prontas_semana', count(*) filter (where t.status = 'pronto' and t.done_at >= now() - interval '7 days'))
    into r
    from public.project_tasks t
    left join public.projects p on p.id = t.project_id
   where t.tenant_id = v_tenant
     and (f ->> 'projeto' is not null or coalesce((f ->> 'incluir_encerrados')::boolean, false) or p.id is null or p.status <> 'concluido')
     and (f ->> 'tipo' is null or t.kind = f ->> 'tipo')
     and (f ->> 'projeto' is null or t.project_id = (f ->> 'projeto')::uuid)
     and (f ->> 'cliente' is null or p.client_id = (f ->> 'cliente')::uuid)
     and (f ->> 'prioridade' is null or t.priority = f ->> 'prioridade');
  return r;
exception
  when invalid_text_representation or invalid_datetime_format then
    raise exception 'filtros_invalidos' using errcode = '22023';
end;
$$;

revoke all on function public.tarefas_resumo(jsonb) from public, anon;
grant execute on function public.tarefas_resumo(jsonb) to authenticated;
