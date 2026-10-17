-- =====================================================================
-- Hub Fora do Papel · S4 · Financeiro e Pagamentos no portal
-- Card: docs/cards/S4-financeiro.md
-- Cobranças nascem do que já acontece no Hub (aceite, diagnóstico, serviço adicional,
-- lançamento). Pagamento por Pix da agência com registro manual. Atraso só é exibido.
-- Leitura do dono: RLS por tenant. Cliente: só pelas RPCs portal_*. Escrita: só RPC.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipos e tabelas
-- ---------------------------------------------------------------------
create type public.charge_kind as enum ('parcela', 'diagnostico', 'adicional', 'mensalidade', 'avulsa');
create type public.charge_status as enum ('aberta', 'paga', 'cancelada');
create type public.pay_method as enum ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro');
create type public.subscription_status as enum ('ativa', 'pausada', 'encerrada');
create type public.expense_kind as enum ('fixa', 'avulsa');
create type public.expense_category as enum ('ferramentas', 'hospedagem', 'impostos', 'marketing', 'pessoal', 'outros');

create table public.finance_settings (
  tenant_id     uuid primary key references public.tenants (id) on delete cascade,
  pix_key       text check (pix_key is null or length(trim(pix_key)) between 3 and 77),
  pix_name      text check (pix_name is null or length(trim(pix_name)) between 2 and 25),
  pix_city      text check (pix_city is null or length(trim(pix_city)) between 2 and 15),
  due_day       smallint not null default 10 check (due_day between 1 and 28),
  next_receipt  integer not null default 1 check (next_receipt >= 1),
  updated_at    timestamptz not null default now()
);

create table public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  client_id     uuid not null references public.clients (id) on delete restrict,
  project_id    uuid unique references public.projects (id) on delete set null,
  plan_name     text not null check (length(trim(plan_name)) between 2 and 80),
  amount_cents  integer not null check (amount_cents between 100 and 100000000),
  start_month   date not null check (extract(day from start_month) = 1),
  due_day       smallint not null default 10 check (due_day between 1 and 28),
  min_months    smallint not null default 6 check (min_months between 1 and 60),
  status        public.subscription_status not null default 'ativa',
  ended_month   date check (ended_month is null or extract(day from ended_month) = 1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint subscriptions_fim_depois check (ended_month is null or ended_month >= start_month)
);
create index subscriptions_tenant_idx on public.subscriptions (tenant_id, status);

-- Meses em que a mensalidade fica sem cobrança (pausa ou encerramento antes de começar)
create table public.subscription_pauses (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  subscription_id  uuid not null references public.subscriptions (id) on delete cascade,
  from_month       date not null check (extract(day from from_month) = 1),
  to_month         date check (to_month is null or (extract(day from to_month) = 1 and to_month >= from_month)),
  created_at       timestamptz not null default now()
);
create index subscription_pauses_sub_idx on public.subscription_pauses (subscription_id);
create index subscriptions_client_idx on public.subscriptions (client_id);
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();

create table public.charges (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  client_id           uuid not null references public.clients (id) on delete restrict,
  project_id          uuid references public.projects (id) on delete set null,
  proposal_id         uuid references public.proposals (id) on delete restrict,
  deal_id             uuid references public.deals (id) on delete set null,
  request_id          uuid references public.requests (id) on delete set null,
  subscription_id     uuid references public.subscriptions (id) on delete set null,
  kind                public.charge_kind not null,
  description         text not null check (length(trim(description)) between 2 and 160),
  amount_cents        integer not null check (amount_cents between 1 and 100000000),
  due_date            date,
  due_label           text check (due_label is null or length(due_label) <= 60),
  sequence            smallint check (sequence is null or sequence between 1 and 24),
  sequence_total      smallint check (sequence_total is null or sequence_total between 1 and 24),
  period              date check (period is null or extract(day from period) = 1),
  status              public.charge_status not null default 'aberta',
  paid_at             date,
  paid_cents          integer check (paid_cents is null or paid_cents between 1 and 100000000),
  paid_method         public.pay_method,
  receipt_number      integer,
  payment_note        text check (payment_note is null or length(payment_note) <= 300),
  client_reported_at  timestamptz,
  canceled_reason     text check (canceled_reason is null or length(canceled_reason) <= 300),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint charges_paga_completa check (status <> 'paga' or (paid_at is not null and paid_cents is not null
                                                              and paid_method is not null and receipt_number is not null)),
  constraint charges_cancelada_motivo check (status <> 'cancelada' or canceled_reason is not null)
);
create unique index charges_parcela_unica on public.charges (proposal_id, sequence) where kind = 'parcela';
create unique index charges_adicional_unico on public.charges (request_id, sequence) where kind = 'adicional';
create unique index charges_mensal_unica on public.charges (subscription_id, period) where kind = 'mensalidade';
create unique index charges_diag_unico on public.charges (deal_id) where kind = 'diagnostico' and status <> 'cancelada';
create unique index charges_recibo_unico on public.charges (tenant_id, receipt_number) where receipt_number is not null;
create index charges_tenant_status_idx on public.charges (tenant_id, status, due_date);
create index charges_client_idx on public.charges (client_id, status);
create index charges_project_idx on public.charges (project_id);
create index charges_paid_idx on public.charges (tenant_id, paid_at) where status = 'paga';

create or replace function public.charges_evento_criada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_outbox (tenant_id, event, payload)
  values (new.tenant_id, 'financeiro.cobranca_criada', jsonb_build_object('cobranca_id', new.id, 'client_id', new.client_id,
          'tipo', new.kind, 'valor_cents', new.amount_cents, 'vencimento', new.due_date));
  return new;
end;
$$;
revoke all on function public.charges_evento_criada() from public, anon, authenticated;
create trigger charges_evento_criada after insert on public.charges
  for each row execute function public.charges_evento_criada();
create trigger charges_touch before update on public.charges for each row execute function public.touch_updated_at();

create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  description   text not null check (length(trim(description)) between 2 and 120),
  category      public.expense_category not null default 'outros',
  amount_cents  integer not null check (amount_cents between 1 and 100000000),
  kind          public.expense_kind not null,
  spent_on      date,                 -- avulsa
  start_month   date,                 -- fixa
  end_month     date,                 -- fixa (vazio = sem fim)
  note          text check (note is null or length(note) <= 300),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint expenses_forma check (
    (kind = 'avulsa' and spent_on is not null and start_month is null and end_month is null) or
    (kind = 'fixa' and spent_on is null and start_month is not null and extract(day from start_month) = 1
       and (end_month is null or (extract(day from end_month) = 1 and end_month >= start_month))))
);
create index expenses_tenant_idx on public.expenses (tenant_id, kind);
create trigger expenses_touch before update on public.expenses for each row execute function public.touch_updated_at();

do $$
declare t text;
begin
  foreach t in array array['finance_settings', 'subscriptions', 'subscription_pauses', 'charges', 'expenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_tenant_owner(tenant_id))',
                   t || '_owner_select', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. Apoio interno
-- ---------------------------------------------------------------------
create or replace function public._financas(p_tenant uuid)
returns public.finance_settings language plpgsql security definer set search_path = public as $$
declare f public.finance_settings;
begin
  insert into public.finance_settings (tenant_id) values (p_tenant) on conflict (tenant_id) do nothing;
  select * into f from public.finance_settings where tenant_id = p_tenant;
  return f;
end;
$$;

create or replace function public._mes_de(p_data date)
returns date language sql immutable as $$ select date_trunc('month', p_data)::date $$;

-- Visão de uma cobrança com o atraso calculado (multa e juros só para exibir)
create or replace function public._cobranca_json(c public.charges, p_hoje date, s public.pricing_settings)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'client_id', c.client_id, 'project_id', c.project_id, 'request_id', c.request_id,
    'subscription_id', c.subscription_id, 'tipo', c.kind, 'descricao', c.description,
    'valor_cents', c.amount_cents, 'vencimento', c.due_date, 'quando', c.due_label,
    'parte', c.sequence, 'partes', c.sequence_total, 'mes', c.period, 'situacao', c.status,
    'pago_em', c.paid_at, 'pago_cents', c.paid_cents, 'forma', c.paid_method, 'recibo', c.receipt_number,
    'nota', c.payment_note, 'cliente_avisou_em', c.client_reported_at,
    'dias_atraso', case when c.status = 'aberta' and c.due_date < p_hoje then p_hoje - c.due_date else 0 end,
    'multa_cents', case when c.status = 'aberta' and c.due_date < p_hoje
                        then round(c.amount_cents * s.late_fee_pct / 100)::int else 0 end,
    'juros_cents', case when c.status = 'aberta' and c.due_date < p_hoje
                        then round(c.amount_cents * s.interest_pct / 100 / 30 * (p_hoje - c.due_date))::int else 0 end);
$$;

create or replace function public._cobranca_evento(c public.charges, p_kind text, p_source text, p_event text, p_extra jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._projeto_evento(c.tenant_id, c.client_id, c.project_id, c.request_id, p_kind,
    jsonb_build_object('cobranca_id', c.id, 'descricao', c.description, 'valor_cents', c.amount_cents) || coalesce(p_extra, '{}'::jsonb),
    p_source, p_event);
end;
$$;

-- Marca como paga (usada pelo registro manual e pelo funil no diagnóstico)
create or replace function public._cobranca_marcar_paga(p_id uuid, p_data date, p_valor integer, p_forma public.pay_method, p_nota text)
returns public.charges language plpgsql security definer set search_path = public as $$
declare c public.charges; n int;
begin
  select * into c from public.charges where id = p_id for update;
  if c.status <> 'aberta' then return c; end if;
  perform public._financas(c.tenant_id);
  update public.finance_settings set next_receipt = next_receipt + 1 where tenant_id = c.tenant_id
    returning next_receipt - 1 into n;
  update public.charges set status = 'paga', paid_at = p_data, paid_cents = p_valor, paid_method = p_forma,
         receipt_number = n, payment_note = nullif(left(trim(coalesce(p_nota, '')), 300), '')
   where id = c.id returning * into c;
  perform public._cobranca_evento(c, 'pagamento_registrado', 'hub', 'financeiro.pagamento',
    jsonb_build_object('recibo', n, 'pago_cents', p_valor));
  return c;
end;
$$;

-- Mensalidades: gera as cobranças que faltam até o mês corrente (sem duplicar)
create or replace function public._mensalidades_gerar(p_tenant uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.subscriptions; m date; ate date; hoje date := public._hoje(p_tenant); ultimo date;
begin
  for s in select * from public.subscriptions where tenant_id = p_tenant loop
    ate := least(public._mes_de(hoje), coalesce(s.ended_month, public._mes_de(hoje)));
    -- Continua do último mês já gerado (não refaz o histórico a cada chamada)
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
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['_financas(uuid)', '_mes_de(date)',
    '_cobranca_json(public.charges, date, public.pricing_settings)',
    '_cobranca_evento(public.charges, text, text, text, jsonb)',
    '_cobranca_marcar_paga(uuid, date, integer, public.pay_method, text)', '_mensalidades_gerar(uuid)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon, authenticated';
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Cobranças que nascem sozinhas
-- ---------------------------------------------------------------------
-- Parcelas no aceite da proposta (dispara depois do gatilho que cria o projeto)
create or replace function public._parcelas_da_proposta(pr public.proposals)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb; i int := 0; n int; proj uuid; aceite date;
begin
  if exists (select 1 from public.charges where proposal_id = pr.id and kind = 'parcela') then return; end if;
  select count(*) into n from jsonb_array_elements(coalesce(pr.snapshot->'investimento'->'parcelas', '[]'::jsonb)) x
   where coalesce((x->>'cents')::bigint, 0) > 0;
  if n = 0 then return; end if;
  select id into proj from public.projects where proposal_id = pr.id;
  aceite := (coalesce(pr.accepted_at, now()) at time zone (select timezone from public.tenants where id = pr.tenant_id))::date;
  for it in select * from jsonb_array_elements(pr.snapshot->'investimento'->'parcelas') x
            where coalesce((x->>'cents')::bigint, 0) > 0 loop
    i := i + 1;
    insert into public.charges (tenant_id, client_id, project_id, proposal_id, deal_id, kind, description, amount_cents,
                                due_date, due_label, sequence, sequence_total)
    values (pr.tenant_id, pr.client_id, proj, pr.id, pr.deal_id, 'parcela',
            left(i || 'ª parte · ' || coalesce(nullif(it->>'quando', ''), 'parcela') ||
                 coalesce(' · ' || nullif(trim(coalesce(pr.project_type, '')), ''), ''), 160),
            least((it->>'cents')::bigint, 100000000)::int,
            case when i = 1 then aceite + 3 end,
            case when i > 1 then left(coalesce(it->>'quando', 'na entrega'), 60) end,
            i, n);
  end loop;
end;
$$;
revoke all on function public._parcelas_da_proposta(public.proposals) from public, anon, authenticated;

create or replace function public.proposals_cria_cobrancas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aceita' and old.status is distinct from 'aceita' then
    perform public._parcelas_da_proposta(new);
  end if;
  return new;
end;
$$;
revoke all on function public.proposals_cria_cobrancas() from public, anon, authenticated;
-- "z" no nome: roda depois de proposals_cria_projeto (ordem alfabética)
create trigger proposals_z_cria_cobrancas after update of status on public.proposals
  for each row execute function public.proposals_cria_cobrancas();

-- Diagnóstico: cobrança nasce com o pacote; pago no funil = pago aqui
create or replace function public._diagnostico_sincronizar(d public.deals, p_era_pago boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.charges; valor int; s public.pricing_settings;
begin
  select * into c from public.charges where deal_id = d.id and kind = 'diagnostico'
   order by (status <> 'cancelada') desc, created_at desc limit 1;
  if d.diagnostic_tier is null then
    if c.status = 'aberta' then
      update public.charges set status = 'cancelada', canceled_reason = 'Diagnóstico retirado no funil' where id = c.id;
    end if;
    return;
  end if;
  -- Cancelada de propósito (cortesia, por exemplo): não volta sozinha
  if c.status = 'cancelada' then return; end if;
  s := public._precos(d.tenant_id);
  valor := case d.diagnostic_tier when 'essencial' then s.diag_essencial_cents else s.diag_ampliado_cents end;
  if c.id is null then
    if valor is null or valor <= 0 then return; end if;
    insert into public.charges (tenant_id, client_id, deal_id, kind, description, amount_cents, due_date)
    values (d.tenant_id, d.client_id, d.id, 'diagnostico',
            'Diagnóstico ' || d.diagnostic_tier::text, valor, public._hoje(d.tenant_id) + 2)
    returning * into c;
  elsif c.status = 'aberta' and c.amount_cents <> valor and valor > 0 then
    update public.charges set amount_cents = valor, description = 'Diagnóstico ' || d.diagnostic_tier::text
     where id = c.id returning * into c;
  end if;
  if d.diagnostic_paid and c.status = 'aberta' then
    perform public._cobranca_marcar_paga(c.id,
      (coalesce(d.diagnostic_paid_at, now()) at time zone (select timezone from public.tenants where id = d.tenant_id))::date,
      c.amount_cents, 'pix', 'Marcado como pago no funil');
  elsif not d.diagnostic_paid and c.status = 'paga' and p_era_pago then
    perform public._cobranca_evento(c, 'pagamento_desfeito', 'hub', 'financeiro.pagamento_desfeito',
      jsonb_build_object('recibo', c.receipt_number, 'motivo', 'Desmarcado no funil'));
    update public.charges set status = 'aberta', paid_at = null, paid_cents = null, paid_method = null,
           receipt_number = null, payment_note = null where id = c.id;
  end if;
end;
$$;
revoke all on function public._diagnostico_sincronizar(public.deals, boolean) from public, anon, authenticated;

create or replace function public.deals_cobranca_diagnostico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Só quando o pacote ou o "pago" mudam de fato (o funil regrava as colunas a cada edição)
  if tg_op = 'UPDATE' and new.diagnostic_tier is not distinct from old.diagnostic_tier
     and new.diagnostic_paid is not distinct from old.diagnostic_paid then
    return new;
  end if;
  perform public._diagnostico_sincronizar(new, case when tg_op = 'UPDATE' then coalesce(old.diagnostic_paid, false) else false end);
  return new;
end;
$$;
revoke all on function public.deals_cobranca_diagnostico() from public, anon, authenticated;
create trigger deals_z_cobranca_diagnostico after insert or update of diagnostic_tier, diagnostic_paid on public.deals
  for each row execute function public.deals_cobranca_diagnostico();

-- Serviço adicional: 50% na aprovação e 50% na entrega
create or replace function public.requests_cobranca_adicional()
returns trigger language plpgsql security definer set search_path = public as $$
declare hoje date := public._hoje(new.tenant_id); metade int;
begin
  if new.classification = 'adicional' and new.client_decision = 'aprovado'
     and old.client_decision is distinct from 'aprovado' and coalesce(new.value_cents, 0) > 0 then
    metade := round(new.value_cents / 2.0)::int;
    insert into public.charges (tenant_id, client_id, project_id, request_id, kind, description, amount_cents,
                                due_date, due_label, sequence, sequence_total)
    values (new.tenant_id, new.client_id, new.project_id, new.id, 'adicional',
            left('Serviço adicional ' || new.code || ' · 1ª parte (aprovação) · ' || new.title, 160), metade, hoje + 3, null, 1, 2),
           (new.tenant_id, new.client_id, new.project_id, new.id, 'adicional',
            left('Serviço adicional ' || new.code || ' · 2ª parte (entrega) · ' || new.title, 160),
            new.value_cents - metade, null, 'na entrega', 2, 2)
    on conflict (request_id, sequence) where kind = 'adicional' do nothing;
  end if;
  if new.status = 'pronto' and old.status is distinct from 'pronto' then
    update public.charges set due_date = hoje + 3, due_label = null
     where request_id = new.id and kind = 'adicional' and status = 'aberta' and due_date is null;
  end if;
  if new.status = 'recusado' and old.status is distinct from 'recusado' then
    update public.charges set status = 'cancelada', canceled_reason = 'Pedido recusado'
     where request_id = new.id and kind = 'adicional' and status = 'aberta';
  end if;
  return new;
end;
$$;
revoke all on function public.requests_cobranca_adicional() from public, anon, authenticated;
create trigger requests_z_cobranca_adicional after update of client_decision, status on public.requests
  for each row execute function public.requests_cobranca_adicional();

-- Lançamento com plano: nasce a mensalidade (a partir do mês seguinte)
create or replace function public.projects_cria_mensalidade()
returns trigger language plpgsql security definer set search_path = public as $$
declare infra int; f public.finance_settings; inicio date;
begin
  if new.status = 'mensalidade' and old.status is distinct from 'mensalidade' and new.plan_name is not null
     and coalesce(new.monthly_cents, 0) > 0
     and not exists (select 1 from public.subscriptions where project_id = new.id) then
    select coalesce((snapshot->'mensalidade'->>'infra_cents')::int, 0) into infra
      from public.proposals where id = new.proposal_id;
    f := public._financas(new.tenant_id);
    inicio := (public._mes_de(public._hoje(new.tenant_id)) + interval '1 month')::date;
    insert into public.subscriptions (tenant_id, client_id, project_id, plan_name, amount_cents, start_month, due_day, min_months)
    values (new.tenant_id, new.client_id, new.id, new.plan_name, least(new.monthly_cents + coalesce(infra, 0), 100000000),
            inicio, f.due_day,
            coalesce((select min_months from public.pricing_plans where tenant_id = new.tenant_id and name = new.plan_name), 6));
    perform public._projeto_evento(new.tenant_id, new.client_id, new.id, null, 'mensalidade_criada',
      jsonb_build_object('plano', new.plan_name, 'inicio', inicio), 'hub', 'financeiro.mensalidade_criada');
  end if;
  return new;
end;
$$;
revoke all on function public.projects_cria_mensalidade() from public, anon, authenticated;
create trigger projects_z_cria_mensalidade after update of status on public.projects
  for each row execute function public.projects_cria_mensalidade();

-- Uma vez: o que já existia antes do S4
do $$
declare pr public.proposals; d public.deals;
begin
  for pr in select * from public.proposals where status = 'aceita' loop
    perform public._parcelas_da_proposta(pr);
  end loop;
  for d in select * from public.deals where diagnostic_tier is not null loop
    perform public._diagnostico_sincronizar(d, false);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. RPCs do dono
-- ---------------------------------------------------------------------
create or replace function public.financeiro_config_ler()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare f public.finance_settings := public._financas(public._tenant_do_dono());
begin
  return jsonb_build_object('pix_chave', f.pix_key, 'pix_nome', f.pix_name, 'pix_cidade', f.pix_city, 'dia_vencimento', f.due_day);
end;
$$;

create or replace function public.financeiro_config_salvar(p_chave text, p_nome text, p_cidade text, p_dia integer)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  perform public._financas(t);
  if nullif(trim(coalesce(p_chave, '')), '') is not null and length(trim(p_chave)) not between 3 and 77 then
    raise exception 'pix_chave_invalida' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_chave, '')), '') is not null
     and (length(trim(coalesce(p_nome, ''))) < 2 or length(trim(coalesce(p_cidade, ''))) < 2) then
    raise exception 'pix_incompleto' using errcode = '22023';
  end if;
  update public.finance_settings set
    pix_key = nullif(trim(coalesce(p_chave, '')), ''),
    pix_name = nullif(left(trim(coalesce(p_nome, '')), 25), ''),
    pix_city = nullif(left(trim(coalesce(p_cidade, '')), 15), ''),
    due_day = greatest(1, least(28, coalesce(p_dia, 10))),
    updated_at = now()
   where tenant_id = t;
  return public.financeiro_config_ler();
end;
$$;

create or replace function public.financeiro_painel()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); hoje date; s public.pricing_settings; mes date;
begin
  perform public._mensalidades_gerar(t);
  hoje := public._hoje(t); s := public._precos(t); mes := public._mes_de(hoje);
  return jsonb_build_object(
    'hoje', hoje,
    'regras', jsonb_build_object('multa_pct', s.late_fee_pct, 'juros_pct', s.interest_pct),
    'numeros', jsonb_build_object(
      'a_receber_30_cents', (select coalesce(sum(amount_cents), 0) from public.charges
                               where tenant_id = t and status = 'aberta' and due_date between hoje and hoje + 30),
      'em_atraso_cents', (select coalesce(sum(amount_cents), 0) from public.charges
                            where tenant_id = t and status = 'aberta' and due_date < hoje),
      'em_atraso', (select count(*) from public.charges where tenant_id = t and status = 'aberta' and due_date < hoje),
      'sem_data_cents', (select coalesce(sum(amount_cents), 0) from public.charges
                           where tenant_id = t and status = 'aberta' and due_date is null),
      'recebido_mes_cents', (select coalesce(sum(paid_cents), 0) from public.charges
                               where tenant_id = t and status = 'paga' and paid_at >= mes),
      'recebidos_mes', (select count(*) from public.charges where tenant_id = t and status = 'paga' and paid_at >= mes),
      'mrr_cents', (select coalesce(sum(amount_cents), 0) from public.subscriptions where tenant_id = t and status = 'ativa'),
      'mensalidades_ativas', (select count(*) from public.subscriptions where tenant_id = t and status = 'ativa'),
      'despesas_mes_cents', (select coalesce(sum(amount_cents), 0) from public.expenses
                               where tenant_id = t and ((kind = 'avulsa' and public._mes_de(spent_on) = mes)
                                  or (kind = 'fixa' and start_month <= mes and (end_month is null or end_month >= mes))))
                          + (select coalesce(sum(amount_cents), 0) from public.ad_spend where tenant_id = t and spent_on between mes and hoje),
      'avisos_cliente', (select count(*) from public.charges where tenant_id = t and status = 'aberta' and client_reported_at is not null)),
    'cobrancas', coalesce((select jsonb_agg(public._cobranca_json(c, hoje, s) || jsonb_build_object(
                    'empresa', cl.company_name, 'contato', cl.contact_name, 'whatsapp', cl.whatsapp,
                    'projeto', p.name)
                  order by (c.status = 'aberta') desc, c.due_date nulls last, c.paid_at desc nulls last, c.created_at)
       from public.charges c join public.clients cl on cl.id = c.client_id
       left join public.projects p on p.id = c.project_id
      where c.tenant_id = t and (c.status = 'aberta' or (c.status = 'paga' and c.paid_at >= hoje - 180))), '[]'::jsonb),
    'mensalidades', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'client_id', x.client_id, 'empresa', cl.company_name,
                    'projeto', p.name, 'plano', x.plan_name, 'valor_cents', x.amount_cents, 'inicio', x.start_month,
                    'dia', x.due_day, 'minimo_meses', x.min_months, 'situacao', x.status, 'fim', x.ended_month,
                    'meses_pagos', (select count(*) from public.charges c where c.subscription_id = x.id and c.status = 'paga'),
                    'em_aberto_cents', (select coalesce(sum(amount_cents), 0) from public.charges c
                                          where c.subscription_id = x.id and c.status = 'aberta'))
                  order by x.status, cl.company_name)
       from public.subscriptions x join public.clients cl on cl.id = x.client_id
       left join public.projects p on p.id = x.project_id where x.tenant_id = t), '[]'::jsonb),
    'despesas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'descricao', e.description, 'categoria', e.category,
                    'valor_cents', e.amount_cents, 'tipo', e.kind, 'data', e.spent_on, 'inicio', e.start_month,
                    'fim', e.end_month, 'nota', e.note,
                    'ativa', e.kind = 'fixa' and (e.end_month is null or e.end_month >= mes))
                  order by e.kind, e.description)
       from public.expenses e where e.tenant_id = t
        and (e.kind = 'fixa' or e.spent_on >= hoje - 180)), '[]'::jsonb),
    'anuncios_mes_cents', (select coalesce(sum(amount_cents), 0) from public.ad_spend where tenant_id = t and spent_on >= mes)
  );
end;
$$;

-- Fluxo de caixa: 3 meses para trás, o atual e 3 para frente
create or replace function public.financeiro_fluxo()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); hoje date; atual date; m date; i int; r jsonb := '[]'::jsonb;
        recebido bigint; previsto bigint; atrasado bigint; mensal_proj bigint; fixas bigint; avulsas bigint; anuncios bigint;
begin
  perform public._mensalidades_gerar(t);
  hoje := public._hoje(t); atual := public._mes_de(hoje);
  for i in -3..3 loop
    m := (atual + make_interval(months => i))::date;
    select coalesce(sum(paid_cents), 0) into recebido from public.charges
     where tenant_id = t and status = 'paga' and public._mes_de(paid_at) = m;
    select coalesce(sum(amount_cents), 0) into previsto from public.charges
     where tenant_id = t and status = 'aberta' and public._mes_de(due_date) = m and due_date >= hoje;
    atrasado := 0;
    if i = 0 then
      select coalesce(sum(amount_cents), 0) into atrasado from public.charges
       where tenant_id = t and status = 'aberta' and due_date < hoje;
    end if;
    -- Meses futuros ainda sem cobrança gerada: projeta as mensalidades ativas
    mensal_proj := 0;
    if i > 0 then
      select coalesce(sum(s.amount_cents), 0) into mensal_proj from public.subscriptions s
       where s.tenant_id = t and s.status = 'ativa' and s.start_month <= m and (s.ended_month is null or s.ended_month >= m)
         and not exists (select 1 from public.charges c where c.subscription_id = s.id and c.period = m);
    end if;
    select coalesce(sum(amount_cents), 0) into fixas from public.expenses
     where tenant_id = t and kind = 'fixa' and start_month <= m and (end_month is null or end_month >= m);
    select coalesce(sum(amount_cents), 0) into avulsas from public.expenses
     where tenant_id = t and kind = 'avulsa' and public._mes_de(spent_on) = m;
    select coalesce(sum(amount_cents), 0) into anuncios from public.ad_spend
     where tenant_id = t and public._mes_de(spent_on) = m;
    r := r || jsonb_build_object('mes', m, 'tipo', case when i < 0 then 'passado' when i = 0 then 'atual' else 'futuro' end,
      'recebido_cents', recebido, 'a_receber_cents', previsto + mensal_proj, 'em_atraso_cents', atrasado,
      'despesas_fixas_cents', fixas, 'despesas_avulsas_cents', avulsas, 'anuncios_cents', anuncios,
      'entradas_cents', recebido + previsto + mensal_proj, 'saidas_cents', fixas + avulsas + anuncios,
      'saldo_cents', recebido + previsto + mensal_proj - fixas - avulsas - anuncios);
  end loop;
  return jsonb_build_object('hoje', hoje, 'meses', r);
end;
$$;

create or replace function public._cobranca_do_dono(p_id uuid)
returns public.charges language plpgsql security definer set search_path = public as $$
declare c public.charges;
begin
  select * into c from public.charges where id = p_id for update;
  if c.id is null or not public.is_tenant_owner(c.tenant_id) then raise exception 'cobranca_inexistente' using errcode = 'P0002'; end if;
  return c;
end;
$$;
revoke all on function public._cobranca_do_dono(uuid) from public, anon, authenticated;

create or replace function public.cobranca_criar(p_cliente uuid, p_descricao text, p_valor_cents integer,
  p_vencimento date default null, p_projeto uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); c public.charges;
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if p_projeto is not null and not exists (select 1 from public.projects where id = p_projeto and client_id = p_cliente) then
    raise exception 'projeto_inexistente' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_descricao, ''))) < 2 then raise exception 'descricao_obrigatoria' using errcode = '22023'; end if;
  if coalesce(p_valor_cents, 0) < 1 or p_valor_cents > 100000000 then raise exception 'valor_invalido' using errcode = '22023'; end if;
  insert into public.charges (tenant_id, client_id, project_id, kind, description, amount_cents, due_date)
  values (t, p_cliente, p_projeto, 'avulsa', left(trim(p_descricao), 160), p_valor_cents, p_vencimento)
  returning * into c;
  perform public._cobranca_evento(c, 'cobranca_criada', 'hub', null);
  return jsonb_build_object('id', c.id);
end;
$$;

-- Chaves: vencimento (AAAA-MM-DD|''), valor_cents, descricao
create or replace function public.cobranca_atualizar(p_id uuid, p_campos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.charges := public._cobranca_do_dono(p_id); j jsonb := coalesce(p_campos, '{}'::jsonb);
begin
  if c.status <> 'aberta' then raise exception 'cobranca_fechada' using errcode = '22023'; end if;
  if j ? 'vencimento' then c.due_date := nullif(j->>'vencimento', '')::date; end if;
  if j ? 'valor_cents' then
    if coalesce((j->>'valor_cents')::int, 0) < 1 then raise exception 'valor_invalido' using errcode = '22023'; end if;
    if c.kind in ('parcela', 'adicional', 'diagnostico') and (j->>'valor_cents')::int <> c.amount_cents then
      -- valor combinado com o cliente: só muda pelo caminho que o criou (proposta, pedido, funil)
      raise exception 'valor_combinado' using errcode = '22023';
    end if;
    c.amount_cents := (j->>'valor_cents')::int;
  end if;
  if j ? 'descricao' then
    if length(trim(coalesce(j->>'descricao', ''))) < 2 then raise exception 'descricao_obrigatoria' using errcode = '22023'; end if;
    c.description := left(trim(j->>'descricao'), 160);
  end if;
  update public.charges set due_date = c.due_date, due_label = case when c.due_date is not null then null else due_label end,
         amount_cents = c.amount_cents, description = c.description
   where id = c.id returning * into c;
  return public._cobranca_json(c, public._hoje(c.tenant_id), public._precos(c.tenant_id));
end;
$$;

create or replace function public.cobranca_pagar(p_id uuid, p_data date, p_valor_cents integer,
  p_forma public.pay_method, p_nota text default null, p_restante boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.charges := public._cobranca_do_dono(p_id); hoje date := public._hoje(c.tenant_id); resto public.charges;
begin
  if c.status <> 'aberta' then raise exception 'cobranca_fechada' using errcode = '22023'; end if;
  if p_data is null or p_data > hoje or p_data < hoje - 366 then raise exception 'data_invalida' using errcode = '22023'; end if;
  if coalesce(p_valor_cents, 0) < 1 or p_valor_cents > 100000000 then raise exception 'valor_invalido' using errcode = '22023'; end if;
  if p_forma is null then raise exception 'forma_obrigatoria' using errcode = '22023'; end if;
  c := public._cobranca_marcar_paga(c.id, p_data, p_valor_cents, p_forma, p_nota);
  -- Pagou menos e pediu para cobrar o resto
  if p_restante and p_valor_cents < c.amount_cents then
    insert into public.charges (tenant_id, client_id, project_id, proposal_id, deal_id, request_id, subscription_id,
                                kind, description, amount_cents, due_date)
    values (c.tenant_id, c.client_id, c.project_id, null, null, null, null, 'avulsa',
            left('Restante · ' || c.description, 160), c.amount_cents - p_valor_cents, hoje + 7)
    returning * into resto;
  end if;
  -- Diagnóstico pago aqui também fica pago no funil
  if c.kind = 'diagnostico' and c.deal_id is not null then
    update public.deals set diagnostic_paid = true where id = c.deal_id and not diagnostic_paid;
  end if;
  return public._cobranca_json(c, hoje, public._precos(c.tenant_id)) || jsonb_build_object('restante_id', resto.id);
end;
$$;

create or replace function public.cobranca_desfazer(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.charges := public._cobranca_do_dono(p_id);
begin
  if c.status <> 'paga' then raise exception 'cobranca_nao_paga' using errcode = '22023'; end if;
  -- O número do recibo anulado fica registrado na linha do tempo e na fila do n8n
  perform public._cobranca_evento(c, 'pagamento_desfeito', 'hub', 'financeiro.pagamento_desfeito',
    jsonb_build_object('recibo', c.receipt_number, 'pago_cents', c.paid_cents, 'pago_em', c.paid_at));
  update public.charges set status = 'aberta', paid_at = null, paid_cents = null, paid_method = null,
         receipt_number = null, payment_note = null where id = c.id returning * into c;
  if c.kind = 'diagnostico' and c.deal_id is not null then
    update public.deals set diagnostic_paid = false where id = c.deal_id and diagnostic_paid;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.cobranca_cancelar(p_id uuid, p_motivo text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.charges := public._cobranca_do_dono(p_id);
begin
  if c.status <> 'aberta' then raise exception 'cobranca_fechada' using errcode = '22023'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'motivo_obrigatorio' using errcode = '22023'; end if;
  update public.charges set status = 'cancelada', canceled_reason = left(trim(p_motivo), 300) where id = c.id returning * into c;
  perform public._cobranca_evento(c, 'cobranca_cancelada', 'hub', 'financeiro.cobranca_cancelada',
    jsonb_build_object('motivo', c.canceled_reason));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.mensalidade_criar(p_cliente uuid, p_plano text, p_valor_cents integer,
  p_inicio date, p_dia integer default null, p_minimo integer default 6)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); s public.subscriptions; f public.finance_settings := public._financas(t);
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_plano, ''))) < 2 then raise exception 'plano_obrigatorio' using errcode = '22023'; end if;
  if coalesce(p_valor_cents, 0) < 100 then raise exception 'valor_invalido' using errcode = '22023'; end if;
  if p_inicio is null or p_inicio < public._hoje(t) - 366 then raise exception 'data_invalida' using errcode = '22023'; end if;
  insert into public.subscriptions (tenant_id, client_id, plan_name, amount_cents, start_month, due_day, min_months)
  values (t, p_cliente, left(trim(p_plano), 80), p_valor_cents, public._mes_de(p_inicio),
          greatest(1, least(28, coalesce(p_dia, f.due_day))), greatest(1, least(60, coalesce(p_minimo, 6))))
  returning * into s;
  perform public._projeto_evento(t, p_cliente, null, null, 'mensalidade_criada',
    jsonb_build_object('plano', s.plan_name, 'inicio', s.start_month), 'hub', 'financeiro.mensalidade_criada');
  return jsonb_build_object('id', s.id);
end;
$$;

create or replace function public.mensalidade_situacao(p_id uuid, p_situacao public.subscription_status)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.subscriptions; hoje date; mes date;
begin
  select * into s from public.subscriptions where id = p_id for update;
  if s.id is null or not public.is_tenant_owner(s.tenant_id) then raise exception 'mensalidade_inexistente' using errcode = 'P0002'; end if;
  if s.status = 'encerrada' then raise exception 'mensalidade_encerrada' using errcode = '22023'; end if;
  if s.status = p_situacao then return jsonb_build_object('ok', true); end if;
  hoje := public._hoje(s.tenant_id); mes := public._mes_de(hoje);
  -- Gera o mês corrente antes de mudar (o mês em curso continua cobrado)
  perform public._mensalidades_gerar(s.tenant_id);
  if p_situacao = 'pausada' then
    -- Pausa a partir do mês seguinte (ou do início, se ainda não começou)
    insert into public.subscription_pauses (tenant_id, subscription_id, from_month)
    values (s.tenant_id, s.id, greatest(s.start_month, (mes + interval '1 month')::date));
  else
    -- Retomou antes da pausa começar: a pausa some. Senão, fecha a pausa no mês da retomada.
    delete from public.subscription_pauses where subscription_id = s.id and to_month is null and from_month > mes;
    update public.subscription_pauses set to_month = mes
     where subscription_id = s.id and to_month is null;
  end if;
  if p_situacao = 'encerrada' and s.start_month > mes then
    -- Encerrada antes de começar: nenhum mês é cobrado
    insert into public.subscription_pauses (tenant_id, subscription_id, from_month, to_month)
    values (s.tenant_id, s.id, s.start_month, s.start_month);
  end if;
  update public.subscriptions set status = p_situacao,
         ended_month = case when p_situacao = 'encerrada' then greatest(start_month, mes) end
   where id = s.id returning * into s;
  perform public._projeto_evento(s.tenant_id, s.client_id, s.project_id, null, 'mensalidade_' || p_situacao::text,
    jsonb_build_object('plano', s.plan_name), 'hub', 'financeiro.mensalidade_' || p_situacao::text);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.despesa_salvar(p_id uuid, p_descricao text, p_categoria public.expense_category,
  p_valor_cents integer, p_tipo public.expense_kind, p_data date, p_fim date default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); e public.expenses;
begin
  if length(trim(coalesce(p_descricao, ''))) < 2 then raise exception 'descricao_obrigatoria' using errcode = '22023'; end if;
  if coalesce(p_valor_cents, 0) < 1 or p_valor_cents > 100000000 then raise exception 'valor_invalido' using errcode = '22023'; end if;
  if p_data is null then raise exception 'data_invalida' using errcode = '22023'; end if;
  if p_tipo = 'fixa' and p_fim is not null and public._mes_de(p_fim) < public._mes_de(p_data) then
    raise exception 'fim_antes_do_inicio' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.expenses (tenant_id, description, category, amount_cents, kind, spent_on, start_month, end_month, note)
    values (t, left(trim(p_descricao), 120), coalesce(p_categoria, 'outros'), p_valor_cents, p_tipo,
            case when p_tipo = 'avulsa' then p_data end,
            case when p_tipo = 'fixa' then public._mes_de(p_data) end,
            case when p_tipo = 'fixa' and p_fim is not null then public._mes_de(p_fim) end,
            nullif(left(trim(coalesce(p_nota, '')), 300), ''))
    returning * into e;
  else
    select * into e from public.expenses where id = p_id and tenant_id = t for update;
    if e.id is null then raise exception 'despesa_inexistente' using errcode = 'P0002'; end if;
    update public.expenses set description = left(trim(p_descricao), 120), category = coalesce(p_categoria, 'outros'),
           amount_cents = p_valor_cents, kind = p_tipo,
           spent_on = case when p_tipo = 'avulsa' then p_data end,
           start_month = case when p_tipo = 'fixa' then public._mes_de(p_data) end,
           end_month = case when p_tipo = 'fixa' and p_fim is not null then public._mes_de(p_fim) end,
           note = nullif(left(trim(coalesce(p_nota, '')), 300), '')
     where id = e.id returning * into e;
  end if;
  return jsonb_build_object('id', e.id);
end;
$$;

create or replace function public.despesa_remover(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono();
begin
  delete from public.expenses where id = p_id and tenant_id = t;
  if not found then raise exception 'despesa_inexistente' using errcode = 'P0002'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Resumo para a ficha do cliente e para o projeto
create or replace function public.financeiro_cliente(p_cliente uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); hoje date := public._hoje(t);
begin
  if not exists (select 1 from public.clients where id = p_cliente and tenant_id = t) then
    raise exception 'cliente_inexistente' using errcode = 'P0002';
  end if;
  return (select jsonb_build_object(
    'pago_cents', coalesce(sum(paid_cents) filter (where status = 'paga'), 0),
    'a_receber_cents', coalesce(sum(amount_cents) filter (where status = 'aberta'), 0),
    'em_atraso_cents', coalesce(sum(amount_cents) filter (where status = 'aberta' and due_date < hoje), 0),
    'proxima', (select jsonb_build_object('descricao', description, 'valor_cents', amount_cents, 'vencimento', due_date)
                  from public.charges where client_id = p_cliente and status = 'aberta' and due_date is not null
                 order by due_date limit 1),
    'mensalidade_cents', (select coalesce(sum(amount_cents), 0) from public.subscriptions
                           where client_id = p_cliente and status = 'ativa'))
    from public.charges where client_id = p_cliente);
end;
$$;

create or replace function public.financeiro_projeto(p_projeto uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.projects;
begin
  select * into p from public.projects where id = p_projeto;
  if p.id is null or not public.is_tenant_owner(p.tenant_id) then raise exception 'projeto_inexistente' using errcode = 'P0002'; end if;
  return (select jsonb_build_object(
    'total_cents', coalesce(sum(amount_cents) filter (where status <> 'cancelada' and kind = 'parcela'), 0),
    'pago_cents', coalesce(sum(paid_cents) filter (where status = 'paga' and kind = 'parcela'), 0),
    'proxima', (select jsonb_build_object('descricao', description, 'valor_cents', amount_cents, 'vencimento', due_date)
                  from public.charges where project_id = p.id and status = 'aberta' and kind = 'parcela'
                 order by due_date nulls last, sequence limit 1))
    from public.charges where project_id = p.id);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Portal e recibo
-- ---------------------------------------------------------------------
create or replace function public.portal_pagamentos(p_cliente uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c uuid := public._portal_cliente(p_cliente); t uuid; hoje date; s public.pricing_settings;
        f public.finance_settings; proj public.projects; cob jsonb;
begin
  select tenant_id into t from public.clients where id = c;
  perform public._mensalidades_gerar(t);
  hoje := public._hoje(t); s := public._precos(t); f := public._financas(t);
  select * into proj from public.projects where client_id = c order by (status = 'andamento') desc, created_at desc limit 1;
  select coalesce(jsonb_agg((public._cobranca_json(x, hoje, s) - 'nota') order by x.kind, x.sequence, x.period desc, x.created_at), '[]'::jsonb)
    into cob from public.charges x where x.client_id = c and x.status <> 'cancelada';
  return jsonb_build_object(
    'hoje', hoje,
    'projeto', case when proj.id is null then null else jsonb_build_object(
        'nome', proj.name,
        'total_cents', (select coalesce(sum(amount_cents), 0) from public.charges
                         where project_id = proj.id and kind = 'parcela' and status <> 'cancelada'),
        'pago_cents', (select coalesce(sum(paid_cents), 0) from public.charges
                        where project_id = proj.id and kind = 'parcela' and status = 'paga'),
        'diagnostico_cents', (select coalesce(sum(paid_cents), 0) from public.charges
                               where client_id = c and kind = 'diagnostico' and status = 'paga')) end,
    'mensalidade', (select jsonb_build_object('plano', x.plan_name, 'valor_cents', x.amount_cents, 'inicio', x.start_month,
                       'dia', x.due_day, 'minimo_meses', x.min_months, 'situacao', x.status,
                       'horas_mes', (select hours_month from public.pricing_plans pp where pp.tenant_id = t and pp.name = x.plan_name))
                      from public.subscriptions x where x.client_id = c and x.status <> 'encerrada'
                     order by x.created_at desc limit 1),
    'mensalidade_prevista', case when proj.plan_name is not null and proj.status = 'andamento' then
        jsonb_build_object('plano', proj.plan_name, 'valor_cents', proj.monthly_cents, 'lancamento', proj.launch_date) end,
    'cobrancas', cob,
    'pix', case when f.pix_key is null then null else
        jsonb_build_object('chave', f.pix_key, 'nome', f.pix_name, 'cidade', f.pix_city) end,
    'regras', jsonb_build_object('multa_pct', s.late_fee_pct, 'juros_pct', s.interest_pct),
    'responsavel', (select coalesce(nullif(trim(pr.full_name), ''), nullif(trim(u.raw_user_meta_data->>'full_name'), ''))
                     from public.memberships m join auth.users u on u.id = m.user_id
                     left join public.profiles pr on pr.id = m.user_id
                    where m.tenant_id = t and m.role = 'owner' order by m.created_at limit 1)
  );
end;
$$;

create or replace function public.portal_cobranca_avisar(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare x public.charges;
begin
  select * into x from public.charges where id = p_id for update;
  if x.id is null or not public.is_client_member(x.client_id) then raise exception 'cobranca_inexistente' using errcode = 'P0002'; end if;
  if x.status <> 'aberta' then return jsonb_build_object('repetido', true); end if;
  if x.client_reported_at is not null and x.client_reported_at > now() - interval '1 day' then
    return jsonb_build_object('repetido', true);
  end if;
  update public.charges set client_reported_at = now() where id = x.id returning * into x;
  perform public._cobranca_evento(x, 'pagamento_avisado', 'cliente', 'financeiro.pagamento_avisado');
  return jsonb_build_object('repetido', false);
end;
$$;

-- Recibo: dono do tenant ou alguém da empresa do cliente
create or replace function public.recibo(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare x public.charges; cl public.clients; tn public.tenants;
begin
  select * into x from public.charges where id = p_id;
  if x.id is null or x.status <> 'paga'
     or not (public.is_tenant_owner(x.tenant_id) or public.is_client_member(x.client_id)) then
    raise exception 'recibo_inexistente' using errcode = 'P0002';
  end if;
  select * into cl from public.clients where id = x.client_id;
  select * into tn from public.tenants where id = x.tenant_id;
  return jsonb_build_object(
    'numero', x.receipt_number, 'agencia', tn.name,
    'cliente', coalesce(nullif(cl.legal_name, ''), cl.company_name), 'documento', cl.document_number,
    'descricao', x.description, 'valor_cents', x.paid_cents, 'pago_em', x.paid_at, 'forma', x.paid_method,
    'responsavel', (select coalesce(nullif(trim(pr.full_name), ''), nullif(trim(u.raw_user_meta_data->>'full_name'), ''))
                     from public.memberships m join auth.users u on u.id = m.user_id
                     left join public.profiles pr on pr.id = m.user_id
                    where m.tenant_id = x.tenant_id and m.role = 'owner' order by m.created_at limit 1));
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Painel: aviso de pagamento do cliente entra nas novidades
-- ---------------------------------------------------------------------
do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.painel_novidades()'::regprocedure);
  novo := replace(d, '''pendencia_feita'', ''pedido_recebido'')', '''pendencia_feita'', ''pedido_recebido'', ''pagamento_avisado'')');
  if novo = d then raise exception 'painel_novidades: ponto de troca não encontrado'; end if;
  execute novo;
end $$;

do $$
declare d text; novo text;
begin
  d := pg_get_functiondef('public.pedido_enviar_cliente(uuid)'::regprocedure);
  novo := replace(d, 'if r.classification is distinct from ''adicional'' or r.status <> ''em_analise'' then',
                     'if r.classification is distinct from ''adicional'' or r.status <> ''em_analise'' or r.client_decision = ''aprovado'' then');
  if novo = d then raise exception 'pedido_enviar_cliente: ponto de troca não encontrado'; end if;
  execute novo;
end $$;

-- ---------------------------------------------------------------------
-- 7. Permissões das RPCs
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'financeiro_config_ler()', 'financeiro_config_salvar(text, text, text, integer)', 'financeiro_painel()',
    'financeiro_fluxo()', 'cobranca_criar(uuid, text, integer, date, uuid)', 'cobranca_atualizar(uuid, jsonb)',
    'cobranca_pagar(uuid, date, integer, public.pay_method, text, boolean)', 'cobranca_desfazer(uuid)',
    'cobranca_cancelar(uuid, text)', 'mensalidade_criar(uuid, text, integer, date, integer, integer)',
    'mensalidade_situacao(uuid, public.subscription_status)',
    'despesa_salvar(uuid, text, public.expense_category, integer, public.expense_kind, date, date, text)',
    'despesa_remover(uuid)', 'financeiro_cliente(uuid)', 'financeiro_projeto(uuid)',
    'portal_pagamentos(uuid)', 'portal_cobranca_avisar(uuid)', 'recibo(uuid)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
