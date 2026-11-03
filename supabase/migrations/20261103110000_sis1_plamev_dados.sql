-- SIS-1 · dados do sistema da Plamev (pedido do Yuri em 03/11: "verifique e cadastre no Hub").
-- Fonte: repositório sousayuridev-art/crm-vendas-yuri (Orga CRM) e projeto "Orga CRM" no Lovable,
-- publicado em crm-vendas-yuri.lovable.app. Custos ficam vazios: não temos o valor de cada serviço.
-- Se o cliente Plamev ainda não existir no Hub, nada é gravado (aviso no log da migração).
do $$
declare s public.sistemas;
begin
  select * into s from public.sistemas where nome = 'Sistema Plamev' order by created_at limit 1;
  if s.id is null then
    raise notice 'SIS-1: cliente Plamev não encontrado no Hub; cadastre pelo botão Novo sistema.';
    return;
  end if;

  update public.sistemas set
    nome = 'Orga CRM · Plamev',
    descricao = 'CRM de vendas da Plamev: os contatos dos anúncios entram em rodízio entre as vendedoras, '
             || 'na fila do dia com a mensagem pronta. Também reúne equipe, comissão, ponto e a consulta de '
             || 'preço e rede credenciada pela API da Plamev.',
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

  raise notice 'SIS-1: sistema da Plamev atualizado (%).', s.id;
end;
$$;
