-- =====================================================================
-- SITE-2b · Tamanho da empresa (opcional) e WhatsApp obrigatório no
-- pedido de horário (a confirmação é feita pelo WhatsApp).
-- =====================================================================

alter table public.site_contatos
  add column porte text check (porte is null or porte in ('ate_10', '11_50', '51_200', 'mais_200'));

-- A assinatura muda (novo parâmetro): troca a função inteira.
drop function public.site_registrar_contato(public.site_contato_tipo, text, boolean, text, text, text, text, timestamptz, jsonb);

create function public.site_registrar_contato(
  p_tipo              public.site_contato_tipo,
  p_email             text,
  p_consentimento     boolean,
  p_nome              text default null,
  p_whatsapp          text default null,
  p_assunto           text default null,
  p_mensagem          text default null,
  p_horario_sugerido  timestamptz default null,
  p_origem            jsonb default '{}'::jsonb,
  p_porte             text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tenant    uuid;
  v_email     text := lower(trim(coalesce(p_email, '')));
  v_nome      text := nullif(trim(coalesce(p_nome, '')), '');
  v_whatsapp  text := nullif(trim(coalesce(p_whatsapp, '')), '');
  v_digitos   text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_porte     text := nullif(trim(coalesce(p_porte, '')), '');
  v_id        uuid;
  v_origem    jsonb := coalesce(p_origem, '{}'::jsonb);
begin
  if p_consentimento is distinct from true then
    raise exception 'consentimento_obrigatorio' using errcode = '22023';
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(v_email) > 255 then
    raise exception 'email_invalido' using errcode = '22023';
  end if;
  if p_tipo <> 'inscricao' and (v_nome is null or length(v_nome) > 100) then
    raise exception 'nome_obrigatorio' using errcode = '22023';
  end if;
  if p_tipo = 'horario' and (p_horario_sugerido is null or p_horario_sugerido < now()) then
    raise exception 'horario_invalido' using errcode = '22023';
  end if;
  -- Horário é confirmado pelo WhatsApp: número obrigatório (10 a 13 dígitos, com ou sem +55)
  if p_tipo = 'horario' and (length(v_digitos) < 10 or length(v_digitos) > 13) then
    raise exception 'whatsapp_invalido' using errcode = '22023';
  end if;
  if v_porte is not null and v_porte not in ('ate_10', '11_50', '51_200', 'mais_200') then
    raise exception 'porte_invalido' using errcode = '22023';
  end if;
  if length(coalesce(p_whatsapp, '')) > 30 or length(coalesce(p_assunto, '')) > 200
     or length(coalesce(p_mensagem, '')) > 3000 or length(v_origem::text) > 2000 then
    raise exception 'campo_longo' using errcode = '22023';
  end if;

  select id into v_tenant from public.tenants where slug = 'fora-do-papel';
  if v_tenant is null then
    raise exception 'tenant_ausente' using errcode = 'P0002';
  end if;

  -- Mesmo e-mail e tipo em menos de 1 minuto: devolve o registro anterior
  select id into v_id
    from public.site_contatos
   where tenant_id = v_tenant and lower(email) = v_email and tipo = p_tipo
     and created_at > now() - interval '1 minute'
   order by created_at desc
   limit 1;
  if v_id is not null then
    return v_id;
  end if;

  -- Mais de 10 envios do mesmo e-mail em 1 hora: recusa
  if (select count(*) from public.site_contatos
       where tenant_id = v_tenant and lower(email) = v_email
         and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'muitas_tentativas' using errcode = '54000';
  end if;

  insert into public.site_contatos
    (tenant_id, tipo, nome, email, whatsapp, assunto, mensagem, horario_sugerido, consentimento_em, origem, porte)
  values
    (v_tenant, p_tipo, v_nome, v_email, v_whatsapp,
     nullif(trim(coalesce(p_assunto, '')), ''), nullif(trim(coalesce(p_mensagem, '')), ''),
     p_horario_sugerido, now(), v_origem, v_porte)
  returning id into v_id;

  insert into public.event_outbox (tenant_id, event, payload)
  values (v_tenant, 'site.contato_recebido',
          jsonb_build_object('contato_id', v_id, 'tipo', p_tipo, 'porte', v_porte));

  return v_id;
end;
$$;

revoke all on function public.site_registrar_contato(public.site_contato_tipo, text, boolean, text, text, text, text, timestamptz, jsonb, text) from public;
grant execute on function public.site_registrar_contato(public.site_contato_tipo, text, boolean, text, text, text, text, timestamptz, jsonb, text) to anon, authenticated;
