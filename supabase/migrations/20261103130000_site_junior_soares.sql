-- Site do Junior Soares Personal na central de Sites (pedido do Yuri em 03/11: "inserir o projeto do Junior").
-- Domínio tirado do próprio código do site (repositório site-junior-soares): juniorsoarespersonal.lovable.app.
-- Ainda não publicado: entra como "Em construção" (no_ar = false). Módulos padrão do painel: páginas e contatos.
-- Só grava se existir um cliente "Junior Soares" no Hub e ele ainda não tiver site. Idempotente.
do $$
declare c public.clients; s public.sites; dom constant text := 'juniorsoarespersonal.lovable.app';
begin
  select * into c from public.clients
   where company_name ilike '%junior%soares%' or contact_name ilike '%junior%soares%'
   order by created_at limit 1;
  if c.id is null then
    raise notice 'Cliente Junior Soares não encontrado: nada gravado.';
    return;
  end if;
  if exists (select 1 from public.sites where client_id = c.id)
     or exists (select 1 from public.sites where regexp_replace(dominio, '^www\.', '') = dom) then
    return;
  end if;

  insert into public.sites (tenant_id, client_id, nome, dominio, modulos, no_ar)
  values (c.tenant_id, c.id, 'Junior Soares Personal', dom, array['contatos', 'paginas'], false)
  returning * into s;

  insert into public.event_outbox (tenant_id, event, payload)
  values (c.tenant_id, 'site.cliente_definido', jsonb_build_object('site_id', s.id, 'dominio', s.dominio,
          'client_id', s.client_id, 'modulos', to_jsonb(s.modulos), 'no_ar', s.no_ar));
end;
$$;
