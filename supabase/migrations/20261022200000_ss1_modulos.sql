-- =====================================================================
-- Hub Fora do Papel · SS-1 · Módulos no projeto (sistemas sob medida)
-- Card: docs/cards/SS-1-modulos-no-projeto.md
-- Projeto "sob medida": módulos em paralelo, cada um com o próprio ciclo até a produção.
-- Publicar com homologação exige aprovação; a 1ª publicação cria a mensalidade;
-- a publicação final (todos no ar ou fora do escopo) marca o início da garantia.
-- =====================================================================

create type public.project_kind as enum ('padrao', 'sob_medida');
create type public.module_status as enum
  ('planejado', 'desenvolvimento', 'testes', 'aguardando_aprovacao', 'aprovado', 'publicado', 'fora_do_escopo');
create type public.module_path as enum ('homologacao', 'direta');

alter table public.projects
  add column kind public.project_kind not null default 'padrao',
  add column final_release_at timestamptz;

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------
create table public.project_modules (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  position        smallint not null check (position between 1 and 200),
  name            text not null check (length(trim(name)) between 2 and 60),
  path            public.module_path not null default 'homologacao',
  status          public.module_status not null default 'planejado',
  test_url        text check (test_url is null or (test_url ~ '^https://[^\s]{3,}$' and length(test_url) <= 500)),
  prod_url        text check (prod_url is null or (prod_url ~ '^https://[^\s]{3,}$' and length(prod_url) <= 500)),
  rounds          smallint not null default 0 check (rounds between 0 and 100),
  live_since      timestamptz,
  last_release_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, position)
);
create index project_modules_tenant_idx on public.project_modules (tenant_id);
create index project_modules_project_idx on public.project_modules (project_id, position);
create trigger project_modules_touch before update on public.project_modules
  for each row execute function public.touch_updated_at();

-- Notas de cada publicação (histórico que o cliente vê)
create table public.module_releases (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  module_id     uuid not null references public.project_modules (id) on delete cascade,
  notes         text not null check (length(trim(notes)) between 5 and 2000),
  url           text check (url is null or (url ~ '^https://[^\s]{3,}$' and length(url) <= 500)),
  path          public.module_path not null,
  approval_id   uuid references public.approvals (id) on delete set null,
  published_by  uuid references auth.users (id) on delete set null,
  published_at  timestamptz not null default now()
);
create index module_releases_module_idx on public.module_releases (module_id, published_at desc);
create index module_releases_tenant_idx on public.module_releases (tenant_id);

alter table public.approvals add column module_id uuid references public.project_modules (id) on delete set null;
create unique index approvals_um_pedido_por_modulo on public.approvals (module_id)
  where module_id is not null and status = 'aguardando';

-- ---------------------------------------------------------------------
-- 2. RLS: o dono lê; o portal só pelas RPCs; ninguém grava direto
-- ---------------------------------------------------------------------
alter table public.project_modules enable row level security;
alter table public.module_releases enable row level security;
create policy project_modules_owner_select on public.project_modules
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy module_releases_owner_select on public.module_releases
  for select to authenticated using (public.is_tenant_owner(tenant_id));
revoke all on public.project_modules, public.module_releases from anon;
revoke insert, update, delete, truncate on public.project_modules, public.module_releases from authenticated;

-- ---------------------------------------------------------------------
-- 3. Auxiliares
-- ---------------------------------------------------------------------
create or replace function public._ss1_trocar(p_funcao text, p_de text, p_para text)
returns void language plpgsql as $$
declare d text; novo text;
begin
  d := pg_get_functiondef(p_funcao::regprocedure);
  novo := replace(d, p_de, p_para);
  if novo = d then raise exception '%: ponto de troca não encontrado', p_funcao; end if;
  execute novo;
end;
$$;

-- Módulo do dono, travado para mudar.
create or replace function public._modulo_do_dono(p_id uuid)
returns public.project_modules language plpgsql security definer set search_path = public as $$
declare m public.project_modules;
begin
  select * into m from public.project_modules where id = p_id for update;
  if m.id is null or not public.is_tenant_owner(m.tenant_id) then
    raise exception 'modulo_inexistente' using errcode = 'P0002';
  end if;
  return m;
end;
$$;

-- Mensalidade do projeto (mesma regra do Financeiro, uma vez só). Usada pelo gatilho
-- de status e pela 1ª publicação de módulo.
create or replace function public._projeto_criar_mensalidade(p_projeto uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.projects; infra int; f public.finance_settings; inicio date;
begin
  select * into p from public.projects where id = p_projeto;
  if p.id is null or p.plan_name is null or coalesce(p.monthly_cents, 0) <= 0
     or exists (select 1 from public.subscriptions where project_id = p.id) then
    return;
  end if;
  select coalesce((snapshot->'mensalidade'->>'infra_cents')::int, 0) into infra
    from public.proposals where id = p.proposal_id;
  f := public._financas(p.tenant_id);
  inicio := (public._mes_de(public._hoje(p.tenant_id)) + interval '1 month')::date;
  insert into public.subscriptions (tenant_id, client_id, project_id, plan_name, amount_cents, start_month, due_day, min_months)
  values (p.tenant_id, p.client_id, p.id, p.plan_name, least(p.monthly_cents + coalesce(infra, 0), 100000000),
          inicio, f.due_day,
          coalesce((select min_months from public.pricing_plans where tenant_id = p.tenant_id and name = p.plan_name), 6));
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'mensalidade_criada',
    jsonb_build_object('plano', p.plan_name, 'inicio', inicio), 'hub', 'financeiro.mensalidade_criada');
end;
$$;

create or replace function public.projects_cria_mensalidade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'mensalidade' and old.status is distinct from 'mensalidade' then
    perform public._projeto_criar_mensalidade(new.id);
  end if;
  return new;
end;
$$;

-- Módulos em JSON. p_hub = verdadeiro traz o que só o dono vê (link de testes, rodadas, caminho).
create or replace function public._modulos_json(p_projeto uuid, p_hub boolean)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id, 'nome', m.name, 'ordem', m.position, 'situacao', m.status,
      'no_ar_desde', m.live_since, 'ultima_versao', m.last_release_at,
      'link', case when m.live_since is not null then m.prod_url end,
      'versoes', (select coalesce(jsonb_agg(jsonb_build_object('notas', r.notes, 'quando', r.published_at)
                                            order by r.published_at desc), '[]'::jsonb)
                    from (select * from public.module_releases where module_id = m.id
                           order by published_at desc limit 10) r))
    || case when p_hub then jsonb_build_object(
         'caminho', m.path, 'link_testes', m.test_url, 'link_producao', m.prod_url, 'rodadas', m.rounds,
         'aprovacao', (select jsonb_build_object('id', a.id, 'enviada_em', a.sent_at) from public.approvals a
                        where a.module_id = m.id and a.status = 'aguardando'),
         'ultimo_ajuste', (select jsonb_build_object('comentario', a.decision_note, 'quando', a.decided_at)
                            from public.approvals a where a.module_id = m.id and a.status = 'ajuste'
                           order by a.decided_at desc limit 1))
       else '{}'::jsonb end
    order by m.position), '[]'::jsonb)
  from public.project_modules m
  where m.project_id = p_projeto and (p_hub or m.status <> 'fora_do_escopo');
$$;

-- Depois de publicar ou tirar do escopo: se todos os módulos estão no ar ou fora (e há pelo menos
-- um no ar), marca a publicação final uma vez (início da garantia).
create or replace function public._projeto_final(p_projeto uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.projects;
begin
  select * into p from public.projects where id = p_projeto for update;
  if p.final_release_at is not null then return; end if;
  if exists (select 1 from public.project_modules where project_id = p.id and status = 'publicado')
     and not exists (select 1 from public.project_modules where project_id = p.id
                      and status not in ('publicado', 'fora_do_escopo')) then
    update public.projects
       set final_release_at = (select max(last_release_at) from public.project_modules where project_id = p.id),
           launched_at = coalesce(launched_at, now())
     where id = p.id;
    perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'publicacao_final', '{}'::jsonb, 'hub',
      'projeto.publicacao_final');
  end if;
end;
$$;

-- Módulo novo ou que voltou ao escopo depois da publicação final: a data sai (com evento) e é
-- marcada de novo quando tudo estiver no ar outra vez.
create or replace function public._projeto_reabrir_final(p_projeto uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.projects;
begin
  select * into p from public.projects where id = p_projeto for update;
  if p.final_release_at is null then return; end if;
  update public.projects set final_release_at = null where id = p.id;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'publicacao_final_reaberta',
    jsonb_build_object('antes', p.final_release_at), 'hub', null);
end;
$$;

revoke all on function public._projeto_reabrir_final(uuid) from public, anon, authenticated;
revoke all on function public._ss1_trocar(text, text, text) from public, anon, authenticated;
revoke all on function public._modulo_do_dono(uuid) from public, anon, authenticated;
revoke all on function public._projeto_criar_mensalidade(uuid) from public, anon, authenticated;
revoke all on function public.projects_cria_mensalidade() from public, anon, authenticated;
revoke all on function public._modulos_json(uuid, boolean) from public, anon, authenticated;
revoke all on function public._projeto_final(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. RPCs do Hub (dono)
-- ---------------------------------------------------------------------
-- Tipo do projeto. Para "sob medida", só sem fase concluída; para "padrão", só sem módulos.
create or replace function public.projeto_tipo_definir(p_projeto uuid, p_tipo public.project_kind)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_projeto);
begin
  if p.kind = p_tipo then return jsonb_build_object('tipo', p_tipo); end if;
  if p_tipo = 'sob_medida' and exists (select 1 from public.project_phases where project_id = p.id and status = 'concluida') then
    raise exception 'fases_concluidas' using errcode = '22023';
  end if;
  if p_tipo = 'padrao' and exists (select 1 from public.project_modules where project_id = p.id) then
    raise exception 'tem_modulos' using errcode = '22023';
  end if;
  update public.projects set kind = p_tipo where id = p.id;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'tipo_definido',
    jsonb_build_object('tipo', p_tipo), 'hub', null);
  return jsonb_build_object('tipo', p_tipo);
end;
$$;

create or replace function public.modulo_criar(p_projeto uuid, p_nome text, p_caminho public.module_path default 'homologacao')
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_projeto); m public.project_modules;
begin
  if p.kind <> 'sob_medida' then raise exception 'projeto_nao_sob_medida' using errcode = '22023'; end if;
  if length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_obrigatorio' using errcode = '22023'; end if;
  perform 1 from public.projects where id = p.id for update;
  insert into public.project_modules (tenant_id, project_id, position, name, path)
  values (p.tenant_id, p.id,
          coalesce((select max(position) from public.project_modules where project_id = p.id), 0) + 1,
          left(trim(p_nome), 60), coalesce(p_caminho, 'homologacao'))
  returning * into m;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'modulo_criado',
    jsonb_build_object('modulo_id', m.id, 'nome', m.name), 'hub', null);
  perform public._projeto_reabrir_final(p.id);
  return jsonb_build_object('id', m.id);
end;
$$;

-- O caminho só muda enquanto o módulo está planejado e nunca pediu aprovação: assim a troca
-- para "publicação direta" não serve para pular um ajuste pedido pelo cliente.
create or replace function public.modulo_editar(p_id uuid, p_nome text, p_caminho public.module_path)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.project_modules := public._modulo_do_dono(p_id); p public.projects;
begin
  if length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_obrigatorio' using errcode = '22023'; end if;
  if p_caminho is not null and p_caminho <> m.path then
    if m.status <> 'planejado' or m.live_since is not null
       or exists (select 1 from public.approvals where module_id = m.id) then
      raise exception 'caminho_travado' using errcode = '22023';
    end if;
    select * into p from public.projects where id = m.project_id;
    perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'modulo_caminho_alterado',
      jsonb_build_object('modulo_id', m.id, 'nome', m.name, 'caminho', p_caminho), 'hub', null);
  end if;
  update public.project_modules set name = left(trim(p_nome), 60), path = coalesce(p_caminho, path) where id = m.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- Movimentos do dono. Aprovação, aprovado e publicado têm caminho próprio (pedir, cliente, publicar).
create or replace function public.modulo_mover(p_id uuid, p_situacao public.module_status, p_link_testes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.project_modules := public._modulo_do_dono(p_id); p public.projects; link text := nullif(trim(coalesce(p_link_testes, '')), '');
begin
  select * into p from public.projects where id = m.project_id;
  if not (
       (m.status = 'planejado' and p_situacao in ('desenvolvimento', 'fora_do_escopo'))
    or (m.status = 'desenvolvimento' and p_situacao in ('testes', 'planejado', 'fora_do_escopo'))
    or (m.status = 'testes' and p_situacao in ('desenvolvimento', 'fora_do_escopo'))
    or (m.status = 'aprovado' and p_situacao = 'desenvolvimento')
    or (m.status = 'publicado' and p_situacao = 'desenvolvimento')
    or (m.status = 'fora_do_escopo' and p_situacao = 'planejado')) then
    raise exception 'movimento_invalido' using errcode = '22023';
  end if;
  if p_situacao = 'fora_do_escopo' and m.live_since is not null then
    raise exception 'modulo_no_ar' using errcode = '22023';
  end if;
  if link is not null and (link !~ '^https://[^\s]{3,}$' or length(link) > 500) then
    raise exception 'link_invalido' using errcode = '22023';
  end if;
  update public.project_modules
     set status = p_situacao, test_url = case when p_situacao = 'testes' then coalesce(link, test_url) else test_url end
   where id = m.id returning * into m;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'modulo_movido',
    jsonb_build_object('modulo_id', m.id, 'nome', m.name, 'situacao', p_situacao), 'hub', null);
  if p_situacao = 'fora_do_escopo' then perform public._projeto_final(p.id); end if;
  if p_situacao = 'planejado' and m.status = 'planejado' then perform public._projeto_reabrir_final(p.id); end if;
  return jsonb_build_object('situacao', m.status);
end;
$$;

-- Pedido de aprovação do módulo (caminho com homologação), usando as Aprovações do projeto.
create or replace function public.modulo_pedir_aprovacao(p_id uuid, p_descricao text default null,
                                                         p_itens text[] default null, p_previa text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.project_modules := public._modulo_do_dono(p_id); r jsonb;
begin
  if m.path <> 'homologacao' then raise exception 'caminho_direto' using errcode = '22023'; end if;
  if m.status <> 'testes' then raise exception 'movimento_invalido' using errcode = '22023'; end if;
  r := public.aprovacao_pedir(m.project_id, 'Módulo ' || m.name, p_descricao, p_itens,
                              coalesce(nullif(trim(coalesce(p_previa, '')), ''), m.test_url), null);
  update public.approvals set module_id = m.id where id = (r ->> 'id')::uuid;
  update public.project_modules set status = 'aguardando_aprovacao' where id = m.id;
  return r;
end;
$$;

-- Publicar: com homologação, só aprovado; direta, a partir de desenvolvimento, testes ou aprovado.
create or replace function public.modulo_publicar(p_id uuid, p_notas text, p_link text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.project_modules := public._modulo_do_dono(p_id);
  p public.projects;
  link text := nullif(trim(coalesce(p_link, '')), '');
  aprov uuid;
  tinha_mensalidade boolean;
begin
  select * into p from public.projects where id = m.project_id for update;
  if m.path = 'homologacao' and m.status <> 'aprovado' then
    raise exception 'precisa_aprovacao' using errcode = '22023';
  end if;
  if m.path = 'direta' and m.status not in ('desenvolvimento', 'testes', 'aprovado') then
    raise exception 'movimento_invalido' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_notas, ''))) < 5 then raise exception 'notas_obrigatorias' using errcode = '22023'; end if;
  link := coalesce(link, m.prod_url);
  if link is not null and (link !~ '^https://[^\s]{3,}$' or length(link) > 500) then
    raise exception 'link_invalido' using errcode = '22023';
  end if;
  select id into aprov from public.approvals where module_id = m.id and status = 'aprovada' order by decided_at desc limit 1;
  tinha_mensalidade := exists (select 1 from public.subscriptions where project_id = p.id);

  insert into public.module_releases (tenant_id, project_id, module_id, notes, url, path, approval_id, published_by)
  values (m.tenant_id, p.id, m.id, left(trim(p_notas), 2000), link, m.path,
          case when m.path = 'homologacao' then aprov end, auth.uid());
  update public.project_modules
     set status = 'publicado', prod_url = link, live_since = coalesce(live_since, now()), last_release_at = now()
   where id = m.id returning * into m;

  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'modulo_publicado',
    jsonb_build_object('modulo_id', m.id, 'nome', m.name), 'hub', 'modulo.publicado');
  -- Mensalidade nasce com o 1º módulo no ar (ou na próxima publicação, se o plano entrou depois).
  perform public._projeto_criar_mensalidade(p.id);
  perform public._projeto_final(p.id);
  return jsonb_build_object('situacao', m.status, 'mensalidade_iniciada',
    not tinha_mensalidade and exists (select 1 from public.subscriptions where project_id = p.id));
end;
$$;

revoke all on function public.projeto_tipo_definir(uuid, public.project_kind) from public, anon;
revoke all on function public.modulo_criar(uuid, text, public.module_path) from public, anon;
revoke all on function public.modulo_editar(uuid, text, public.module_path) from public, anon;
revoke all on function public.modulo_mover(uuid, public.module_status, text) from public, anon;
revoke all on function public.modulo_pedir_aprovacao(uuid, text, text[], text) from public, anon;
revoke all on function public.modulo_publicar(uuid, text, text) from public, anon;
grant execute on function public.projeto_tipo_definir(uuid, public.project_kind) to authenticated;
grant execute on function public.modulo_criar(uuid, text, public.module_path) to authenticated;
grant execute on function public.modulo_editar(uuid, text, public.module_path) to authenticated;
grant execute on function public.modulo_mover(uuid, public.module_status, text) to authenticated;
grant execute on function public.modulo_pedir_aprovacao(uuid, text, text[], text) to authenticated;
grant execute on function public.modulo_publicar(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Aprovações existentes passam a mover o módulo
-- ---------------------------------------------------------------------
select public._ss1_trocar('public.portal_aprovar(uuid, text)',
  '  if a.phase_id is not null then perform public._fase_concluir(a.phase_id); end if;',
  '  if a.phase_id is not null then perform public._fase_concluir(a.phase_id); end if;
  if a.module_id is not null then
    update public.project_modules set status = ''aprovado'' where id = a.module_id and status = ''aguardando_aprovacao'';
    insert into public.event_outbox (tenant_id, event, payload)
    values (a.tenant_id, ''modulo.aprovado'', jsonb_build_object(''client_id'', a.client_id, ''project_id'', a.project_id,
                                                                ''module_id'', a.module_id, ''aprovacao_id'', a.id));
  end if;');

select public._ss1_trocar('public.portal_pedir_ajuste(uuid, text)',
  '   where id = a.id returning * into a;',
  '   where id = a.id returning * into a;
  if a.module_id is not null then
    update public.project_modules set status = ''desenvolvimento'', rounds = rounds + 1
     where id = a.module_id and status = ''aguardando_aprovacao'';
    insert into public.event_outbox (tenant_id, event, payload)
    select a.tenant_id, e, jsonb_build_object(''client_id'', a.client_id, ''project_id'', a.project_id,
                                              ''module_id'', a.module_id, ''rodadas'', pm.rounds)
      from public.project_modules pm,
           unnest(case when pm.rounds >= 3 then array[''modulo.ajuste'', ''modulo.rodadas_demais'']
                       else array[''modulo.ajuste''] end) e
     where pm.id = a.module_id;
  end if;');

select public._ss1_trocar('public.aprovacao_cancelar(uuid)',
  '  update public.approvals set status = ''cancelada'', decided_at = now() where id = a.id;',
  '  update public.approvals set status = ''cancelada'', decided_at = now() where id = a.id;
  if a.module_id is not null then
    update public.project_modules set status = ''testes'' where id = a.module_id and status = ''aguardando_aprovacao'';
  end if;');

-- ---------------------------------------------------------------------
-- 6. Hub e portal leem os módulos
-- ---------------------------------------------------------------------
select public._ss1_trocar('public.projeto_detalhe(uuid)',
  '    ''fases'', (select coalesce(jsonb_agg(to_jsonb(f) - ''tenant_id'' order by f.position), ''[]''::jsonb)',
  '    ''modulos'', public._modulos_json(p.id, true),
    ''fases'', (select coalesce(jsonb_agg(to_jsonb(f) - ''tenant_id'' order by f.position), ''[]''::jsonb)');

select public._ss1_trocar('public.portal_inicio(uuid)',
  '        ''fases'', (select coalesce(jsonb_agg(jsonb_build_object(''nome'', f.name',
  '        ''tipo'', p.kind,
        ''modulos'', case when p.kind = ''sob_medida'' then public._modulos_json(p.id, false) else ''[]''::jsonb end,
        ''fases'', (select coalesce(jsonb_agg(jsonb_build_object(''nome'', f.name');

select public._ss1_trocar('public.projeto_cancelar(uuid, text)',
  '  update public.approvals set status = ''cancelada'' where project_id = p.id and status = ''aguardando'';',
  '  update public.approvals set status = ''cancelada'' where project_id = p.id and status = ''aguardando'';
  update public.project_modules set status = ''testes'' where project_id = p.id and status = ''aguardando_aprovacao'';');

drop function public._ss1_trocar(text, text, text);
