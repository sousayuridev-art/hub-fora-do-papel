import { useQuery } from "@tanstack/react-query";

import { useAvisoDeErro } from "@/components/marketing/useAvisoDeErro";

import { chavesMarketing, linksDosArquivos } from "@/lib/marketing";

/**
 * Links temporários dos arquivos (MK-2): um pedido em lote para todos os caminhos, válido por
 * 10 minutos; renova sozinho antes de vencer e ao reabrir o painel.
 */
export function useLinksArquivos(caminhos: (string | null | undefined)[]) {
  const lista = [...new Set(caminhos.filter((c): c is string => !!c))].sort();
  const q = useQuery({
    queryKey: chavesMarketing.links(lista),
    queryFn: () => linksDosArquivos(lista),
    enabled: lista.length > 0,
    staleTime: 8 * 60_000,
    refetchInterval: 9 * 60_000,
  });
  useAvisoDeErro(q.isError, "Não conseguimos carregar as imagens e vídeos das peças.", q.refetch);
  return { links: q.data ?? {}, falhou: q.isError, tentarDeNovo: q.refetch };
}
