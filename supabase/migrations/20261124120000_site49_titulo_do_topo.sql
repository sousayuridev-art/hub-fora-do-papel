-- =====================================================================
-- Hub Fora do Papel · SITE-49 · Novo título do topo da página inicial
-- Card: fora-do-papel-blueprint/docs/cards/SITE-49-estrutura-e-textos-da-inicial.md
-- Publica o texto novo no site da Fora do Papel, substituindo o publicado (o import do CMS-4 não
-- sobrescreve). Valores = reserva do site (`src/data/paginas.ts`). Só o título muda; linha, apoio e link_sites seguem iguais.
-- Sem o site cadastrado (banco de teste), não faz nada.
-- =====================================================================
create or replace function public._site49_publicar(p_chave text, p_valor jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare s public.sites;
begin
  select * into s from public.sites where public._site_dominio(dominio) = public._site_dominio('www.foradopapel.com.br');
  if s.id is null then return; end if;
  perform public._site_bloco_validar(p_chave, p_valor);
  if public._site_tem_marcador(p_valor::text) then raise exception 'marcador_pendente' using errcode = '22023'; end if;
  insert into public.site_blocos (site_id, tenant_id, chave, valor, situacao, publicado_em)
  values (s.id, s.tenant_id, p_chave, p_valor, 'publicado', now())
  on conflict (site_id, chave) do update set valor = excluded.valor, situacao = 'publicado', publicado_em = now();
end $$;
revoke all on function public._site49_publicar(text, jsonb) from public, anon, authenticated;

-- inicio.topo
select public._site49_publicar('inicio.topo', '{"linha":"Sistemas sob medida · sites · automações","titulo":"**Sistemas sob medida** que crescem junto com a sua empresa.","apoio":"Juntamos o WhatsApp, as planilhas e os programas que não conversam num sistema só, feito para a rotina da sua equipe. Menos tempo copiando informação, mais tempo para atender e vender.","link_sites":"Precisa só de um site? Veja os sites que trazem contatos"}'::jsonb);

drop function public._site49_publicar(text, jsonb);
