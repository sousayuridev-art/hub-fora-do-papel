-- =====================================================================
-- Hub Fora do Papel · TA-1 · Central de Tarefas (banco)
-- Card: docs/cards/TA-central-de-tarefas.md
-- A Central é outra forma de ver a MESMA tabela project_tasks: nada é copiado.
-- Tarefa pode não ter projeto (interna ou do Hub). Tipo cliente ⇔ tem projeto.
-- =====================================================================

alter table public.project_tasks alter column project_id drop not null;

alter table public.project_tasks
  add column kind        text not null default 'cliente' check (kind in ('cliente', 'interna', 'hub')),
  add column priority    text not null default 'normal' check (priority in ('alta', 'normal', 'baixa')),
  add column due_date    date,
  add column assignee_id uuid references auth.users (id) on delete set null,
  add column done_at     timestamptz,
  add column card_ref    text check (card_ref is null or length(card_ref) between 1 and 20);

alter table public.project_tasks
  add constraint project_tasks_tipo_projeto check ((kind = 'cliente') = (project_id is not null));

-- Tarefas já prontas ganham a data de conclusão da última mudança.
update public.project_tasks set done_at = updated_at where status = 'pronto' and done_at is null;

create index project_tasks_central_idx on public.project_tasks (tenant_id, status, due_date);
create index project_tasks_tipo_idx on public.project_tasks (tenant_id, kind);

-- ---------------------------------------------------------------------
-- Ajudantes internos
-- ---------------------------------------------------------------------
-- Trava a tarefa e confere o dono (pelo projeto, ou pelo tenant quando não há projeto).
create or replace function public._tarefa_do_dono(p_id uuid)
returns public.project_tasks language plpgsql security definer set search_path = public as $$
declare t public.project_tasks; p public.projects;
begin
  select * into t from public.project_tasks where id = p_id for update;
  if t.id is null then raise exception 'tarefa_inexistente' using errcode = 'P0002'; end if;
  if t.project_id is not null then
    p := public._projeto_do_dono(t.project_id);
  elsif t.tenant_id <> public._tenant_do_dono() then
    raise exception 'tarefa_inexistente' using errcode = 'P0002';
  end if;
  return t;
end;
$$;
revoke all on function public._tarefa_do_dono(uuid) from public, anon, authenticated;

-- Tarefa no formato da tela: com projeto, cliente, pedido de origem e "atrasada".
create or replace function public._tarefa_json(t public.project_tasks, p_hoje date)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(t) - 'tenant_id'
    || jsonb_build_object(
      'atrasada', t.due_date is not null and t.due_date < p_hoje and t.status <> 'pronto',
      'projeto', (select jsonb_build_object('id', p.id, 'nome', p.name, 'situacao', p.status)
                    from public.projects p where p.id = t.project_id),
      'cliente', (select jsonb_build_object('id', c.id, 'empresa', c.company_name)
                    from public.projects p join public.clients c on c.id = p.client_id
                   where p.id = t.project_id),
      'pedido', (select jsonb_build_object('id', r.id, 'codigo', r.code, 'titulo', r.title)
                   from public.requests r where r.id = t.request_id)
    );
$$;
revoke all on function public._tarefa_json(public.project_tasks, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Criar (substitui a versão do S3: projeto agora é opcional)
-- ---------------------------------------------------------------------
drop function if exists public.tarefa_criar(uuid, text, text, text, smallint, uuid);

create or replace function public.tarefa_criar(
  p_titulo text,
  p_projeto uuid default null,
  p_area text default null,
  p_descricao text default null,
  p_ciclo smallint default null,
  p_pedido uuid default null,
  p_tipo text default null,
  p_prazo date default null,
  p_prioridade text default 'normal',
  p_card text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects; t public.project_tasks; v_tenant uuid; v_tipo text; v_ciclo smallint;
begin
  if length(trim(coalesce(p_titulo, ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
  if coalesce(p_prioridade, 'normal') not in ('alta', 'normal', 'baixa') then
    raise exception 'prioridade_invalida' using errcode = '22023';
  end if;
  if p_projeto is not null then
    p := public._projeto_do_dono(p_projeto);
    v_tenant := p.tenant_id;
    v_tipo := 'cliente';
    if p_tipo is not null and p_tipo <> 'cliente' then raise exception 'tipo_invalido' using errcode = '22023'; end if;
    if p_pedido is not null and not exists (select 1 from public.requests where id = p_pedido and project_id = p.id) then
      raise exception 'pedido_inexistente' using errcode = 'P0002';
    end if;
    -- Sem ciclo informado (ex.: criada na Central), entra no ciclo atual do projeto (o maior).
    v_ciclo := coalesce(p_ciclo, (select max(cycle) from public.project_tasks where project_id = p.id), 1);
  else
    v_tenant := public._tenant_do_dono();
    v_tipo := coalesce(p_tipo, 'interna');
    if v_tipo not in ('interna', 'hub') then raise exception 'tipo_invalido' using errcode = '22023'; end if;
    if p_pedido is not null then raise exception 'pedido_inexistente' using errcode = 'P0002'; end if;
  end if;

  insert into public.project_tasks (tenant_id, project_id, request_id, cycle, area, title, description, position,
                                    kind, priority, due_date, card_ref)
  values (v_tenant, p_projeto, p_pedido, greatest(1, least(50, coalesce(v_ciclo, 1))),
          nullif(left(trim(coalesce(p_area, '')), 40), ''), left(trim(p_titulo), 120),
          nullif(left(trim(coalesce(p_descricao, '')), 600), ''), extract(epoch from now()),
          v_tipo, coalesce(p_prioridade, 'normal'), p_prazo, nullif(left(trim(coalesce(p_card, '')), 20), ''))
  returning * into t;
  return public._tarefa_json(t, public._hoje(v_tenant));
end;
$$;

-- ---------------------------------------------------------------------
-- Editar: só as chaves presentes em p_campos mudam (null limpa prazo/área/descrição/card/responsável).
-- ---------------------------------------------------------------------
create or replace function public.tarefa_editar(p_id uuid, p_campos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t public.project_tasks := public._tarefa_do_dono(p_id); v_resp uuid;
begin
  if p_campos is null or jsonb_typeof(p_campos) <> 'object' then raise exception 'campos_invalidos' using errcode = '22023'; end if;
  if p_campos ? 'titulo' then
    if length(trim(coalesce(p_campos ->> 'titulo', ''))) < 2 then raise exception 'titulo_obrigatorio' using errcode = '22023'; end if;
    t.title := left(trim(p_campos ->> 'titulo'), 120);
  end if;
  if p_campos ? 'descricao' then t.description := nullif(left(trim(coalesce(p_campos ->> 'descricao', '')), 600), ''); end if;
  if p_campos ? 'area' then t.area := nullif(left(trim(coalesce(p_campos ->> 'area', '')), 40), ''); end if;
  if p_campos ? 'prazo' then t.due_date := (p_campos ->> 'prazo')::date; end if;
  if p_campos ? 'prioridade' then
    if coalesce(p_campos ->> 'prioridade', '') not in ('alta', 'normal', 'baixa') then
      raise exception 'prioridade_invalida' using errcode = '22023';
    end if;
    t.priority := p_campos ->> 'prioridade';
  end if;
  if p_campos ? 'card' then t.card_ref := nullif(left(trim(coalesce(p_campos ->> 'card', '')), 20), ''); end if;
  if p_campos ? 'tipo' then
    -- Só alterna entre interna e hub (tarefa de cliente segue o projeto).
    if t.project_id is not null or coalesce(p_campos ->> 'tipo', '') not in ('interna', 'hub') then
      raise exception 'tipo_invalido' using errcode = '22023';
    end if;
    t.kind := p_campos ->> 'tipo';
  end if;
  if p_campos ? 'responsavel' then
    v_resp := (p_campos ->> 'responsavel')::uuid;
    if v_resp is not null and not exists (
      select 1 from public.memberships m where m.tenant_id = t.tenant_id and m.user_id = v_resp and m.role = 'owner'
    ) then
      raise exception 'responsavel_invalido' using errcode = '22023';
    end if;
    t.assignee_id := v_resp;
  end if;

  update public.project_tasks
     set title = t.title, description = t.description, area = t.area, due_date = t.due_date,
         priority = t.priority, card_ref = t.card_ref, kind = t.kind, assignee_id = t.assignee_id
   where id = t.id
  returning * into t;
  return public._tarefa_json(t, public._hoje(t.tenant_id));
exception
  when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
    raise exception 'campos_invalidos' using errcode = '22023';
end;
$$;

-- ---------------------------------------------------------------------
-- Mover e remover (agora valem também para tarefas sem projeto)
-- ---------------------------------------------------------------------
create or replace function public.tarefa_mover(p_id uuid, p_situacao public.task_status)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t public.project_tasks := public._tarefa_do_dono(p_id);
begin
  update public.project_tasks
     set status = p_situacao,
         position = extract(epoch from now()),
         done_at = case when p_situacao = 'pronto' then coalesce(case when t.status = 'pronto' then t.done_at end, now()) end
   where id = t.id
  returning * into t;
  return public._tarefa_json(t, public._hoje(t.tenant_id));
end;
$$;

create or replace function public.tarefa_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t public.project_tasks := public._tarefa_do_dono(p_id);
begin
  delete from public.project_tasks where id = t.id;
  return to_jsonb(t) - 'tenant_id';
end;
$$;

-- ---------------------------------------------------------------------
-- Central: lista com filtros e resumo (contagens no banco)
-- p_filtros: id (uma tarefa, sem os cortes padrão), tipo (cliente|interna|hub), cliente (uuid), projeto (uuid), prioridade, situacao,
--            prazo (atrasadas|hoje|semana), busca (texto), incluir_encerrados (bool), pronto_dias (int, padrão 7)
-- ---------------------------------------------------------------------
create or replace function public.tarefas_listar(p_filtros jsonb default '{}'::jsonb, p_limite integer default 500)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_tenant uuid := public._tenant_do_dono();
  v_hoje date := public._hoje(v_tenant);
  f jsonb := coalesce(p_filtros, '{}'::jsonb);
  v_dias int := greatest(0, least(90, coalesce((f ->> 'pronto_dias')::numeric, 7)))::int;
  -- Busca literal: \ % _ digitados não viram curinga.
  v_busca text := replace(replace(replace(nullif(left(trim(coalesce(f ->> 'busca', '')), 100), ''), '\', '\\'), '%', '\%'), '_', '\_');
  v_itens jsonb;
begin
  select coalesce(jsonb_agg(public._tarefa_json(t, v_hoje)
           order by (t.status = 'pronto'), t.due_date nulls last,
                    case t.priority when 'alta' then 0 when 'normal' then 1 else 2 end, t.position desc), '[]'::jsonb)
    into v_itens
    from (
      select t.*
        from public.project_tasks t
        left join public.projects p on p.id = t.project_id
       where t.tenant_id = v_tenant
         and (f ->> 'id' is null or t.id = (f ->> 'id')::uuid)
         and (f ->> 'id' is not null or f ->> 'projeto' is not null or coalesce((f ->> 'incluir_encerrados')::boolean, false) or p.id is null or p.status <> 'concluido')
         and (f ->> 'tipo' is null or t.kind = f ->> 'tipo')
         and (f ->> 'projeto' is null or t.project_id = (f ->> 'projeto')::uuid)
         and (f ->> 'cliente' is null or p.client_id = (f ->> 'cliente')::uuid)
         and (f ->> 'prioridade' is null or t.priority = f ->> 'prioridade')
         and (f ->> 'situacao' is null or t.status::text = f ->> 'situacao')
         and (f ->> 'id' is not null or t.status <> 'pronto' or t.done_at >= now() - make_interval(days => v_dias))
         and (f ->> 'prazo' is null
              or (f ->> 'prazo' = 'atrasadas' and t.due_date < v_hoje and t.status <> 'pronto')
              or (f ->> 'prazo' = 'hoje' and t.due_date = v_hoje and t.status <> 'pronto')
              or (f ->> 'prazo' = 'semana' and t.due_date between v_hoje and v_hoje + 6 and t.status <> 'pronto'))
         and (v_busca is null or t.title ilike '%' || v_busca || '%' or coalesce(t.description, '') ilike '%' || v_busca || '%')
       order by (t.status = 'pronto'), t.due_date nulls last, t.position desc
       limit greatest(1, least(2000, coalesce(p_limite, 500)))
    ) t;
  return jsonb_build_object('hoje', v_hoje, 'itens', v_itens);
exception
  when invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range then
    raise exception 'filtros_invalidos' using errcode = '22023';
end;
$$;

create or replace function public.tarefas_resumo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tenant uuid := public._tenant_do_dono(); v_hoje date := public._hoje(v_tenant); r jsonb;
begin
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
   where t.tenant_id = v_tenant and (p.id is null or p.status <> 'concluido');
  return r;
end;
$$;

revoke all on function public.tarefa_criar(text, uuid, text, text, smallint, uuid, text, date, text, text) from public, anon;
revoke all on function public.tarefa_editar(uuid, jsonb) from public, anon;
revoke all on function public.tarefa_mover(uuid, public.task_status) from public, anon;
revoke all on function public.tarefa_remover(uuid) from public, anon;
revoke all on function public.tarefas_listar(jsonb, integer) from public, anon;
revoke all on function public.tarefas_resumo() from public, anon;
grant execute on function public.tarefa_criar(text, uuid, text, text, smallint, uuid, text, date, text, text) to authenticated;
grant execute on function public.tarefa_editar(uuid, jsonb) to authenticated;
grant execute on function public.tarefa_mover(uuid, public.task_status) to authenticated;
grant execute on function public.tarefa_remover(uuid) to authenticated;
grant execute on function public.tarefas_listar(jsonb, integer) to authenticated;
grant execute on function public.tarefas_resumo() to authenticated;
