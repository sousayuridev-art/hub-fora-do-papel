-- =====================================================================
-- Hub Fora do Papel · PC-6 · Dados do negócio e "Aparecer no Google"
-- Card: docs/cards/PC-6-ajustes-do-negocio.md
-- Um lugar só para WhatsApp, endereço, Instagram, horário e o título/descrição do Google.
-- Sem rascunho: salvou, o site lê na hora pela função pública site_publico_negocio.
-- Dono e pessoa do portal da empresa do site (qualquer perfil; não é dinheiro) gravam por RPC.
-- =====================================================================

alter table public.sites
  add column negocio jsonb not null default '{}'::jsonb
    check (jsonb_typeof(negocio) = 'object' and pg_column_size(negocio) <= 16384),
  add column google jsonb not null default '{}'::jsonb
    check (jsonb_typeof(google) = 'object' and pg_column_size(google) <= 4096);

-- ---------------------------------------------------------------------
-- 1. Validação (devolve o problema ou null)
-- ---------------------------------------------------------------------
create or replace function public._site_negocio_erro(d jsonb)
returns text language plpgsql immutable as $$
declare h jsonb; tel text;
begin
  if jsonb_typeof(d) is distinct from 'object' then return 'formato'; end if;
  if length(trim(coalesce(d ->> 'nome', ''))) not between 2 and 100 then return 'nome: de 2 a 100 caracteres'; end if;
  tel := regexp_replace(coalesce(d ->> 'whatsapp', ''), '\D', '', 'g');
  if tel <> '' and length(tel) not between 10 and 13 then return 'WhatsApp: use DDD e número'; end if;
  if length(coalesce(d ->> 'endereco', '')) > 200 then return 'endereço: até 200 caracteres'; end if;
  if coalesce(d ->> 'instagram', '') <> '' and (d ->> 'instagram') !~ '^@?[A-Za-z0-9._]{1,30}$' then
    return 'Instagram: só o nome do perfil, como @seunegocio';
  end if;
  if d ? 'horario' then
    if jsonb_typeof(d -> 'horario') <> 'array' or jsonb_array_length(d -> 'horario') > 7 then return 'horário: até 7 linhas'; end if;
    for h in select * from jsonb_array_elements(d -> 'horario') loop
      if length(trim(coalesce(h ->> 'dias', ''))) not between 2 and 40 then return 'horário: diga os dias (até 40 caracteres)'; end if;
      if coalesce((h ->> 'fechado')::boolean, false) then continue; end if;
      if coalesce(h ->> 'abre', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(h ->> 'fecha', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or (h ->> 'abre') >= (h ->> 'fecha') then
        return 'horário: a hora de abrir precisa ser antes da hora de fechar';
      end if;
    end loop;
  end if;
  return null;
end;
$$;

create or replace function public._site_google_erro(d jsonb)
returns text language plpgsql immutable as $$
begin
  if jsonb_typeof(d) is distinct from 'object' then return 'formato'; end if;
  if length(coalesce(d ->> 'titulo', '')) > 60 then return 'título para o Google: até 60 caracteres'; end if;
  if length(coalesce(d ->> 'descricao', '')) > 155 then return 'descrição para o Google: até 155 caracteres'; end if;
  if public._site_tem_marcador(coalesce(d ->> 'titulo', '') || ' ' || coalesce(d ->> 'descricao', '')) then
    return 'há marcador pendente entre colchetes';
  end if;
  return null;
end;
$$;
revoke all on function public._site_negocio_erro(jsonb) from public, anon, authenticated;
revoke all on function public._site_google_erro(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Gravar (publica na hora)
-- ---------------------------------------------------------------------
create or replace function public.site_negocio_salvar(p_site uuid, p_dados jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._site_editavel(p_site, null); erro text := public._site_negocio_erro(p_dados); limpo jsonb;
begin
  if erro is not null then raise exception 'negocio_invalido' using errcode = '22023', detail = erro; end if;
  limpo := jsonb_strip_nulls(jsonb_build_object(
    'nome', trim(p_dados ->> 'nome'),
    'whatsapp', nullif(regexp_replace(coalesce(p_dados ->> 'whatsapp', ''), '\D', '', 'g'), ''),
    'endereco', nullif(trim(coalesce(p_dados ->> 'endereco', '')), ''),
    'instagram', nullif(regexp_replace(trim(coalesce(p_dados ->> 'instagram', '')), '^@', ''), ''),
    'horario', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                  'dias', trim(h ->> 'dias'),
                  'fechado', coalesce((h ->> 'fechado')::boolean, false),
                  'abre', case when coalesce((h ->> 'fechado')::boolean, false) then null else h ->> 'abre' end,
                  'fecha', case when coalesce((h ->> 'fechado')::boolean, false) then null else h ->> 'fecha' end)))
                  from jsonb_array_elements(coalesce(p_dados -> 'horario', '[]'::jsonb)) h)));
  update public.sites set negocio = limpo where id = s.id returning * into s;
  perform public._site_evento(s.tenant_id, 'site.negocio_atualizado', s.id, jsonb_build_object('parte', 'negocio'));
  return s.negocio;
end;
$$;

create or replace function public.site_google_salvar(p_site uuid, p_dados jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.sites := public._site_editavel(p_site, null); erro text := public._site_google_erro(p_dados);
begin
  if erro is not null then raise exception 'google_invalido' using errcode = '22023', detail = erro; end if;
  update public.sites set google = jsonb_strip_nulls(jsonb_build_object(
           'titulo', nullif(trim(coalesce(p_dados ->> 'titulo', '')), ''),
           'descricao', nullif(trim(coalesce(p_dados ->> 'descricao', '')), '')))
   where id = s.id returning * into s;
  perform public._site_evento(s.tenant_id, 'site.negocio_atualizado', s.id, jsonb_build_object('parte', 'google'));
  return s.google;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Leitura: painel (dados + equipe) e site (público)
-- ---------------------------------------------------------------------
create or replace function public.portal_ajustes(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.sites := public._site_editavel(p_site, null);
begin
  return jsonb_build_object(
    'negocio', s.negocio, 'google', s.google, 'dominio', s.dominio, 'no_ar', s.no_ar,
    'equipe', coalesce((select jsonb_agg(jsonb_build_object(
                 'nome', coalesce(nullif(trim(pr.full_name), ''), nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')),
                 'email', u.email, 'perfil', m.profile) order by m.profile <> 'responsavel', m.created_at)
               from public.client_members m
               join auth.users u on u.id = m.user_id
               left join public.profiles pr on pr.id = m.user_id
              where m.client_id = s.client_id), '[]'::jsonb));
end;
$$;

create or replace function public.site_publico_negocio(p_dominio text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('negocio', s.negocio, 'google', s.google)
    from public.sites s
   where public._site_dominio(s.dominio) = public._site_dominio(p_dominio);
$$;
revoke all on function public.site_publico_negocio(text) from public;
grant execute on function public.site_publico_negocio(text) to anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array['site_negocio_salvar(uuid, jsonb)', 'site_google_salvar(uuid, jsonb)', 'portal_ajustes(uuid)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
