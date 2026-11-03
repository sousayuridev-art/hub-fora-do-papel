-- =====================================================================
-- Hub Fora do Papel · SIS-1 · Sistemas sob medida (menu Entregar > Sistemas)
-- Card: docs/cards/SIS-1-sistemas.md
-- 1. sistemas: o que entregamos e está (ou vai estar) rodando para o cliente.
-- 2. sistema_servicos: o que mantém o sistema no ar (fornecedor, custo, quem paga, vencimento).
--    Nunca senhas nem chaves: só nome, para que serve e o endereço do painel.
-- 3. RPCs de escrita (só o dono, com código) e sistemas_resumo() com números e avisos prontos.
-- Imagem da tela principal: bucket privado logos-clientes, caminho {client_id}/sistema-*.{webp|png|jpg}
-- (as policies do RD2-5 já limitam ao dono do cliente).
-- =====================================================================

create table public.sistemas (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  client_id     uuid not null references public.clients (id) on delete restrict,
  project_id    uuid references public.projects (id) on delete set null,
  nome          text not null check (length(trim(nome)) between 2 and 80),
  descricao     text check (descricao is null or length(descricao) <= 600),
  situacao      text not null default 'construcao'
                check (situacao in ('construcao', 'teste', 'no_ar', 'pausado')),
  url_producao  text check (url_producao is null or (url_producao ~ '^https://[^\s]+$' and length(url_producao) <= 300)),
  url_teste     text check (url_teste is null or (url_teste ~ '^https://[^\s]+$' and length(url_teste) <= 300)),
  capa_path     text check (capa_path is null or capa_path ~ '^[0-9a-f-]{36}/sistema-[A-Za-z0-9._-]{1,100}\.(jpe?g|png|webp)$'),
  no_ar_desde   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index sistemas_tenant_idx on public.sistemas (tenant_id);
create index sistemas_client_idx on public.sistemas (client_id);
create unique index sistemas_projeto_unico on public.sistemas (project_id) where project_id is not null;

create table public.sistema_servicos (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  sistema_id  uuid not null references public.sistemas (id) on delete cascade,
  nome        text not null check (length(trim(nome)) between 2 and 60),
  para_que    text check (para_que is null or length(para_que) <= 140),
  custo_cents integer check (custo_cents is null or custo_cents between 0 and 10000000),
  quem_paga   text not null default 'nos' check (quem_paga in ('nos', 'cliente')),
  vence_em    date,
  painel_url  text check (painel_url is null or (painel_url ~ '^https://[^\s]+$' and length(painel_url) <= 300)),
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);
create index sistema_servicos_sistema_idx on public.sistema_servicos (sistema_id, ordem);
create index sistema_servicos_tenant_idx on public.sistema_servicos (tenant_id);

alter table public.sistemas enable row level security;
alter table public.sistema_servicos enable row level security;
create policy sistemas_dono_ler on public.sistemas
  for select to authenticated using (public.is_tenant_owner(tenant_id));
create policy sistema_servicos_dono_ler on public.sistema_servicos
  for select to authenticated using (public.is_tenant_owner(tenant_id));
-- Escrita só pelas RPCs (validam tenant, código do app e gravam o evento)
revoke insert, update, delete, truncate on public.sistemas, public.sistema_servicos from anon, authenticated;
revoke select on public.sistemas, public.sistema_servicos from anon;

create trigger sistemas_touch before update on public.sistemas
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Escrita
-- ---------------------------------------------------------------------
create or replace function public._texto_ou_nulo(p text)
returns text language sql immutable as $$
  select nullif(trim(coalesce(p, '')), '');
$$;

create or replace function public.sistema_salvar(p_dados jsonb)
returns public.sistemas language plpgsql volatile security definer set search_path = public as $$
declare
  t uuid := public._tenant_do_dono();
  v_id uuid := nullif(p_dados->>'id', '')::uuid;
  v_cliente uuid := nullif(p_dados->>'client_id', '')::uuid;
  v_projeto uuid := nullif(p_dados->>'project_id', '')::uuid;
  v_sit text := coalesce(nullif(p_dados->>'situacao', ''), 'construcao');
  s public.sistemas;
  antes text;
begin
  if not exists (select 1 from public.clients where id = v_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if v_projeto is not null and not exists (
       select 1 from public.projects where id = v_projeto and tenant_id = t and client_id = v_cliente) then
    raise exception 'projeto_de_outro_cliente' using errcode = '22023';
  end if;
  if v_sit not in ('construcao', 'teste', 'no_ar', 'pausado') then
    raise exception 'situacao_invalida' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.sistemas (tenant_id, client_id, project_id, nome, descricao, situacao,
                                 url_producao, url_teste, no_ar_desde)
    values (t, v_cliente, v_projeto, trim(p_dados->>'nome'), public._texto_ou_nulo(p_dados->>'descricao'), v_sit,
            public._texto_ou_nulo(p_dados->>'url_producao'), public._texto_ou_nulo(p_dados->>'url_teste'),
            case when v_sit = 'no_ar' then coalesce(nullif(p_dados->>'no_ar_desde', '')::date, public._hoje(t)) end)
    returning * into s;
    insert into public.event_outbox (tenant_id, event, payload)
    values (t, 'sistema.criado', jsonb_build_object('sistema_id', s.id, 'client_id', s.client_id, 'situacao', s.situacao));
  else
    select situacao into antes from public.sistemas where id = v_id and tenant_id = t for update;
    if antes is null then raise exception 'sistema_inexistente' using errcode = 'P0002'; end if;
    update public.sistemas set
      client_id = v_cliente, project_id = v_projeto, nome = trim(p_dados->>'nome'),
      descricao = public._texto_ou_nulo(p_dados->>'descricao'), situacao = v_sit,
      url_producao = public._texto_ou_nulo(p_dados->>'url_producao'),
      url_teste = public._texto_ou_nulo(p_dados->>'url_teste'),
      no_ar_desde = case
        when v_sit = 'no_ar' then coalesce(nullif(p_dados->>'no_ar_desde', '')::date, no_ar_desde, public._hoje(t))
        else no_ar_desde end
    where id = v_id returning * into s;
    if antes <> s.situacao then
      insert into public.event_outbox (tenant_id, event, payload)
      values (t, 'sistema.situacao', jsonb_build_object('sistema_id', s.id, 'client_id', s.client_id,
                                                         'de', antes, 'para', s.situacao));
    end if;
  end if;
  return s;
exception when unique_violation then
  raise exception 'projeto_ja_tem_sistema' using errcode = '23505';
end;
$$;

-- Grava (ou tira, com null) a imagem da tela principal. Devolve o caminho anterior para apagar o arquivo.
create or replace function public.sistema_capa(p_sistema uuid, p_caminho text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.sistemas;
begin
  select * into s from public.sistemas where id = p_sistema and tenant_id = t for update;
  if s.id is null then raise exception 'sistema_inexistente' using errcode = 'P0002'; end if;
  if p_caminho is not null and (
       split_part(p_caminho, '/', 1) <> s.client_id::text
       or p_caminho !~ '^[0-9a-f-]{36}/sistema-[A-Za-z0-9._-]{1,100}\.(jpe?g|png|webp)$') then
    raise exception 'caminho_invalido' using errcode = '22023';
  end if;
  update public.sistemas set capa_path = p_caminho where id = s.id;
  return jsonb_build_object('capa_path', p_caminho, 'anterior', s.capa_path);
end;
$$;

create or replace function public.sistema_servico_salvar(p_sistema uuid, p_dados jsonb)
returns public.sistema_servicos language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); v_id uuid := nullif(p_dados->>'id', '')::uuid; r public.sistema_servicos;
begin
  if not exists (select 1 from public.sistemas where id = p_sistema and tenant_id = t) then
    raise exception 'sistema_inexistente' using errcode = 'P0002';
  end if;
  if (select count(*) from public.sistema_servicos where sistema_id = p_sistema) >= 40 and v_id is null then
    raise exception 'servicos_demais' using errcode = '54000';
  end if;
  if v_id is null then
    insert into public.sistema_servicos (tenant_id, sistema_id, nome, para_que, custo_cents, quem_paga, vence_em, painel_url, ordem)
    values (t, p_sistema, trim(p_dados->>'nome'), public._texto_ou_nulo(p_dados->>'para_que'),
            nullif(p_dados->>'custo_cents', '')::integer, coalesce(nullif(p_dados->>'quem_paga', ''), 'nos'),
            nullif(p_dados->>'vence_em', '')::date, public._texto_ou_nulo(p_dados->>'painel_url'),
            coalesce((select max(ordem) + 1 from public.sistema_servicos where sistema_id = p_sistema), 0))
    returning * into r;
  else
    update public.sistema_servicos set
      nome = trim(p_dados->>'nome'), para_que = public._texto_ou_nulo(p_dados->>'para_que'),
      custo_cents = nullif(p_dados->>'custo_cents', '')::integer,
      quem_paga = coalesce(nullif(p_dados->>'quem_paga', ''), 'nos'),
      vence_em = nullif(p_dados->>'vence_em', '')::date, painel_url = public._texto_ou_nulo(p_dados->>'painel_url')
    where id = v_id and sistema_id = p_sistema and tenant_id = t
    returning * into r;
    if r.id is null then raise exception 'servico_inexistente' using errcode = 'P0002'; end if;
  end if;
  return r;
end;
$$;

create or replace function public.sistema_servico_apagar(p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  delete from public.sistema_servicos where id = p_id and tenant_id = t;
  if not found then raise exception 'servico_inexistente' using errcode = 'P0002'; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Leitura: lista com números e avisos prontos
-- ---------------------------------------------------------------------
create or replace function public.sistemas_resumo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); hoje date; itens jsonb;
begin
  hoje := public._hoje(t);
  with base as (
    select s.*, c.company_name as empresa, c.logo_path,
      (select count(*) from public.requests r
        where r.client_id = s.client_id and r.status not in ('pronto', 'recusado')
          and (s.project_id is null or r.project_id = s.project_id or r.project_id is null))::int as pedidos_abertos,
      (select min(r.created_at) from public.requests r
        where r.client_id = s.client_id and r.status not in ('pronto', 'recusado')
          and (s.project_id is null or r.project_id = s.project_id or r.project_id is null)) as pedido_mais_antigo,
      (select coalesce(sum(x.custo_cents), 0) from public.sistema_servicos x
        where x.sistema_id = s.id and x.quem_paga = 'nos')::bigint as custo_nosso_cents,
      (select coalesce(sum(x.custo_cents), 0) from public.sistema_servicos x
        where x.sistema_id = s.id and x.quem_paga = 'cliente')::bigint as custo_cliente_cents,
      (select count(*) from public.sistema_servicos x where x.sistema_id = s.id)::int as servicos,
      (select min(x.vence_em) from public.sistema_servicos x
        where x.sistema_id = s.id and x.vence_em is not null and x.vence_em <= hoje + 30) as vence_em,
      (select coalesce(sum(m.amount_cents), 0) from public.subscriptions m
        where m.client_id = s.client_id and m.status = 'ativa')::bigint as mensalidade_cents,
      (select min(x.due_date) from public.charges x
        where x.client_id = s.client_id and x.status = 'aberta' and x.due_date < hoje) as atrasada_desde,
      (select jsonb_build_object('id', p.id, 'nome', p.name, 'status', p.status,
          'fase_posicao', (select f.position from public.project_phases f
                            where f.project_id = p.id and f.status <> 'concluida' order by f.position limit 1),
          'fase_nome', (select f.name from public.project_phases f
                         where f.project_id = p.id and f.status <> 'concluida' order by f.position limit 1),
          'fases_total', (select count(*) from public.project_phases f where f.project_id = p.id))
         from public.projects p where p.id = s.project_id) as projeto
    from public.sistemas s join public.clients c on c.id = s.client_id
    where s.tenant_id = t
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'nome', b.nome, 'descricao', b.descricao, 'situacao', b.situacao,
      'client_id', b.client_id, 'empresa', b.empresa, 'logo_path', b.logo_path,
      'project_id', b.project_id, 'projeto', b.projeto,
      'url_producao', b.url_producao, 'url_teste', b.url_teste, 'capa_path', b.capa_path,
      'no_ar_desde', b.no_ar_desde, 'atualizado_em', b.updated_at,
      'pedidos_abertos', b.pedidos_abertos, 'servicos', b.servicos,
      'custo_nosso_cents', b.custo_nosso_cents, 'custo_cliente_cents', b.custo_cliente_cents,
      'mensalidade_cents', b.mensalidade_cents,
      'avisos', (
        select coalesce(jsonb_agg(a.aviso order by a.ordem), '[]'::jsonb) from (
          select 1 as ordem, jsonb_build_object('tipo', 'cobranca_atrasada', 'desde', b.atrasada_desde) as aviso
           where b.atrasada_desde is not null
          union all
          select 2, jsonb_build_object('tipo', 'servico_vence', 'em', b.vence_em) where b.vence_em is not null
          union all
          select 3, jsonb_build_object('tipo', 'sem_endereco') where b.situacao = 'no_ar' and b.url_producao is null
          union all
          select 4, jsonb_build_object('tipo', 'pedidos_abertos', 'n', b.pedidos_abertos, 'desde', b.pedido_mais_antigo)
           where b.pedidos_abertos > 0
        ) a)
    ) order by (b.situacao = 'no_ar') desc, b.nome), '[]'::jsonb)
    into itens from base b;

  return jsonb_build_object(
    'itens', itens,
    'resumo', jsonb_build_object(
      'total', jsonb_array_length(itens),
      'no_ar', (select count(*) from jsonb_array_elements(itens) e where e->>'situacao' = 'no_ar'),
      'construcao', (select count(*) from jsonb_array_elements(itens) e where e->>'situacao' in ('construcao', 'teste')),
      'atencao', (select count(*) from jsonb_array_elements(itens) e where jsonb_array_length(e->'avisos') > 0),
      'pedidos_abertos', (select coalesce(sum((e->>'pedidos_abertos')::int), 0) from jsonb_array_elements(itens) e),
      'custo_nosso_cents', (select coalesce(sum((e->>'custo_nosso_cents')::bigint), 0) from jsonb_array_elements(itens) e),
      'mensalidades_cents', (select coalesce(sum(m.amount_cents), 0) from public.subscriptions m
                              where m.tenant_id = t and m.status = 'ativa'
                                and m.client_id in (select client_id from public.sistemas where tenant_id = t))
    ));
end;
$$;

revoke all on function public._texto_ou_nulo(text) from public, anon, authenticated;
revoke all on function public.sistema_salvar(jsonb) from public, anon;
revoke all on function public.sistema_capa(uuid, text) from public, anon;
revoke all on function public.sistema_servico_salvar(uuid, jsonb) from public, anon;
revoke all on function public.sistema_servico_apagar(uuid) from public, anon;
revoke all on function public.sistemas_resumo() from public, anon;
grant execute on function public.sistema_salvar(jsonb) to authenticated;
grant execute on function public.sistema_capa(uuid, text) to authenticated;
grant execute on function public.sistema_servico_salvar(uuid, jsonb) to authenticated;
grant execute on function public.sistema_servico_apagar(uuid) to authenticated;
grant execute on function public.sistemas_resumo() to authenticated;

-- ---------------------------------------------------------------------
-- Plamev: o único sistema sob medida no ar (02/11). Entra se o cliente existir; o resto o Yuri completa.
-- ---------------------------------------------------------------------
insert into public.sistemas (tenant_id, client_id, project_id, nome, situacao, no_ar_desde)
select c.tenant_id, c.id,
       (select p.id from public.projects p where p.client_id = c.id
         order by (p.launched_at is not null) desc, p.started_at desc limit 1),
       'Sistema Plamev', 'no_ar',
       (select p.launched_at::date from public.projects p where p.client_id = c.id and p.launched_at is not null
         order by p.launched_at desc limit 1)
  from public.clients c
 where c.company_name ilike '%plamev%'
   and not exists (select 1 from public.sistemas s where s.client_id = c.id)
 order by c.created_at
 limit 1;
