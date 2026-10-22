import type { Tarefa } from "@/lib/projetos";
import { textoPrazo, type TextoPrazo } from "@/lib/tarefas";
import { cn } from "@/lib/utils";

const tons: Record<TextoPrazo["tom"], string> = {
  risco: "bg-sit-risco text-sit-risco-t font-medium",
  atencao: "bg-sit-atencao text-sit-atencao-t font-medium",
  neutro: "bg-sit-neutro text-sit-neutro-t",
  ok: "bg-sit-ok text-sit-ok-t",
  vazio: "border border-hub-borda text-hub-suave",
};

/** Prazo em pílula: vermelho quando venceu, âmbar quando é hoje. */
export function PrazoTarefa({
  t,
  hoje,
  className,
}: {
  t: Pick<Tarefa, "due_date" | "status" | "done_at">;
  hoje: string;
  className?: string;
}) {
  const p = textoPrazo(t, hoje);
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-px text-[12.5px] leading-5",
        tons[p.tom],
        className,
      )}
    >
      {p.texto}
    </span>
  );
}
