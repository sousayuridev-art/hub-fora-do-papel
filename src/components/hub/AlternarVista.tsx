import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Escolha de vista (Quadro | Lista, Grade | Lista), em botões com estado pressionado (RD2-4, RD2-7). */
export function AlternarVista<T extends string>({
  vista,
  aoMudar,
  opcoes,
}: {
  vista: T;
  aoMudar: (v: T) => void;
  opcoes: { id: T; rotulo: string; Icone: LucideIcon }[];
}) {
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
