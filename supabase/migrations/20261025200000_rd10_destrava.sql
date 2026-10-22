-- =====================================================================
-- Hub Fora do Papel · RD-10 · "O que destrava o projeto"
-- Card: docs/cards/RD-10-destrava-e-portal.md (item 5)
-- Só leitura: a ação principal única do momento e o que está com o cliente.
-- Prioridade (a primeira que existir vence):
--   1. módulo aprovado pelo cliente e ainda não publicado
--   2. fase/módulo pronto sem pedido de aprovação
--      · módulo: em testes, com homologação, sem aprovação aguardando
--      · fase: a fase atual sem aprovação aguardando, com tarefa em "Para aprovar" e
--        nada a fazer ou fazendo no ciclo atual (fase não tem situação "pronta" no banco)
--   3. Pedido de ajuste recebido e sem classificação
--   4. Serviço adicional aprovado pelo cliente e não iniciado (em análise)
--   5. tarefa do projeto atrasada
--   6. nada disso: a primeira tarefa a fazer
-- Fase aprovada pelo cliente já é concluída na aprovação (portal_aprovar), por isso o
-- caso 1 só existe para módulos.
-- =====================================================================

create or replace function public._primeiro_nome(p text)
returns text language sql immutable as $$
  select nullif(split_part(trim(coalesce(p, '')), ' ', 1), '');
$$;
revoke all on function public._primeiro_nome(text) from public, anon, authenticated;

-- Volátil porque _projeto_do_dono trava a linha do projeto; não grava nada.
create or replace function public.projeto_destrava(p_projeto uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  p public.projects := public._projeto_do_dono(p_projeto);
  hoje date := public._hoje(p.tenant_id);
  tz text := coalesce((select timezone from public.tenants where id = p.tenant_id), 'America/Sao_Paulo');
  cli public.clients;
  acao jsonb;
  m record; f record; r record; t record;
  ciclo smallint;
  com jsonb;
begin
  select * into cli from public.clients where id = p.client_id;

  -- 1. Módulo aprovado e não publicado
  select pm.id, pm.name, a.decided_at,
         coalesce(public._primeiro_nome(pr.full_name), public._primeiro_nome(cli.contact_name), 'o cliente') as quem
    into m
    from public.project_modules pm
    left join lateral (select * from public.approvals x
                        where x.module_id = pm.id and x.status = 'aprovada'
                        order by x.decided_at desc nulls last limit 1) a on true
    left join public.profiles pr on pr.id = a.decided_by
   where pm.project_id = p.id and pm.status = 'aprovado'
   order by a.decided_at nulls last, pm.position
   limit 1;
  if m.id is not null then
    acao := jsonb_build_object('tipo', 'publicar_modulo', 'alvo', m.id,
      'titulo', 'Publicar o módulo ' || m.name,
      'apoio', case when m.decided_at is not null
                    then 'Aprovado por ' || m.quem || ' em '
                         || to_char(m.decided_at at time zone tz, 'DD/MM, HH24"h"MI')
                         || '. Falta escrever o que entrou nesta versão.'
                    else 'Aprovado pelo cliente. Falta escrever o que entrou nesta versão.' end,
      'botao', 'Publicar ' || m.name);
  end if;

  -- 2a. Módulo em testes, com homologação, sem pedido de aprovação
  if acao is null then
    select pm.id, pm.name into m
      from public.project_modules pm
     where pm.project_id = p.id and pm.status = 'testes' and pm.path = 'homologacao'
       and not exists (select 1 from public.approvals x where x.module_id = pm.id and x.status = 'aguardando')
     order by pm.position limit 1;
    if m.id is not null then
      acao := jsonb_build_object('tipo', 'pedir_aprovacao_modulo', 'alvo', m.id,
        'titulo', 'Pedir aprovação do módulo ' || m.name,
        'apoio', 'O módulo está em testes e o cliente ainda não recebeu o pedido de aprovação.',
        'botao', 'Pedir aprovação');
    end if;
  end if;

  -- 2b. Fase atual pronta (projeto por fases) sem pedido de aprovação
  if acao is null and p.kind = 'padrao' and p.status = 'andamento' then
    select ph.id, ph.name into f
      from public.project_phases ph
     where ph.project_id = p.id and ph.status = 'andamento'
     order by ph.position limit 1;
    select max(cycle) into ciclo from public.project_tasks where project_id = p.id;
    if f.id is not null
       and not exists (select 1 from public.approvals x
                        where x.project_id = p.id and x.status = 'aguardando'
                          and (x.phase_id = f.id or x.phase_id is null))
       and exists (select 1 from public.project_tasks x
                    where x.project_id = p.id and x.cycle = ciclo and x.status = 'para_aprovar')
       and not exists (select 1 from public.project_tasks x
                        where x.project_id = p.id and x.cycle = ciclo and x.status in ('a_fazer', 'fazendo')) then
      acao := jsonb_build_object('tipo', 'pedir_aprovacao_fase', 'alvo', f.id,
        'titulo', 'Pedir aprovação da fase ' || f.name,
        'apoio', 'As tarefas da fase estão prontas para aprovar e o cliente ainda não recebeu o pedido.',
        'botao', 'Pedir aprovação');
    end if;
  end if;

  -- 3. Pedido de ajuste novo sem classificação
  if acao is null then
    select x.id, x.code, x.title, x.created_at into r
      from public.requests x
     where x.project_id = p.id and x.status = 'recebido' and x.classification is null
     order by x.created_at limit 1;
    if r.id is not null then
      acao := jsonb_build_object('tipo', 'classificar_pedido', 'alvo', r.id,
        'titulo', 'Classificar o pedido de ajuste',
        'apoio', r.code || ' · "' || r.title || '" chegou em '
                 || to_char(r.created_at at time zone tz, 'DD/MM') || ' e ainda não tem classificação.',
        'botao', 'Classificar pedido');
    end if;
  end if;

  -- 4. Serviço adicional aprovado e não iniciado
  if acao is null then
    select x.id, x.code, x.title, x.decided_at as created_at into r
      from public.requests x
     where x.project_id = p.id and x.classification = 'adicional' and x.client_decision = 'aprovado'
       and x.status = 'em_analise'
     order by x.decided_at nulls last, x.created_at limit 1;
    if r.id is not null then
      acao := jsonb_build_object('tipo', 'iniciar_adicional', 'alvo', r.id,
        'titulo', 'Começar o serviço adicional ' || r.title,
        'apoio', 'O cliente aprovou' || coalesce(' em ' || to_char(r.created_at at time zone tz, 'DD/MM'), '')
                 || ' e o trabalho ainda não começou.',
        'botao', 'Começar serviço adicional');
    end if;
  end if;

  -- 5. Tarefa atrasada
  if acao is null then
    select x.id, x.title, x.due_date into t
      from public.project_tasks x
     where x.project_id = p.id and x.status <> 'pronto' and x.due_date < hoje
     order by x.due_date, case x.priority when 'alta' then 0 when 'normal' then 1 else 2 end, x.position desc
     limit 1;
    if t.id is not null then
      acao := jsonb_build_object('tipo', 'tarefa_atrasada', 'alvo', t.id,
        'titulo', 'Resolver a tarefa atrasada ' || t.title,
        'apoio', 'O prazo era ' || to_char(t.due_date, 'DD/MM') || '.',
        'botao', 'Abrir tarefa');
    end if;
  end if;

  -- 6. Nada travado: a primeira tarefa a fazer
  if acao is null then
    select x.id, x.title into t
      from public.project_tasks x
     where x.project_id = p.id and x.status = 'a_fazer'
     order by case x.priority when 'alta' then 0 when 'normal' then 1 else 2 end,
              x.due_date nulls last, x.position desc
     limit 1;
    acao := jsonb_build_object('tipo', 'proxima_tarefa', 'alvo', t.id,
      'titulo', 'Nada travado. Próximo passo: ' || coalesce(t.title, 'criar a próxima tarefa'),
      'apoio', 'Nenhuma entrega, pedido ou tarefa atrasada esperando por você.',
      'botao', case when t.id is null then 'Nova tarefa' else 'Abrir tarefa' end);
  end if;

  -- O que está com o cliente (mesma regra do "Precisam de você" do portal, só deste projeto)
  select coalesce(jsonb_agg(i.item order by i.ordem, i.quando), '[]'::jsonb) into com
    from (
      select 1 as ordem, a.sent_at as quando, jsonb_build_object('tipo', 'aprovacao', 'id', a.id, 'texto',
               case when pm.id is not null then 'aprovação do módulo ' || pm.name
                    when ph.id is not null then 'aprovação da fase ' || ph.name
                    else 'aprovação de "' || a.title || '"' end) as item
        from public.approvals a
        left join public.project_modules pm on pm.id = a.module_id
        left join public.project_phases ph on ph.id = a.phase_id
       where a.project_id = p.id and a.status = 'aguardando'
      union all
      select 2, ch.due_date::timestamptz, jsonb_build_object('tipo', 'pagamento', 'id', ch.id, 'texto',
               case when ch.kind = 'parcela' and ch.sequence is not null
                    then 'pagamento da parcela ' || ch.sequence || coalesce(' de ' || ch.sequence_total, '')
                    else 'pagamento de ' || ch.description end)
        from public.charges ch
       where ch.project_id = p.id and ch.status = 'aberta' and ch.client_reported_at is null
         and ch.due_date <= hoje + 5
      union all
      select 3, k.created_at, jsonb_build_object('tipo', 'pendencia', 'id', k.id, 'texto', k.title)
        from public.client_tasks k
       where k.project_id = p.id and k.status = 'aberta'
      union all
      select 4, x.updated_at, jsonb_build_object('tipo', 'adicional', 'id', x.id, 'texto',
               'decisão do serviço adicional "' || x.title || '"')
        from public.requests x
       where x.project_id = p.id and x.status = 'aguardando_cliente'
    ) i;

  return jsonb_build_object(
    'acao', acao,
    'responsavel', coalesce(public._primeiro_nome(cli.contact_name), 'o cliente'),
    'com_cliente', com);
end;
$$;

revoke all on function public.projeto_destrava(uuid) from public, anon;
grant execute on function public.projeto_destrava(uuid) to authenticated;
