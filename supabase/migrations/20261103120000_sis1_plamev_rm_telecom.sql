-- SIS-1 · sistema da Plamev no cliente certo. O Yuri confirmou (03/11) que a Plamev está cadastrada no
-- Hub como "RM Telecom" (a representação); as migrações anteriores procuravam "Plamev" no nome e não
-- acharam nada. Cria o sistema (Orga CRM, no ar) ligado ao projeto mais recente desse cliente, com a
-- infraestrutura conhecida. Custos ficam vazios: não temos o valor de cada serviço. Idempotente.
do $$
declare c public.clients; s public.sistemas; v_projeto uuid; v_no_ar date;
begin
  select * into c from public.clients
   where company_name ilike '%rm telecom%' or company_name ilike '%rmtelecom%'
   order by created_at limit 1;
  if c.id is null then
    raise notice 'SIS-1: cliente RM Telecom não encontrado.';
    return;
  end if;

  select * into s from public.sistemas where client_id = c.id order by created_at limit 1;
  if s.id is null then
    select p.id, p.launched_at::date into v_projeto, v_no_ar
      from public.projects p
     where p.client_id = c.id
       and not exists (select 1 from public.sistemas x where x.project_id = p.id)
     order by (p.launched_at is not null) desc, p.started_at desc
     limit 1;
    insert into public.sistemas (tenant_id, client_id, project_id, nome, situacao, no_ar_desde)
    values (c.tenant_id, c.id, v_projeto, 'Orga CRM · Plamev', 'no_ar', coalesce(v_no_ar, current_date))
    returning * into s;
    insert into public.event_outbox (tenant_id, event, payload)
    values (c.tenant_id, 'sistema.criado', jsonb_build_object('sistema_id', s.id, 'client_id', c.id, 'situacao', 'no_ar'));
  end if;

  update public.sistemas set
    nome = 'Orga CRM · Plamev',
    descricao = coalesce(descricao,
      'CRM de vendas da Plamev: os contatos dos anúncios entram em rodízio entre as vendedoras, '
      || 'na fila do dia com a mensagem pronta. Também reúne equipe, comissão, ponto e a consulta de '
      || 'preço e rede credenciada pela API da Plamev.'),
    url_producao = coalesce(url_producao, 'https://crm-vendas-yuri.lovable.app'),
    situacao = 'no_ar'
  where id = s.id;

  insert into public.sistema_servicos (tenant_id, sistema_id, nome, para_que, quem_paga, painel_url, ordem)
  select s.tenant_id, s.id, v.nome, v.para_que, v.quem_paga, v.painel_url, v.ordem
    from (values
      ('Lovable', 'Hospedagem e publicação do sistema', 'nos',
       'https://lovable.dev/projects/b7864fcf-9d96-41a1-b8eb-b83fea5f726b', 0),
      ('Lovable Cloud', 'Banco de dados e login', 'nos', null, 1),
      ('API da Plamev', 'Preço do plano e rede credenciada no simulador', 'cliente', null, 2),
      ('GitHub', 'Código do sistema (crm-vendas-yuri)', 'nos',
       'https://github.com/sousayuridev-art/crm-vendas-yuri', 3)
    ) as v(nome, para_que, quem_paga, painel_url, ordem)
   where not exists (select 1 from public.sistema_servicos x where x.sistema_id = s.id and x.nome = v.nome);
end;
$$;
