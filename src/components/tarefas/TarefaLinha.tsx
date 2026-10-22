import { Check } from "lucide-react";

import { PrazoTarefa } from "@/components/tarefas/PrazoTarefa";
import { SeloPrioridade } from "@/components/tarefas/SeloPrioridade";
import { gradeListaTarefas as gradeLista } from "@/lib/estilos";
import { origemDaTarefa, rotuloSituacao, type TarefaVista } from "@/lib/tarefas";
import { cn } from "@/lib/utils";

const tomSituacao: Record<TarefaVista["status"], string> = {
  a_fazer: "text-hub-suave",
  fazendo: "text-sit-info-t font-medium",
  para_aprovar: "text-sit-atencao-t font-medium",
  pronto: "text-sit-ok-t",
};

/**
 * Uma tarefa na lista da Central: círculo para concluir em um clique, título, cliente › projeto,
 * situação, prioridade (só quando não é normal) e prazo. Clique na linha abre o painel.
 */
export function TarefaLinha({
  t,
  hoje,
  aoAbrir,
  aoConcluir,
}: {
  t: TarefaVista;
  hoje: string;
  aoAbrir: () => void;
  aoConcluir: () => void;
}) {
  const pronta = t.status === "pronto";
  const temp = t.id.startsWith("temp-");
  return (
    <div
      className={cn(
        "relative grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-2 px-2 py-1.5 transition-colors hover:bg-hub-fundo md:gap-x-3 md:px-3",
        gradeLista,
        t.atrasada && "bg-[#FFFBFA]",
      )}
    >
      <button
        type="button"
        onClick={aoConcluir}
        disabled={temp}
        aria-pressed={pronta}
        aria-label={pronta ? `Reabrir: ${t.title}` : `Concluir: ${t.title}`}
        className="relative z-10 flex size-11 items-center justify-center rounded-full"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[22px] items-center justify-center rounded-full border-2 transition-colors",
            pronta
              ? "border-[#145A37] bg-[#145A37] text-white"
              : "border-[#B9B9B2] hover:border-[#145A37] hover:bg-sit-ok",
          )}
        >
          {pronta && <Check className="size-3.5" strokeWidth={3} />}
        </span>
      </button>
      <span className="flex min-w-0 flex-col py-1.5">
        <button
          type="button"
          onClick={aoAbrir}
          disabled={temp}
          className={cn(
            "truncate text-left text-[15px] font-semibold leading-snug after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-hub-tinta",
            pronta && "text-hub-suave line-through decoration-1",
          )}
        >
          {t.title}
        </button>
        <span className="truncate text-[13px] text-hub-suave">
          {origemDaTarefa(t)}
          {t.pedido ? ` · do pedido ${t.pedido.codigo}` : ""}
        </span>
        {/* Celular: prazo, situação e prioridade numa linha só */}
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:hidden">
          <PrazoTarefa t={t} hoje={hoje} />
          {t.status !== "a_fazer" && !pronta && (
            <span className={cn("text-[12.5px]", tomSituacao[t.status])}>
              {rotuloSituacao[t.status]}
            </span>
          )}
          <SeloPrioridade p={t.priority} />
        </span>
      </span>
      <span className={cn("hidden text-[14px] md:block", tomSituacao[t.status])}>
        {rotuloSituacao[t.status]}
      </span>
      <span className="hidden md:block">
        <SeloPrioridade p={t.priority} className="text-[14px]" />
      </span>
      <span className="hidden justify-end md:flex">
        <PrazoTarefa t={t} hoje={hoje} className="text-[13.5px]" />
      </span>
    </div>
  );
}
