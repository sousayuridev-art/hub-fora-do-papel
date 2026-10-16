import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { itemConfiguracoes, menuOperador, type ItemMenu } from "@/components/layout/navegacao";
import { ContaUsuario } from "@/components/layout/ContaUsuario";
import { Simbolo } from "@/components/layout/Marca";

const classeItem =
  "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium text-menu-texto transition-colors hover:bg-menu-hover hover:text-hub-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3FA8]";

function LinkMenu({ item, aoNavegar }: { item: ItemMenu; aoNavegar?: (() => void) | undefined }) {
  const Icone = item.icone;
  return (
    <Link
      to={item.para}
      activeOptions={{ exact: item.exato ?? false }}
      onClick={aoNavegar}
      className={classeItem}
      activeProps={{
        className: "!bg-menu-ativo !text-hub-tinta font-semibold",
        "aria-current": "page",
      }}
    >
      {({ isActive }) => (
        <>
          <Icone
            className={`size-[18px] shrink-0 ${isActive ? "text-menu-icone" : "text-menu-rotulo group-hover:text-menu-icone"}`}
            strokeWidth={isActive ? 2.2 : 1.8}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.rotulo}</span>
          {item.emBreve && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[12.5px] font-medium text-menu-rotulo ring-1 ring-menu-borda">
              Em breve
            </span>
          )}
        </>
      )}
    </Link>
  );
}

/**
 * Menu creme do operador (HUB-VIS-1 e HUB-VIS-2): usado na lateral (computador) e na gaveta (celular).
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
      <div className="flex flex-col gap-4 px-4 pb-2 pt-5">
        <Link
          to="/app"
          onClick={aoNavegar}
          className="flex min-h-11 items-center gap-2.5 rounded-xl px-1"
        >
          <Simbolo tamanho={32} />
          <span className="flex flex-col leading-tight">
            <span className="font-marca text-[15.5px] font-semibold text-hub-tinta">
              Fora do Papel
            </span>
            <span className="text-[12.5px] text-menu-rotulo">Hub</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={aoBuscar}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-left text-[14px] text-hub-suave ring-1 ring-menu-borda transition-colors hover:ring-[#E5C77F] hover:text-hub-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3FA8]"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1">Buscar…</span>
          <kbd className="rounded-md bg-white px-1.5 font-sans py-0.5 text-[12px] font-medium text-menu-rotulo shadow-[0_0_0_1px_#F1E3BF]">
            Ctrl K
          </kbd>
        </button>
      </div>
      <nav
        aria-label="Menu principal"
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-3"
      >
        {menuOperador.map((grupo) => (
          <div key={grupo.titulo ?? "inicio"} className="flex flex-col gap-0.5">
            {grupo.titulo && (
              <span className="px-3 pb-1 text-[12.5px] font-semibold text-menu-rotulo">
                {grupo.titulo}
              </span>
            )}
            {grupo.itens.map((item) => (
              <LinkMenu key={item.para} item={item} aoNavegar={aoNavegar} />
            ))}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-2 border-t border-menu-borda px-4 py-3">
        <LinkMenu item={itemConfiguracoes} aoNavegar={aoNavegar} />
        <ContaUsuario cartao />
      </div>
    </div>
  );
}
