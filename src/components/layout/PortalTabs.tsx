import { Link } from "@tanstack/react-router";

import type { SecaoPortal } from "@/components/layout/navegacao";
import type { PendenciasPortal } from "@/hooks/usePendenciasPortal";

/**
 * M1 · Barra de seções do portal, só no celular (até 767 px).
 * 5 abas (responsável) ou 4 (equipe, sem Pagamentos: CX-0), com ícone e nome, 64 px + área segura. Some quando o teclado abre (regra em styles: .barra-fixa).
 */
export function PortalTabs({ selos, secoes }: { selos: PendenciasPortal; secoes: SecaoPortal[] }) {
  return (
    <nav
      aria-label="Seções do portal"
      style={{ gridTemplateColumns: `repeat(${secoes.length}, minmax(0, 1fr))` }}
      className="barra-fixa fixed inset-x-0 bottom-0 z-40 grid border-t border-hub-borda bg-white px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(14,16,19,0.18)] md:hidden"
    >
      {secoes.map((secao) => {
        const Icone = secao.icone;
        const total = secao.selo ? selos[secao.selo] : 0;
        return (
          <Link
            key={secao.para}
            to={secao.para}
            activeOptions={{ exact: secao.exato ?? false }}
            className="group flex min-h-[52px] flex-col items-center justify-center gap-1 text-[12.5px] font-medium tracking-tight text-hub-suave"
            activeProps={{ className: "text-hub-tinta font-semibold", "aria-current": "page" }}
          >
            <span className="relative flex h-7 w-[52px] items-center justify-center rounded-full transition-colors group-active:bg-[#E9E9E3] group-aria-[current=page]:bg-[#F1F1EC]">
              <Icone className="size-5" aria-hidden="true" />
              {total > 0 && (
                <span
                  className="absolute -top-1 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-hub-destaque px-1 text-[12.5px] font-bold tabular-nums text-hub-tinta ring-2 ring-white"
                  aria-label={`${total} pendentes`}
                >
                  {total}
                </span>
              )}
            </span>
            {secao.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
