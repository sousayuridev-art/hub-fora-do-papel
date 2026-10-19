-- REV-3 · Revisão geral (19/10): card docs/cards/REV-3-revisao-geral.md
-- 1. Permissões: ninguém logado esvazia ou altera a fila de integrações nem tabelas por TRUNCATE
-- 2. Reabrir proposta troca o link (o link antigo encaminhado deixa de valer)
-- 3. Lançar o projeto dá data às parcelas "na entrega"
-- 4. Encerrar a mensalidade conclui o projeto (o portal deixa de dizer "Mensalidade")
-- 5. Cancelar projeto: cobranças abertas, mensalidade, aprovações, pendências e pedidos abertos saem juntos
-- 6. Serviço adicional recusado depois de pago: aviso para combinar crédito ou devolução
-- 7. Fila do Painel: cobranças atrasadas, avisos de pagamento, adicionais aprovados, partes sem data
-- 8. Portal: contas a pagar entram no "Precisa de você" (selo de Pagamentos)
-- 9. "Fechado no mês" do Painel usa o valor da proposta aceita (igual aos Relatórios); esse valor fica travado

-- ---------------------------------------------------------------------
-- 1. Permissões
-- ---------------------------------------------------------------------
revoke insert, update, delete, truncate on public.event_outbox from anon, authenticated;
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate on public.%I from anon, authenticated', r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Apoio: troca de trecho no corpo de uma função (falha se o trecho não existir)
-- ---------------------------------------------------------------------
create or replace function public._rev3_trocar(p_funcao text, p_de text, p_para text)
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
-- 2. Reabrir proposta troca o link
-- ---------------------------------------------------------------------
select public._rev3_trocar('public.proposta_reabrir(uuid)',
  'sent_at = null, expires_at = null, viewed_at = null',
  'sent_at = null, expires_at = null, viewed_at = null, token = null');

-- ---------------------------------------------------------------------
-- 3. Lançar o projeto: partes "na entrega" ganham vencimento em 3 dias
-- ---------------------------------------------------------------------
select public._rev3_trocar('public.projeto_lancar(uuid)',
  '  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, ''projeto_lancado'',',
  '  update public.charges set due_date = public._hoje(p.tenant_id) + 3, due_label = null, updated_at = now()
   where project_id = p.id and kind = ''parcela'' and status = ''aberta'' and due_date is null;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, ''projeto_lancado'',');

-- ---------------------------------------------------------------------
-- 4. Mensalidade encerrada conclui o projeto
-- ---------------------------------------------------------------------
select public._rev3_trocar('public.mensalidade_situacao(uuid,public.subscription_status)',
  '   where id = s.id returning * into s;',
  '   where id = s.id returning * into s;
  if p_situacao = ''encerrada'' and s.project_id is not null then
    update public.projects set status = ''concluido'' where id = s.project_id and status = ''mensalidade'';
  end if;');

-- ---------------------------------------------------------------------
-- 5. Cancelar projeto
-- ---------------------------------------------------------------------
alter table public.projects
  add column canceled_at timestamptz,
  add column cancel_reason text check (cancel_reason is null or length(cancel_reason) between 5 and 300);

create or replace function public.projeto_cancelar_previa(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.projects;
begin
  select * into p from public.projects where id = p_id;
  if p.id is null or not public.is_tenant_owner(p.tenant_id) then raise exception 'projeto_inexistente' using errcode = 'P0002'; end if;
  return jsonb_build_object(
    'cobrancas', (select count(*) from public.charges where project_id = p.id and status = 'aberta'),
    'cobrancas_cents', (select coalesce(sum(amount_cents), 0) from public.charges where project_id = p.id and status = 'aberta'),
    'pagas_cents', (select coalesce(sum(paid_cents), 0) from public.charges where project_id = p.id and status = 'paga'),
    'mensalidade', exists (select 1 from public.subscriptions where project_id = p.id and status <> 'encerrada'),
    'aprovacoes', (select count(*) from public.approvals where project_id = p.id and status = 'aguardando'),
    'pendencias', (select count(*) from public.client_tasks where project_id = p.id and status = 'aberta'),
    'pedidos', (select count(*) from public.requests where project_id = p.id
                 and status in ('recebido', 'em_analise', 'aguardando_cliente', 'fazendo')));
end;
$$;

create or replace function public.projeto_cancelar(p_id uuid, p_motivo text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare p public.projects := public._projeto_do_dono(p_id); s public.subscriptions; previa jsonb;
begin
  if p.canceled_at is not null then raise exception 'projeto_cancelado' using errcode = '22023'; end if;
  if p.status = 'concluido' then raise exception 'projeto_concluido' using errcode = '22023'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'motivo_obrigatorio' using errcode = '22023'; end if;
  previa := public.projeto_cancelar_previa(p.id);
  update public.charges set status = 'cancelada', canceled_reason = left('Projeto cancelado: ' || trim(p_motivo), 300),
         updated_at = now()
   where project_id = p.id and status = 'aberta';
  for s in select * from public.subscriptions where project_id = p.id and status <> 'encerrada' loop
    perform public.mensalidade_situacao(s.id, 'encerrada');
  end loop;
  update public.approvals set status = 'cancelada' where project_id = p.id and status = 'aguardando';
  delete from public.client_tasks where project_id = p.id and status = 'aberta';
  update public.requests set status = 'recusado', owner_note = left('Projeto cancelado: ' || trim(p_motivo), 1000)
   where project_id = p.id and status in ('recebido', 'em_analise', 'aguardando_cliente', 'fazendo');
  update public.projects set status = 'concluido', canceled_at = now(), cancel_reason = left(trim(p_motivo), 300)
   where id = p.id returning * into p;
  perform public._projeto_evento(p.tenant_id, p.client_id, p.id, null, 'projeto_cancelado',
    jsonb_build_object('nome', p.name, 'motivo', p.cancel_reason), 'hub', 'projeto.cancelado');
  return previa;
end;
$$;

-- O portal não mostra projeto cancelado como "concluído"
select public._rev3_trocar('public.portal_inicio(uuid)',
  '  select * into p from public.projects where client_id = c
   order by',
  '  select * into p from public.projects where client_id = c and canceled_at is null
   order by');

-- ---------------------------------------------------------------------
-- 6. Adicional recusado depois de pago
-- ---------------------------------------------------------------------
select public._rev3_trocar('public.pedido_recusar(uuid,text)',
  '  return to_jsonb(r) - ''tenant_id'';',
  '  if exists (select 1 from public.charges where request_id = r.id and kind = ''adicional'' and status = ''paga'') then
    perform public._projeto_evento(r.tenant_id, r.client_id, r.project_id, r.id, ''adicional_pago_recusado'',
      jsonb_build_object(''codigo'', r.code, ''titulo'', r.title,
        ''pago_cents'', (select sum(paid_cents) from public.charges where request_id = r.id and kind = ''adicional'' and status = ''paga'')),
      ''hub'', ''pedido.adicional_pago_recusado'');
  end if;
  return (to_jsonb(r) - ''tenant_id'') || jsonb_build_object(''pago_cents'',
    (select coalesce(sum(paid_cents), 0) from public.charges where request_id = r.id and kind = ''adicional'' and status = ''paga''));');

-- ---------------------------------------------------------------------
-- 7. Fila do Painel (o que o Yuri precisa resolver fora do funil)
-- ---------------------------------------------------------------------
create or replace function public.painel_fila()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t uuid := public._tenant_do_dono(); hoje date := public._hoje(t); itens jsonb;
begin
  select coalesce(jsonb_agg(x order by x->>'ordem'), '[]'::jsonb) into itens from (
    -- cliente avisou que pagou
    select jsonb_build_object('tipo', 'pagamento_avisado', 'id', ch.id, 'empresa', c.company_name, 'client_id', c.id,
             'titulo', ch.description, 'valor_cents', ch.amount_cents, 'quando', ch.client_reported_at,
             'ordem', '1' || ch.client_reported_at) x
      from public.charges ch join public.clients c on c.id = ch.client_id
     where ch.tenant_id = t and ch.status = 'aberta' and ch.client_reported_at is not null
    union all
    -- cobrança atrasada (sem aviso do cliente)
    select jsonb_build_object('tipo', 'cobranca_atrasada', 'id', ch.id, 'empresa', c.company_name, 'client_id', c.id,
             'titulo', ch.description, 'valor_cents', ch.amount_cents, 'quando', ch.due_date,
             'dias', hoje - ch.due_date, 'ordem', '2' || ch.due_date)
      from public.charges ch join public.clients c on c.id = ch.client_id
     where ch.tenant_id = t and ch.status = 'aberta' and ch.due_date < hoje and ch.client_reported_at is null
    union all
    -- serviço adicional aprovado pelo cliente esperando começar
    select jsonb_build_object('tipo', 'adicional_aprovado', 'id', r.id, 'empresa', c.company_name, 'client_id', c.id,
             'titulo', r.code || ' · ' || r.title, 'valor_cents', r.value_cents, 'quando', r.updated_at,
             'ordem', '3' || r.updated_at)
      from public.requests r join public.clients c on c.id = r.client_id
     where r.tenant_id = t and r.classification = 'adicional' and r.client_decision = 'aprovado' and r.status = 'em_analise'
    union all
    -- parte sem data de projeto já lançado
    select jsonb_build_object('tipo', 'parcela_sem_data', 'id', ch.id, 'empresa', c.company_name, 'client_id', c.id,
             'titulo', ch.description, 'valor_cents', ch.amount_cents, 'quando', p.launched_at,
             'ordem', '4' || p.launched_at)
      from public.charges ch join public.clients c on c.id = ch.client_id join public.projects p on p.id = ch.project_id
     where ch.tenant_id = t and ch.status = 'aberta' and ch.due_date is null and p.launched_at is not null
    union all
    -- adicional recusado depois de pago (últimos 30 dias)
    select jsonb_build_object('tipo', 'adicional_pago_recusado', 'id', e.request_id, 'empresa', c.company_name,
             'client_id', c.id, 'titulo', (e.detail->>'codigo') || ' · ' || (e.detail->>'titulo'),
             'valor_cents', (e.detail->>'pago_cents')::int, 'quando', e.created_at, 'ordem', '5' || e.created_at)
      from public.project_events e join public.clients c on c.id = e.client_id
     where e.tenant_id = t and e.kind = 'adicional_pago_recusado' and e.created_at > now() - interval '30 days'
  ) q;
  return jsonb_build_object('total', jsonb_array_length(itens), 'itens', itens);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Portal: contas a pagar (vencidas ou vencendo em 3 dias, sem aviso) entram no total
-- ---------------------------------------------------------------------
select public._rev3_trocar('public.portal_pendencias(uuid)',
  'declare c uuid := public._portal_cliente(p_cliente); ap int; pe int; ad int;',
  'declare c uuid := public._portal_cliente(p_cliente); ap int; pe int; ad int; pg int;');
select public._rev3_trocar('public.portal_pendencias(uuid)',
  '  return jsonb_build_object(''aprovacoes'', ap + ad, ''pendencias'', pe, ''total'', ap + pe + ad,',
  '  select count(*) into pg from public.charges ch
   where ch.client_id = c and ch.status = ''aberta'' and ch.client_reported_at is null
     and ch.due_date <= public._hoje(ch.tenant_id) + 3;
  return jsonb_build_object(''aprovacoes'', ap + ad, ''pendencias'', pe, ''pagamentos'', pg, ''total'', ap + pe + ad + pg,');

-- ---------------------------------------------------------------------
-- 9. "Fechado no mês": valor da proposta aceita; o manual só vale sem proposta
-- ---------------------------------------------------------------------
select public._rev3_trocar('public.painel_novidades()',
  '''fechado_mes_cents'', (select coalesce(sum(value_cents), 0) from public.deals',
  '''fechado_mes_cents'', (select coalesce(sum(coalesce((select pr.total_cents from public.proposals pr
                           where pr.deal_id = deals.id and pr.status = ''aceita'' order by pr.accepted_at desc limit 1),
                           value_cents)), 0) from public.deals');

-- O valor de uma oportunidade fechada por aceite é o da proposta aceita
create or replace function public.deals_valor_do_aceite()
returns trigger language plpgsql security definer set search_path = public as $$
declare aceito integer;
begin
  select total_cents into aceito from public.proposals
   where deal_id = new.id and status = 'aceita' order by accepted_at desc limit 1;
  if aceito is not null and new.value_cents is distinct from old.value_cents and new.value_cents is distinct from aceito then
    raise exception 'valor_fechado_por_aceite' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.deals_valor_do_aceite() from public, anon, authenticated;
create trigger deals_valor_do_aceite before update of value_cents on public.deals
  for each row execute function public.deals_valor_do_aceite();

drop function public._rev3_trocar(text, text, text);

revoke all on function public.projeto_cancelar_previa(uuid) from public, anon;
revoke all on function public.projeto_cancelar(uuid, text) from public, anon;
revoke all on function public.painel_fila() from public, anon;
grant execute on function public.projeto_cancelar_previa(uuid) to authenticated;
grant execute on function public.projeto_cancelar(uuid, text) to authenticated;
grant execute on function public.painel_fila() to authenticated;
