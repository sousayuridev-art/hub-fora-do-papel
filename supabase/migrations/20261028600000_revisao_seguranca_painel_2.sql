-- =====================================================================
-- Hub Fora do Papel · Revisão de segurança do painel do cliente, rodada 2 (28/10)
-- 1. Contatos do site: limites por endereço contam só dentro do site (um site não bloqueia
--    outro); IPv6 agrupado por /64; clique no WhatsApp só com página no formato do site;
--    endereço IP apagado depois de 2 dias (LGPD); excesso responde 429.
-- 2. Contatos pertencem à empresa que era dona do site quando chegaram: se o site mudar de
--    empresa, a nova não vê os contatos da anterior.
-- 3. Publicar confere a versão que a pessoa estava vendo (não publica rascunho alheio).
-- 4. Links: "//outro.site" e "/\outro.site" não passam como caminho do site. Fotos só do
--    Storage deste projeto. Artigos editados pela pessoa do portal seguem a mesma regra.
-- 5. Fotos: teto de 300 arquivos por site (apagar e reenviar não cresce sem fim).
-- 6. Ajustes: e-mail das pessoas da empresa só para o dono e o responsável.
-- 7. Excesso responde 429 (PT429) em vez de 500 nas funções do painel.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Endereço público das fotos deste projeto (Storage, bucket site-midia)
-- ---------------------------------------------------------------------
create or replace function public._site_midia_url_base()
returns text language sql immutable as $$
  select 'https://cjzzbpqwlpjvlawllfqy.supabase.co/storage/v1/object/public/site-midia/'::text;
$$;
revoke all on function public._site_midia_url_base() from public, anon, authenticated;

-- Foto de um site: base do projeto + pasta do site + nome de arquivo de imagem
create or replace function public._site_foto_ok(p_site uuid, v text)
returns boolean language sql immutable as $$
  select left(v, length(public._site_midia_url_base())) = public._site_midia_url_base()
     and substr(v, length(public._site_midia_url_base()) + 1) ~ ('^' || p_site::text || '/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$');
$$;
revoke all on function public._site_foto_ok(uuid, text) from public, anon, authenticated;

-- Link que pode ir ao ar (mesma regra de src/secoes/link.ts)
create or replace function public._site_link_ok(v text)
returns boolean language sql immutable as $$
  select v ~ '^(https://[^\s]+|/([^/\\\s][^\s]*)?|#[^\s]*|mailto:[^\s]+|tel:[+0-9() -]+)$';
$$;
revoke all on function public._site_link_ok(text) from public, anon, authenticated;

create or replace function public._site_pagina_urls_erro(p_site uuid, d jsonb)
returns text language plpgsql stable set search_path = public as $$
declare item jsonb; v text;
begin
  for item in select * from jsonb_array_elements(coalesce(d -> 'content', '[]'::jsonb)) loop
    v := coalesce(item -> 'props' ->> 'link', '');
    if v <> '' and not public._site_link_ok(v) then
      return 'link de "' || coalesce(item ->> 'type', 'seção') || '": use https://, um caminho do site (/contato), mailto: ou tel:';
    end if;
    v := coalesce(item -> 'props' ->> 'foto', '');
    if v <> '' and not public._site_foto_ok(p_site, v) then
      return 'foto de "' || coalesce(item ->> 'type', 'seção') || '": escolha uma foto em Fotos e arquivos';
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function public._site_pagina_urls_erro(uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 1 e 2. Contatos do site
-- ---------------------------------------------------------------------
alter table public.site_cliente_contatos
  add column client_id uuid references public.clients (id) on delete cascade;
update public.site_cliente_contatos k set client_id = s.client_id from public.sites s where s.id = k.site_id;
create index site_cliente_contatos_cliente_idx on public.site_cliente_contatos (client_id, criado_em desc);
create index site_cliente_contatos_site_idx on public.site_cliente_contatos (site_id, origem, criado_em desc);

-- IPv6 vira o bloco /64 (um único acesso tem milhões de endereços dentro dele)
create or replace function public._ip_agrupado(p text)
returns text language plpgsql immutable as $$
begin
  if p is null or position(':' in p) = 0 then return p; end if;
  return network(set_masklen(p::inet, 64))::text;
exception when others then
  return p;
end;
$$;
revoke all on function public._ip_agrupado(text) from public, anon, authenticated;

create or replace function public.site_contato_registrar(p_dominio text, p_dados jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites; d jsonb := coalesce(p_dados, '{}'::jsonb); o public.site_contato_origem;
        v_ip text := public._ip_agrupado(public._ip_cliente());
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
  v_pagina := nullif(left(trim(coalesce(d ->> 'pagina', '')), 120), '');

  perform pg_advisory_xact_lock(hashtext('contato-site:' || s.id::text));

  -- Endereço IP só serve para os limites: some depois de 2 dias
  update public.site_cliente_contatos set ip = null
   where site_id = s.id and ip is not null and criado_em < now() - interval '2 days';

  if o = 'whatsapp' then
    -- Página no formato que o site gera ("/caminho#assunto"); fora disso, ignora sem erro.
    if v_pagina is null or v_pagina !~ '^/[a-z0-9/_-]{0,100}(#[a-z0-9_-]{1,30})?$' then
      return jsonb_build_object('ok', true);
    end if;
    -- No máximo 1 por endereço e página a cada 10 min, 20 por endereço por hora (neste site)
    -- e 60 por site a cada 10 min. O excesso é ignorado sem erro.
    if (select count(*) from public.site_cliente_contatos k
         where k.site_id = s.id and k.origem = 'whatsapp' and k.criado_em > now() - interval '10 minutes') >= 60
       or (v_ip is not null and (
             exists (select 1 from public.site_cliente_contatos k
                      where k.ip = v_ip and k.site_id = s.id and k.origem = 'whatsapp'
                        and k.pagina is not distinct from v_pagina and k.criado_em > now() - interval '10 minutes')
             or (select count(*) from public.site_cliente_contatos k
                  where k.ip = v_ip and k.site_id = s.id and k.origem = 'whatsapp'
                    and k.criado_em > now() - interval '1 hour') >= 20)) then
      return jsonb_build_object('ok', true);
    end if;
    insert into public.site_cliente_contatos (site_id, tenant_id, client_id, origem, pagina, ip)
    values (s.id, s.tenant_id, s.client_id, o, v_pagina, v_ip)
    returning id into novo;
  else
    v_nome := nullif(left(trim(coalesce(d ->> 'nome', '')), 100), '');
    tel := nullif(regexp_replace(coalesce(d ->> 'telefone', ''), '\D', '', 'g'), '');
    v_email := nullif(lower(trim(coalesce(d ->> 'email', ''))), '');
    msg := nullif(trim(coalesce(d ->> 'mensagem', '')), '');
    if tel is not null and length(tel) not between 10 and 13 then raise exception 'telefone_invalido' using errcode = '22023'; end if;
    if v_email is not null and (length(v_email) > 255 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
      raise exception 'email_invalido' using errcode = '22023';
    end if;
    if msg is not null and length(msg) > 3000 then raise exception 'mensagem_longa' using errcode = '22023'; end if;
    if v_nome is null or length(v_nome) < 2 or (tel is null and v_email is null) then
      raise exception 'dados_incompletos' using errcode = '22023';
    end if;
    -- Formulário: 30 por site a cada 10 min e 8 por endereço por hora neste site
    if (select count(*) from public.site_cliente_contatos k
         where k.site_id = s.id and k.origem = 'formulario' and k.criado_em > now() - interval '10 minutes') >= 30
       or (v_ip is not null and (select count(*) from public.site_cliente_contatos k
                                  where k.ip = v_ip and k.site_id = s.id and k.origem = 'formulario'
                                    and k.criado_em > now() - interval '1 hour') >= 8) then
      raise exception 'muitas_tentativas' using errcode = 'PT429';
    end if;
    insert into public.site_cliente_contatos (site_id, tenant_id, client_id, origem, nome, telefone, email, pagina, mensagem, ip)
    values (s.id, s.tenant_id, s.client_id, o, v_nome, tel, v_email, v_pagina, msg, v_ip)
    returning id into novo;
  end if;

  insert into public.event_outbox (tenant_id, event, payload)
  values (s.tenant_id, 'site.contato_recebido', jsonb_build_object('site_id', s.id, 'dominio', s.dominio,
          'client_id', s.client_id, 'contato_id', novo, 'origem', o, 'pagina', v_pagina));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.site_contato_registrar(text, jsonb) from public;
grant execute on function public.site_contato_registrar(text, jsonb) to anon, authenticated;

-- Contato visível: dono do tenant vê todos; pessoa do portal só os que chegaram para a empresa dela
create or replace function public._contato_visivel(p_site uuid, p_cliente uuid, p_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public._site_dono_do_tenant(p_tenant)
      or (p_cliente is not null and public.pode_editar_site(p_site, 'contatos')
          and p_cliente = (select client_id from public.sites where id = p_site));
$$;
revoke all on function public._contato_visivel(uuid, uuid, uuid) from public, anon;
grant execute on function public._contato_visivel(uuid, uuid, uuid) to authenticated;

drop policy site_cliente_contatos_select on public.site_cliente_contatos;
create policy site_cliente_contatos_select on public.site_cliente_contatos
  for select to authenticated using (public._contato_visivel(site_id, client_id, tenant_id));

create or replace function public.portal_contatos(p_site uuid, p_filtro text default 'esperando')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.sites := public._site_editavel(p_site, 'contatos'); dono boolean := public._site_dono_do_tenant(s.tenant_id);
begin
  return jsonb_build_object(
    'contagem', jsonb_build_object(
      'esperando', (select count(*) from public.site_cliente_contatos
                     where site_id = s.id and (dono or client_id = s.client_id) and origem = 'formulario' and not respondido),
      'todos', (select count(*) from public.site_cliente_contatos where site_id = s.id and (dono or client_id = s.client_id))),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('id', k.id, 'origem', k.origem, 'nome', k.nome, 'telefone', k.telefone,
               'email', k.email, 'pagina', k.pagina, 'mensagem', k.mensagem, 'respondido', k.respondido,
               'respondido_em', k.respondido_em, 'criado_em', k.criado_em) order by k.criado_em desc)
        from (select * from public.site_cliente_contatos
               where site_id = s.id and (dono or client_id = s.client_id)
                 and (coalesce(p_filtro, 'esperando') = 'todos' or (origem = 'formulario' and not respondido))
               order by criado_em desc limit 500) k), '[]'::jsonb));
end;
$$;

create or replace function public.portal_contato_respondido(p_id uuid, p_respondido boolean default true)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare k public.site_cliente_contatos; s public.sites;
begin
  select * into k from public.site_cliente_contatos where id = p_id for update;
  if k.id is null or not public._contato_visivel(k.site_id, k.client_id, k.tenant_id) then
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

create or replace function public._portal_contatos_sem_resposta(c uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.site_cliente_contatos k
    join public.sites s on s.id = k.site_id
   where s.client_id = c and k.client_id = c and 'contatos' = any (s.modulos)
     and k.origem = 'formulario' and not k.respondido;
$$;
revoke all on function public._portal_contatos_sem_resposta(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Publicar confere a versão vista
-- ---------------------------------------------------------------------
create or replace function public._rev2_trocar(p_funcao text, p_de text, p_para text)
returns void language plpgsql as $$
declare d text; novo text;
begin
  d := pg_get_functiondef(p_funcao::regprocedure);
  novo := replace(d, p_de, p_para);
  if novo = d then raise exception '%: ponto de troca não encontrado', p_funcao; end if;
  execute novo;
end;
$$;

-- Excesso de publicações responde 429
select public._rev2_trocar('public.site_pagina_publicar(uuid)',
  'raise exception ''muitas_tentativas'' using errcode = ''54000'';',
  'raise exception ''muitas_tentativas'' using errcode = ''PT429'';');

alter function public.site_pagina_publicar(uuid) rename to _site_pagina_publicar;
revoke all on function public._site_pagina_publicar(uuid) from public, anon, authenticated;

create or replace function public.site_pagina_publicar(p_id uuid, p_versao integer default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.site_paginas := public._site_pagina_editavel(p_id);
begin
  -- Quem publica informa a versão que está vendo; outra pessoa salvou depois: recusa.
  if p_versao is not null and p_versao is distinct from p.versao then
    raise exception 'pagina_alterada' using errcode = '40001';
  end if;
  return public._site_pagina_publicar(p_id);
end;
$$;
revoke all on function public.site_pagina_publicar(uuid, integer) from public, anon;
grant execute on function public.site_pagina_publicar(uuid, integer) to authenticated;

-- Pedido de ajuste: excesso responde 429
select public._rev2_trocar('public.portal_pedido_criar(text, text, uuid, uuid, jsonb, uuid[])',
  'raise exception ''muitas_tentativas'' using errcode = ''54000'';',
  'raise exception ''muitas_tentativas'' using errcode = ''PT429'';');

-- ---------------------------------------------------------------------
-- 4. Artigos editados pela pessoa do portal: capa e links com as regras das páginas
-- ---------------------------------------------------------------------
create or replace function public._site_artigo_links_erro(a public.site_artigos)
returns text language plpgsql stable set search_path = public as $$
declare v text;
begin
  if not (a.capa in ('cv0', 'cv1', 'cv2', 'cv3') or public._site_foto_ok(a.site_id, a.capa)) then
    return 'capa: escolha uma foto em Fotos e arquivos';
  end if;
  for v in select m[1] from regexp_matches(a.corpo::text, '\]\(([^)]*)\)', 'g') m loop
    if not public._site_link_ok(v) then
      return 'link no texto: use https://, um caminho do site (/contato), mailto: ou tel:';
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function public._site_artigo_links_erro(public.site_artigos) from public, anon, authenticated;

select public._rev2_trocar('public._site_artigo_validar(public.site_artigos, boolean)',
  '  erro := public._site_corpo_erro(a.corpo);',
  '  -- Pessoa do portal (não dono): capa só do site-midia do site e links seguros no texto
  if not public._site_dono_do_tenant(a.tenant_id) then
    erro := public._site_artigo_links_erro(a);
    if erro is not null then raise exception ''artigo_invalido'' using errcode = ''22023'', detail = erro; end if;
  end if;
  erro := public._site_corpo_erro(a.corpo);');

drop function public._rev2_trocar(text, text, text);

-- ---------------------------------------------------------------------
-- 5. Fotos: teto de 300 arquivos por site, além de 100 por dia
-- ---------------------------------------------------------------------
create or replace function public._site_midia_pode_enviar_cliente(p_path text)
returns boolean language sql stable security definer set search_path = public, storage as $$
  select public._site_midia_do_cliente(p_path)
     and (select count(*) from storage.objects o
           where o.bucket_id = 'site-midia' and o.name like split_part(p_path, '/', 1) || '/%'
             and o.created_at > now() - interval '1 day') < 100
     and (select count(*) from storage.objects o
           where o.bucket_id = 'site-midia' and o.name like split_part(p_path, '/', 1) || '/%') < 300;
$$;
revoke all on function public._site_midia_pode_enviar_cliente(text) from public, anon;

-- ---------------------------------------------------------------------
-- 6. Ajustes: e-mail das pessoas só para o dono e o responsável
-- ---------------------------------------------------------------------
create or replace function public.portal_ajustes(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.sites := public._site_editavel(p_site, null);
        ve_email boolean := public._site_dono_do_tenant(s.tenant_id)
          or exists (select 1 from public.client_members where client_id = s.client_id
                      and user_id = auth.uid() and profile = 'responsavel');
begin
  return jsonb_build_object(
    'negocio', s.negocio, 'google', s.google, 'dominio', s.dominio, 'no_ar', s.no_ar,
    'equipe', coalesce((select jsonb_agg(jsonb_build_object(
                 'nome', coalesce(nullif(trim(pr.full_name), ''), nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')),
                 'email', case when ve_email then u.email end, 'perfil', m.profile)
                 order by m.profile <> 'responsavel', m.created_at)
               from public.client_members m
               join auth.users u on u.id = m.user_id
               left join public.profiles pr on pr.id = m.user_id
              where m.client_id = s.client_id), '[]'::jsonb));
end;
$$;
revoke all on function public.portal_ajustes(uuid) from public, anon;
grant execute on function public.portal_ajustes(uuid) to authenticated;
