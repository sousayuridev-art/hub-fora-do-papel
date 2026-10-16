import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { itemConfiguracoes, menuOperador, type ItemMenu } from "@/components/layout/navegacao";
import { ContaUsuario } from "@/components/layout/ContaUsuario";
import { Simbolo } from "@/components/layout/Marca";

const classeItem =
  "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium text-menu-texto transition-colors hover:bg-menu-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]";

function LinkMenu({ item, aoNavegar }: { item: ItemMenu; aoNavegar?: (() => void) | undefined }) {
  const Icone = item.icone;
  return (
    <Link
      to={item.para}
      activeOptions={{ exact: item.exato ?? false }}
      onClick={aoNavegar}
      className={classeItem}
      activeProps={{
        className:
          "!bg-menu-ativo !text-hub-tinta font-semibold shadow-[0_6px_16px_-8px_rgb(255_176_32_/_0.7)]",
        "aria-current": "page",
      }}
    >
      {({ isActive }) => (
        <>
          <Icone
            className={`size-5 shrink-0 ${isActive ? "text-menu-icone" : "text-[#B4B8BF] group-hover:text-white"}`}
            strokeWidth={isActive ? 2.1 : 1.8}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.rotulo}</span>
          {item.emBreve && (
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[12.5px] font-medium text-[#A9ADB5]">
              Em breve
            </span>
          )}
        </>
      )}
    </Link>
  );
}

/**
 * Menu do operador (HUB-VIS-2): escuro na cor da marca, item ativo em âmbar.
 * Usado na lateral (computador) e na gaveta (celular).
 */
export function MenuOperador({
  aoNavegar,
  aoBuscar,
}: {
  aoNavegar?: (() => void) | undefined;
  aoBuscar: () => void;
}) {
  // A barra de rolagem só aparece enquanto a pessoa rola o menu.
  const [rolando, setRolando] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aoRolar = () => {
    setRolando(true);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setRolando(false), 900);
  };

  return (
    <div className="flex h-full flex-col bg-menu text-menu-texto">
      <div className="flex flex-col gap-4 px-4 pb-2 pt-5">
        <Link
          to="/app"
          onClick={aoNavegar}
          className="flex min-h-11 items-center gap-2.5 self-start rounded-full bg-white/6 py-1.5 pl-1.5 pr-4 ring-1 ring-white/10"
        >
          <Simbolo tamanho={30} />
          <span className="font-marca text-[15px] font-semibold text-white">Fora do Papel</span>
          <span className="text-[13px] font-medium text-menu-rotulo">Hub</span>
        </Link>
        <button
          type="button"
          onClick={aoBuscar}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-white/6 px-3 text-left text-[14px] text-[#A9ADB5] ring-1 ring-white/8 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1">Buscar…</span>
          <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-[12px] font-medium text-[#C9CBD0]">
            Ctrl K
          </kbd>
        </button>
      </div>
      <nav
        aria-label="Menu principal"
        onScroll={aoRolar}
        data-rolando={rolando}
        className="rolagem-discreta flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3"
      >
        {menuOperador.map((grupo) => (
          <div key={grupo.titulo ?? "inicio"} className="flex flex-col gap-1">
            {grupo.titulo && (
              <span className="px-3 pb-1 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-menu-rotulo">
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
