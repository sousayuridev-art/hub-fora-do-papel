-- =====================================================================
-- Hub Fora do Papel · RD-4 · Reuniões (e números da lista de Clientes, RD-1)
-- Card: docs/cards/RD-redesenho-telas.md
-- 1. Busca no banco por título, cliente e trecho da transcrição, com semana.
-- 2. "Ligue estas reuniões a um cliente": cliente sugerido pelo e-mail dos convidados.
-- 3. RD-1: clientes_resumo ganha "Para hoje", "Vencidos" e mensalidades ativas
--    (mesmo formato de antes, só com chaves novas).
-- Não muda tabelas nem a função de servidor `reunioes-google`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Auxiliar: cliente sugerido para uma reunião sem cliente
-- Mesma regra do vínculo automático (e-mails dos convidados fora os da agência),
-- mas escolhe o cliente com mais convidados em comum; empate = sem sugestão.
-- Reunião que o Yuri desligou à mão (vínculo manual sem cliente) não recebe sugestão.
-- ---------------------------------------------------------------------
create or replace function public._reuniao_sugestao(m public.meetings)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  emails text[];
  topo uuid[];
  v_cli uuid;
  v_deal uuid;
  v_proj uuid;
begin
  if m.client_id is not null or m.linked_by = 'manual' then return null; end if;

  select coalesce(array_agg(distinct lower(trim(a ->> 'email'))), '{}') into emails
    from jsonb_array_elements(m.attendees) a
   where coalesce(trim(a ->> 'email'), '') <> ''
     and lower(trim(a ->> 'email')) not in (
       select lower(u.email) from public.memberships mb join auth.users u on u.id = mb.user_id
        where mb.tenant_id = m.tenant_id and mb.role = 'owner' and u.email is not null
       union
       select lower(g.google_email) from public.google_connections g where g.tenant_id = m.tenant_id);
  if cardinality(emails) = 0 then return null; end if;

  with pares as (
    select c.id, e.email
      from public.clients c cross join unnest(emails) as e(email)
     where c.tenant_id = m.tenant_id
       and (lower(trim(c.email)) = e.email or lower(trim(c.billing_email)) = e.email)
    union
    select cm.client_id, lower(u.email)
      from public.client_members cm join auth.users u on u.id = cm.user_id
     where cm.tenant_id = m.tenant_id and lower(u.email) = any (emails)
  ), soma as (
    select id, count(*) as n from pares group by id
  )
  select array_agg(id) into topo from soma where n = (select max(n) from soma);
  if coalesce(cardinality(topo), 0) <> 1 then return null; end if;
  v_cli := topo[1];

  select case when count(*) = 1 then min(d.id::text)::uuid end into v_deal
    from public.deals d where d.client_id = v_cli and d.tenant_id = m.tenant_id and d.archived_at is null;
  select case when count(*) = 1 then min(p.id::text)::uuid end into v_proj
    from public.projects p where p.client_id = v_cli and p.tenant_id = m.tenant_id
     and p.status in ('andamento', 'mensalidade');

  return jsonb_build_object(
    'cliente', (select jsonb_build_object('id', c.id, 'nome', c.company_name) from public.clients c where c.id = v_cli),
    'deal_id', v_deal,
    'projeto', (select jsonb_build_object('id', p.id, 'nome', p.name) from public.projects p where p.id = v_proj));
end;
$$;
revoke all on function public._reuniao_sugestao(public.meetings) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Lista com busca e semana
-- p_filtro: 'todas' | 'sem_cliente' | 'sem_transcricao'. p_texto: título, cliente ou trecho falado
-- (sem diferença de acento e maiúsculas). Cada item traz a semana (segunda-feira, no fuso da
-- agência), quantas semanas atrás e, se o texto bateu na transcrição, o trecho.
-- ---------------------------------------------------------------------
create or replace function public.reunioes_buscar(p_filtro text default 'todas', p_texto text default null,
                                                  p_cliente uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  fuso text := (select timezone from public.tenants where id = t);
  semana_atual date := date_trunc('week', now() at time zone fuso)::date;
  termo text := lower(public.unaccent_like(left(nullif(trim(p_texto), ''), 100)));
begin
  if coalesce(p_filtro, 'todas') not in ('todas', 'sem_cliente', 'sem_transcricao') then
    raise exception 'filtro_invalido' using errcode = '22023';
  end if;
  if termo = '' then termo := null; end if;

  return (
    with base as (
      select m.*, c.company_name,
             date_trunc('week', m.started_at at time zone fuso)::date as semana
        from public.meetings m
        left join public.clients c on c.id = m.client_id
       where m.tenant_id = t
         and (p_cliente is null or m.client_id = p_cliente)
         and (coalesce(p_filtro, 'todas') = 'todas'
              or (p_filtro = 'sem_cliente' and m.client_id is null)
              or (p_filtro = 'sem_transcricao' and m.status = 'sem_transcricao'))
    ), achadas as (
      select b.*,
             case when termo is null
                    or strpos(lower(public.unaccent_like(b.title)), termo) > 0
                    or strpos(lower(public.unaccent_like(b.company_name)), termo) > 0
                  then null
                  else (select f ->> 'texto'
                          from public.meeting_transcripts tr, jsonb_array_elements(tr.entries) f
                         where tr.meeting_id = b.id
                           and strpos(lower(public.unaccent_like(f ->> 'texto')), termo) > 0
                         limit 1)
             end as fala
        from base b
    ), filtradas as (
      select * from achadas a
       where termo is null
          or strpos(lower(public.unaccent_like(a.title)), termo) > 0
          or strpos(lower(public.unaccent_like(a.company_name)), termo) > 0
          or a.fala is not null
       order by a.started_at desc
       limit 500
    )
    select jsonb_build_object(
      'itens', coalesce((
        select jsonb_agg(
                 public._reuniao_json(m) || jsonb_build_object(
                   'semana', f.semana,
                   'semanas_atras', (semana_atual - f.semana) / 7,
                   'trecho', case when f.fala is null then null
                                  else public._reuniao_trecho(f.fala, termo) end)
                 order by f.started_at desc)
          from filtradas f join public.meetings m on m.id = f.id), '[]'::jsonb),
      'semanas', coalesce((
        select jsonb_agg(jsonb_build_object('semana', s.semana, 'semanas_atras', (semana_atual - s.semana) / 7,
                                            'total', s.n) order by s.semana desc)
          from (select semana, count(*) as n from filtradas group by semana) s), '[]'::jsonb),
      'todas', (select count(*) from public.meetings where tenant_id = t),
      'sem_cliente', (select count(*) from public.meetings where tenant_id = t and client_id is null),
      'sem_transcricao', (select count(*) from public.meetings where tenant_id = t and status = 'sem_transcricao'))
  );
end;
$$;

-- Trecho de até ~140 caracteres em volta do termo achado na fala.
create or replace function public._reuniao_trecho(p_fala text, p_termo text)
returns text language sql immutable set search_path = public as $$
  select case
    when length(p_fala) <= 140 then p_fala
    else (
      with pos as (select greatest(strpos(lower(public.unaccent_like(p_fala)), p_termo) - 50, 1) as i)
      select case when i > 1 then '…' else '' end || substr(p_fala, i, 140)
             || case when i + 140 <= length(p_fala) then '…' else '' end
        from pos)
  end;
$$;
revoke all on function public._reuniao_trecho(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Bloco "Ligue estas reuniões a um cliente": as mais recentes sem cliente, com sugestão
-- ---------------------------------------------------------------------
create or replace function public.reunioes_para_ligar(p_limite int default 6)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  return jsonb_build_object(
    'total', (select count(*) from public.meetings where tenant_id = t and client_id is null),
    'itens', coalesce((
      select jsonb_agg(public._reuniao_json(m) || jsonb_build_object('sugestao', public._reuniao_sugestao(m))
                       order by m.started_at desc)
        from (select * from public.meetings
               where tenant_id = t and client_id is null
               order by started_at desc
               limit least(greatest(coalesce(p_limite, 6), 1), 20)) m), '[]'::jsonb));
end;
$$;

revoke all on function public.reunioes_buscar(text, text, uuid) from public, anon;
revoke all on function public.reunioes_para_ligar(int) from public, anon;
grant execute on function public.reunioes_buscar(text, text, uuid) to authenticated;
grant execute on function public.reunioes_para_ligar(int) to authenticated;

-- ---------------------------------------------------------------------
-- 4. RD-1: números da lista de Clientes (mesma regra da coluna "Próximo passo":
--    oportunidade aberta, não arquivada, com data do passo no fuso da agência)
-- ---------------------------------------------------------------------
create or replace function public.clientes_resumo()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'todos',      count(*),
    'contato',    count(*) filter (where situacao = 'contato'),
    'negociacao', count(*) filter (where situacao = 'negociacao'),
    'cliente',    count(*) filter (where situacao = 'cliente'),
    'arquivado',  count(*) filter (where situacao = 'arquivado'),
    'em_negociacao_cents', coalesce(sum(value_cents) filter (where situacao = 'negociacao'), 0),
    'fechado_cents', coalesce(sum(fechado_cents), 0),
    'para_hoje',  count(*) filter (where archived_at is null and stage <> 'fechado' and next_step_date = hoje),
    'para_hoje_com_hora', count(*) filter (where archived_at is null and stage <> 'fechado'
                                             and next_step_date = hoje and next_step_has_time),
    'vencidos',   count(*) filter (where archived_at is null and stage <> 'fechado' and next_step_date < hoje),
    'vencido_ha_dias', coalesce(max(hoje - next_step_date)
                                  filter (where archived_at is null and stage <> 'fechado' and next_step_date < hoje), 0),
    'mensalidades_cents', (select coalesce(sum(s.amount_cents), 0) from public.subscriptions s where s.status = 'ativa')
  ) from public.v_clientes;
$$;
