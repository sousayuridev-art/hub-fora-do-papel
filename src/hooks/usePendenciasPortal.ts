export type PendenciasPortal = { aprovacoes: number; arquivos: number };

/**
 * Selos do portal (card P, M11): Aprovações + Arquivos = contador "Precisam de você".
 * Sprint 0: ficam em zero (selos escondidos). Quando existir a RPC portal_pending_counts,
 * trocar este retorno por um useQuery que chama a RPC; nenhum componente muda.
 */
export function usePendenciasPortal(): PendenciasPortal {
  return { aprovacoes: 0, arquivos: 0 };
}
