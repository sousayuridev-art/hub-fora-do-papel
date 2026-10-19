import { useQuery } from "@tanstack/react-query";

import { chavesPortal, pendenciasDoPortal } from "@/lib/portal";

export type PendenciasPortal = { inicio: number; aprovacoes: number; arquivos: number };

/**
 * Selos do portal (card P, M11): a soma dos selos é igual ao contador "Precisa de você".
 * Aprovações = entregas + serviços adicionais aguardando; Início = pendências do cliente.
 * Conta feita no banco (portal_pendencias). Arquivos não tem selo próprio: o que falta enviar
 * já conta em Início (pendências), para a soma bater com "Precisa de você" (card S8).
 */
export function usePendenciasPortal(): PendenciasPortal {
  const q = useQuery({
    queryKey: chavesPortal.pendencias,
    queryFn: pendenciasDoPortal,
    refetchInterval: 60_000,
  });
  return {
    inicio: q.data?.pendencias ?? 0,
    aprovacoes: q.data?.aprovacoes ?? 0,
    arquivos: 0,
  };
}
