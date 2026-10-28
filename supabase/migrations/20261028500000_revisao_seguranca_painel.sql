-- =====================================================================
-- Hub Fora do Papel · Revisão de segurança do painel do cliente (PC-1 a PC-6)
-- 1. Cliques no WhatsApp não podem mais bloquear o formulário: tetos separados;
--    clique em excesso é ignorado sem erro (não grava, não avisa).
-- 2. Links e fotos das seções: só https://, caminho do site (/), âncora (#), mailto: e tel:;
--    foto só do site-midia do próprio site. Vale ao salvar e ao publicar.
-- 3. Volume: até 30 publicações por página por hora; evento de foto só uma vez por arquivo
--    e de descrição só quando ela muda.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Contatos do site
-- ---------------------------------------------------------------------
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
  v_pagina := nullif(left(trim(coalesce(d ->> 'pagina', '')), 120), '');

  perform pg_advisory_xact_lock(hashtext('contato-site:' || s.id::text));

  if o = 'whatsapp' then
    -- Clique: no máximo 1 por endereço e página a cada 10 min, 20 por endereço por hora
    -- e 60 por site a cada 10 min. O excesso é ignorado sem erro.
    if (select count(*) from public.site_cliente_contatos k
         where k.site_id = s.id and k.origem = 'whatsapp' and k.criado_em > now() - interval '10 minutes') >= 60
       or (v_ip is not null and (
             exists (select 1 from public.site_cliente_contatos k
                      where k.ip = v_ip and k.site_id = s.id and k.origem = 'whatsapp'
                        and k.pagina is not distinct from v_pagina and k.criado_em > now() - interval '10 minutes')
             or (select count(*) from public.site_cliente_contatos k
                  where k.ip = v_ip and k.origem = 'whatsapp' and k.criado_em > now() - interval '1 hour') >= 20)) then
      return jsonb_build_object('ok', true);
    end if;
    insert into public.site_cliente_contatos (site_id, tenant_id, origem, pagina, ip)
    values (s.id, s.tenant_id, o, v_pagina, v_ip)
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
    -- Formulário: 30 por site a cada 10 min e 8 por endereço por hora (cliques não contam)
    if (select count(*) from public.site_cliente_contatos k
         where k.site_id = s.id and k.origem = 'formulario' and k.criado_em > now() - interval '10 minutes') >= 30
       or (v_ip is not null and (select count(*) from public.site_cliente_contatos k
                                  where k.ip = v_ip and k.origem = 'formulario'
                                    and k.criado_em > now() - interval '1 hour') >= 8) then
      raise exception 'muitas_tentativas' using errcode = '54000';
    end if;
    insert into public.site_cliente_contatos (site_id, tenant_id, origem, nome, telefone, email, pagina, mensagem, ip)
    values (s.id, s.tenant_id, o, v_nome, tel, v_email, v_pagina, msg, v_ip)
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

-- ---------------------------------------------------------------------
-- 2. Links e fotos das seções
-- ---------------------------------------------------------------------
create or replace function public._site_pagina_urls_erro(p_site uuid, d jsonb)
returns text language plpgsql stable set search_path = public as $$
declare item jsonb; v text;
begin
  for item in select * from jsonb_array_elements(coalesce(d -> 'content', '[]'::jsonb)) loop
    v := coalesce(item -> 'props' ->> 'link', '');
    if v <> '' and v !~ '^(https://[^\s]+|/[^\s]*|#[^\s]*|mailto:[^\s]+|tel:[+0-9() -]+)$' then
      return 'link de "' || coalesce(item ->> 'type', 'seção') || '": use https://, um caminho do site (/contato), mailto: ou tel:';
    end if;
    v := coalesce(item -> 'props' ->> 'foto', '');
    if v <> '' and v !~ ('^https://[a-z0-9.-]+(:[0-9]+)?/storage/v1/object/public/site-midia/' || p_site::text
                         || '/[A-Za-z0-9._-]+\.(jpe?g|png|webp)$') then
      return 'foto de "' || coalesce(item ->> 'type', 'seção') || '": escolha uma foto em Fotos e arquivos';
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function public._site_pagina_urls_erro(uuid, jsonb) from public, anon, authenticated;

create or replace function public._rev_trocar(p_funcao text, p_de text, p_para text)
returns void language plpgsql as $$
declare d text; novo text;
begin
  d := pg_get_functiondef(p_funcao::regprocedure);
  novo := replace(d, p_de, p_para);
  if novo = d then raise exception '%: ponto de troca não encontrado', p_funcao; end if;
  execute novo;
end;
$$;

select public._rev_trocar('public.site_pagina_salvar_rascunho(uuid, jsonb, integer)',
  '  erro := public._site_pagina_formato_erro(p_dados);',
  '  erro := coalesce(public._site_pagina_formato_erro(p_dados), public._site_pagina_urls_erro(p.site_id, p_dados));');
select public._rev_trocar('public.site_pagina_publicar(uuid)',
  '  erro := public._site_pagina_formato_erro(p.rascunho);',
  '  erro := coalesce(public._site_pagina_formato_erro(p.rascunho), public._site_pagina_urls_erro(p.site_id, p.rascunho));
  -- Volume: até 30 publicações da mesma página por hora
  if (select count(*) from public.site_paginas_versoes where pagina_id = p.id and publicado_em > now() - interval ''1 hour'') >= 30 then
    raise exception ''muitas_tentativas'' using errcode = ''54000'';
  end if;');

-- ---------------------------------------------------------------------
-- 3. Eventos de foto: uma vez por arquivo; descrição só quando muda
-- ---------------------------------------------------------------------
select public._rev_trocar('public.site_midia_enviada(text)',
  '  perform public._site_evento(s.tenant_id, ''site.midia_enviada'', s.id, jsonb_build_object(''caminho'', p_caminho));',
  '  if not exists (select 1 from public.event_outbox where tenant_id = s.tenant_id and event = ''site.midia_enviada''
                  and payload ->> ''caminho'' = p_caminho) then
    perform public._site_evento(s.tenant_id, ''site.midia_enviada'', s.id, jsonb_build_object(''caminho'', p_caminho));
  end if;');
select public._rev_trocar('public.site_midia_descrever(text, text)',
  'declare s public.sites; d text := nullif(left(trim(coalesce(p_descricao, '''')), 250), ''''); m public.site_midia;',
  'declare s public.sites; d text := nullif(left(trim(coalesce(p_descricao, '''')), 250), ''''); m public.site_midia; antes text;');
select public._rev_trocar('public.site_midia_descrever(text, text)',
  '  insert into public.site_midia (site_id, tenant_id, caminho, descricao, atualizado_por)',
  '  select descricao into antes from public.site_midia where caminho = p_caminho;
  insert into public.site_midia (site_id, tenant_id, caminho, descricao, atualizado_por)');
select public._rev_trocar('public.site_midia_descrever(text, text)',
  '  perform public._site_evento(s.tenant_id, ''site.midia_descrita'', s.id, jsonb_build_object(''caminho'', m.caminho));',
  '  if m.descricao is distinct from antes then
    perform public._site_evento(s.tenant_id, ''site.midia_descrita'', s.id, jsonb_build_object(''caminho'', m.caminho));
  end if;');

drop function public._rev_trocar(text, text, text);
