import type { Tarefa } from "@/lib/projetos";
import { cn } from "@/lib/utils";

/** Prioridade só aparece quando foge do normal (Alta em vermelho, Baixa discreta). */
export function SeloPrioridade({ p, className }: { p: Tarefa["priority"]; className?: string }) {
  if (p === "normal") return null;
  return (
    <span
      className={cn(
        "whitespace-nowrap text-[12.5px]",
        p === "alta" ? "font-semibold text-sit-risco-t" : "text-hub-suave",
        className,
      )}
    >
      {p === "alta" ? "Alta" : "Baixa"}
    </span>
  );
}
