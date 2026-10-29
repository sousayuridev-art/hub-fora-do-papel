-- =====================================================================
-- Hub Fora do Papel · MK-5 · Publicação e números automáticos (banco)
-- Card: docs/cards/MK-5-publicacao-e-numeros-automaticos.md
-- Decisão do Yuri (29/10): Upload-Post. O Hub guarda a fila e a situação; a função de servidor
-- `marketing-publicar` (chave de serviço, chamada pelo pg_cron com um segredo do Vault) pega o que está
-- na hora, pede o pacote da versão, publica e devolve link e números. O n8n só recebe o aviso de falha.
-- A pessoa decide: só sai o que foi aprovado, tem data e está com "Publicar sozinho" ligado, e só
-- no perfil do Upload-Post ligado ao próprio tenant.
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

-- Perfil do Upload-Post de cada tenant. Os perfis ficam na conta da agência no Upload-Post, então só
-- quem administra o banco liga um perfil a um tenant (o dono só lê o seu).
create table public.mkt_publicacao_contas (
  tenant_id        uuid primary key references public.tenants (id) on delete cascade,
  perfil           text not null check (perfil ~ '^[A-Za-z0-9_.-]{2,60}$'),
  pagina_linkedin  text check (pagina_linkedin is null or pagina_linkedin ~ '^[0-9]{3,20}$'),
  criado_em        timestamptz not null default now()
);
alter table public.mkt_publicacao_contas enable row level security;
create policy mkt_publicacao_contas_owner_select on public.mkt_publicacao_contas
  for select to authenticated using (public.is_tenant_owner(tenant_id));
revoke all on public.mkt_publicacao_contas from anon;
revoke insert, update, delete, truncate on public.mkt_publicacao_contas from authenticated;
-- Fora do Papel: perfil "fora-do-papel" (criar com esse nome no Upload-Post).
insert into public.mkt_publicacao_contas (tenant_id, perfil)
select id, 'fora-do-papel' from public.tenants where slug = 'fora-do-papel'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 1. A versão nunca sai diferente do que foi aprovado
-- ---------------------------------------------------------------------
create or replace function public._mkt_conteudo_mudou(n public.mkt_versions, o public.mkt_versions)
returns boolean language sql immutable set search_path = public as $$
  select n.hook is distinct from o.hook or n.body is distinct from o.body
      or n.script is distinct from o.script or n.slides is distinct from o.slides
      or n.cta is distinct from o.cta or n.hashtags is distinct from o.hashtags
      or n.format is distinct from o.format or n.scheduled_at is distinct from o.scheduled_at;
$$;

-- Na fila: mudou, sai da fila (com aviso). Enviada para a rede: não muda até a rede responder.
create or replace function public._mkt_fila_versao_mudou()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.publicacao = 'enviada' and new.publicacao = 'enviada'
     and (public._mkt_conteudo_mudou(new, old) or new.published_at is distinct from old.published_at) then
    raise exception 'publicacao_em_andamento' using errcode = '22023';
  end if;
  -- Publicada à mão enquanto estava na fila: sai da fila (não sai de novo).
  if old.publicacao = 'na_fila' and new.publicacao = 'na_fila' and new.published_at is not null then
    new.publicar_sozinho := false;
    new.publicacao := 'manual';
    new.publicacao_erro := null;
    return new;
  end if;
  if old.publicacao = 'na_fila' and new.publicacao = 'na_fila' and public._mkt_conteudo_mudou(new, old) then
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

-- Versão (ou peça) enviada para a rede não é apagada: o post sairia sem registro.
create or replace function public._mkt_fila_versao_apagada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.publicacao = 'enviada' then raise exception 'publicacao_em_andamento' using errcode = '22023'; end if;
  return old;
end;
$$;
create trigger mkt_versions_fila_apagar before delete on public.mkt_versions
  for each row execute function public._mkt_fila_versao_apagada();

-- Arquivo ligado ou tirado: na fila, sai da fila; enviada, não muda.
create or replace function public._mkt_fila_midia_mudou()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id uuid := coalesce(new.version_id, old.version_id);
begin
  if exists (select 1 from public.mkt_versions where id = v_id and publicacao = 'enviada') then
    raise exception 'publicacao_em_andamento' using errcode = '22023';
  end if;
  update public.mkt_versions
     set publicar_sozinho = false, publicacao = 'manual',
         publicacao_erro = 'Saiu da fila: os arquivos mudaram depois de entrar. Confira e ligue de novo.'
   where id = v_id and publicacao = 'na_fila';
  return null;
end;
$$;
create trigger mkt_version_media_fila after insert or delete on public.mkt_version_media
  for each row execute function public._mkt_fila_midia_mudou();

-- A peça saiu de "Pronto" ou mudou de título (vira título no YouTube, TikTok e documento).
create or replace function public._mkt_fila_peca_mudou()
returns trigger language plpgsql security definer set search_path = public as $$
declare saiu boolean := new.stage is distinct from old.stage and new.stage not in ('pronto', 'publicado', 'analisado');
        titulo boolean := new.title is distinct from old.title;
begin
  if not (saiu or titulo) then return null; end if;
  if exists (select 1 from public.mkt_versions where piece_id = new.id and publicacao = 'enviada') then
    raise exception 'publicacao_em_andamento' using errcode = '22023';
  end if;
  update public.mkt_versions
     set publicar_sozinho = false, publicacao = 'manual',
         publicacao_erro = case when saiu then 'Saiu da fila: a peça voltou para a aprovação.'
                                else 'Saiu da fila: o título da peça mudou. Confira e ligue de novo.' end
   where piece_id = new.id and publicacao = 'na_fila';
  return null;
end;
$$;
create trigger mkt_pieces_fila after update of stage, title on public.mkt_pieces
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
  if v.publicacao = 'enviada' then raise exception 'publicacao_em_andamento' using errcode = '22023'; end if;
  if p_ligar then
    if not exists (select 1 from public.mkt_publicacao_contas where tenant_id = v.tenant_id) then
      raise exception 'sem_conta_publicacao' using errcode = '22023';
    end if;
    if p.stage <> 'pronto' then raise exception 'peca_nao_aprovada' using errcode = '22023'; end if;
    if not exists (select 1 from public.mkt_channels where tenant_id = v.tenant_id and slug = v.channel and active) then
      raise exception 'canal_inexistente' using errcode = '22023';
    end if;
    -- Anúncio (Tráfego pago) e artigo do LinkedIn não têm caminho automático: saem à mão.
    if v.format in ('anuncio', 'artigo') then raise exception 'formato_sem_publicacao' using errcode = '22023'; end if;
    if v.format = 'documento' and not exists (select 1 from public.mkt_version_media where version_id = v.id and role = 'documento') then
      raise exception 'documento_sem_pdf' using errcode = '22023';
    end if;
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
    update public.mkt_versions
       set publicar_sozinho = true, publicacao = 'na_fila', publicacao_erro = null
     where id = v.id;
    perform public._mkt_evento(p, v.id, 'publicacao', null, null,
      'Publicar sozinho em ' || to_char(v.scheduled_at at time zone (select timezone from public.tenants where id = p.tenant_id), 'DD/MM HH24:MI'));
  else
    update public.mkt_versions
       set publicar_sozinho = false, publicacao = 'manual', publicacao_erro = null
     where id = v.id;
    perform public._mkt_evento(p, v.id, 'publicacao', null, null, 'Publicar sozinho desligado');
  end if;
  return public._mkt_peca_json(p);
end;
$$;

-- Para a tela: o tenant tem perfil do Upload-Post ligado?
create or replace function public.mkt_publicacao_ligada()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mkt_publicacao_contas where tenant_id = public._tenant_do_dono());
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
-- Segredo da chamada do pg_cron (no Vault; a função confere antes de trabalhar).
create or replace function public.mkt_publicar_segredo_confere(p_segredo text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare s text;
begin
  if to_regclass('vault.decrypted_secrets') is null then return false; end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into s using 'marketing_publicar';
  -- Compara os resumos (mesmo tamanho sempre), não o texto.
  return s is not null and p_segredo is not null
     and extensions.digest(p_segredo, 'sha256') = extensions.digest(s, 'sha256');
end;
$$;

-- Versões na hora de sair, só de tenants com perfil ligado.
create or replace function public.mkt_publicacoes_devidas(p_limite integer default 20)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.id order by x.scheduled_at), '[]'::jsonb)
    from (select v.id, v.scheduled_at from public.mkt_versions v
            join public.mkt_publicacao_contas c on c.tenant_id = v.tenant_id
           where v.publicacao = 'na_fila' and v.publicar_sozinho and v.published_at is null
             and v.scheduled_at <= now() + interval '1 minute'
           order by v.scheduled_at limit least(greatest(coalesce(p_limite, 20), 1), 50)) x;
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

-- Trava peça e versão (mesma ordem do MK-1), confere tudo de novo e marca "enviada". Devolve o pacote,
-- ou null se não deve sair. Chamar duas vezes não publica duas vezes.
create or replace function public.mkt_publicacao_iniciar(p_versao uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions;
  p public.mkt_pieces;
  c public.mkt_publicacao_contas;
begin
  select * into v from public.mkt_versions where id = p_versao;
  if v.id is null then return null; end if;
  select * into p from public.mkt_pieces where id = v.piece_id for update;
  select * into v from public.mkt_versions where id = p_versao for update;
  if v.publicacao <> 'na_fila' or not v.publicar_sozinho or v.published_at is not null
     or p.stage <> 'pronto' or v.scheduled_at is null or v.scheduled_at > now() + interval '2 minutes' then
    return null;
  end if;
  select * into c from public.mkt_publicacao_contas where tenant_id = v.tenant_id;
  if c.tenant_id is null then
    perform public._mkt_publicacao_falhou(v, 'Nenhum perfil do Upload-Post ligado a esta empresa.');
    return null;
  end if;
  if v.scheduled_at < now() - interval '2 hours' then
    perform public._mkt_publicacao_falhou(v, 'Passou da hora marcada sem o envio automático rodar. Confira e marque uma nova data.');
    return null;
  end if;
  if exists (select 1 from public.mkt_version_media x join public.materials m on m.id = x.material_id
              where x.version_id = v.id and m.deleted_at is not null) then
    perform public._mkt_publicacao_falhou(v, 'Um arquivo está na lixeira de Materiais.');
    return null;
  end if;
  update public.mkt_versions set publicacao = 'enviada', publicacao_em = now(), publicacao_erro = null where id = v.id;
  return jsonb_build_object(
    'versao_id', v.id, 'peca_id', p.id, 'tenant_id', v.tenant_id,
    'perfil', c.perfil, 'pagina_linkedin', c.pagina_linkedin,
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

-- Não saiu: volta para a pessoa com o motivo e avisa pelo n8n (WhatsApp).
create or replace function public._mkt_publicacao_falhou(v public.mkt_versions, p_erro text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare e text := left(regexp_replace(coalesce(nullif(trim(p_erro), ''), 'A rede não aceitou a publicação.'),
                                      'https?://\S+', '[link]', 'g'), 300);
begin
  update public.mkt_versions set publicacao = 'falhou', publicar_sozinho = false, publicacao_erro = e where id = v.id;
  insert into public.event_outbox (tenant_id, event, payload)
  values (v.tenant_id, 'marketing.publicacao_falhou', jsonb_build_object('peca_id', v.piece_id, 'versao_id', v.id,
    'canal', v.channel, 'erro', e));
end;
$$;

-- Marca publicada (o mesmo que o "Marcar como publicada" do MK-1, sem login de pessoa).
-- Quem chama já travou a peça e a versão, nessa ordem.
create or replace function public._mkt_marcar_publicada(v public.mkt_versions, p public.mkt_pieces, p_link text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
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
-- Links no texto do erro saem (a rede pode repetir o endereço assinado do arquivo).
create or replace function public.mkt_publicacao_registrar(
  p_versao uuid, p_situacao text, p_link text default null, p_id_externo text default null, p_erro text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions;
  p public.mkt_pieces;
begin
  if p_situacao is null or p_situacao not in ('enviada', 'publicada', 'falhou') then
    raise exception 'situacao_invalida' using errcode = '22023';
  end if;
  select * into v from public.mkt_versions where id = p_versao;
  if v.id is null then raise exception 'versao_inexistente' using errcode = 'P0002'; end if;
  select * into p from public.mkt_pieces where id = v.piece_id for update;
  select * into v from public.mkt_versions where id = p_versao for update;
  if v.published_at is not null then return jsonb_build_object('ok', true, 'ja_publicada', true); end if;
  if v.publicacao not in ('enviada', 'na_fila') then raise exception 'fora_da_fila' using errcode = '22023'; end if;

  if p_situacao = 'enviada' then
    update public.mkt_versions set id_externo = coalesce(left(p_id_externo, 200), id_externo) where id = v.id;
  elsif p_situacao = 'publicada' then
    if coalesce(trim(p_link), '') !~ '^https://[^\s]{4,}$' then raise exception 'link_invalido' using errcode = '22023'; end if;
    update public.mkt_versions set id_externo = coalesce(left(p_id_externo, 200), id_externo) where id = v.id returning * into v;
    perform public._mkt_marcar_publicada(v, p, trim(p_link));
  else
    perform public._mkt_publicacao_falhou(v, p_erro);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Enviadas esperando a confirmação da rede (a função confere a situação no Upload-Post).
create or replace function public.mkt_publicacoes_enviadas()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('versao_id', v.id, 'canal', v.channel, 'id_externo', v.id_externo,
                                               'enviada_em', v.publicacao_em) order by v.publicacao_em), '[]'::jsonb)
    from public.mkt_versions v
   -- Sem exigir o perfil: uma enviada de tenant que perdeu o perfil também precisa de saída.
   where v.publicacao = 'enviada' and v.published_at is null;
$$;

-- Publicadas há até 30 dias com post conhecido (com o perfil do tenant), para buscar os números.
create or replace function public.mkt_versoes_para_medir()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('versao_id', x.id, 'canal', x.channel, 'id_externo', x.id_externo,
                                               'link', x.published_url, 'publicada_em', x.published_at, 'perfil', x.perfil)
                            order by x.published_at desc), '[]'::jsonb)
    from (select v.*, c.perfil from public.mkt_versions v
            join public.mkt_publicacao_contas c on c.tenant_id = v.tenant_id
           where v.published_at > now() - interval '30 days' and v.id_externo is not null
           order by v.published_at desc limit 200) x;
$$;

-- Números da rede: somam-se ao que existe (mensagens e outros digitados ficam). Não passa por cima
-- do que alguém digitou nas últimas 24 h.
create or replace function public.mkt_resultados_automaticos(p_versao uuid, p_numeros jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions;
  p public.mkt_pieces;
  r jsonb := '{}'::jsonb; k text; n numeric;
begin
  if p_numeros is null or jsonb_typeof(p_numeros) <> 'object' then raise exception 'resultados_invalidos' using errcode = '22023'; end if;
  foreach k in array array['alcance', 'salvamentos', 'cliques', 'mensagens', 'comentarios', 'curtidas',
                           'compartilhamentos', 'visualizacoes'] loop
    if p_numeros ? k and jsonb_typeof(p_numeros -> k) = 'number' then
      n := (p_numeros ->> k)::numeric;
      if n >= 0 and n = trunc(n) and n <= 2000000000 then r := r || jsonb_build_object(k, n::bigint); end if;
    end if;
  end loop;
  if r = '{}'::jsonb then return jsonb_build_object('ok', false, 'motivo', 'sem_numeros'); end if;

  select * into v from public.mkt_versions where id = p_versao;
  if v.id is null then raise exception 'versao_inexistente' using errcode = 'P0002'; end if;
  select * into p from public.mkt_pieces where id = v.piece_id for update;
  select * into v from public.mkt_versions where id = p_versao for update;
  if v.published_at is null then raise exception 'versao_nao_publicada' using errcode = '22023'; end if;
  if v.resultados_fonte = 'manual' and v.resultados_em > now() - interval '24 hours' then
    return jsonb_build_object('ok', false, 'motivo', 'manual_recente');
  end if;

  perform set_config('mk5.automatico', 'sim', true);
  update public.mkt_versions
     set results = coalesce(results, '{}'::jsonb) || r || jsonb_build_object('registrado_em', now()),
         resultados_fonte = 'automatico', resultados_em = now()
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
-- 4. Permissões
-- ---------------------------------------------------------------------
revoke all on function public._mkt_conteudo_mudou(public.mkt_versions, public.mkt_versions) from public, anon, authenticated;
revoke all on function public._mkt_fila_versao_mudou() from public, anon, authenticated;
revoke all on function public._mkt_fila_versao_apagada() from public, anon, authenticated;
revoke all on function public._mkt_fila_midia_mudou() from public, anon, authenticated;
revoke all on function public._mkt_fila_peca_mudou() from public, anon, authenticated;
revoke all on function public._mkt_legenda(public.mkt_versions) from public, anon, authenticated;
revoke all on function public._mkt_publicacao_falhou(public.mkt_versions, text) from public, anon, authenticated;
revoke all on function public._mkt_marcar_publicada(public.mkt_versions, public.mkt_pieces, text) from public, anon, authenticated;

revoke all on function public.mkt_versao_publicar_sozinho(uuid, boolean) from public, anon;
revoke all on function public.mkt_publicacao_ligada() from public, anon;
revoke all on function public.mkt_publicacoes_com_problema() from public, anon;
grant execute on function public.mkt_versao_publicar_sozinho(uuid, boolean) to authenticated;
grant execute on function public.mkt_publicacao_ligada() to authenticated;
grant execute on function public.mkt_publicacoes_com_problema() to authenticated;

revoke all on function public.mkt_publicar_segredo_confere(text) from public, anon, authenticated;
revoke all on function public.mkt_publicacoes_devidas(integer) from public, anon, authenticated;
revoke all on function public.mkt_publicacao_iniciar(uuid) from public, anon, authenticated;
revoke all on function public.mkt_publicacao_registrar(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.mkt_publicacoes_enviadas() from public, anon, authenticated;
revoke all on function public.mkt_versoes_para_medir() from public, anon, authenticated;
revoke all on function public.mkt_resultados_automaticos(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.mkt_publicar_segredo_confere(text) to service_role;
grant execute on function public.mkt_publicacoes_devidas(integer) to service_role;
grant execute on function public.mkt_publicacao_iniciar(uuid) to service_role;
grant execute on function public.mkt_publicacao_registrar(uuid, text, text, text, text) to service_role;
grant execute on function public.mkt_publicacoes_enviadas() to service_role;
grant execute on function public.mkt_versoes_para_medir() to service_role;
grant execute on function public.mkt_resultados_automaticos(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 5. Agenda: publicar e conferir a cada 5 min; números 1 vez por dia
-- Só onde pg_cron, pg_net e o Vault existem. Cada banco gera o próprio segredo: um banco local que
-- chame a função de produção é recusado (o segredo não bate).
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net')
     and to_regclass('vault.decrypted_secrets') is not null then
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
    if not exists (select 1 from vault.decrypted_secrets where name = 'marketing_publicar') then
      perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
                                  'marketing_publicar', 'Segredo do pg_cron para a função marketing-publicar (MK-5)');
    end if;
    perform cron.unschedule(jobid) from cron.job where jobname in ('marketing-publicar', 'marketing-medir');
    perform cron.schedule('marketing-publicar', '*/5 * * * *', $cron$
      select net.http_post(
        url := 'https://cjzzbpqwlpjvlawllfqy.supabase.co/functions/v1/marketing-publicar/publicar',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-segredo',
                     (select decrypted_secret from vault.decrypted_secrets where name = 'marketing_publicar')),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000);
    $cron$);
    -- 06h13 em Fortaleza (09h13 UTC): números da véspera já fechados nas redes.
    perform cron.schedule('marketing-medir', '13 9 * * *', $cron$
      select net.http_post(
        url := 'https://cjzzbpqwlpjvlawllfqy.supabase.co/functions/v1/marketing-publicar/medir',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-segredo',
                     (select decrypted_secret from vault.decrypted_secrets where name = 'marketing_publicar')),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000);
    $cron$);
  end if;
end $$;
