-- =====================================================================
-- Hub Fora do Papel · RD2-8 · Sites: a central dos sites que entregamos
-- Card: docs/cards/RD2-8-sites-dos-clientes.md
-- 1. Último acesso de cada pessoa ao portal (client_members.last_seen_at, RPC portal_visto).
-- 2. "No ar" automático quando o projeto do cliente é lançado.
-- 3. sites_resumo(): lista com situação, primeira seção da página inicial, números e avisos.
-- 4. site_atividade(): o que cada pessoa fez no site, e quem usa o painel.
-- 5. Ver como o cliente: o dono LÊ o portal do cliente (espelho), com registro de quem abriu.
--    Só as funções de leitura aceitam o espelho; as que gravam continuam só para pessoas do portal.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Último acesso ao portal
-- ---------------------------------------------------------------------
alter table public.client_members add column if not exists last_seen_at timestamptz;

-- Chamado pelo portal ao abrir; grava no máximo uma vez a cada 10 minutos por pessoa
create or replace function public.portal_visto()
returns void language sql security definer set search_path = public as $$
  update public.client_members
     set last_seen_at = now()
   where user_id = auth.uid()
     and (last_seen_at is null or last_seen_at < now() - interval '10 minutes');
$$;
revoke all on function public.portal_visto() from public, anon;
grant execute on function public.portal_visto() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Projeto lançado → site do cliente no ar
-- ---------------------------------------------------------------------
create or replace function public._site_no_ar_ao_lancar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.launched_at is null and new.launched_at is not null then
    update public.sites set no_ar = true
     where client_id = new.client_id and tenant_id = new.tenant_id and not no_ar;
  end if;
  return new;
end;
$$;
revoke all on function public._site_no_ar_ao_lancar() from public, anon, authenticated;
drop trigger if exists projects_site_no_ar on public.projects;
create trigger projects_site_no_ar after update of launched_at on public.projects
  for each row execute function public._site_no_ar_ao_lancar();

-- ---------------------------------------------------------------------
-- 3. sites_resumo()
-- ---------------------------------------------------------------------
create or replace function public.sites_resumo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tenant uuid := public._tenant_do_dono(); itens jsonb;
  publicar text[] := array['site.artigo_publicado', 'site.pagina_publicada', 'site.bloco_publicado',
                           'site.midia_enviada', 'site.negocio_atualizado'];
begin
  with base as (
    select s.*, c.company_name as empresa, c.logo_path,
      (select p from public.projects p where p.client_id = s.client_id and p.status = 'andamento'
        order by p.launch_date nulls last, p.started_at limit 1) as proj,
      (select count(*) from public.site_cliente_contatos k
        where k.site_id = s.id and k.origem = 'formulario' and not k.respondido) as sem_resposta,
      (select min(k.criado_em) from public.site_cliente_contatos k
        where k.site_id = s.id and k.origem = 'formulario' and not k.respondido) as sem_resposta_desde,
      (select max(m.last_seen_at) from public.client_members m where m.client_id = s.client_id) as ultimo_acesso,
      (select count(*) from public.client_members m where m.client_id = s.client_id) as pessoas,
      (select count(*) from public.site_artigos a
        where a.site_id = s.id and a.situacao = 'rascunho' and a.atualizado_em < now() - interval '7 days') as rascunho_parado
    from public.sites s
    left join public.clients c on c.id = s.client_id
    where s.tenant_id = v_tenant
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'nome', b.nome, 'dominio', b.dominio, 'client_id', b.client_id, 'empresa', b.empresa,
      'logo_path', b.logo_path, 'no_ar', b.no_ar, 'modulos', to_jsonb(b.modulos),
      'situacao', case when b.no_ar then 'no_ar' when (b.proj).id is not null then 'construcao' else 'fora' end,
      'projeto', case when (b.proj).id is null then null else jsonb_build_object(
          'id', (b.proj).id, 'vai_ao_ar', (b.proj).launch_date,
          'fase_posicao', (select f.position from public.project_phases f
                            where f.project_id = (b.proj).id and f.status <> 'concluida' order by f.position limit 1),
          'fase_nome', (select f.name from public.project_phases f
                         where f.project_id = (b.proj).id and f.status <> 'concluida' order by f.position limit 1),
          'fases_total', (select count(*) from public.project_phases f where f.project_id = (b.proj).id)) end,
      -- Primeira seção publicada da página inicial (sites do editor de páginas) ou o topo (site da Fora do Papel)
      'capa', coalesce(
          (select jsonb_build_object('tipo', 'secao', 'secao', pg.publicado -> 'content' -> 0,
                                     'cor', pg.publicado -> 'root' -> 'props' ->> 'cor')
             from public.site_paginas pg
            where pg.site_id = b.id and pg.caminho = '/' and pg.publicado is not null
              and jsonb_array_length(coalesce(pg.publicado -> 'content', '[]'::jsonb)) > 0),
          (select jsonb_build_object('tipo', 'topo', 'topo', bl.valor)
             from public.site_blocos bl
            where bl.site_id = b.id and bl.chave = 'inicio.topo' and bl.situacao = 'publicado')),
      'artigos', (select count(*) from public.site_artigos a where a.site_id = b.id and a.situacao = 'publicado'),
      'contatos_mes', (select count(*) from public.site_cliente_contatos k
                        where k.site_id = b.id and k.criado_em >= date_trunc('month', now())),
      'sem_resposta', b.sem_resposta,
      'sem_resposta_desde', b.sem_resposta_desde,
      'publicacoes_cliente_30d', (select count(*) from public.event_outbox e
                                   where e.tenant_id = v_tenant and e.payload ->> 'site_id' = b.id::text
                                     and e.event = any (publicar) and e.payload ->> 'quem' = 'cliente'
                                     and e.occurred_at > now() - interval '30 days'),
      'ultima_publicacao', (select max(e.occurred_at) from public.event_outbox e
                             where e.tenant_id = v_tenant and e.payload ->> 'site_id' = b.id::text
                               and e.event = any (publicar)),
      'pedidos_abertos', (select count(*) from public.requests r
                           where r.site_id = b.id and r.status not in ('pronto', 'recusado')),
      'pessoas', b.pessoas,
      'ultimo_acesso', b.ultimo_acesso,
      'avisos', to_jsonb(array_remove(array[
          case when b.sem_resposta > 0 and b.sem_resposta_desde < now() - interval '2 days' then 'contato_parado' end,
          case when b.client_id is not null and b.pessoas > 0
                and coalesce(b.ultimo_acesso, '-infinity') < now() - interval '14 days' then 'cliente_sumido' end,
          case when b.rascunho_parado > 0 then 'rascunho_parado' end], null))
    ) order by (b.client_id is not null), b.nome), '[]'::jsonb)
    into itens from base b;

  return jsonb_build_object(
    'itens', itens,
    'resumo', jsonb_build_object(
      'total', jsonb_array_length(itens),
      'no_ar', (select count(*) from jsonb_array_elements(itens) i where i ->> 'situacao' = 'no_ar'),
      'construcao', (select count(*) from jsonb_array_elements(itens) i where i ->> 'situacao' = 'construcao'),
      'atencao', (select count(*) from jsonb_array_elements(itens) i where jsonb_array_length(i -> 'avisos') > 0),
      'sem_resposta', (select coalesce(sum((i ->> 'sem_resposta')::int), 0) from jsonb_array_elements(itens) i),
      'sem_resposta_desde', (select min((i ->> 'sem_resposta_desde')::timestamptz) from jsonb_array_elements(itens) i),
      'publicacoes_cliente_30d', (select coalesce(sum((i ->> 'publicacoes_cliente_30d')::int), 0) from jsonb_array_elements(itens) i),
      'pedidos_abertos', (select coalesce(sum((i ->> 'pedidos_abertos')::int), 0) from jsonb_array_elements(itens) i)));
end;
$$;
revoke all on function public.sites_resumo() from public, anon;
grant execute on function public.sites_resumo() to authenticated;

-- ---------------------------------------------------------------------
-- 4. site_atividade(): o que cada pessoa fez no site e quem usa o painel
-- ---------------------------------------------------------------------
create or replace function public.site_atividade(p_site uuid, p_dias int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tenant uuid := public._tenant_do_dono(); s public.sites; dias int := least(greatest(coalesce(p_dias, 30), 1), 180);
begin
  select * into s from public.sites where id = p_site and tenant_id = v_tenant;
  if s.id is null then raise exception 'site_nao_encontrado' using errcode = 'P0002'; end if;
  return jsonb_build_object(
    'itens', coalesce((
      select jsonb_agg(x order by (x ->> 'quando') desc) from (
        select jsonb_build_object(
          'evento', e.event, 'quando', e.occurred_at, 'quem', e.payload ->> 'quem',
          'nome', coalesce(nullif(trim(pr.full_name), ''), split_part(u.email, '@', 1)),
          'titulo', coalesce(e.payload ->> 'titulo', a.titulo, pg.titulo),
          'caminho', coalesce(e.payload ->> 'caminho', pg.caminho)) as x
          from public.event_outbox e
          left join public.profiles pr on pr.id = (e.payload ->> 'por')::uuid
          left join auth.users u on u.id = (e.payload ->> 'por')::uuid
          left join public.site_artigos a on a.id::text = e.payload ->> 'artigo_id'
          left join lateral (select p2.caminho, p2.nome as titulo from public.site_paginas p2
                              where p2.id::text = e.payload ->> 'pagina_id') pg on true
         where e.tenant_id = v_tenant and e.payload ->> 'site_id' = s.id::text
           and e.event like 'site.%' and e.event not in ('site.artigo_salvo', 'site.bloco_salvo', 'site.contato_recebido')
           and e.occurred_at > now() - make_interval(days => dias)
         order by e.occurred_at desc limit 60) t), '[]'::jsonb),
    'pessoas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'nome', coalesce(nullif(trim(pr.full_name), ''), split_part(u.email, '@', 1)),
               'perfil', m.profile, 'ultimo_acesso', m.last_seen_at) order by m.last_seen_at desc nulls last)
        from public.client_members m
        left join public.profiles pr on pr.id = m.user_id
        left join auth.users u on u.id = m.user_id
       where s.client_id is not null and m.client_id = s.client_id), '[]'::jsonb),
    'contatos', jsonb_build_object(
      'mes', (select count(*) from public.site_cliente_contatos k where k.site_id = s.id and k.criado_em >= date_trunc('month', now())),
      'formulario', (select count(*) from public.site_cliente_contatos k where k.site_id = s.id and k.origem = 'formulario' and k.criado_em >= date_trunc('month', now())),
      'whatsapp', (select count(*) from public.site_cliente_contatos k where k.site_id = s.id and k.origem = 'whatsapp' and k.criado_em >= date_trunc('month', now())),
      'sem_resposta', (select count(*) from public.site_cliente_contatos k where k.site_id = s.id and k.origem = 'formulario' and not k.respondido)),
    'fotos_sem_descricao', (select count(*) from storage.objects o
                             left join public.site_midia m on m.caminho = o.name
                            where o.bucket_id = 'site-midia' and o.name like s.id::text || '/%'
                              and coalesce(m.descricao, '') = ''),
    'rascunhos', (select count(*) from public.site_artigos a where a.site_id = s.id and a.situacao = 'rascunho'));
end;
$$;
revoke all on function public.site_atividade(uuid, int) from public, anon;
grant execute on function public.site_atividade(uuid, int) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Ver como o cliente (espelho em modo leitura)
-- ---------------------------------------------------------------------
create table if not exists public.portal_espelhos (
  id         bigint generated always as identity primary key,
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  user_id    uuid not null,
  client_id  uuid not null references public.clients (id) on delete cascade,
  perfil     text not null check (perfil in ('responsavel', 'equipe')),
  aberto_em  timestamptz not null default now()
);
create index if not exists portal_espelhos_busca_idx on public.portal_espelhos (user_id, client_id, aberto_em desc);
alter table public.portal_espelhos enable row level security;
create policy portal_espelhos_dono_le on public.portal_espelhos for select to authenticated
  using (public.is_tenant_owner(tenant_id));
revoke all on public.portal_espelhos from anon;
revoke insert, update, delete, truncate on public.portal_espelhos from authenticated;

-- O dono abre (ou troca o perfil do) espelho de um cliente do próprio tenant. Fica registrado.
create or replace function public.portal_espelho_abrir(p_cliente uuid, p_perfil text default 'responsavel')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tenant uuid := public._tenant_do_dono(); c public.clients;
begin
  if coalesce(p_perfil, '') not in ('responsavel', 'equipe') then
    raise exception 'perfil_invalido' using errcode = '22023';
  end if;
  select * into c from public.clients where id = p_cliente and tenant_id = v_tenant;
  if c.id is null then raise exception 'cliente_nao_encontrado' using errcode = 'P0002'; end if;
  insert into public.portal_espelhos (tenant_id, user_id, client_id, perfil)
  values (v_tenant, auth.uid(), c.id, p_perfil);
  insert into public.event_outbox (tenant_id, event, payload)
  values (v_tenant, 'portal.espelho_aberto', jsonb_build_object('client_id', c.id, 'por', auth.uid(), 'perfil', p_perfil));
  return jsonb_build_object('cliente', c.id, 'empresa', c.company_name, 'perfil', p_perfil);
end;
$$;
revoke all on function public.portal_espelho_abrir(uuid, text) from public, anon;
grant execute on function public.portal_espelho_abrir(uuid, text) to authenticated;

-- Perfil do espelho aberto pelo dono nas últimas 12 horas (null = sem espelho válido).
-- Confere de novo se a pessoa ainda é dona do tenant do cliente e está com o código (aal2).
create or replace function public._portal_espelho_perfil(p_cliente uuid)
returns text language sql stable security definer set search_path = public as $$
  select e.perfil from public.portal_espelhos e
    join public.clients c on c.id = e.client_id
   where e.user_id = auth.uid() and e.client_id = p_cliente
     and e.aberto_em > now() - interval '12 hours'
     and public.is_tenant_owner(c.tenant_id) and public._sessao_forte()
   order by e.id desc limit 1;
$$;
revoke all on function public._portal_espelho_perfil(uuid) from public, anon, authenticated;

-- Cliente do portal para LEITURA: a pessoa do portal (como antes) ou o dono com espelho aberto.
create or replace function public._portal_cliente_leitura(p_cliente uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare c uuid;
begin
  select client_id into c from public.client_members
   where user_id = auth.uid() and (p_cliente is null or client_id = p_cliente)
   order by created_at limit 1;
  if c is not null then return c; end if;
  if p_cliente is not null and public._portal_espelho_perfil(p_cliente) is not null then return p_cliente; end if;
  raise exception 'sem_permissao' using errcode = '42501';
end;
$$;
revoke all on function public._portal_cliente_leitura(uuid) from public, anon, authenticated;

create or replace function public._portal_responsavel_leitura(p_cliente uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public._portal_responsavel(p_cliente)
      or (not exists (select 1 from public.client_members where client_id = p_cliente and user_id = auth.uid())
          and public._portal_espelho_perfil(p_cliente) = 'responsavel');
$$;
revoke all on function public._portal_responsavel_leitura(uuid) from public, anon, authenticated;

create or replace function public._portal_pode_aprovar_leitura(p_cliente uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public._portal_pode_aprovar(p_cliente)
      or (not exists (select 1 from public.client_members where client_id = p_cliente and user_id = auth.uid())
          and public._portal_espelho_perfil(p_cliente) = 'responsavel');
$$;
revoke all on function public._portal_pode_aprovar_leitura(uuid) from public, anon, authenticated;

-- As funções de LEITURA do portal passam a aceitar o espelho (troca pontual no corpo).
-- As que gravam (aprovar, pedir ajuste, decidir adicional, avisar pagamento, criar pedido,
-- preparar arquivo, pendência feita, responder contato) continuam com _portal_cliente: o dono não age como o cliente.
do $$
declare f text; d text; novo text;
begin
  foreach f in array array['portal_pendencias(uuid)', 'portal_inicio(uuid)', 'portal_aprovacoes(uuid)',
                           'portal_pedidos(uuid)', 'portal_pagamentos(uuid)', 'portal_arquivos(uuid)',
                           'portal_sites(uuid)'] loop
    d := pg_get_functiondef(('public.' || f)::regprocedure);
    novo := replace(d, 'public._portal_cliente(p_cliente)', 'public._portal_cliente_leitura(p_cliente)');
    if novo = d then raise exception '%: ponto de troca não encontrado', f; end if;
    novo := replace(novo, 'public._portal_responsavel(c)', 'public._portal_responsavel_leitura(c)');
    novo := replace(novo, 'public._portal_pode_aprovar(c)', 'public._portal_pode_aprovar_leitura(c)');
    -- Trava: nenhuma regra de perfil pode ter ficado de fora da troca (senão o espelho como equipe veria valores)
    if novo ~ '_portal_responsavel\(' or novo ~ '_portal_pode_aprovar\(' or novo ~ 'profile\s*=' then
      raise exception '%: regra de perfil não coberta pelo espelho', f;
    end if;
    execute novo;
  end loop;
end $$;

-- Empresa do portal para o espelho (a versão sem argumento continua a de sempre)
create or replace function public.portal_minha_empresa(p_cliente uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid := public._portal_cliente_leitura(p_cliente); perfil text;
begin
  select cm.profile into perfil from public.client_members cm where cm.client_id = c and cm.user_id = auth.uid();
  perfil := coalesce(perfil, public._portal_espelho_perfil(c));
  return (select jsonb_build_object('id', x.id, 'empresa', x.company_name, 'contato', x.contact_name,
                                    'perfil', perfil, 'espelho', not exists (
                                      select 1 from public.client_members m where m.client_id = c and m.user_id = auth.uid()))
            from public.clients x where x.id = c);
end;
$$;
revoke all on function public.portal_minha_empresa(uuid) from public, anon;
grant execute on function public.portal_minha_empresa(uuid) to authenticated;
