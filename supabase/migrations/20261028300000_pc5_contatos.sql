-- =====================================================================
-- Hub Fora do Papel · PC-5 · Contatos do site do cliente no painel
-- Card: docs/cards/PC-5-contatos-do-site.md
-- Tabela própria (site_cliente_contatos): a site_contatos do SITE-1 é a entrada do site da
-- Fora do Papel e alimenta o Funil; os contatos dos sites dos clientes são deles e não entram lá.
-- O site do cliente registra pela RPC pública site_contato_registrar (anon); ninguém lê sem login.
-- =====================================================================

create type public.site_contato_origem as enum ('formulario', 'whatsapp');

create table public.site_cliente_contatos (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references public.sites (id) on delete cascade,
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  origem          public.site_contato_origem not null,
  nome            text check (nome is null or length(nome) <= 100),
  telefone        text check (telefone is null or telefone ~ '^[0-9]{10,13}$'),
  email           text check (email is null or (length(email) <= 255 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  pagina          text check (pagina is null or length(pagina) <= 120),
  mensagem        text check (mensagem is null or length(mensagem) <= 3000),
  respondido      boolean not null default false,
  respondido_em   timestamptz,
  respondido_por  uuid references auth.users (id) on delete set null,
  ip              text,
  criado_em       timestamptz not null default now(),
  check (origem <> 'formulario' or (nome is not null and (telefone is not null or email is not null)))
);
create index site_cliente_contatos_lista_idx on public.site_cliente_contatos (site_id, respondido, criado_em desc);
create index site_cliente_contatos_tenant_idx on public.site_cliente_contatos (tenant_id);
create index site_cliente_contatos_ip_idx on public.site_cliente_contatos (ip, criado_em) where ip is not null;
create trigger site_cliente_contatos_tenant_guard before insert or update on public.site_cliente_contatos
  for each row execute function public._site_conteudo_tenant();

alter table public.site_cliente_contatos enable row level security;
create policy site_cliente_contatos_select on public.site_cliente_contatos
  for select to authenticated using (public.pode_editar_site(site_id, 'contatos'));
revoke all on public.site_cliente_contatos from anon;
revoke insert, update, delete, truncate on public.site_cliente_contatos from authenticated;

-- ---------------------------------------------------------------------
-- 1. Site (anon): registrar contato
-- ---------------------------------------------------------------------
-- p_dados: {origem: formulario|whatsapp, nome, telefone, email, pagina, mensagem}
-- O WhatsApp registra o clique (sem dados da pessoa). Limites: 30 por site em 10 min;
-- 8 formulários e 20 cliques por endereço (IP) por hora. Resposta sem id (nada para ler depois).
create or replace function public.site_contato_registrar(p_dominio text, p_dados jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites; d jsonb := coalesce(p_dados, '{}'::jsonb); o public.site_contato_origem; v_ip text := public._ip_cliente();
        v_nome text; tel text; v_email text; v_pagina text; msg text; novo uuid;
begin
  select * into s from public.sites where public._site_dominio(dominio) = public._site_dominio(p_dominio);
  if s.id is null or s.client_id is null or not ('contatos' = any (s.modulos)) then
    raise exception 'site_inexistente' using errcode = 'P0002';
  end if;
  if jsonb_typeof(d) <> 'object' or coalesce(d ->> 'origem', '') not in ('formulario', 'whatsapp') then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;
  o := (d ->> 'origem')::public.site_contato_origem;
  v_nome := nullif(left(trim(coalesce(d ->> 'nome', '')), 100), '');
  tel := nullif(regexp_replace(coalesce(d ->> 'telefone', ''), '\D', '', 'g'), '');
  v_email := nullif(lower(trim(coalesce(d ->> 'email', ''))), '');
  v_pagina := nullif(left(trim(coalesce(d ->> 'pagina', '')), 120), '');
  msg := nullif(trim(coalesce(d ->> 'mensagem', '')), '');
  if tel is not null and length(tel) not between 10 and 13 then raise exception 'telefone_invalido' using errcode = '22023'; end if;
  if v_email is not null and (length(v_email) > 255 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'email_invalido' using errcode = '22023';
  end if;
  if msg is not null and length(msg) > 3000 then raise exception 'mensagem_longa' using errcode = '22023'; end if;
  if o = 'formulario' and (v_nome is null or length(v_nome) < 2 or (tel is null and v_email is null)) then
    raise exception 'dados_incompletos' using errcode = '22023';
  end if;
  if o = 'whatsapp' then v_nome := null; tel := null; v_email := null; msg := null; end if;

  perform pg_advisory_xact_lock(hashtext('contato-site:' || s.id::text));
  if (select count(*) from public.site_cliente_contatos where site_id = s.id and criado_em > now() - interval '10 minutes') >= 30
     or (v_ip is not null and (select count(*) from public.site_cliente_contatos k
                              where k.ip = v_ip and k.origem = o
                                and k.criado_em > now() - interval '1 hour') >= case when o = 'formulario' then 8 else 20 end) then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;

  insert into public.site_cliente_contatos (site_id, tenant_id, origem, nome, telefone, email, pagina, mensagem, ip)
  values (s.id, s.tenant_id, o, v_nome, tel, v_email, v_pagina, msg, v_ip)
  returning id into novo;
  insert into public.event_outbox (tenant_id, event, payload)
  values (s.tenant_id, 'site.contato_recebido', jsonb_build_object('site_id', s.id, 'dominio', s.dominio,
          'client_id', s.client_id, 'contato_id', novo, 'origem', o, 'pagina', v_pagina));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.site_contato_registrar(text, jsonb) from public;
grant execute on function public.site_contato_registrar(text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Painel: lista e "já respondi"
-- ---------------------------------------------------------------------
create or replace function public.portal_contatos(p_site uuid, p_filtro text default 'esperando')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.sites := public._site_editavel(p_site, 'contatos');
begin
  return jsonb_build_object(
    'contagem', jsonb_build_object(
      'esperando', (select count(*) from public.site_cliente_contatos where site_id = s.id and origem = 'formulario' and not respondido),
      'todos', (select count(*) from public.site_cliente_contatos where site_id = s.id)),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('id', k.id, 'origem', k.origem, 'nome', k.nome, 'telefone', k.telefone,
               'email', k.email, 'pagina', k.pagina, 'mensagem', k.mensagem, 'respondido', k.respondido,
               'respondido_em', k.respondido_em, 'criado_em', k.criado_em) order by k.criado_em desc)
        from (select * from public.site_cliente_contatos
               where site_id = s.id
                 and (coalesce(p_filtro, 'esperando') = 'todos' or (origem = 'formulario' and not respondido))
               order by criado_em desc limit 500) k), '[]'::jsonb));
end;
$$;

create or replace function public.portal_contato_respondido(p_id uuid, p_respondido boolean default true)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare k public.site_cliente_contatos; s public.sites;
begin
  select * into k from public.site_cliente_contatos where id = p_id for update;
  if k.id is null or not (public._site_dono_do_tenant(k.tenant_id) or public.pode_editar_site(k.site_id)) then
    raise exception 'contato_inexistente' using errcode = 'P0002';
  end if;
  s := public._site_editavel(k.site_id, 'contatos');
  update public.site_cliente_contatos
     set respondido = coalesce(p_respondido, true),
         respondido_em = case when coalesce(p_respondido, true) then now() end,
         respondido_por = case when coalesce(p_respondido, true) then auth.uid() end
   where id = k.id returning * into k;
  perform public._site_evento(s.tenant_id, 'site.contato_respondido', s.id,
    jsonb_build_object('contato_id', k.id, 'respondido', k.respondido));
  return jsonb_build_object('id', k.id, 'respondido', k.respondido, 'respondido_em', k.respondido_em);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['portal_contatos(uuid, text)', 'portal_contato_respondido(uuid, boolean)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Contador do portal: formulários sem resposta nos sites da empresa (com o módulo)
-- ---------------------------------------------------------------------
create or replace function public._portal_contatos_sem_resposta(c uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.site_cliente_contatos k
    join public.sites s on s.id = k.site_id
   where s.client_id = c and 'contatos' = any (s.modulos) and k.origem = 'formulario' and not k.respondido;
$$;
revoke all on function public._portal_contatos_sem_resposta(uuid) from public, anon, authenticated;

do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.portal_pendencias(uuid)'::regprocedure);
  novo := replace(d, '''pedidos_andamento'',', '''contatos'', public._portal_contatos_sem_resposta(c), ''pedidos_andamento'',');
  if novo = d then raise exception 'portal_pendencias: ponto de troca não encontrado'; end if;
  execute novo;
end $$;
