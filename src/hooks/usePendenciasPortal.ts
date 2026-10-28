import { useQuery } from "@tanstack/react-query";

import { chavesPortal, pendenciasDoPortal } from "@/lib/portal";

export type PendenciasPortal = {
  inicio: number;
  aprovacoes: number;
  pagamentos: number;
  arquivos: number;
  /** Formulários do site sem resposta (PC-5). */
  contatos: number;
};

/**
 * Selos do portal (card P, M11): a soma dos selos é igual ao contador "Precisa de você".
 * Aprovações = entregas + serviços adicionais aguardando; Início = pendências do cliente;
 * Pagamentos = contas vencidas ou vencendo em 3 dias (REV-3). Contatos = formulários do site
 * sem resposta (PC-5); o Início soma esse número ao "Precisa da sua atenção".
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
    pagamentos: q.data?.pagamentos ?? 0,
    arquivos: 0,
    contatos: q.data?.contatos ?? 0,
  };
}
