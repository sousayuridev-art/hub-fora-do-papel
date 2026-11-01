-- =====================================================================
-- RD2-4 · Prazo com data em cada fase (decisão do Yuri, 29/10)
-- A data de verdade permite dizer "3 dias de atraso" na página do projeto.
-- O texto livre (due_label) continua para quem já usa.
-- =====================================================================
alter table public.project_phases add column if not exists due_date date;

create or replace function public.projeto_fase_prazo(p_fase uuid, p_data date)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare f public.project_phases;
begin
  select * into f from public.project_phases where id = p_fase for update;
  if f.id is null or not public.is_tenant_owner(f.tenant_id) then
    raise exception 'fase_inexistente' using errcode = 'P0002';
  end if;
  if p_data is not null and (p_data < date '2020-01-01' or p_data > date '2100-12-31') then
    raise exception 'data_invalida' using errcode = '22023';
  end if;
  update public.project_phases set due_date = p_data where id = p_fase returning * into f;
  return jsonb_build_object('id', f.id, 'due_date', f.due_date);
end;
$$;
revoke all on function public.projeto_fase_prazo(uuid, date) from public, anon;
grant execute on function public.projeto_fase_prazo(uuid, date) to authenticated;
