import { Share2, Trash2 } from "lucide-react";

import { categoriasMaterial, type ListaMateriais } from "@/lib/materiais";
import { cn } from "@/lib/utils";

export type Pasta = ListaMateriais["contagem"] extends Record<infer K, number> ? K : never;

/**
 * Categorias com contagem do banco (cards S8 e RD-7): coluna no computador, chips roláveis no
 * celular. Categoria vazia fica apagada e sem número (continua clicável).
 */
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
      className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0"
    >
      {itens.map((c) => {
        const Icone = c.icone;
        const total = contagem[c.id] ?? 0;
        const vazia = total === 0 && ativa !== c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={ativa === c.id}
            onClick={() => aoEscolher(c.id)}
            className={cn(
              "relative flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 text-left text-[14.5px] transition-colors",
              c.id === "compartilhados" &&
                "md:mt-5 md:before:absolute md:before:inset-x-3 md:before:-top-2.5 md:before:h-px md:before:bg-hub-borda",
              ativa === c.id
                ? "bg-white font-semibold text-hub-tinta shadow-[0_1px_2px_rgba(14,16,19,0.08)]"
                : vazia
                  ? "text-[#6E7177] hover:bg-white/60 max-md:border max-md:border-hub-borda max-md:bg-white"
                  : "text-hub-tinta hover:bg-white/60 max-md:border max-md:border-hub-borda max-md:bg-white",
            )}
          >
            <span className="flex items-center gap-2">
              {Icone && <Icone className="size-4" aria-hidden="true" />}
              {c.rotulo}
            </span>
            {total > 0 && (
              <span className="font-rotulo text-[12.5px] tabular-nums text-hub-suave">
                {total}
                <span className="sr-only"> materiais</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
