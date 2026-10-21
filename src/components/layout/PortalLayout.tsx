import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SimboloPapel } from "@/components/layout/Marca";
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
  // No Início, o cabeçalho faz parte da capa (transparente) até a pessoa rolar (direção A, CX-5).
  const noInicio = useRouterState({
    select: (s) => s.location.pathname.replace(/\/$/, "") === "/portal",
  });
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const ver = () => setRolou(window.scrollY > 8);
    ver();
    window.addEventListener("scroll", ver, { passive: true });
    return () => window.removeEventListener("scroll", ver);
  }, []);
  const sobreACapa = noInicio && !rolou;
  const secoes = secoesDoPortal(empresa.data?.perfil ?? null);

  return (
    <div className="min-h-dvh overflow-x-clip bg-portal-fundo text-hub-tinta">
      {/* Cabeçalho escuro (direção A, CX-5): no Início, transparente sobre a capa até rolar. */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b text-[#F5F5F2] transition-colors duration-200",
          sobreACapa ? "border-transparent bg-transparent" : "border-white/10 bg-hub-tinta",
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 md:h-[72px] md:px-6 lg:px-16">
          <div className="flex min-w-0 items-center gap-3">
            <SimboloPapel tamanho={28} />
            <span className="flex min-w-0 flex-col leading-tight">
              <b className="truncate text-[15px] font-semibold">{empresa.data?.empresa ?? ""}</b>
              <span className="hidden text-[12.5px] text-[#A3A6AD] md:block">
                Portal do projeto com a{" "}
                <span className="font-marca font-bold text-[#F5F5F2]">Fora do Papel</span>
              </span>
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
                  {secao.rotuloLongo ?? secao.rotulo}
                  {total > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-hub-destaque px-1.5 text-[12.5px] font-semibold tabular-nums text-hub-tinta">
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
