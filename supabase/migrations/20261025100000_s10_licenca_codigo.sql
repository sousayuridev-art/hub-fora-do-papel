-- S10 · Licença do código em sistemas sob medida (decisão do Yuri em 22/10): card docs/cards/S10-licenca-do-codigo.md
-- 1. Proposta guarda o modelo de propriedade (cliente | licenca) e o valor de compra do código (centavos)
-- 2. proposta_salvar aceita as chaves 'propriedade' e 'compra_codigo_cents'
-- 3. Pendências no envio: modelo não escolhido; licença sem mensalidade
-- 4. Retrato do cliente leva condicoes.propriedade e condicoes.compra_codigo_cents
-- 5. Proposta nova já nasce com o padrão da frente (sites → cliente; sistemas → licença)
-- Propostas antigas ficam com o modelo vazio: o retrato já enviado não muda.

-- ---------------------------------------------------------------------
-- Apoio: troca de trecho no corpo de uma função (falha se o trecho não existir)
-- ---------------------------------------------------------------------
create or replace function public._s10_trocar(p_funcao text, p_de text, p_para text)
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
-- 1. Colunas
-- ---------------------------------------------------------------------
alter table public.proposals
  add column ownership_model text check (ownership_model is null or ownership_model in ('cliente', 'licenca')),
  add column code_buyout_cents integer check (code_buyout_cents is null or code_buyout_cents >= 0);

-- ---------------------------------------------------------------------
-- 2. Edição pela RPC que já existe (mesmas travas de tenant, versão e situação)
-- ---------------------------------------------------------------------
select public._s10_trocar('public.proposta_salvar(uuid,timestamp with time zone,jsonb)',
  '  if j ? ''conferencias'' then',
  '  if j ? ''propriedade'' then
    p.ownership_model := nullif(trim(coalesce(j->>''propriedade'', '''')), '''');
    if p.ownership_model is not null and p.ownership_model not in (''cliente'', ''licenca'') then
      raise exception ''propriedade_invalida'' using errcode = ''22023'';
    end if;
  end if;
  if j ? ''compra_codigo_cents'' then
    p.code_buyout_cents := nullif(j->>''compra_codigo_cents'', '''')::int;
    if p.code_buyout_cents < 0 then
      raise exception ''compra_codigo_invalida'' using errcode = ''22023'';
    end if;
  end if;
  if j ? ''conferencias'' then');
select public._s10_trocar('public.proposta_salvar(uuid,timestamp with time zone,jsonb)',
  'infra_cents = p.infra_cents, checks = p.checks,',
  'infra_cents = p.infra_cents, checks = p.checks,
    ownership_model = p.ownership_model, code_buyout_cents = p.code_buyout_cents,');

-- ---------------------------------------------------------------------
-- 3. Pendências (travam proposta_enviar e aparecem em "Antes de enviar")
-- ---------------------------------------------------------------------
select public._s10_trocar('public._proposta_calcular(public.proposals)',
  '    v_pend := v_pend || jsonb_build_object(''chave'', ''plano'', ''acao'', ''escolher a mensalidade'');
  end if;',
  '    v_pend := v_pend || jsonb_build_object(''chave'', ''plano'', ''acao'', ''escolher a mensalidade'');
  end if;
  if p.ownership_model is null then
    v_pend := v_pend || jsonb_build_object(''chave'', ''propriedade'', ''acao'', ''escolher o que fica com o cliente'');
  elsif p.ownership_model = ''licenca'' and pl.id is null then
    v_pend := v_pend || jsonb_build_object(''chave'', ''licenca'', ''acao'', ''escolher a mensalidade, porque a licença depende dela'');
  end if;');

-- ---------------------------------------------------------------------
-- 4. Retrato do cliente
-- ---------------------------------------------------------------------
select public._s10_trocar('public._proposta_documento(public.proposals,jsonb)',
  '''garantia_dias'', s.warranty_days)',
  '''garantia_dias'', s.warranty_days,
       ''propriedade'', p.ownership_model,
       ''compra_codigo_cents'', case when p.ownership_model = ''licenca'' then p.code_buyout_cents end)');

-- ---------------------------------------------------------------------
-- 5. Padrão pela frente da oportunidade (ia e automações: sem padrão, o Yuri escolhe)
-- ---------------------------------------------------------------------
select public._s10_trocar('public.proposta_criar(uuid)',
  '  insert into public.proposals (tenant_id, client_id, deal_id, phases)
  values (d.tenant_id, d.client_id, d.id, jsonb_build_array(',
  '  insert into public.proposals (tenant_id, client_id, deal_id, ownership_model, phases)
  values (d.tenant_id, d.client_id, d.id,
    case d.service_line when ''sites'' then ''cliente'' when ''sistemas'' then ''licenca'' end,
    jsonb_build_array(');

drop function public._s10_trocar(text, text, text);
