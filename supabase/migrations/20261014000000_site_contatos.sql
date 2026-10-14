-- =====================================================================
-- SITE-1 · Contatos que chegam pelo site institucional
-- O site (visitante anônimo) só grava pela RPC; ninguém lê sem ser dono.
-- =====================================================================

create type public.site_contato_tipo as enum ('mensagem', 'horario', 'inscricao');

create table public.site_contatos (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  tipo              public.site_contato_tipo not null,
  nome              text check (nome is null or length(nome) <= 100),
  email             text not null check (length(email) <= 255),
  whatsapp          text check (whatsapp is null or length(whatsapp) <= 30),
  assunto           text check (assunto is null or length(assunto) <= 200),
  mensagem          text check (mensagem is null or length(mensagem) <= 3000),
  horario_sugerido  timestamptz,
  consentimento_em  timestamptz not null,
  origem            jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  check (tipo <> 'horario' or horario_sugerido is not null)
);
create index site_contatos_tenant_idx on public.site_contatos (tenant_id, created_at desc);
create index site_contatos_repeticao_idx on public.site_contatos (lower(email), tipo, created_at desc);

alter table public.site_contatos enable row level security;

create policy site_contatos_owner_select on public.site_contatos
  for select using (public.is_tenant_owner(tenant_id));

-- ---------------------------------------------------------------------
-- RPC chamada pelo site. Valida, evita repetição e grava o evento junto.
-- ---------------------------------------------------------------------
create or replace function public.site_registrar_contato(
  p_tipo              public.site_contato_tipo,
  p_email             text,
  p_consentimento     boolean,
  p_nome              text default null,
  p_whatsapp          text default null,
  p_assunto           text default null,
  p_mensagem          text default null,
  p_horario_sugerido  timestamptz default null,
  p_origem            jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tenant  uuid;
  v_email   text := lower(trim(coalesce(p_email, '')));
  v_nome    text := nullif(trim(coalesce(p_nome, '')), '');
  v_id      uuid;
  v_origem  jsonb := coalesce(p_origem, '{}'::jsonb);
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
    (tenant_id, tipo, nome, email, whatsapp, assunto, mensagem, horario_sugerido, consentimento_em, origem)
  values
    (v_tenant, p_tipo, v_nome, v_email, nullif(trim(coalesce(p_whatsapp, '')), ''),
     nullif(trim(coalesce(p_assunto, '')), ''), nullif(trim(coalesce(p_mensagem, '')), ''),
     p_horario_sugerido, now(), v_origem)
  returning id into v_id;

  insert into public.event_outbox (tenant_id, event, payload)
  values (v_tenant, 'site.contato_recebido',
          jsonb_build_object('contato_id', v_id, 'tipo', p_tipo));

  return v_id;
end;
$$;

revoke all on function public.site_registrar_contato(public.site_contato_tipo, text, boolean, text, text, text, text, timestamptz, jsonb) from public;
grant execute on function public.site_registrar_contato(public.site_contato_tipo, text, boolean, text, text, text, text, timestamptz, jsonb) to anon, authenticated;
