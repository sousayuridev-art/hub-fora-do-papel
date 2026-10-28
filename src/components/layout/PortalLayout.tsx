import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SimboloPapel } from "@/components/layout/Marca";
import { ContaPortal } from "@/components/layout/ContaPortal";
import { MenuPortal } from "@/components/layout/MenuPortal";
import { PortalTabs } from "@/components/layout/PortalTabs";
import { PortalTabsSite } from "@/components/layout/PortalTabsSite";
import { acoesRapidas, gruposDoPortal, secoesDoPortal } from "@/components/layout/navegacao";
import { useEmpresaPortal } from "@/hooks/useEmpresaPortal";
import { usePendenciasPortal } from "@/hooks/usePendenciasPortal";
import { useSitesPortal } from "@/hooks/useSitesPortal";

type Props = {
  children: ReactNode;
  /** Telas de decisão (Proposta, Serviço adicional) passam uma ActionBar; ela substitui as abas no celular. */
  barraDeAcao?: ReactNode;
};

/**
 * Casca do painel do cliente (cards P-portal-celular e PC-1).
 * Computador: menu lateral escuro, como o do Hub, montado pelos módulos do site.
 * Celular (até 767 px): cabeçalho de 56 px e abas embaixo (com site: Início, Meu site, Criar, Contatos, Mais).
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
  const perfil = empresa.data?.perfil ?? null;
  const secoes = secoesDoPortal(perfil);
  const sites = useSitesPortal();
  const grupos = gruposDoPortal(perfil, sites.modulos);

  return (
    <div className="min-h-dvh overflow-x-clip bg-portal-fundo text-hub-tinta md:pl-[var(--menu-portal)] md:[--menu-portal:280px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-70 border-r border-menu-borda md:block">
        <MenuPortal
          grupos={grupos}
          selos={selos}
          empresa={empresa.data?.empresa ?? ""}
          site={sites.site}
          perfil={perfil}
          falhou={sites.falhou}
          aoTentarDeNovo={sites.tentarDeNovo}
        />
      </aside>
      {/* Cabeçalho escuro (direção A, CX-5): no Início, transparente sobre a capa até rolar. */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b text-[#F5F5F2] transition-colors duration-200 md:hidden",
          sobreACapa ? "border-transparent bg-transparent" : "border-white/10 bg-hub-tinta",
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <SimboloPapel tamanho={28} />
            <span className="flex min-w-0 flex-col leading-tight">
              <b className="truncate text-[15px] font-semibold">{empresa.data?.empresa ?? ""}</b>
            </span>
          </div>
          <ContaPortal />
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full max-w-[1120px] px-4 pt-5 md:px-8 md:pt-12 md:pb-[88px]",
          // Folga para a barra fixa de baixo no celular (64 px + área segura + respiro).
          "max-md:pb-[calc(104px+env(safe-area-inset-bottom))]",
        )}
      >
        {sites.falhou && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-sit-atencao p-3 text-[14px] text-sit-atencao-t md:hidden"
          >
            Não conseguimos carregar o menu do seu site.
            <button
              type="button"
              onClick={sites.tentarDeNovo}
              className="min-h-11 shrink-0 rounded-lg px-3 font-semibold underline"
            >
              Tentar de novo
            </button>
          </div>
        )}
        {children}
      </main>

      {barraDeAcao ??
        (sites.modulos ? (
          <PortalTabsSite grupos={grupos} selos={selos} acoes={acoesRapidas(sites.modulos)} />
        ) : (
          <PortalTabs selos={selos} secoes={secoes} />
        ))}
    </div>
  );
}
