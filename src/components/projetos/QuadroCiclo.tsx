import { Plus } from "lucide-react";

import { ColunaTarefas } from "@/components/projetos/ColunaTarefas";
import { classeBotaoSecundario } from "@/lib/estilos";
import { colunasTarefa, type SituacaoTarefa, type Tarefa } from "@/lib/projetos";
import { cn } from "@/lib/utils";

/** Quadro de tarefas do ciclo escolhido: A fazer, Fazendo, Para aprovar, Pronto. */
export function QuadroCiclo({
  tarefas,
  ciclo,
  aoTrocarCiclo,
  aoNovaTarefa,
  aoMover,
  aoRemover,
}: {
  tarefas: Tarefa[];
  ciclo: number;
  aoTrocarCiclo: (c: number) => void;
  aoNovaTarefa: () => void;
  aoMover: (t: Tarefa, s: SituacaoTarefa) => void;
  aoRemover: (t: Tarefa) => void;
}) {
  const ciclos = [...new Set([1, ciclo, ...tarefas.map((t) => t.cycle)])].sort((a, b) => a - b);
  const doCiclo = tarefas.filter((t) => t.cycle === ciclo);
  const maior = ciclos[ciclos.length - 1] ?? 1;

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
        </div>
        <button type="button" className={classeBotaoSecundario} onClick={aoNovaTarefa}>
          <Plus className="size-4" aria-hidden="true" /> Nova tarefa
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {colunasTarefa.map((c) => (
          <ColunaTarefas
            key={c.id}
            rotulo={c.rotulo}
            cor={c.cor}
            tarefas={doCiclo
              .filter((t) => t.status === c.id)
              .sort((a, b) => b.position - a.position)}
            aoMover={aoMover}
            aoRemover={aoRemover}
          />
        ))}
      </div>
    </section>
  );
}
