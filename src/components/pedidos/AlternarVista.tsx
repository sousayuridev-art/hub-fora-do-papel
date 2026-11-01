import { Columns3, List } from "lucide-react";

import { cn } from "@/lib/utils";

/** Quadro ou lista na tela de pedidos (RD2-4). */
export function AlternarVista({
  vista,
  aoMudar,
}: {
  vista: "quadro" | "lista";
  aoMudar: (v: "quadro" | "lista") => void;
}) {
  const opcoes = [
    { id: "quadro" as const, rotulo: "Quadro", Icone: Columns3 },
    { id: "lista" as const, rotulo: "Lista", Icone: List },
  ];
  return (
    <div
      role="group"
      aria-label="Ver como"
      className="inline-flex shrink-0 self-start rounded-xl border border-[#E3E7ED] bg-white p-1"
    >
      {opcoes.map(({ id, rotulo, Icone }) => (
        <button
          key={id}
          type="button"
          aria-pressed={vista === id}
          onClick={() => aoMudar(id)}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[14px] md:min-h-9",
            vista === id
              ? "bg-hub-tinta font-medium text-white"
              : "text-hub-suave hover:text-hub-tinta",
          )}
        >
          <Icone className="size-4" aria-hidden="true" /> {rotulo}
        </button>
      ))}
    </div>
  );
}
