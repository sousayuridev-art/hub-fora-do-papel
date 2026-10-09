import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { itemConfiguracoes, menuOperador, type ItemMenu } from "@/components/layout/navegacao";
import { ContaUsuario } from "@/components/layout/ContaUsuario";

function LinkMenu({ item, aoNavegar }: { item: ItemMenu; aoNavegar?: (() => void) | undefined }) {
  const Icone = item.icone;
  return (
    <Link
      to={item.para}
      activeOptions={{ exact: item.exato ?? false }}
      onClick={aoNavegar}
      className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-hub-suave transition-colors hover:bg-hub-selecao hover:text-hub-tinta"
      activeProps={{ className: cn("bg-hub-selecao text-hub-tinta font-semibold") }}
    >
      <Icone className="size-[18px] shrink-0" aria-hidden="true" />
      {item.rotulo}
    </Link>
  );
}

/** Conteúdo do menu do operador: usado na lateral (computador) e na gaveta (celular). */
export function MenuOperador({ aoNavegar }: { aoNavegar?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col">
      <nav
        aria-label="Menu principal"
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4"
      >
        {menuOperador.map((grupo) => (
          <div key={grupo.titulo ?? "inicio"} className="flex flex-col gap-0.5">
            {grupo.titulo && (
              <span className="px-3 pb-1.5 font-rotulo text-[12.5px] font-medium uppercase tracking-[0.08em] text-hub-suave/80">
                {grupo.titulo}
              </span>
            )}
            {grupo.itens.map((item) => (
              <LinkMenu key={item.para} item={item} aoNavegar={aoNavegar} />
            ))}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t border-hub-borda px-3 py-3">
        <LinkMenu item={itemConfiguracoes} aoNavegar={aoNavegar} />
        <ContaUsuario />
      </div>
    </div>
  );
}
