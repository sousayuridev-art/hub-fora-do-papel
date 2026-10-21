import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Simbolo } from "@/components/layout/Marca";
import { ContaPortal } from "@/components/layout/ContaPortal";
import { PortalTabs } from "@/components/layout/PortalTabs";
import { secoesDoPortal } from "@/components/layout/navegacao";
import { useEmpresaPortal } from "@/hooks/useEmpresaPortal";
import { usePendenciasPortal } from "@/hooks/usePendenciasPortal";

type Props = {
  children: ReactNode;
  /** Telas de decisão (Proposta, Serviço adicional) passam uma ActionBar; ela substitui as abas no celular. */
  barraDeAcao?: ReactNode;
};

/**
 * Casca do portal do cliente (card P-portal-celular, itens M1, M2, M11 e M13).
 * Computador: menu no cabeçalho. Celular (até 767 px): cabeçalho de 56 px e abas embaixo.
 */
export function PortalLayout({ children, barraDeAcao }: Props) {
  const empresa = useEmpresaPortal();
  const selos = usePendenciasPortal();
  const secoes = secoesDoPortal(empresa.data?.perfil ?? null);

  return (
    <div className="min-h-dvh overflow-x-clip bg-portal-fundo text-hub-tinta">
      {/* Cabeçalho escuro e sólido (direção A, CX-5): continua na capa do Início. */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-hub-tinta text-[#F5F5F2]">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 md:h-[72px] md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Simbolo tamanho={28} />
            <span className="hidden font-marca text-base font-bold tracking-tight md:inline">
              Fora do Papel
            </span>
            <span aria-hidden="true" className="hidden h-5 w-px bg-white/15 md:block" />
            <span className="truncate text-[15px] font-semibold md:font-medium md:text-[#D5D7DC]">
              {empresa.data?.empresa ?? ""}
            </span>
          </div>

          <nav
            aria-label="Portal"
            className="hidden items-center gap-0.5 rounded-[14px] bg-white/[0.07] p-1 md:flex"
          >
            {secoes.map((secao) => {
              const total = secao.selo ? selos[secao.selo] : 0;
              return (
                <Link
                  key={secao.para}
                  to={secao.para}
                  activeOptions={{ exact: secao.exato ?? false }}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] px-3.5 text-sm font-medium text-[#D5D7DC] hover:text-white"
                  activeProps={{
                    className: cn("bg-[#F5F5F2] font-semibold text-hub-tinta hover:text-hub-tinta"),
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

      {barraDeAcao ?? <PortalTabs selos={selos} secoes={secoes} />}
    </div>
  );
}
