import { useQuery } from "@tanstack/react-query";

import { enderecosDasLogos } from "@/lib/clientes";

/** Endereços das logos de uma lista de clientes, numa consulta só (renova a cada 50 min). */
export function useLogos(caminhos: (string | null | undefined)[]): Record<string, string> {
  const lista = [...new Set(caminhos.filter((c): c is string => Boolean(c)))].sort();
  const q = useQuery({
    queryKey: ["clientes", "logos", lista],
    queryFn: () => enderecosDasLogos(lista),
    enabled: lista.length > 0,
    staleTime: 50 * 60_000,
  });
  return q.data ?? {};
}
