-- =====================================================================
-- Hub Fora do Papel · MK-6 · Modelos da marca (banco)
-- Card: docs/cards/MK-6-modelos-da-marca.md
-- Os quadros são desenhados no Hub; o banco guarda qual tema cada versão usou, para a grade
-- alternar as capas (escuro → claro → âmbar) e para o histórico.
-- =====================================================================

alter table public.mkt_versions add column modelo jsonb
  check (modelo is null or (
    jsonb_typeof(modelo) = 'object'
    and modelo ->> 'capa' in ('escuro', 'claro', 'ambar')
    and modelo ->> 'final' in ('ambar', 'escuro')));

alter table public.mkt_events drop constraint mkt_events_kind_check;
alter table public.mkt_events add constraint mkt_events_kind_check
  check (kind in ('criada', 'etapa', 'aprovada', 'ajuste_pedido', 'reaberta', 'versao_adicionada', 'versao_removida',
                  'agendada', 'publicada', 'resultados', 'midia_ligada', 'midia_removida', 'modelo_gerado'));

-- Grava o tema usado ao gerar os arquivos pelo modelo (os arquivos entram pelo caminho do MK-2).
create or replace function public.mkt_versao_modelo(p_id uuid, p_capa text, p_final text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.mkt_versions := public._mkt_versao_do_dono(p_id);
  p public.mkt_pieces := public._mkt_peca_do_dono(v.piece_id);
begin
  if v.published_at is not null then raise exception 'versao_publicada' using errcode = '22023'; end if;
  if p_capa is null or p_capa not in ('escuro', 'claro', 'ambar') or p_final is null or p_final not in ('ambar', 'escuro') then
    raise exception 'modelo_invalido' using errcode = '22023';
  end if;
  update public.mkt_versions
     set modelo = jsonb_build_object('capa', p_capa, 'final', p_final, 'gerado_em', now())
   where id = v.id
  returning * into v;
  perform public._mkt_evento(p, v.id, 'modelo_gerado', null, null, 'Capa ' || p_capa || ', final ' || p_final);
  return public._mkt_versao_json(v);
end;
$$;

-- Última capa gerada no canal (publicada, agendada ou só gerada; a mais recente) e o próximo tema.
create or replace function public.mkt_proxima_capa(p_canal text, p_ignorar uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  with ultima as (
    select v.modelo ->> 'capa' as capa
      from public.mkt_versions v
     where v.tenant_id = public._tenant_do_dono() and v.channel = p_canal and v.modelo is not null
       and (p_ignorar is null or v.id <> p_ignorar)
     order by coalesce(v.published_at, v.scheduled_at, (v.modelo ->> 'gerado_em')::timestamptz) desc
     limit 1)
  select jsonb_build_object(
    'ultima', (select capa from ultima),
    'sugerida', case (select capa from ultima) when 'escuro' then 'claro' when 'claro' then 'ambar' else 'escuro' end);
$$;

revoke all on function public.mkt_versao_modelo(uuid, text, text) from public, anon;
revoke all on function public.mkt_proxima_capa(text, uuid) from public, anon;
grant execute on function public.mkt_versao_modelo(uuid, text, text) to authenticated;
grant execute on function public.mkt_proxima_capa(text, uuid) to authenticated;
