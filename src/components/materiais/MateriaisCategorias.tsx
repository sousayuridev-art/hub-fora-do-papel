import { Share2, Trash2 } from "lucide-react";

import { categoriasMaterial, type ListaMateriais } from "@/lib/materiais";
import { cn } from "@/lib/utils";

export type Pasta = ListaMateriais["contagem"] extends Record<infer K, number> ? K : never;

/** Categorias com contagem do banco: coluna no computador, chips roláveis no celular. */
export function MateriaisCategorias({
  contagem,
  ativa,
  aoEscolher,
}: {
  contagem: ListaMateriais["contagem"];
  ativa: Pasta;
  aoEscolher: (p: Pasta) => void;
}) {
  const itens: { id: Pasta; rotulo: string; icone?: typeof Trash2 }[] = [
    { id: "todos", rotulo: "Todos" },
    ...categoriasMaterial,
    { id: "compartilhados", rotulo: "Compartilhados", icone: Share2 },
    { id: "lixeira", rotulo: "Lixeira", icone: Trash2 },
  ];
  return (
    <nav
      aria-label="Categorias de materiais"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:overflow-visible md:px-0"
    >
      {itens.map((c) => {
        const Icone = c.icone;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={ativa === c.id}
            onClick={() => aoEscolher(c.id)}
            className={cn(
              "flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 text-left text-[14.5px] transition-colors",
              c.id === "compartilhados" && "md:mt-3",
              ativa === c.id
                ? "bg-white font-semibold text-hub-tinta shadow-[0_1px_2px_rgba(14,16,19,0.08)]"
                : "text-hub-suave hover:bg-white/60 hover:text-hub-tinta max-md:border max-md:border-hub-borda max-md:bg-white",
            )}
          >
            <span className="flex items-center gap-2">
              {Icone && <Icone className="size-4" aria-hidden="true" />}
              {c.rotulo}
            </span>
            <span className="rounded-md bg-[#E1E1DA] px-1.5 font-rotulo text-[12.5px] tabular-nums text-hub-tinta">
              {contagem[c.id] ?? 0}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
