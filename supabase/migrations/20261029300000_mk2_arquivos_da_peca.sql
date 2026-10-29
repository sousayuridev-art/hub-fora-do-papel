-- =====================================================================
-- Hub Fora do Papel · MK-2 · Arquivos da peça e prévia real (banco)
-- Card: docs/cards/MK-2-arquivos-e-previa-real.md
-- Os arquivos continuam em Materiais (categoria nova "redes"); a versão só aponta para eles.
-- Formato visual sem arquivo não vai para aprovação (decisão do Yuri, 29/10). Arquivo enviado
-- pelo cliente só entra com o cliente ligado à peça e a autorização marcada (decisão do Yuri, 29/10).
-- =====================================================================

-- Categoria nova. O valor só é usado em funções (lidas na hora), não nesta transação.
alter type public.material_category add value if not exists 'redes';

-- Histórico ganha os tipos de arquivo
alter table public.mkt_events drop constraint mkt_events_kind_check;
alter table public.mkt_events add constraint mkt_events_kind_check
  check (kind in ('criada', 'etapa', 'aprovada', 'ajuste_pedido', 'reaberta', 'versao_adicionada', 'versao_removida',
                  'agendada', 'publicada', 'resultados', 'midia_ligada', 'midia_removida'));

-- ---------------------------------------------------------------------
-- 1. Tabela
-- ---------------------------------------------------------------------
create table public.mkt_version_media (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  version_id   uuid not null references public.mkt_versions (id) on delete cascade,
  -- restrict: o arquivo só sai de vez de Materiais depois de sair das peças.
  material_id  uuid not null references public.materials (id) on delete restrict,
  role         text not null check (role in ('slide', 'capa', 'imagem', 'video', 'documento')),
  position     smallint not null default 0 check (position between 0 and 99),
  created_at   timestamptz not null default now(),
  unique (version_id, material_id)
);
create index mkt_version_media_versao_idx on public.mkt_version_media (version_id, position);
create index mkt_version_media_material_idx on public.mkt_version_media (material_id);

alter table public.mkt_version_media enable row level security;
create policy mkt_version_media_owner_select on public.mkt_version_media
  for select to authenticated using (public.is_tenant_owner(tenant_id));
revoke all on public.mkt_version_media from anon;
revoke insert, update, delete, truncate on public.mkt_version_media from authenticated;

-- ---------------------------------------------------------------------
-- 2. Regras
-- ---------------------------------------------------------------------

-- Tipo de arquivo aceito em cada papel.
create or replace function public._mkt_papel_aceita(p_papel text, p_mime text)
returns boolean language sql immutable set search_path = public as $$
  select case p_papel
    when 'slide' then p_mime in ('image/png', 'image/jpeg', 'image/webp')
    when 'capa' then p_mime in ('image/png', 'image/jpeg', 'image/webp')
    when 'imagem' then p_mime in ('image/png', 'image/jpeg', 'image/webp')
    when 'video' then p_mime = 'video/mp4'
    when 'documento' then p_mime = 'application/pdf'
    else false end;
$$;

-- Papel que o formato exige para a aprovação (null = não exige arquivo).
create or replace function public._mkt_papel_exigido(p_formato text)
returns text language sql immutable set search_path = public as $$
  select case
    when p_formato in ('carrossel', 'carrossel_fotos') then 'slide'
    when p_formato = 'documento' then 'documento'
    when p_formato in ('post_unico', 'stories') then 'imagem'
    when p_formato in ('reels', 'video', 'video_curto', 'shorts', 'video_longo') then 'video'
    else null end;
$$;

create or replace function public._mkt_rotulo_papel(p_papel text)
returns text language sql immutable set search_path = public as $$
  select case p_papel when 'slide' then 'slides' when 'documento' then 'o PDF' when 'imagem' then 'imagem'
                      when 'video' then 'vídeo' when 'capa' then 'capa' else p_papel end;
$$;

-- O que falta nos arquivos para a aprovação (MK-2). Documento aceita o PDF ou slides em imagem.
create or replace function public._mkt_falta_midia(p public.mkt_pieces)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct f) filter (where f is not null), '{}'::text[]) from (
    select case
             when public._mkt_papel_exigido(v.format) is not null
              and not exists (select 1 from public.mkt_version_media x join public.materials m on m.id = x.material_id
                               where x.version_id = v.id and m.deleted_at is null
                                 and (x.role = public._mkt_papel_exigido(v.format)
                                      or (v.format = 'documento' and x.role = 'slide')))
             then public._mkt_rotulo_papel(public._mkt_papel_exigido(v.format)) || ' (' || coalesce(c.name, v.channel) || ')'
           end as f
      from public.mkt_versions v
      left join public.mkt_channels c on c.tenant_id = v.tenant_id and c.slug = v.channel
     where v.piece_id = p.id
    union all
    select 'tirar da lixeira os arquivos da peça'
     where exists (select 1 from public.mkt_versions v join public.mkt_version_media x on x.version_id = v.id
                     join public.materials m on m.id = x.material_id
                    where v.piece_id = p.id and m.deleted_at is not null)
    union all
    select 'trocar os arquivos de outro cliente'
     where exists (select 1 from public.mkt_versions v join public.mkt_version_media x on x.version_id = v.id
                     join public.materials m on m.id = x.material_id
                    where v.piece_id = p.id and m.origin = 'cliente' and m.client_id is distinct from p.client_id)
  ) t;
$$;

-- A porta da aprovação do MK-1, agora com os arquivos.
create or replace function public._mkt_falta_aprovacao(p public.mkt_pieces)
returns text[] language sql stable security definer set search_path = public as $$
  select public._mkt_falta_briefing(p) || array_remove(array[
    case when exists (select 1 from public.mkt_versions v where v.piece_id = p.id and length(trim(coalesce(v.body, ''))) = 0)
         then 'texto em todas as versões' end,
    case when exists (select 1 from public.mkt_versions v, jsonb_array_elements(v.warnings) a
                       where v.piece_id = p.id and (a ->> 'bloqueia')::boolean)
         then 'preencher os marcadores do texto' end,
    case when p.client_id is not null and not p.client_authorized then 'autorização do cliente' end
  ], null) || public._mkt_falta_midia(p);
$$;

-- Versão com os arquivos (o caminho só serve para pedir o link temporário ao Storage).
create or replace function public._mkt_versao_json(v public.mkt_versions)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(v) - 'tenant_id'
    || jsonb_build_object(
      'canal_nome', (select c.name from public.mkt_channels c where c.tenant_id = v.tenant_id and c.slug = v.channel),
      'limite_texto', (select c.text_limit from public.mkt_channels c where c.tenant_id = v.tenant_id and c.slug = v.channel),
      'midias', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', x.id, 'material_id', m.id, 'papel', x.role, 'posicao', x.position, 'titulo', m.title,
                 'arquivo', m.file_name, 'mime', m.mime_type, 'caminho', m.storage_path, 'origem', m.origin,
                 'na_lixeira', m.deleted_at is not null) order by x.position, x.created_at)
          from public.mkt_version_media x join public.materials m on m.id = x.material_id
         where x.version_id = v.id), '[]'::jsonb));
$$;

revoke all on function public._mkt_papel_aceita(text, text) from public, anon, authenticated;
revoke all on function public._mkt_papel_exigido(text) from public, anon, authenticated;
revoke all on function public._mkt_rotulo_papel(text) from public, anon, authenticated;
revoke all on function public._mkt_falta_midia(public.mkt_pieces) from public, anon, authenticated;
revoke all on function public._mkt_falta_aprovacao(public.mkt_pieces) from public, anon, authenticated;
revoke all on function public._mkt_versao_json(public.mkt_versions) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. RPCs de dono (travam a peça antes da versão, como no MK-1)
-- ---------------------------------------------------------------------
create or replace function public.mkt_midia_ligar(p_versao uuid, p_material uuid, p_papel text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions := public._mkt_versao_do_dono(p_versao);
  p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
  m public.materials;
begin
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  select * into m from public.materials where id = p_material and tenant_id = v.tenant_id;
  if m.id is null or m.kind <> 'arquivo' or m.ready_at is null then raise exception 'material_inexistente' using errcode = 'P0002'; end if;
  if m.deleted_at is not null then raise exception 'material_na_lixeira' using errcode = '22023'; end if;
  if p_papel is null or not public._mkt_papel_aceita(p_papel, m.mime_type) then raise exception 'tipo_do_arquivo' using errcode = '22023'; end if;
  -- Foto que o cliente enviou: só na peça daquele cliente (a autorização é conferida na aprovação).
  if m.origin = 'cliente' and m.client_id is distinct from p.client_id then
    raise exception 'arquivo_de_outro_cliente' using errcode = '22023';
  end if;
  if exists (select 1 from public.mkt_version_media where version_id = v.id and material_id = m.id) then
    raise exception 'arquivo_repetido' using errcode = '22023';
  end if;
  if (select count(*) from public.mkt_version_media where version_id = v.id) >= 20 then
    raise exception 'arquivos_demais' using errcode = '22023';
  end if;
  insert into public.mkt_version_media (tenant_id, version_id, material_id, role, position)
  values (v.tenant_id, v.id, m.id, p_papel,
          coalesce((select max(position) + 1 from public.mkt_version_media where version_id = v.id), 0));
  perform public._mkt_evento(p, v.id, 'midia_ligada', null, null, m.title);
  p := public._mkt_reabrir_se_aprovada(p, 'Arquivo trocado depois da aprovação');
  return public._mkt_peca_json(p);
end;
$$;

create or replace function public.mkt_midia_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  x public.mkt_version_media;
  v public.mkt_versions;
  p public.mkt_pieces;
begin
  select * into x from public.mkt_version_media where id = p_id and tenant_id = public._tenant_do_dono();
  if x.id is null then raise exception 'midia_inexistente' using errcode = 'P0002'; end if;
  v := public._mkt_versao_do_dono(x.version_id);
  p := public._mkt_peca_do_dono(v.piece_id);
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  delete from public.mkt_version_media where id = x.id;
  perform public._mkt_evento(p, v.id, 'midia_removida', null, null, (select title from public.materials where id = x.material_id));
  p := public._mkt_reabrir_se_aprovada(p, 'Arquivo trocado depois da aprovação');
  return public._mkt_peca_json(p);
end;
$$;

-- Nova ordem: a lista precisa ter exatamente os arquivos da versão.
create or replace function public.mkt_midia_ordenar(p_versao uuid, p_ids uuid[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions := public._mkt_versao_do_dono(p_versao);
  p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
begin
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  if p_ids is null or cardinality(p_ids) <> (select count(*) from public.mkt_version_media where version_id = v.id)
     or cardinality(p_ids) <> (select count(distinct i) from unnest(p_ids) i)
     or exists (select 1 from unnest(p_ids) i where not exists (
                  select 1 from public.mkt_version_media where id = i and version_id = v.id)) then
    raise exception 'ordem_invalida' using errcode = '22023';
  end if;
  update public.mkt_version_media x set position = o.n - 1
    from unnest(p_ids) with ordinality as o(id, n)
   where x.id = o.id and x.position <> o.n - 1;
  if found then
    p := public._mkt_reabrir_se_aprovada(p, 'Ordem dos arquivos alterada depois da aprovação');
  end if;
  return public._mkt_peca_json(p);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Materiais: a contagem da categoria nova
-- ---------------------------------------------------------------------
create or replace function public.materiais_lista()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  return jsonb_build_object(
    'contagem', (select jsonb_build_object(
        'todos', count(*) filter (where deleted_at is null),
        'lixeira', count(*) filter (where deleted_at is not null),
        'modelos', count(*) filter (where deleted_at is null and category = 'modelos'),
        'guias', count(*) filter (where deleted_at is null and category = 'guias'),
        'textos', count(*) filter (where deleted_at is null and category = 'textos'),
        'marca', count(*) filter (where deleted_at is null and category = 'marca'),
        'anuncios', count(*) filter (where deleted_at is null and category = 'anuncios'),
        'redes', count(*) filter (where deleted_at is null and category::text = 'redes'),
        'entregas', count(*) filter (where deleted_at is null and category = 'entregas'),
        'cliente', count(*) filter (where deleted_at is null and category = 'cliente'),
        'compartilhados', count(*) filter (where deleted_at is null and shared))
       from public.materials where tenant_id = t and (kind <> 'arquivo' or ready_at is not null)),
    'itens', coalesce((select jsonb_agg(public._material_json(m) order by m.updated_at desc)
       from public.materials m where m.tenant_id = t and (m.kind <> 'arquivo' or m.ready_at is not null)), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Materiais: arquivo usado numa peça não é apagado de vez
-- O app apaga do Storage antes do registro; a regra do Storage recusa (o arquivo fica) e a RPC
-- explica o motivo, sem deixar peça apontando para arquivo que não existe.
-- ---------------------------------------------------------------------
create or replace function public._material_pode_apagar(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.materials m
                  where m.storage_path = p_path and public.is_tenant_owner(m.tenant_id)
                    and not exists (select 1 from public.mkt_version_media x where x.material_id = m.id));
$$;

create or replace function public.material_excluir(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare m public.materials := public._material_do_dono(p_id);
begin
  if m.deleted_at is null then raise exception 'material_fora_da_lixeira' using errcode = '22023'; end if;
  if exists (select 1 from public.mkt_version_media where material_id = m.id) then
    raise exception 'material_em_uso' using errcode = '22023';
  end if;
  -- o app apaga o arquivo antes; se ele ainda existe, a remoção falhou e o registro fica (sem arquivo órfão)
  if m.storage_path is not null and exists (select 1 from storage.objects where bucket_id = 'materiais' and name = m.storage_path) then
    raise exception 'arquivo_nao_apagado' using errcode = '22023';
  end if;
  delete from public.materials where id = m.id;
  return jsonb_build_object('caminho', m.storage_path);
end;
$$;

revoke all on function public.mkt_midia_ligar(uuid, uuid, text) from public, anon;
revoke all on function public.mkt_midia_remover(uuid) from public, anon;
revoke all on function public.mkt_midia_ordenar(uuid, uuid[]) from public, anon;
grant execute on function public.mkt_midia_ligar(uuid, uuid, text) to authenticated;
grant execute on function public.mkt_midia_remover(uuid) to authenticated;
grant execute on function public.mkt_midia_ordenar(uuid, uuid[]) to authenticated;
