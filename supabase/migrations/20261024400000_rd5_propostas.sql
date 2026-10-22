-- RD-5 · Propostas: números do topo e cartões do quadro calculados no banco.
-- 1. Quantas vezes o cliente abriu o link (contagem por envio).
-- 2. propostas_resumo(): em negociação, enviadas sem abrir há mais de 3 dias,
--    aceitas no ano (com valor) e taxa de aceite no ano.
-- 3. propostas_quadro(): um cartão por proposta, com valor, dias desde o envio,
--    vezes aberta, o que falta no rascunho e motivo de recusa.
-- As duas RPCs são do dono (public._tenant_do_dono()) e nunca leem outro tenant.

-- ---------------------------------------------------------------------
-- 1. Aberturas do link
-- ---------------------------------------------------------------------
alter table public.proposals
  add column view_count     integer not null default 0 check (view_count >= 0),
  add column last_viewed_at timestamptz;

-- O que já foi aberto conta como uma abertura (sem mexer em updated_at, que é a versão do editor)
alter table public.proposals disable trigger proposals_touch;
update public.proposals set view_count = 1, last_viewed_at = viewed_at where viewed_at is not null;
alter table public.proposals enable trigger proposals_touch;

-- Novo envio (ou reabertura) começa a contagem do zero
create or replace function public.proposals_zera_aberturas()
returns trigger language plpgsql as $$
begin
  if new.sent_at is distinct from old.sent_at then
    new.view_count := 0;
    new.last_viewed_at := null;
  end if;
  return new;
end;
$$;
create trigger proposals_zera_aberturas before update of sent_at on public.proposals
  for each row execute function public.proposals_zera_aberturas();

-- O link conta uma abertura por vez que o cliente volta (recarregar em 30 min não conta de novo)
create or replace function public._rd5_trocar(p_funcao text, p_de text, p_para text)
returns void language plpgsql as $$
declare d text; novo text;
begin
  d := pg_get_functiondef(p_funcao::regprocedure);
  novo := replace(d, p_de, p_para);
  if novo = d then raise exception '%: ponto de troca não encontrado', p_funcao; end if;
  execute novo;
end;
$$;

select public._rd5_trocar('public.proposta_publica(text)',
  '  if p.status = ''enviada'' and p.viewed_at is null then
    update public.proposals set viewed_at = now() where id = p.id;',
  '  if p.status = ''enviada'' and (p.last_viewed_at is null or p.last_viewed_at < now() - interval ''30 minutes'') then
    update public.proposals set view_count = view_count + 1, last_viewed_at = now() where id = p.id;
  end if;
  if p.status = ''enviada'' and p.viewed_at is null then
    update public.proposals set viewed_at = now() where id = p.id;');

drop function public._rd5_trocar(text, text, text);

-- ---------------------------------------------------------------------
-- 2. Números do topo
-- ---------------------------------------------------------------------
create or replace function public.propostas_resumo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t   uuid := public._tenant_do_dono();
  tz  text;
  ini timestamptz;
  r   jsonb;
begin
  select timezone into tz from public.tenants where id = t;
  ini := date_trunc('year', now() at time zone tz) at time zone tz;

  with p as (
    select x.*, c.company_name,
           (x.status = 'enviada' and x.expires_at < now()) as vencida,
           (x.status = 'enviada' and x.expires_at >= now() and x.viewed_at is null
             and x.sent_at < now() - interval '3 days') as sem_abrir
      from public.proposals x
      join public.clients c on c.id = x.client_id
     where x.tenant_id = t
  ), n as (
    select
      count(*) filter (where status = 'rascunho')                          as rascunho,
      count(*) filter (where status = 'enviada')                           as enviada,
      count(*) filter (where status = 'aceita')                            as aceita,
      count(*) filter (where status = 'recusada')                          as recusada,
      count(*) filter (where vencida)                                      as vencidas,
      count(*) filter (where status = 'enviada' and not vencida)           as neg_qtd,
      coalesce(sum(total_cents) filter (where status = 'enviada' and not vencida), 0) as neg_cents,
      count(*) filter (where sem_abrir)                                    as sem_abrir,
      count(*) filter (where status = 'aceita' and accepted_at >= ini)     as aceitas_ano,
      coalesce(sum(total_cents) filter (where status = 'aceita' and accepted_at >= ini), 0) as aceitas_ano_cents,
      count(*) filter (where status = 'recusada' and refused_at >= ini)    as recusadas_ano
    from p
  )
  select jsonb_build_object(
    'rascunho', n.rascunho,
    'enviada', n.enviada,
    'aceita', n.aceita,
    'recusada', n.recusada,
    'vencidas', n.vencidas,
    'em_negociacao_cents', n.neg_cents,
    'em_negociacao_qtd', n.neg_qtd,
    'sem_abrir_3_dias', n.sem_abrir,
    -- A mais antiga das que não foram abertas, para o apoio do número
    'sem_abrir_mais_antiga', (
      select jsonb_build_object('id', s.id, 'empresa', s.company_name,
               'dias', (now() at time zone tz)::date - (s.sent_at at time zone tz)::date)
        from p s where s.sem_abrir order by s.sent_at asc limit 1),
    'aceitas_no_ano', n.aceitas_ano,
    'aceitas_no_ano_cents', n.aceitas_ano_cents,
    'recusadas_no_ano', n.recusadas_ano,
    'respondidas_no_ano', n.aceitas_ano + n.recusadas_ano,
    'taxa_aceite_pct', case when n.aceitas_ano + n.recusadas_ano = 0 then null
                            else round(100.0 * n.aceitas_ano / (n.aceitas_ano + n.recusadas_ano))::int end,
    'oportunidades_sem_proposta', (select count(*) from public.deals d
        where d.tenant_id = t and d.archived_at is null and d.stage <> 'fechado'
          and not exists (select 1 from public.proposals x
                           where x.deal_id = d.id and x.status in ('rascunho', 'enviada')))
  ) into r
  from n;
  return r;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Cartões do quadro (até 500 por coluna, os mais recentes; enviadas: a que espera há mais tempo primeiro)
-- ---------------------------------------------------------------------
create or replace function public.propostas_quadro()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  t  uuid := public._tenant_do_dono();
  tz text;
  r  jsonb;
begin
  select timezone into tz from public.tenants where id = t;

  with p as (
    select x.*, c.company_name, c.contact_name,
           row_number() over (partition by x.status order by
             case when x.status = 'enviada' then extract(epoch from x.sent_at) end asc nulls last,
             coalesce(x.accepted_at, x.refused_at, x.updated_at) desc) as ordem
      from public.proposals x
      join public.clients c on c.id = x.client_id
     where x.tenant_id = t
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'deal_id', p.deal_id,
    'client_id', p.client_id,
    'status', p.status,
    'situacao', case when p.status = 'enviada' and p.expires_at < now() then 'vencida' else p.status::text end,
    'versao', p.version,
    'empresa', p.company_name,
    'contato', p.contact_name,
    'titulo', coalesce(nullif(trim(p.title), ''), nullif(trim(p.project_type), '')),
    -- Rascunho sem horas ainda não tem valor
    'valor_cents', case when p.status = 'rascunho' and coalesce(p.hours_total, 0) = 0 then null else p.total_cents end,
    'enviada_em', p.sent_at,
    'dias_desde_envio', case when p.sent_at is null then null
                             else (now() at time zone tz)::date - (p.sent_at at time zone tz)::date end,
    -- Mesma regra do número "Sem abrir há mais de 3 dias"
    'sem_abrir', (p.status = 'enviada' and p.expires_at >= now() and p.viewed_at is null
                  and p.sent_at < now() - interval '3 days'),
    'vezes_aberta', p.view_count,
    'aberta_em', p.last_viewed_at,
    'vence_em', p.expires_at,
    'aceita_em', p.accepted_at,
    'projeto_id', (select pr.id from public.projects pr where pr.proposal_id = p.id),
    'recusada_em', p.refused_at,
    'motivo', p.refused_reason,
    'falta', case when p.status = 'rascunho' then
               (select coalesce(jsonb_agg(f->>'acao'), '[]'::jsonb)
                  from public.proposals y,
                       jsonb_array_elements(public._proposta_calcular(y)->'pendencias') f
                 where y.id = p.id)
             else '[]'::jsonb end,
    'criada_em', p.created_at,
    'atualizada_em', p.updated_at
  ) order by p.status, p.ordem), '[]'::jsonb) into r
  from p
  where p.ordem <= 500;
  return r;
end;
$$;

revoke all on function public.propostas_resumo() from public, anon;
revoke all on function public.propostas_quadro() from public, anon;
grant execute on function public.propostas_resumo(), public.propostas_quadro() to authenticated;
