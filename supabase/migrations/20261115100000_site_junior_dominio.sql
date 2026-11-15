-- Site do Junior Soares Personal no domínio próprio (pedido do Yuri em 15/11: "já tá em produção:
-- juniorsoarespersonal.com.br. Ligue ele ao Hub"). Card SITE-CLI-2 (repositório site-junior-soares).
-- Troca o domínio provisório da ficha do site e marca "No ar". O site identifica a ficha pelo
-- domínio, então o código do site muda junto. Idempotente.
do $$
declare s public.sites;
begin
  update public.sites
     set dominio = 'juniorsoarespersonal.com.br', no_ar = true
   where public._site_dominio(dominio) = public._site_dominio('juniorsoarespersonal.lovable.app')
  returning * into s;
  if s.id is null then
    raise notice 'Site provisório do Junior não encontrado: nada alterado.';
    return;
  end if;
  insert into public.event_outbox (tenant_id, event, payload)
  values (s.tenant_id, 'site.cliente_definido', jsonb_build_object('site_id', s.id, 'dominio', s.dominio,
          'client_id', s.client_id, 'modulos', to_jsonb(s.modulos), 'no_ar', s.no_ar));
end;
$$;
