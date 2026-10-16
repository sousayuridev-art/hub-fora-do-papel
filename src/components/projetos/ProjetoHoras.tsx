import { Clock, Trash2 } from "lucide-react";

import { classeAcaoPrincipal } from "@/lib/estilos";
import { dataLocal, diaMes } from "@/lib/formatar";
import { horasMin, type DetalheProjeto } from "@/lib/projetos";

/** Lançamentos de horas do projeto (os 200 mais recentes; o total vem do banco). */
export function ProjetoHoras({
  d,
  aoLancar,
  aoRemover,
}: {
  d: DetalheProjeto;
  aoLancar: () => void;
  aoRemover: (id: string, minutos: number) => void;
}) {
  return (
    <section
      aria-labelledby="horas-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="horas-t" className="font-titulo text-lg font-bold">
            Horas lançadas
          </h2>
          <p className="text-[14px] text-hub-suave">
            {horasMin(d.minutos_usados)} usadas de{" "}
            {d.projeto.hours_estimated.toLocaleString("pt-BR")} h estimadas
          </p>
        </div>
        <button type="button" className={classeAcaoPrincipal} onClick={aoLancar}>
          <Clock className="size-4" aria-hidden="true" /> Lançar horas
        </button>
      </div>
      {d.horas.length === 0 ? (
        <p className="rounded-xl bg-hub-fundo p-4 text-[14.5px] text-hub-suave">
          Nenhuma hora lançada ainda.
        </p>
      ) : (
        <ul className="flex flex-col">
          {d.horas.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 border-t border-hub-borda py-2 first:border-t-0"
            >
              <span className="w-14 shrink-0 text-[14px] text-hub-suave tabular-nums">
                {diaMes(dataLocal(h.worked_on))}
              </span>
              <span className="w-16 shrink-0 font-semibold tabular-nums">
                {horasMin(h.minutes)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14.5px]">{h.note ?? "—"}</span>
              <button
                type="button"
                disabled={h.id.startsWith("temp-")}
                onClick={() => aoRemover(h.id, h.minutes)}
                aria-label={`Remover lançamento de ${horasMin(h.minutes)} em ${diaMes(dataLocal(h.worked_on))}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-sit-risco-t disabled:opacity-40"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
