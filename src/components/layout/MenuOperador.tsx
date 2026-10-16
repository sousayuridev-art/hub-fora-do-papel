import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { itemConfiguracoes, menuOperador, type ItemMenu } from "@/components/layout/navegacao";
import { ContaUsuario } from "@/components/layout/ContaUsuario";
import { Simbolo } from "@/components/layout/Marca";

function LinkMenu({ item, aoNavegar }: { item: ItemMenu; aoNavegar?: (() => void) | undefined }) {
  const Icone = item.icone;
  return (
    <Link
      to={item.para}
      activeOptions={{ exact: item.exato ?? false }}
      onClick={aoNavegar}
      className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[14.5px] text-menu-texto transition-colors hover:bg-menu-ativo hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]"
      activeProps={{
        className: cn("bg-menu-ativo !text-white font-semibold"),
        "aria-current": "page",
      }}
    >
      <Icone className="size-[18px] shrink-0" aria-hidden="true" />
      {item.rotulo}
    </Link>
  );
}

/**
 * Menu escuro do operador (proposta 2): usado na lateral (computador) e na gaveta (celular).
 */
export function MenuOperador({
  aoNavegar,
  aoBuscar,
}: {
  aoNavegar?: (() => void) | undefined;
  aoBuscar: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-menu text-menu-texto">
      <div className="flex flex-col gap-4 px-3 pb-2 pt-5">
        <Link to="/app" onClick={aoNavegar} className="flex items-center gap-2.5 px-2">
          <Simbolo />
          <span className="flex flex-col leading-tight">
            <span className="font-titulo text-[15px] font-bold text-white">Fora do Papel</span>
            <span className="text-[12.5px] text-menu-rotulo">Hub</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={aoBuscar}
          className="flex min-h-10 items-center gap-2 rounded-lg border border-[#2A2D33] px-3 text-left text-[14px] text-menu-rotulo hover:border-[#3A3F47] hover:text-menu-texto"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1">Buscar…</span>
          <kbd className="rounded border border-[#2A2D33] px-1.5 font-rotulo text-[12px]">
            Ctrl K
          </kbd>
        </button>
      </div>
      <nav
        aria-label="Menu principal"
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3"
      >
        {menuOperador.map((grupo) => (
          <div key={grupo.titulo ?? "inicio"} className="flex flex-col gap-0.5">
            {grupo.titulo && (
              <span className="px-3 pb-1.5 font-rotulo text-[12.5px] uppercase tracking-[0.1em] text-menu-rotulo">
                {grupo.titulo}
              </span>
            )}
            {grupo.itens.map((item) => (
              <LinkMenu key={item.para} item={item} aoNavegar={aoNavegar} />
            ))}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t border-[#2A2D33] px-3 py-3">
        <LinkMenu item={itemConfiguracoes} aoNavegar={aoNavegar} />
        <ContaUsuario escuro />
      </div>
    </div>
  );
}
