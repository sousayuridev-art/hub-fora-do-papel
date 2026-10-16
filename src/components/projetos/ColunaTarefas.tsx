import { TarefaCartao } from "@/components/projetos/TarefaCartao";
import type { SituacaoTarefa, Tarefa } from "@/lib/projetos";

/** Uma coluna do quadro do ciclo. */
export function ColunaTarefas({
  rotulo,
  cor,
  tarefas,
  aoMover,
  aoRemover,
}: {
  rotulo: string;
  cor: string;
  tarefas: Tarefa[];
  aoMover: (t: Tarefa, s: SituacaoTarefa) => void;
  aoRemover: (t: Tarefa) => void;
}) {
  return (
    <section aria-label={rotulo} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-coluna p-3">
      <h3 className="flex items-center justify-between px-1 text-[14.5px] font-semibold">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className={`size-2 rounded-full ${cor}`} />
          {rotulo}
        </span>
        <span className="font-rotulo text-[13px] text-hub-suave tabular-nums">
          {tarefas.length}
        </span>
      </h3>
      {tarefas.length === 0 ? (
        <p className="px-1 pb-1 text-[13.5px] text-hub-suave">Nada aqui.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tarefas.map((t) => (
            <TarefaCartao
              key={t.id}
              t={t}
              aoMover={(s) => aoMover(t, s)}
              aoRemover={() => aoRemover(t)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
