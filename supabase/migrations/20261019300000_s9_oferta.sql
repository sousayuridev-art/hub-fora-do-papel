-- S9 · Oferta 2026 no Hub (decisões do Yuri em 19/10): card docs/cards/S9-oferta-no-hub.md
-- 1. Frente da oportunidade (sistemas, ia, sites, automacoes): vem do assunto do site ou é escolhida no Hub
-- 2. Capacidade: horas por mês da agência (200) e o quanto já está vendido
-- 3. Mensalidade por nível de serviço: o que cada plano inclui e horas que valem por mais 1 mês
-- 4. Garantia de 30 dias e "o que é seu" na proposta (texto fixo, a partir das novas propostas)
-- 5. Preços iniciais dos planos na hora de referência (R$ 300) para agências novas

-- ---------------------------------------------------------------------
-- Apoio: troca de trecho no corpo de uma função (falha se o trecho não existir)
-- ---------------------------------------------------------------------
create or replace function public._s9_trocar(p_funcao text, p_de text, p_para text)
returns void language plpgsql as $$
declare d text; novo text;
begin
  d := pg_get_functiondef(p_funcao::regprocedure);
  novo := replace(d, p_de, p_para);
  if novo = d then raise exception '%: ponto de troca não encontrado', p_funcao; end if;
  execute novo;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Frente da oportunidade
-- ---------------------------------------------------------------------
create type public.service_line as enum ('sistemas', 'ia', 'sites', 'automacoes');
alter table public.deals add column service_line public.service_line;

-- Assunto do formulário do site → frente (os textos são os de src/data/inicio.ts do site)
create or replace function public._frente_do_assunto(p text)
returns public.service_line language sql immutable as $$
  select case
    when p ilike 'Sistemas%' then 'sistemas'::public.service_line
    when p ilike 'Intelig%' then 'ia'::public.service_line
    when p ilike 'Sites%' then 'sites'::public.service_line
    when p ilike 'Automa%' then 'automacoes'::public.service_line
  end;
$$;
revoke all on function public._frente_do_assunto(text) from public, anon, authenticated;

select public._s9_trocar('public._site_contato_para_funil_registro(public.site_contatos)',
  'insert into public.deals (tenant_id, client_id, stage, next_step, next_step_at, requested_slot_at, site_contato_id)
      values (s.tenant_id, v_client, ''contato'', v_passo, v_quando, s.horario_sugerido, s.id)',
  'insert into public.deals (tenant_id, client_id, stage, next_step, next_step_at, requested_slot_at, site_contato_id, service_line)
      values (s.tenant_id, v_client, ''contato'', v_passo, v_quando, s.horario_sugerido, s.id, public._frente_do_assunto(s.assunto))');
-- Oportunidade que já existia não é alterada pelo visitante (regra do REV-1): a frente fica para o Yuri

-- funil_atualizar aceita a chave 'frente' ('' limpa)
select public._s9_trocar('public.funil_atualizar(uuid,timestamp with time zone,jsonb)',
  '  if p_campos ? ''proximo_passo'' then',
  '  if p_campos ? ''frente'' then
    d.service_line := nullif(p_campos ->> ''frente'', '''')::public.service_line;
    v_alterados := array_append(v_alterados, ''frente'');
  end if;
  if p_campos ? ''proximo_passo'' then');
select public._s9_trocar('public.funil_atualizar(uuid,timestamp with time zone,jsonb)',
  'next_step = d.next_step, next_step_at = d.next_step_at, next_step_has_time = d.next_step_has_time',
  'next_step = d.next_step, next_step_at = d.next_step_at, next_step_has_time = d.next_step_has_time,
    service_line = d.service_line');

-- v_funil ganha a frente (coluna nova no fim; as permissões continuam)
create or replace view public.v_funil with (security_invoker = true) as
select
  d.id, d.client_id, d.stage, d.value_cents, d.diagnostic_tier, d.diagnostic_paid,
  d.next_step, d.next_step_at, d.next_step_has_time, d.requested_slot_at,
  d.archived_at, d.lost_reason, d.lost_note, d.stage_changed_at, d.closed_at,
  d.position, d.created_at, d.updated_at,
  c.company_name, c.contact_name, c.whatsapp, c.email, c.origin, c.ad_name,
  (d.next_step_at at time zone t.timezone)::date as next_step_date,
  (now() at time zone t.timezone)::date as hoje,
  (d.archived_at is null and d.stage <> 'fechado'
     and (d.next_step_at at time zone t.timezone)::date < (now() at time zone t.timezone)::date) as vencido,
  (d.archived_at is null and d.stage <> 'fechado'
     and (d.next_step_at at time zone t.timezone)::date = (now() at time zone t.timezone)::date) as para_hoje,
  (date_trunc('month', d.created_at at time zone t.timezone) = date_trunc('month', now() at time zone t.timezone)) as deste_mes,
  d.service_line as frente
from public.deals d
join public.clients c on c.id = d.client_id
join public.tenants t on t.id = d.tenant_id;

-- ---------------------------------------------------------------------
-- 2. Capacidade e 4. garantia (configurações da agência)
-- ---------------------------------------------------------------------
alter table public.pricing_settings
  add column capacity_hours integer not null default 200 check (capacity_hours between 1 and 2000),
  add column warranty_days integer not null default 30 check (warranty_days between 0 and 365);

select public._s9_trocar('public.precos_salvar(jsonb,jsonb)',
  'infra_at_cost = s.infra_at_cost, updated_at = now()',
  'infra_at_cost = s.infra_at_cost, capacity_hours = s.capacity_hours, warranty_days = s.warranty_days,
    updated_at = now()');

-- Horas vendidas: mensalidades ativas (horas do plano) + o que falta nos projetos em andamento
create or replace function public.capacidade_resumo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); ini date; cap int; mens numeric; proj numeric; lanc numeric;
begin
  ini := date_trunc('month', public._hoje(t))::date;
  select capacity_hours into cap from public.pricing_settings where tenant_id = t;
  select coalesce(sum(pp.hours_month), 0) into mens
    from public.subscriptions s join public.pricing_plans pp on pp.tenant_id = s.tenant_id and pp.name = s.plan_name
   where s.tenant_id = t and s.status = 'ativa';
  select coalesce(sum(greatest(p.hours_estimated - coalesce(
           (select sum(e.minutes) from public.time_entries e where e.project_id = p.id), 0) / 60.0, 0)), 0) into proj
    from public.projects p where p.tenant_id = t and p.status = 'andamento' and p.canceled_at is null;
  select coalesce(sum(e.minutes), 0) / 60.0 into lanc
    from public.time_entries e
   where e.tenant_id = t and e.worked_on >= ini;
  return jsonb_build_object('capacidade_h', coalesce(cap, 200), 'mensalidades_h', round(mens, 1),
    'projetos_restantes_h', round(proj, 1), 'lancadas_mes_h', round(lanc, 1),
    'livre_mes_h', round(coalesce(cap, 200) - mens, 1));
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Mensalidade por nível: o que inclui e horas que valem por mais um mês
-- ---------------------------------------------------------------------
alter table public.pricing_plans
  add column includes text check (includes is null or length(includes) <= 600),
  add column rollover_months smallint not null default 1 check (rollover_months between 0 and 3);

update public.pricing_plans set includes = case name
    when 'Essencial' then E'Tudo no ar e seguro: hospedagem acompanhada, cópias de segurança e atualizações\nCorreção de falhas no que entregamos\nResposta em até 2 dias úteis'
    when 'Evolução' then E'Tudo no ar e seguro, com cópias de segurança e correção de falhas\nMelhorias todo mês, numa fila que priorizamos com você\nRelatório mensal no portal'
    when 'Parceria' then E'Tudo no ar e seguro, com melhorias todo mês e relatório no portal\nReunião mensal com os indicadores do seu negócio\nPrioridade no atendimento'
  end
 where includes is null;

select public._s9_trocar('public.precos_salvar(jsonb,jsonb)',
  '      active      = coalesce((pl->>''active'')::boolean, active)',
  '      active      = coalesce((pl->>''active'')::boolean, active),
      includes    = case when pl ? ''includes'' then nullif(left(trim(pl->>''includes''), 600), '''') else includes end,
      rollover_months = coalesce((pl->>''rollover_months'')::smallint, rollover_months)');

-- O plano na conta da proposta (e no retrato enviado ao cliente) leva o que inclui e o acúmulo
select public._s9_trocar('public._proposta_calcular(public.proposals)',
  '''horas_mes'', pl.hours_month, ''minimo_meses'', pl.min_months) end,',
  '''horas_mes'', pl.hours_month, ''minimo_meses'', pl.min_months,
               ''inclui'', pl.includes, ''acumula_meses'', pl.rollover_months) end,');

-- Garantia no documento do cliente (marca as propostas feitas com a política de 19/10)
select public._s9_trocar('public._proposta_documento(public.proposals,jsonb)',
  '''multa_pct'', s.late_fee_pct, ''juros_pct'', s.interest_pct, ''reajuste'', s.adjustment_index)',
  '''multa_pct'', s.late_fee_pct, ''juros_pct'', s.interest_pct, ''reajuste'', s.adjustment_index,
       ''garantia_dias'', s.warranty_days)');

-- ---------------------------------------------------------------------
-- 5. Agência nova já nasce com os planos na hora de referência e com o que incluem
-- ---------------------------------------------------------------------
select public._s9_trocar('public._precos(uuid)',
  '    values (p_tenant, ''Essencial'', 1.5, 40000, 6, 1),
           (p_tenant, ''Evolução'', 4.5, 120000, 6, 2),
           (p_tenant, ''Parceria'', 11, 300000, 12, 3)',
  '    values (p_tenant, ''Essencial'', 1.5, 45000, 6, 1),
           (p_tenant, ''Evolução'', 4.5, 135000, 6, 2),
           (p_tenant, ''Parceria'', 11, 330000, 12, 3)');
select public._s9_trocar('public._precos(uuid)',
  '    on conflict (tenant_id, name) do nothing;
    select * into s',
  '    on conflict (tenant_id, name) do nothing;
    update public.pricing_plans set includes = case name
        when ''Essencial'' then E''Tudo no ar e seguro: hospedagem acompanhada, cópias de segurança e atualizações\nCorreção de falhas no que entregamos\nResposta em até 2 dias úteis''
        when ''Evolução'' then E''Tudo no ar e seguro, com cópias de segurança e correção de falhas\nMelhorias todo mês, numa fila que priorizamos com você\nRelatório mensal no portal''
        when ''Parceria'' then E''Tudo no ar e seguro, com melhorias todo mês e relatório no portal\nReunião mensal com os indicadores do seu negócio\nPrioridade no atendimento''
      end
     where tenant_id = p_tenant and includes is null;
    select * into s');

drop function public._s9_trocar(text, text, text);

revoke all on function public.capacidade_resumo() from public, anon;
grant execute on function public.capacidade_resumo() to authenticated;
