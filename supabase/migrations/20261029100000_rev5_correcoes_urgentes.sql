-- =====================================================================
-- REV-5 · Correções urgentes do diagnóstico de 29/10 (docs/cards/REV-5-correcoes-urgentes.md)
-- 1. Fechado sem proposta aceita pede motivo (o funil não vira cliente por engano)
-- 2. Proposta recusada vira próximo passo "para hoje" na oportunidade
-- 3. SVG fora dos materiais (pode carregar script)
-- 4. Fila de integrações: reservar e confirmar eventos (só o servidor/n8n)
-- 5. Mensalidades: geração uma vez por dia por empresa, sem corrida
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. funil_mover: Fechado exige proposta aceita ou motivo escrito
-- ---------------------------------------------------------------------
drop function public.funil_mover(uuid, public.deal_stage, timestamptz, text, date, time);

create function public.funil_mover(
  p_deal          uuid,
  p_etapa         public.deal_stage,
  p_versao        timestamptz,
  p_proximo_passo text default null,
  p_data          date default null,
  p_hora          time default null,
  p_motivo_fechar text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  d public.deals := public._funil_travar(p_deal, p_versao);
  v_de public.deal_stage := d.stage;
  v_motivo text := nullif(left(trim(coalesce(p_motivo_fechar, '')), 400), '');
  v_aceita boolean;
begin
  if d.archived_at is not null then
    raise exception 'oportunidade_arquivada' using errcode = '22023';
  end if;
  if v_de = p_etapa then
    return to_jsonb(d);
  end if;
  if p_etapa = 'fechado' then
    select exists (select 1 from public.proposals p where p.deal_id = d.id and p.status = 'aceita')
      into v_aceita;
    if not v_aceita and v_motivo is null then
      raise exception 'fechar_sem_proposta' using errcode = '22023';
    end if;
  end if;
  if nullif(trim(coalesce(p_proximo_passo, '')), '') is not null and p_data is not null then
    d.next_step := trim(p_proximo_passo);
    d.next_step_at := public._no_fuso(d.tenant_id, p_data, p_hora);
    d.next_step_has_time := p_hora is not null;
  end if;
  if p_etapa <> 'fechado' and (d.next_step is null or d.next_step_at is null) then
    raise exception 'proximo_passo_obrigatorio' using errcode = '22023';
  end if;

  update public.deals set
    stage = p_etapa,
    stage_changed_at = now(),
    closed_at = case when p_etapa = 'fechado' then now() else null end,
    next_step = d.next_step, next_step_at = d.next_step_at, next_step_has_time = d.next_step_has_time,
    position = extract(epoch from now())
  where id = p_deal
  returning * into d;

  if p_etapa = 'fechado' then
    update public.clients set client_since = coalesce(client_since, current_date) where id = d.client_id;
  end if;

  perform public._funil_registrar(d.tenant_id, d.client_id, d.id, 'etapa_alterada', v_de, p_etapa,
    case when p_etapa = 'fechado' and v_motivo is not null
         then jsonb_build_object('sem_proposta', true, 'motivo', v_motivo)
         else '{}'::jsonb end,
    'hub', 'oportunidade.etapa_alterada');
  return to_jsonb(d);
end;
$$;

revoke all on function public.funil_mover(uuid, public.deal_stage, timestamptz, text, date, time, text) from public, anon;
grant execute on function public.funil_mover(uuid, public.deal_stage, timestamptz, text, date, time, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Recusa da proposta: a oportunidade ganha um próximo passo para hoje
-- ---------------------------------------------------------------------
create or replace function public._funil_apos_recusa(p public.proposals)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.deals set
    next_step = 'Proposta recusada: conversar e decidir entre nova proposta ou arquivar',
    next_step_at = public._no_fuso(tenant_id, public._hoje(tenant_id), null),
    next_step_has_time = false,
    position = extract(epoch from now())
  where id = p.deal_id and archived_at is null and stage <> 'fechado';
end;
$$;
revoke all on function public._funil_apos_recusa(public.proposals) from public, anon, authenticated;

create or replace function public.proposta_marcar_recusada(p_id uuid, p_motivo text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals := public._proposta_travar(p_id, null);
begin
  if p.status <> 'enviada' then
    raise exception 'proposta_nao_enviada' using errcode = '22023';
  end if;
  update public.proposals set status = 'recusada', refused_at = now(),
    refused_reason = nullif(left(trim(coalesce(p_motivo, '')), 600), '')
  where id = p.id returning * into p;
  perform public._funil_registrar(p.tenant_id, p.client_id, p.deal_id, 'proposta_recusada', null, null,
    jsonb_build_object('proposta_id', p.id, 'motivo', p.refused_reason, 'por', 'hub'), 'hub', 'proposta.recusada');
  perform public._funil_apos_recusa(p);
  return jsonb_build_object('id', p.id);
end;
$$;

create or replace function public.proposta_recusar(p_token text, p_motivo text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.proposals;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'link_invalido' using errcode = 'P0002';
  end if;
  select * into p from public.proposals where token = p_token for update;
  if p.id is null then raise exception 'link_invalido' using errcode = 'P0002'; end if;
  if p.status = 'recusada' then return jsonb_build_object('recusada_em', p.refused_at, 'repetido', true); end if;
  if p.status <> 'enviada' then raise exception 'proposta_indisponivel' using errcode = '22023'; end if;
  update public.proposals set status = 'recusada', refused_at = now(),
    refused_reason = nullif(left(trim(coalesce(p_motivo, '')), 600), '')
  where id = p.id returning * into p;
  perform public._funil_registrar(p.tenant_id, p.client_id, p.deal_id, 'proposta_recusada', null, null,
    jsonb_build_object('proposta_id', p.id, 'motivo', p.refused_reason, 'por', 'cliente'), 'cliente', 'proposta.recusada');
  perform public._funil_apos_recusa(p);
  return jsonb_build_object('recusada_em', p.refused_at, 'repetido', false);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Materiais sem SVG (arquivos antigos continuam só para baixar)
-- ---------------------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array_remove(allowed_mime_types, 'image/svg+xml')
 where id = 'materiais';

create or replace function public._material_tipo_ok(p_mime text)
returns boolean language sql immutable as $$
  select p_mime = any (array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'application/zip', 'video/mp4', 'audio/mpeg']);
$$;
revoke all on function public._material_tipo_ok(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Fila de integrações (event_outbox) para o n8n
--    Reserva com SKIP LOCKED: dois consumidores nunca pegam o mesmo evento.
--    Reserva vence em 5 minutos (se o n8n cair, o evento volta para a fila).
--    Depois de 10 tentativas o evento para e fica com o último erro para conferência.
-- ---------------------------------------------------------------------
alter table public.event_outbox add column if not exists reserved_until timestamptz;
drop index if exists public.event_outbox_pending_idx;
create index event_outbox_pending_idx on public.event_outbox (id) where sent_at is null;

create or replace function public.outbox_reservar(p_limite integer default 50)
returns setof public.event_outbox language plpgsql volatile security definer set search_path = public as $$
begin
  return query
  with alvo as (
    select e.id from public.event_outbox e
     where e.sent_at is null
       and e.attempts < 10
       and (e.reserved_until is null or e.reserved_until < now())
     order by e.id
     limit greatest(1, least(coalesce(p_limite, 50), 200))
     for update skip locked
  )
  update public.event_outbox e
     set reserved_until = now() + interval '5 minutes',
         attempts = e.attempts + 1
    from alvo
   where e.id = alvo.id
  returning e.*;
end;
$$;

create or replace function public.outbox_confirmar(p_id bigint, p_erro text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if p_erro is null then
    update public.event_outbox set sent_at = now(), reserved_until = null, last_error = null
     where id = p_id and sent_at is null;
  else
    update public.event_outbox set reserved_until = null, last_error = left(p_erro, 1000)
     where id = p_id and sent_at is null;
  end if;
end;
$$;

revoke all on function public.outbox_reservar(integer) from public, anon, authenticated;
revoke all on function public.outbox_confirmar(bigint, text) from public, anon, authenticated;
grant execute on function public.outbox_reservar(integer) to service_role;
grant execute on function public.outbox_confirmar(bigint, text) to service_role;

-- ---------------------------------------------------------------------
-- 5. Mensalidades: uma geração por dia por empresa
--    Telas de leitura (portal, relatórios) continuam chamando, mas só a
--    primeira do dia escreve. Mudança em mensalidade ou pausa libera de novo.
-- ---------------------------------------------------------------------
create table if not exists public.mensalidades_controle (
  tenant_id  uuid primary key references public.tenants (id) on delete cascade,
  gerado_em  date not null
);
alter table public.mensalidades_controle enable row level security;
revoke all on public.mensalidades_controle from public, anon, authenticated;

create or replace function public._mensalidades_gerar(p_tenant uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.subscriptions; m date; ate date; hoje date := public._hoje(p_tenant); ultimo date;
begin
  if exists (select 1 from public.mensalidades_controle c where c.tenant_id = p_tenant and c.gerado_em = hoje) then
    return;
  end if;
  -- Uma geração por vez por empresa (duas telas abertas ao mesmo tempo não brigam)
  perform pg_advisory_xact_lock(hashtextextended('mensalidades:' || p_tenant::text, 0));
  if exists (select 1 from public.mensalidades_controle c where c.tenant_id = p_tenant and c.gerado_em = hoje) then
    return;
  end if;

  for s in select * from public.subscriptions where tenant_id = p_tenant loop
    ate := least(public._mes_de(hoje), coalesce(s.ended_month, public._mes_de(hoje)));
    select max(period) into ultimo from public.charges where subscription_id = s.id and kind = 'mensalidade';
    m := greatest(s.start_month, coalesce((ultimo + interval '1 month')::date, s.start_month));
    while m <= ate loop
      if exists (select 1 from public.subscription_pauses z
                  where z.subscription_id = s.id and m >= z.from_month and (z.to_month is null or m <= z.to_month)) then
        m := (m + interval '1 month')::date;
        continue;
      end if;
      insert into public.charges (tenant_id, client_id, project_id, subscription_id, kind, description,
                                  amount_cents, due_date, period)
      values (s.tenant_id, s.client_id, s.project_id, s.id, 'mensalidade',
              'Mensalidade ' || s.plan_name || ' · ' || to_char(m, 'MM/YYYY'),
              s.amount_cents, m + (s.due_day - 1), m)
      on conflict (subscription_id, period) where kind = 'mensalidade' do nothing;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;

  insert into public.mensalidades_controle (tenant_id, gerado_em) values (p_tenant, hoje)
  on conflict (tenant_id) do update set gerado_em = excluded.gerado_em;
end;
$$;
revoke all on function public._mensalidades_gerar(uuid) from public, anon, authenticated;

create or replace function public._mensalidades_liberar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.mensalidades_controle
   where tenant_id = coalesce(new.tenant_id, old.tenant_id);
  return null;
end;
$$;
revoke all on function public._mensalidades_liberar() from public, anon, authenticated;

create trigger subscriptions_libera_mensalidades after insert or update or delete on public.subscriptions
  for each row execute function public._mensalidades_liberar();
create trigger subscription_pauses_libera_mensalidades after insert or update or delete on public.subscription_pauses
  for each row execute function public._mensalidades_liberar();
