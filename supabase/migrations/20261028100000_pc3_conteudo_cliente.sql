-- =====================================================================
-- Hub Fora do Papel · PC-3 · Artigos e fotos editados pelo cliente
-- Card: docs/cards/PC-3-conteudo-do-cliente.md
-- Mesmas tabelas e RPCs do CMS-1; muda quem pode editar:
--   dono do tenant (sessão forte) em qualquer site do tenant;
--   pessoa do portal (responsável ou equipe) só no site da própria empresa
--   e só no módulo contratado (sites.modulos, PC-1). O banco recusa o resto.
-- Fotos: o Storage continua sendo a fonte; site_midia guarda a descrição.
-- "Onde é usada" é calculado na hora (artigos e blocos), para nunca ficar desatualizado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quem pode editar
-- ---------------------------------------------------------------------
-- Verdadeira para o dono do tenant (is_tenant_owner já exige a sessão forte do SEG-1) e para a pessoa do portal
-- da empresa do site (com o módulo contratado, quando p_modulo é informado). Usada nas policies.
create or replace function public.pode_editar_site(p_site uuid, p_modulo text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sites s
     where s.id = p_site
       and (public.is_tenant_owner(s.tenant_id)
            or (s.client_id is not null and public.is_client_member(s.client_id)
                and (p_modulo is null or p_modulo = any (s.modulos)))));
$$;
revoke all on function public.pode_editar_site(uuid, text) from public, anon;
grant execute on function public.pode_editar_site(uuid, text) to authenticated;

-- Site para gravar: dono passa pela sessão forte (_tenant_do_dono); cliente precisa do módulo
create or replace function public._site_dono_do_tenant(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where tenant_id = t and user_id = auth.uid() and role = 'owner');
$$;

create or replace function public._site_editavel(p_site uuid, p_modulo text)
returns public.sites language plpgsql stable security definer set search_path = public as $$
declare s public.sites;
begin
  select * into s from public.sites where id = p_site;
  if s.id is null then raise exception 'site_inexistente' using errcode = 'P0002'; end if;
  -- Dono sem o código do app recebe precisa_codigo (de _tenant_do_dono), como no CMS-1
  if public._site_dono_do_tenant(s.tenant_id) then
    if public._tenant_do_dono() is distinct from s.tenant_id then
      raise exception 'site_inexistente' using errcode = 'P0002';
    end if;
    return s;
  end if;
  if s.client_id is null or not public.is_client_member(s.client_id) then
    raise exception 'site_inexistente' using errcode = 'P0002';
  end if;
  if p_modulo is not null and not (p_modulo = any (s.modulos)) then
    raise exception 'modulo_nao_contratado' using errcode = '42501';
  end if;
  return s;
end;
$$;

-- Artigo para gravar, travado
create or replace function public._site_artigo_editavel(p_id uuid)
returns public.site_artigos language plpgsql security definer set search_path = public as $$
declare a public.site_artigos;
begin
  select * into a from public.site_artigos where id = p_id for update;
  -- Quem não tem nada a ver com o site não fica sabendo que o artigo existe
  if a.id is null or not (public._site_dono_do_tenant(a.tenant_id) or public.pode_editar_site(a.site_id)) then
    raise exception 'artigo_inexistente' using errcode = 'P0002';
  end if;
  perform public._site_editavel(a.site_id, 'artigos');
  return a;
end;
$$;
revoke all on function public._site_dono_do_tenant(uuid) from public, anon, authenticated;
revoke all on function public._site_editavel(uuid, text) from public, anon, authenticated;
revoke all on function public._site_artigo_editavel(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. RPCs de artigo do CMS-1 passam a aceitar o cliente
-- ---------------------------------------------------------------------
create or replace function public._pc3_trocar(p_funcao text, p_de text, p_para text)
returns void language plpgsql as $$
declare d text; novo text;
begin
  d := pg_get_functiondef(p_funcao::regprocedure);
  novo := replace(d, p_de, p_para);
  if novo = d then raise exception '%: ponto de troca não encontrado', p_funcao; end if;
  execute novo;
end;
$$;

select public._pc3_trocar('public.site_artigo_salvar(uuid, jsonb)',
  's public.sites := public._site_do_dono(p_site);',
  's public.sites := public._site_editavel(p_site, ''artigos'');');
select public._pc3_trocar('public.site_artigo_salvar(uuid, jsonb)',
  'a := public._site_artigo_do_dono((j ->> ''id'')::uuid);',
  'a := public._site_artigo_editavel((j ->> ''id'')::uuid);');
select public._pc3_trocar('public.site_artigo_publicar(uuid)',
  'a public.site_artigos := public._site_artigo_do_dono(p_id);',
  'a public.site_artigos := public._site_artigo_editavel(p_id);');
select public._pc3_trocar('public.site_artigo_arquivar(uuid)',
  'a public.site_artigos := public._site_artigo_do_dono(p_id);',
  'a public.site_artigos := public._site_artigo_editavel(p_id);');

-- Eventos dizem quem fez (dono ou pessoa do portal)
select public._pc3_trocar('public._site_evento(uuid, text, uuid, jsonb)',
  'jsonb_build_object(''site_id'', s.id, ''dominio'', s.dominio)',
  'jsonb_build_object(''site_id'', s.id, ''dominio'', s.dominio, ''por'', auth.uid(),
                            ''quem'', case when public.is_tenant_owner(s.tenant_id) then ''dono'' else ''cliente'' end,
                            ''client_id'', s.client_id)');

drop function public._pc3_trocar(text, text, text);

-- ---------------------------------------------------------------------
-- 3. Leitura dos artigos pelo cliente (RLS)
-- ---------------------------------------------------------------------
create policy site_artigos_cliente_select on public.site_artigos
  for select to authenticated using (public.pode_editar_site(site_id, 'artigos'));

-- ---------------------------------------------------------------------
-- 4. Fotos: Storage para a pessoa do portal (só a pasta do site da empresa)
-- ---------------------------------------------------------------------
create or replace function public._site_midia_do_cliente(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$'
     and exists (select 1 from public.sites s
                  where s.id::text = split_part(p_path, '/', 1)
                    and s.client_id is not null and public.is_client_member(s.client_id));
$$;

-- Onde a foto aparece: capa ou corpo de artigo, blocos de página
create or replace function public._site_midia_usos(p_path text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(u order by u ->> 'tipo', u ->> 'nome'), '[]'::jsonb) from (
    select jsonb_build_object('tipo', 'artigo', 'id', a.id, 'nome', a.titulo) u
      from public.site_artigos a
     where a.site_id::text = split_part(p_path, '/', 1)
       and (a.capa like '%/' || p_path or a.corpo::text like '%' || p_path || '%')
    union all
    select jsonb_build_object('tipo', 'pagina', 'id', b.id, 'nome', b.chave)
      from public.site_blocos b
     where b.site_id::text = split_part(p_path, '/', 1) and b.valor::text like '%' || p_path || '%'
  ) x;
$$;

-- Limite contra excesso: 100 fotos por dia por site
create or replace function public._site_midia_pode_enviar_cliente(p_path text)
returns boolean language sql stable security definer set search_path = public, storage as $$
  select public._site_midia_do_cliente(p_path)
     and (select count(*) from storage.objects o
           where o.bucket_id = 'site-midia' and o.name like split_part(p_path, '/', 1) || '/%'
             and o.created_at > now() - interval '1 day') < 100;
$$;

create or replace function public._site_midia_pode_apagar_cliente(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select public._site_midia_do_cliente(p_path) and jsonb_array_length(public._site_midia_usos(p_path)) = 0;
$$;

revoke all on function public._site_midia_do_cliente(text) from public, anon;
revoke all on function public._site_midia_usos(text) from public, anon, authenticated;
revoke all on function public._site_midia_pode_enviar_cliente(text) from public, anon;
revoke all on function public._site_midia_pode_apagar_cliente(text) from public, anon;
grant execute on function public._site_midia_do_cliente(text) to authenticated;
grant execute on function public._site_midia_pode_enviar_cliente(text) to authenticated;
grant execute on function public._site_midia_pode_apagar_cliente(text) to authenticated;

create policy site_midia_cliente_ler on storage.objects for select to authenticated
  using (bucket_id = 'site-midia' and public._site_midia_do_cliente(name));
create policy site_midia_cliente_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'site-midia' and public._site_midia_pode_enviar_cliente(name));
-- Cliente não substitui foto (sem policy de update); apaga só a que não está em uso
create policy site_midia_cliente_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'site-midia' and public._site_midia_pode_apagar_cliente(name));

-- ---------------------------------------------------------------------
-- 5. Descrição das fotos (texto alternativo)
-- ---------------------------------------------------------------------
create table public.site_midia (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete cascade,
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  caminho        text not null unique check (caminho ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$'),
  descricao      text check (descricao is null or length(descricao) <= 250),
  atualizado_por uuid references auth.users (id) on delete set null,
  atualizado_em  timestamptz not null default now()
);
create index site_midia_site_idx on public.site_midia (site_id);
create index site_midia_tenant_idx on public.site_midia (tenant_id);
create trigger site_midia_tenant_guard before insert or update on public.site_midia
  for each row execute function public._site_conteudo_tenant();
alter table public.site_midia enable row level security;
create policy site_midia_select on public.site_midia
  for select to authenticated using (public.pode_editar_site(site_id));
revoke all on public.site_midia from anon;
revoke insert, update, delete, truncate on public.site_midia from authenticated;

-- Fotos do site com descrição e onde são usadas (dono e pessoa do portal)
create or replace function public.site_midia_lista(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path = public, storage as $$
declare s public.sites;
begin
  select * into s from public.sites where id = p_site;
  if s.id is null or not public.pode_editar_site(p_site) then
    raise exception 'site_inexistente' using errcode = 'P0002';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'caminho', o.name, 'nome', split_part(o.name, '/', 2),
             'tamanho', nullif(o.metadata ->> 'size', '')::bigint, 'criado_em', o.created_at,
             'descricao', m.descricao, 'usos', public._site_midia_usos(o.name))
           order by o.created_at desc)
      from storage.objects o
      left join public.site_midia m on m.caminho = o.name
     where o.bucket_id = 'site-midia' and o.name like p_site::text || '/%'
       and o.name ~ '\.(jpe?g|png|webp)$'), '[]'::jsonb);
end;
$$;

create or replace function public.site_midia_descrever(p_caminho text, p_descricao text)
returns jsonb language plpgsql volatile security definer set search_path = public, storage as $$
declare s public.sites; d text := nullif(left(trim(coalesce(p_descricao, '')), 250), ''); m public.site_midia;
begin
  if coalesce(p_caminho, '') !~ '^[0-9a-f-]{36}/' then raise exception 'foto_inexistente' using errcode = 'P0002'; end if;
  s := public._site_editavel(split_part(p_caminho, '/', 1)::uuid, null);
  if not exists (select 1 from storage.objects where bucket_id = 'site-midia' and name = p_caminho) then
    raise exception 'foto_inexistente' using errcode = 'P0002';
  end if;
  insert into public.site_midia (site_id, tenant_id, caminho, descricao, atualizado_por)
  values (s.id, s.tenant_id, p_caminho, d, auth.uid())
  on conflict (caminho) do update set descricao = excluded.descricao, atualizado_por = excluded.atualizado_por,
                                      atualizado_em = now()
  returning * into m;
  perform public._site_evento(s.tenant_id, 'site.midia_descrita', s.id, jsonb_build_object('caminho', m.caminho));
  return jsonb_build_object('caminho', m.caminho, 'descricao', m.descricao);
end;
$$;

-- Registra o envio (evento midia.enviada); o arquivo já precisa estar no Storage
create or replace function public.site_midia_enviada(p_caminho text)
returns void language plpgsql volatile security definer set search_path = public, storage as $$
declare s public.sites;
begin
  if coalesce(p_caminho, '') !~ '^[0-9a-f-]{36}/' then raise exception 'foto_inexistente' using errcode = 'P0002'; end if;
  s := public._site_editavel(split_part(p_caminho, '/', 1)::uuid, null);
  if not exists (select 1 from storage.objects where bucket_id = 'site-midia' and name = p_caminho) then
    raise exception 'foto_inexistente' using errcode = 'P0002';
  end if;
  perform public._site_evento(s.tenant_id, 'site.midia_enviada', s.id, jsonb_build_object('caminho', p_caminho));
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['site_midia_lista(uuid)', 'site_midia_descrever(text, text)', 'site_midia_enviada(text)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
