-- Mansão Mediterrâneo no Hub (pedido do Yuri em 11/11: "o site da mansão já tá no ar, porém não tá no
-- menu do hub"). Domínio www.mansaomediterraneo.com, no ar.
-- 1. Cria a ficha do cliente, sem oportunidade em Vendas (o projeto já foi entregue). O repositório é
--    público: nenhum dado de contato fica aqui. A ficha nasce com o contato da Rouse que já está no Hub
--    (ficha da RM Telecom) e o Yuri confere nome, WhatsApp e e-mail na própria ficha.
-- 2. Cadastra o site ligado à ficha, sem módulos (o site não é feito no editor de páginas do Hub).
-- Valor, mensalidade e projeto ficam para o Yuri cadastrar (não inventamos). Idempotente.
do $$
declare t uuid; c public.clients; base public.clients; s public.sites;
  dom constant text := 'www.mansaomediterraneo.com';
begin
  select id into t from public.tenants where slug = 'fora-do-papel';
  if t is null then
    raise notice 'Tenant fora-do-papel não encontrado: nada gravado.';
    return;
  end if;

  select * into c from public.clients
   where tenant_id = t and company_name ilike '%mans%o%mediterr%'
   order by created_at limit 1;
  if c.id is null then
    select * into base from public.clients
     where tenant_id = t and contact_name ilike 'rouse%'
     order by created_at desc limit 1;
    if base.id is null then
      raise notice 'Contato da Rouse não encontrado: ficha da Mansão não criada.';
      return;
    end if;
    insert into public.clients (tenant_id, company_name, contact_name, whatsapp, email, city, current_site)
    values (t, 'Mansão Mediterrâneo', base.contact_name, base.whatsapp, base.email, base.city, dom)
    returning * into c;
  end if;

  if exists (select 1 from public.sites
              where regexp_replace(dominio, '^www\.', '') = regexp_replace(dom, '^www\.', '')) then
    return;
  end if;

  insert into public.sites (tenant_id, client_id, nome, dominio, modulos, no_ar)
  values (t, c.id, 'Mansão Mediterrâneo', dom, '{}'::text[], true)
  returning * into s;

  insert into public.event_outbox (tenant_id, event, payload)
  values (t, 'site.cliente_definido', jsonb_build_object('site_id', s.id, 'dominio', s.dominio,
          'client_id', s.client_id, 'modulos', to_jsonb(s.modulos), 'no_ar', s.no_ar));
end;
$$;
