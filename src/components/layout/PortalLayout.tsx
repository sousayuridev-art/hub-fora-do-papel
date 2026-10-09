import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAccess } from "@/hooks/useAccess";
import { cn } from "@/lib/utils";
import { Simbolo } from "@/components/layout/Marca";
import { ContaPortal } from "@/components/layout/ContaPortal";
import { PortalTabs } from "@/components/layout/PortalTabs";
import { menuPortal } from "@/components/layout/navegacao";
import { usePendenciasPortal } from "@/hooks/usePendenciasPortal";

type Props = {
  children: ReactNode;
  /** Telas de decisão (Proposta, Serviço adicional) passam uma ActionBar; ela substitui as abas no celular. */
  barraDeAcao?: ReactNode;
};

/** Nome da empresa do cliente logado. A RLS garante que ele só enxerga a própria. */
function useEmpresaDoCliente(clientId: string | null) {
  return useQuery({
    queryKey: ["clientes", clientId, "nome"],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("company_name")
        .eq("id", clientId ?? "")
        .single();
      if (error) throw error;
      return data.company_name as string;
    },
  });
}

/**
 * Casca do portal do cliente (card P-portal-celular, itens M1, M2, M11 e M13).
 * Computador: menu no cabeçalho. Celular (até 767 px): cabeçalho de 56 px e abas embaixo.
 */
export function PortalLayout({ children, barraDeAcao }: Props) {
  const { acesso } = useAccess();
  const empresa = useEmpresaDoCliente(acesso?.clientId ?? null);
  const selos = usePendenciasPortal();

  return (
    <div className="min-h-dvh bg-portal-fundo text-hub-tinta">
      <header className="sticky top-0 z-30 border-b border-hub-borda bg-white">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 md:h-[72px] md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Simbolo tamanho={28} />
            <span className="hidden font-titulo text-base font-semibold tracking-tight md:inline">
              Fora do Papel
            </span>
            <span aria-hidden="true" className="hidden h-5 w-px bg-hub-borda md:block" />
            <span className="truncate text-[15px] font-semibold text-hub-tinta md:font-medium md:text-[#3A3F47]">
              {empresa.data ?? ""}
            </span>
          </div>

          <nav aria-label="Portal" className="hidden items-center gap-1 md:flex">
            {menuPortal.map((secao) => {
              const total = secao.selo ? selos[secao.selo] : 0;
              return (
                <Link
                  key={secao.para}
                  to={secao.para}
                  activeOptions={{ exact: secao.exato ?? false }}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] px-3.5 text-sm font-medium text-[#3A3F47] hover:text-hub-tinta"
                  activeProps={{
                    className: cn("bg-[#F1F1EC] font-semibold text-hub-tinta"),
                    "aria-current": "page",
                  }}
                >
                  {secao.rotulo}
                  {total > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-hub-destaque px-1.5 text-[12.5px] font-semibold tabular-nums">
                      {total}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <ContaPortal />
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full max-w-[1120px] px-4 pt-5 md:px-6 md:pt-12 md:pb-[88px]",
          // Folga para a barra fixa de baixo no celular (64 px + área segura + respiro).
          "max-md:pb-[calc(104px+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>

      {barraDeAcao ?? <PortalTabs selos={selos} />}
    </div>
  );
}
