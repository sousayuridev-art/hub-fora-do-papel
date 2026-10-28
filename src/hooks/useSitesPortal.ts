import { useQuery } from "@tanstack/react-query";

import { useAccess } from "@/hooks/useAccess";
import { chavesSitesCliente, sitesDoPortal, type SitePortal } from "@/lib/sitesCliente";

/**
 * Site da empresa no portal (card PC-1). O menu usa os módulos do primeiro site;
 * sem site, ou se a leitura falhar, o menu fica com Início, Fora do Papel e Ajustes.
 */
export function useSitesPortal() {
  const { acesso } = useAccess();
  const clientId = acesso?.clientId ?? null;
  const q = useQuery({
    queryKey: [...chavesSitesCliente.portal, clientId],
    queryFn: sitesDoPortal,
    enabled: Boolean(clientId),
    staleTime: 5 * 60_000,
  });
  const site: SitePortal | null = q.data?.[0] ?? null;
  return {
    sites: q.data ?? [],
    site,
    modulos: site?.modulos ?? null,
    falhou: q.isError,
    tentarDeNovo: () => void q.refetch(),
  };
}
