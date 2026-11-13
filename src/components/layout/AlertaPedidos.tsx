import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { chavesPedidos, resumoPedidos, textoAlertaPedidos } from "@/lib/pedidos";

/**
 * Faixa no topo do Hub quando chega pedido de ajuste novo (card PED-1).
 * Fica até o pedido ser classificado; some na própria tela de pedidos. Confere a cada 2 minutos
 * e quando a aba volta ao foco (mesma consulta do número do menu, sem chamada a mais).
 */
export function AlertaPedidos() {
  const caminho = useRouterState({ select: (r) => r.location.pathname });
  const resumo = useQuery({
    queryKey: chavesPedidos.resumo,
    queryFn: resumoPedidos,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const texto = textoAlertaPedidos(resumo.data);
  if (!texto || caminho.startsWith("/app/pedidos")) return null;
  const urgente = (resumo.data?.novos_urgentes ?? 0) > 0;
  return (
    <div
      role="status"
      className={
        urgente
          ? "flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#F5C6C1] bg-[#FDE8E6] px-4 py-2 text-[14.5px] text-[#9A1C12] md:px-8"
          : "flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#F3D9A4] bg-[#FFF1D6] px-4 py-2 text-[14.5px] text-[#7A4200] md:px-8"
      }
    >
      <BellRing className="size-4 shrink-0" aria-hidden="true" />
      <span className="font-semibold">{texto}</span>
      <Link
        to="/app/pedidos"
        className="ml-auto inline-flex min-h-11 items-center font-semibold text-hub-tinta hover:underline md:min-h-9"
      >
        Ver pedidos ›
      </Link>
    </div>
  );
}
