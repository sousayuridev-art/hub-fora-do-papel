-- =====================================================================
-- Hub Fora do Papel · MK-5 · Publicação e números automáticos (banco)
-- Card: docs/cards/MK-5-publicacao-e-numeros-automaticos.md
-- Decisão do Yuri (29/10): Upload-Post. O Hub guarda a fila e a situação; a função de servidor
-- `marketing-publicar` (chave de serviço, chamada pelo pg_cron) pega o que está na hora, pede o pacote
-- da versão, publica e devolve link e números. O n8n só recebe o aviso de falha (WhatsApp).
-- A pessoa decide: só sai o que foi aprovado, tem data e está com "Publicar sozinho" ligado.
-- =====================================================================

alter table public.mkt_versions
  add column publicar_sozinho boolean not null default false,
  add column publicacao text not null default 'manual'
    check (publicacao in ('manual', 'na_fila', 'enviada', 'publicada', 'falhou')),
  add column publicacao_erro text check (publicacao_erro is null or length(publicacao_erro) <= 300),
  add column id_externo text check (id_externo is null or length(id_externo) <= 200),
  add column publicacao_em timestamptz,
  add column resultados_fonte text check (resultados_fonte is null or resultados_fonte in ('manual', 'automatico')),
  add column resultados_em timestamptz;
create index mkt_versions_fila_idx on public.mkt_versions (scheduled_at) where publicacao = 'na_fila';

alter table public.mkt_events drop constraint mkt_events_kind_check;
alter table public.mkt_events add constraint mkt_events_kind_check
  check (kind in ('criada', 'etapa', 'aprovada', 'ajuste_pedido', 'reaberta', 'versao_adicionada', 'versao_removida',
                  'agendada', 'publicada', 'resultados', 'midia_ligada', 'midia_removida', 'modelo_gerado',
                  'publicacao'));

-- ---------------------------------------------------------------------
-- 1. A versão na fila nunca sai diferente do que foi aprovado
-- ---------------------------------------------------------------------
-- Texto, formato, data ou chamada mudaram com a versão na fila: sai da fila e a tela avisa.
create or replace function public._mkt_fila_versao_mudou()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.publicacao = 'na_fila' and new.publicacao = 'na_fila' and (
       new.hook is distinct from old.hook or new.body is distinct from old.body
       or new.script is distinct from old.script or new.slides is distinct from old.slides
       or new.cta is distinct from old.cta or new.hashtags is distinct from old.hashtags
       or new.format is distinct from old.format or new.scheduled_at is distinct from old.scheduled_at) then
    new.publicar_sozinho := false;
    new.publicacao := 'manual';
    new.publicacao_erro := 'Saiu da fila: a versão mudou depois de entrar. Confira e ligue de novo.';
  end if;
  -- Resultado digitado na tela (o caminho automático marca a origem antes).
  if new.results is distinct from old.results and coalesce(current_setting('mk5.automatico', true), '') <> 'sim' then
    new.resultados_fonte := case when new.results is null then null else 'manual' end;
    new.resultados_em := case when new.results is null then null else now() end;
  end if;
  return new;
end;
$$;
create trigger mkt_versions_fila before update on public.mkt_versions
  for each row execute function public._mkt_fila_versao_mudou();

-- Arquivo ligado ou tirado da versão na fila: sai da fila.
create or replace function public._mkt_fila_midia_mudou()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.mkt_versions
     set publicar_sozinho = false, publicacao = 'manual',
         publicacao_erro = 'Saiu da fila: os arquivos mudaram depois de entrar. Confira e ligue de novo.'
   where id = coalesce(new.version_id, old.version_id) and publicacao = 'na_fila';
  return null;
end;
$$;
create trigger mkt_version_media_fila after insert or delete on public.mkt_version_media
  for each row execute function public._mkt_fila_midia_mudou();

-- A peça saiu de "Pronto" (aprovação desfeita, ajuste pedido): as versões saem da fila.
create or replace function public._mkt_fila_peca_mudou()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage and new.stage <> 'pronto' then
    update public.mkt_versions
       set publicar_sozinho = false, publicacao = 'manual',
           publicacao_erro = 'Saiu da fila: a peça voltou para a aprovação.'
     where piece_id = new.id and publicacao = 'na_fila';
  end if;
  return null;
end;
$$;
create trigger mkt_pieces_fila after update of stage on public.mkt_pieces
  for each row execute function public._mkt_fila_peca_mudou();

-- ---------------------------------------------------------------------
-- 2. Ligar e desligar (dono)
-- ---------------------------------------------------------------------
create or replace function public.mkt_versao_publicar_sozinho(p_id uuid, p_ligar boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions := public._mkt_versao_do_dono(p_id);
  p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
  falta text[];
begin
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  if p_ligar then
    if p.stage <> 'pronto' then raise exception 'peca_nao_aprovada' using errcode = '22023'; end if;
    if v.scheduled_at is null then raise exception 'sem_data' using errcode = '22023'; end if;
    if v.scheduled_at < now() + interval '2 minutes' then raise exception 'data_no_passado' using errcode = '22023'; end if;
    falta := public._mkt_falta_midia(p);
    if cardinality(falta) > 0 then
      raise exception 'revisao_pendente' using errcode = '22023', detail = array_to_string(falta, ', ');
    end if;
    if exists (select 1 from public.mkt_version_media x join public.materials m on m.id = x.material_id
                where x.version_id = v.id and m.deleted_at is not null) then
      raise exception 'material_na_lixeira' using errcode = '22023';
    end if;
    if v.publicacao = 'enviada' then raise exception 'publicacao_em_andamento' using errcode = '22023'; end if;
    update public.mkt_versions
       set publicar_sozinho = true, publicacao = 'na_fila', publicacao_erro = null
     where id = v.id;
    perform public._mkt_evento(p, v.id, 'publicacao', null, null,
      'Publicar sozinho em ' || to_char(v.scheduled_at at time zone (select timezone from public.tenants where id = p.tenant_id), 'DD/MM HH24:MI'));
  else
    if v.publicacao = 'enviada' then raise exception 'publicacao_em_andamento' using errcode = '22023'; end if;
    update public.mkt_versions
       set publicar_sozinho = false, publicacao = 'manual', publicacao_erro = null
     where id = v.id;
    perform public._mkt_evento(p, v.id, 'publicacao', null, null, 'Publicar sozinho desligado');
  end if;
  return public._mkt_peca_json(p);
end;
$$;

-- Para o Painel: o que não saiu (ou saiu da fila) e precisa do Yuri.
create or replace function public.mkt_publicacoes_com_problema()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('peca_id', p.id, 'titulo', p.title, 'versao_id', v.id, 'canal', v.channel,
                                               'canal_nome', ch.name, 'erro', v.publicacao_erro, 'situacao', v.publicacao)
                            order by v.scheduled_at nulls last), '[]'::jsonb)
    from public.mkt_versions v
    join public.mkt_pieces p on p.id = v.piece_id
    left join public.mkt_channels ch on ch.tenant_id = v.tenant_id and ch.slug = v.channel
   where v.tenant_id = public._tenant_do_dono() and v.published_at is null and v.publicacao_erro is not null
     and v.publicacao in ('falhou', 'manual') and p.stage = 'pronto';
$$;

-- ---------------------------------------------------------------------
-- 3. A função de servidor (só a chave de serviço)
-- ---------------------------------------------------------------------
-- Versões na hora de sair (de todos os tenants; cada pacote leva o tenant).
create or replace function public.mkt_publicacoes_devidas(p_limite integer default 20)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.id order by x.scheduled_at), '[]'::jsonb)
    from (select id, scheduled_at from public.mkt_versions
           where publicacao = 'na_fila' and publicar_sozinho and published_at is null
             and scheduled_at <= now() + interval '1 minute'
           order by scheduled_at limit least(greatest(coalesce(p_limite, 20), 1), 50)) x;
$$;

-- Texto que vai para cada rede: Instagram e TikTok não aceitam link na legenda (vai "link na bio");
-- LinkedIn e YouTube levam o link com rastreio do MK-4.
create or replace function public._mkt_legenda(v public.mkt_versions)
returns text language sql stable security definer set search_path = public as $$
  select trim(both E'\n' from concat_ws(E'\n\n',
    nullif(trim(coalesce(v.body, '')), ''),
    case when v.channel in ('linkedin', 'youtube') then public._mkt_link(v) end,
    nullif(trim(coalesce(v.hashtags, '')), '')));
$$;

-- Trava a versão, confere tudo de novo e marca "enviada". Devolve o pacote, ou null se não deve sair
-- (desligada, editada, já enviada). Chamar duas vezes não publica duas vezes.
create or replace function public.mkt_publicacao_iniciar(p_versao uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions;
  p public.mkt_pieces;
begin
  select * into v from public.mkt_versions where id = p_versao;
  if v.id is null then return null; end if;
  select * into p from public.mkt_pieces where id = v.piece_id for update;
  select * into v from public.mkt_versions where id = p_versao for update;
  if v.publicacao <> 'na_fila' or not v.publicar_sozinho or v.published_at is not null
     or p.stage <> 'pronto' or v.scheduled_at is null or v.scheduled_at > now() + interval '2 minutes' then
    return null;
  end if;
  if exists (select 1 from public.mkt_version_media x join public.materials m on m.id = x.material_id
              where x.version_id = v.id and m.deleted_at is not null) then
    update public.mkt_versions
       set publicacao = 'falhou', publicar_sozinho = false, publicacao_erro = 'Um arquivo está na lixeira de Materiais.'
     where id = v.id;
    return null;
  end if;
  update public.mkt_versions set publicacao = 'enviada', publicacao_em = now(), publicacao_erro = null where id = v.id;
  return jsonb_build_object(
    'versao_id', v.id, 'peca_id', p.id, 'tenant_id', v.tenant_id,
    'canal', v.channel, 'formato', v.format, 'quando', v.scheduled_at,
    'titulo', coalesce(nullif(trim(v.hook), ''), p.title),
    'legenda', public._mkt_legenda(v),
    'link', public._mkt_link(v),
    'arquivos', coalesce((select jsonb_agg(jsonb_build_object('papel', x.role, 'caminho', m.storage_path, 'mime', m.mime_type,
                                                              'nome', m.file_name) order by x.position, x.created_at)
                            from public.mkt_version_media x join public.materials m on m.id = x.material_id
                           where x.version_id = v.id), '[]'::jsonb));
end;
$$;

-- Marca publicada (o mesmo que o "Marcar como publicada" do MK-1, sem login de pessoa).
create or replace function public._mkt_marcar_publicada(v public.mkt_versions, p_link text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare p public.mkt_pieces;
begin
  select * into p from public.mkt_pieces where id = v.piece_id for update;
  update public.mkt_versions set published_at = now(), published_url = p_link, publicacao = 'publicada', publicacao_erro = null
   where id = v.id;
  perform public._mkt_evento(p, v.id, 'publicada', null, null, v.channel || ' · ' || v.format || ' · publicada sozinha');
  insert into public.event_outbox (tenant_id, event, payload)
  values (p.tenant_id, 'marketing.versao_publicada', jsonb_build_object('peca_id', p.id, 'versao_id', v.id,
    'canal', v.channel, 'formato', v.format, 'link', p_link, 'quando', now(), 'pilar', p.pillar, 'automatica', true));
  perform public._mkt_avancar_publicacao(p);
end;
$$;

-- Devolve o que aconteceu: enviada (com o id do pedido), publicada (com o link) ou falhou (com o motivo).
create or replace function public.mkt_publicacao_registrar(
  p_versao uuid, p_situacao text, p_link text default null, p_id_externo text default null, p_erro text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v public.mkt_versions;
begin
  select * into v from public.mkt_versions where id = p_versao for update;
  if v.id is null then raise exception 'versao_inexistente' using errcode = 'P0002'; end if;
  if p_situacao is null or p_situacao not in ('enviada', 'publicada', 'falhou') then
    raise exception 'situacao_invalida' using errcode = '22023';
  end if;
  if v.published_at is not null then return jsonb_build_object('ok', true, 'ja_publicada', true); end if;
  if v.publicacao not in ('enviada', 'na_fila') then raise exception 'fora_da_fila' using errcode = '22023'; end if;

  if p_situacao = 'enviada' then
    update public.mkt_versions set id_externo = coalesce(left(p_id_externo, 200), id_externo) where id = v.id;
  elsif p_situacao = 'publicada' then
    if coalesce(trim(p_link), '') !~ '^https://[^\s]{4,}$' then raise exception 'link_invalido' using errcode = '22023'; end if;
    update public.mkt_versions set id_externo = coalesce(left(p_id_externo, 200), id_externo) where id = v.id returning * into v;
    perform public._mkt_marcar_publicada(v, trim(p_link));
  else
    update public.mkt_versions
       set publicacao = 'falhou', publicar_sozinho = false,
           publicacao_erro = left(coalesce(nullif(trim(p_erro), ''), 'A rede não aceitou a publicação.'), 300)
     where id = v.id;
    insert into public.event_outbox (tenant_id, event, payload)
    values (v.tenant_id, 'marketing.publicacao_falhou', jsonb_build_object('peca_id', v.piece_id, 'versao_id', v.id,
      'canal', v.channel, 'erro', left(p_erro, 300)));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Enviadas esperando a confirmação da rede (a função confere a situação no Upload-Post).
create or replace function public.mkt_publicacoes_enviadas()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('versao_id', id, 'canal', channel, 'id_externo', id_externo,
                                               'enviada_em', publicacao_em) order by publicacao_em), '[]'::jsonb)
    from public.mkt_versions
   where publicacao = 'enviada' and published_at is null;
$$;

-- Publicadas há até 30 dias com post conhecido, para buscar os números uma vez por dia.
create or replace function public.mkt_versoes_para_medir()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('versao_id', id, 'canal', channel, 'id_externo', id_externo,
                                               'link', published_url, 'publicada_em', published_at)
                            order by published_at desc), '[]'::jsonb)
    from (select * from public.mkt_versions
           where published_at > now() - interval '30 days' and id_externo is not null
           order by published_at desc limit 200) v;
$$;

-- Números da rede. Não passa por cima do que alguém digitou nas últimas 24 h.
create or replace function public.mkt_resultados_automaticos(p_versao uuid, p_numeros jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions;
  p public.mkt_pieces;
  r jsonb := '{}'::jsonb; k text; n numeric;
begin
  select * into v from public.mkt_versions where id = p_versao;
  if v.id is null then raise exception 'versao_inexistente' using errcode = 'P0002'; end if;
  if v.published_at is null then raise exception 'versao_nao_publicada' using errcode = '22023'; end if;
  if v.resultados_fonte = 'manual' and v.resultados_em > now() - interval '24 hours' then
    return jsonb_build_object('ok', false, 'motivo', 'manual_recente');
  end if;
  if p_numeros is null or jsonb_typeof(p_numeros) <> 'object' then raise exception 'resultados_invalidos' using errcode = '22023'; end if;
  foreach k in array array['alcance', 'salvamentos', 'cliques', 'mensagens', 'comentarios', 'curtidas',
                           'compartilhamentos', 'visualizacoes'] loop
    if p_numeros ? k and jsonb_typeof(p_numeros -> k) = 'number' then
      n := (p_numeros ->> k)::numeric;
      if n >= 0 and n = trunc(n) and n <= 2000000000 then r := r || jsonb_build_object(k, n::bigint); end if;
    end if;
  end loop;
  if r = '{}'::jsonb then return jsonb_build_object('ok', false, 'motivo', 'sem_numeros'); end if;

  select * into p from public.mkt_pieces where id = v.piece_id for update;
  perform set_config('mk5.automatico', 'sim', true);
  update public.mkt_versions
     set results = r || jsonb_build_object('registrado_em', now()), resultados_fonte = 'automatico', resultados_em = now()
   where id = v.id;
  perform set_config('mk5.automatico', '', true);
  if v.results is null then
    perform public._mkt_evento(p, v.id, 'resultados', null, null, v.channel || ' · números da rede');
  end if;
  perform public._mkt_avancar_publicacao(p);
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. "Falta registrar" (MK-4) não lista o que a rede mede sozinha
-- ---------------------------------------------------------------------
create or replace function public.mkt_resultados_destaques(p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 400 then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;
  return (
    with base as (select * from public._mkt_versoes_do_periodo(t, p_inicio, p_fim)),
    pecas as (
      select b.peca_id, min(b.titulo) as titulo, sum(b.contatos) as contatos, sum(b.alcance) as alcance,
             sum(b.salvamentos) as salvamentos
        from base b group by b.peca_id)
    select jsonb_build_object(
      'por_contatos', coalesce((select jsonb_agg(jsonb_build_object('peca_id', x.peca_id, 'titulo', x.titulo, 'contatos', x.contatos))
                                  from (select * from pecas where contatos > 0 order by contatos desc, alcance desc limit 5) x), '[]'::jsonb),
      'por_salvamentos', coalesce((select jsonb_agg(jsonb_build_object('peca_id', x.peca_id, 'titulo', x.titulo, 'alcance', x.alcance,
                                                                       'salvamentos_por_mil', round(x.salvamentos::numeric * 1000 / x.alcance, 1)))
                                     from (select * from pecas where alcance >= 100
                                            order by salvamentos::numeric / alcance desc, alcance desc limit 5) x), '[]'::jsonb),
      'falta_registrar', coalesce((
        select jsonb_agg(jsonb_build_object('peca_id', p.id, 'titulo', p.title, 'versao_id', v.id, 'canal', v.channel,
                                            'canal_nome', ch.name, 'publicada_em', v.published_at) order by v.published_at)
          from (select * from public.mkt_versions
                 where tenant_id = t and published_at is not null and results is null and id_externo is null
                   and published_at < now() - interval '7 days'
                 order by published_at limit 50) v
          join public.mkt_pieces p on p.id = v.piece_id
          left join public.mkt_channels ch on ch.tenant_id = t and ch.slug = v.channel), '[]'::jsonb))
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Permissões
-- ---------------------------------------------------------------------
revoke all on function public._mkt_fila_versao_mudou() from public, anon, authenticated;
revoke all on function public._mkt_fila_midia_mudou() from public, anon, authenticated;
revoke all on function public._mkt_fila_peca_mudou() from public, anon, authenticated;
revoke all on function public._mkt_legenda(public.mkt_versions) from public, anon, authenticated;
revoke all on function public._mkt_marcar_publicada(public.mkt_versions, text) from public, anon, authenticated;

revoke all on function public.mkt_versao_publicar_sozinho(uuid, boolean) from public, anon;
revoke all on function public.mkt_publicacoes_com_problema() from public, anon;
grant execute on function public.mkt_versao_publicar_sozinho(uuid, boolean) to authenticated;
grant execute on function public.mkt_publicacoes_com_problema() to authenticated;

revoke all on function public.mkt_publicacoes_devidas(integer) from public, anon, authenticated;
revoke all on function public.mkt_publicacao_iniciar(uuid) from public, anon, authenticated;
revoke all on function public.mkt_publicacao_registrar(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.mkt_publicacoes_enviadas() from public, anon, authenticated;
revoke all on function public.mkt_versoes_para_medir() from public, anon, authenticated;
revoke all on function public.mkt_resultados_automaticos(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.mkt_publicacoes_devidas(integer) to service_role;
grant execute on function public.mkt_publicacao_iniciar(uuid) to service_role;
grant execute on function public.mkt_publicacao_registrar(uuid, text, text, text, text) to service_role;
grant execute on function public.mkt_publicacoes_enviadas() to service_role;
grant execute on function public.mkt_versoes_para_medir() to service_role;
grant execute on function public.mkt_resultados_automaticos(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 6. Agenda: publicar e conferir a cada 5 min; números 1 vez por dia (só onde pg_cron e pg_net existem)
-- A função não exige login: só trabalha a fila do banco e não devolve dados (como a busca de reuniões).
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname in ('marketing-publicar', 'marketing-medir');
    perform cron.schedule('marketing-publicar', '*/5 * * * *', $cron$
      select net.http_post(
        url := 'https://cjzzbpqwlpjvlawllfqy.supabase.co/functions/v1/marketing-publicar/publicar',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 5000);
    $cron$);
    -- 06h13 em Fortaleza (09h13 UTC): números da véspera já fechados nas redes.
    perform cron.schedule('marketing-medir', '13 9 * * *', $cron$
      select net.http_post(
        url := 'https://cjzzbpqwlpjvlawllfqy.supabase.co/functions/v1/marketing-publicar/medir',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 5000);
    $cron$);
  end if;
end $$;
