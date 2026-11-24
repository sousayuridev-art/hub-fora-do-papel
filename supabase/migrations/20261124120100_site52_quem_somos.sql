-- =====================================================================
-- Hub Fora do Papel · SITE-52 · Quem cuida do seu projeto: título e texto
-- Card: fora-do-papel-blueprint/docs/cards/SITE-52-quem-cuida-do-seu-projeto.md
-- Publica o texto novo no site da Fora do Papel, substituindo o publicado (o import do CMS-4 não
-- sobrescreve). Valores = reserva do site (`src/data/paginas.ts`). As três linhas de credenciais ficam no código do site.
-- Sem o site cadastrado (banco de teste), não faz nada.
-- =====================================================================
create or replace function public._site52_publicar(p_chave text, p_valor jsonb)
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
revoke all on function public._site52_publicar(text, jsonb) from public, anon, authenticated;

-- quem-somos
select public._site52_publicar('quem-somos', '{"titulo":"Tecnologia com **visão de negócio.**","texto":"O Yuri junta gestão e programação: entende o processo da sua empresa e constrói o sistema."}'::jsonb);

drop function public._site52_publicar(text, jsonb);
