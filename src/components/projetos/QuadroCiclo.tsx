import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { QuadroTarefas } from "@/components/tarefas/QuadroTarefas";
import { classeBotaoSecundario } from "@/lib/estilos";
import type { SituacaoTarefa, Tarefa } from "@/lib/projetos";
import { estaAtrasada } from "@/lib/tarefas";
import { cn } from "@/lib/utils";

/** Quadro de tarefas do ciclo escolhido (TA-2): mesmas colunas e cartões do Kanban da Central. */
export function QuadroCiclo({
  projetoId,
  tarefas,
  hoje,
  codigoPedido,
  ciclo,
  aoTrocarCiclo,
  aoNovaTarefa,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  projetoId: string;
  tarefas: Tarefa[];
  hoje: string;
  /** Código do pedido de origem (PA-014), quando houver. */
  codigoPedido: (t: Tarefa) => string | null;
  ciclo: number;
  aoTrocarCiclo: (c: number) => void;
  aoNovaTarefa: () => void;
  aoAbrir: (t: Tarefa) => void;
  aoMover: (t: Tarefa, s: SituacaoTarefa) => void;
  aoRemover: (t: Tarefa) => void;
}) {
  const ciclos = [...new Set([1, ciclo, ...tarefas.map((t) => t.cycle)])].sort((a, b) => a - b);
  const doCiclo = tarefas.filter((t) => t.cycle === ciclo).sort((a, b) => b.position - a.position);
  const maior = ciclos[ciclos.length - 1] ?? 1;
  const atrasadas = doCiclo.filter((t) => estaAtrasada(t, hoje)).length;

  return (
    <section aria-labelledby="quadro-t" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 id="quadro-t" className="font-titulo text-lg font-bold">
            Ciclo {ciclo}
          </h2>
          <div role="group" aria-label="Escolher ciclo" className="flex flex-wrap gap-1">
            {ciclos.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === ciclo}
                onClick={() => aoTrocarCiclo(c)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-lg text-[14px] tabular-nums sm:size-10",
                  c === ciclo
                    ? "bg-hub-tinta font-semibold text-white"
                    : "border border-hub-borda bg-white",
                )}
              >
                {c}
              </button>
            ))}
            {maior < 50 && (
              <button
                type="button"
                onClick={() => aoTrocarCiclo(maior + 1)}
                className="inline-flex h-11 items-center gap-1 rounded-lg border border-dashed border-[#D6D6CF] px-3 text-[14px] text-hub-suave sm:h-10"
              >
                <Plus className="size-3.5" aria-hidden="true" /> Novo ciclo
              </button>
            )}
          </div>
          {atrasadas > 0 && (
            <Selo tom="risco">
              {atrasadas} {atrasadas === 1 ? "atrasada" : "atrasadas"}
            </Selo>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 max-sm:justify-between">
          <Link
            to="/app/tarefas"
            search={{ projeto: projetoId }}
            className="inline-flex min-h-11 items-center px-2 text-[14.5px] font-medium text-[#1E3FA8] underline-offset-2 hover:underline"
          >
            Ver na Central
          </Link>
          <button type="button" className={classeBotaoSecundario} onClick={aoNovaTarefa}>
            <Plus className="size-4" aria-hidden="true" /> Nova tarefa
          </button>
        </div>
      </div>
      <QuadroTarefas
        tarefas={doCiclo}
        hoje={hoje}
        descricaoPronto="Concluídas neste ciclo"
        topo={(t) => t.area ?? "Geral"}
        extra={codigoPedido}
        aoAbrir={aoAbrir}
        aoMover={aoMover}
        aoRemover={aoRemover}
      />
    </section>
  );
}
