import { Plus, X } from "lucide-react";

import { BlocoEditor } from "@/components/propostas/BlocoEditor";
import type { PropsBloco } from "@/components/propostas/tipos";

/** Como vamos trabalhar: fases (nome e quando) e a data prevista de lançamento. */
export function BlocoFases({ d, alterar, bloqueado }: PropsBloco) {
  const campo =
    "h-10 w-full rounded-lg border border-[#DADAD3] bg-white px-2.5 text-base outline-none focus:border-hub-tinta disabled:bg-hub-fundo md:text-[14.5px]";
  return (
    <BlocoEditor
      id="fases"
      titulo="Como vamos trabalhar"
      texto="As fases aparecem para o cliente numa linha, da primeira conversa ao lançamento."
    >
      <ol className="flex flex-col gap-2">
        {d.fases.map((f, i) => (
          <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <label className="sr-only" htmlFor={`fase-${i}`}>
              Fase {i + 1}
            </label>
            <input
              id={`fase-${i}`}
              className={campo}
              value={f.nome}
              maxLength={40}
              disabled={bloqueado}
              onChange={(e) =>
                alterar({
                  fases: d.fases.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)),
                })
              }
            />
            <label className="sr-only" htmlFor={`quando-${i}`}>
              Quando acontece a fase {f.nome}
            </label>
            <input
              id={`quando-${i}`}
              className={campo}
              value={f.quando}
              maxLength={40}
              disabled={bloqueado}
              placeholder="Ex.: Até 30/10, Em 4 ciclos"
              onChange={(e) =>
                alterar({
                  fases: d.fases.map((x, j) => (j === i ? { ...x, quando: e.target.value } : x)),
                })
              }
            />
            {!bloqueado ? (
              <button
                type="button"
                aria-label={`Remover a fase ${f.nome}`}
                onClick={() => alterar({ fases: d.fases.filter((_, j) => j !== i) })}
                className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-sit-risco hover:text-sit-risco-t"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <span />
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-end justify-between gap-3">
        {!bloqueado && d.fases.length < 10 && (
          <button
            type="button"
            onClick={() => alterar({ fases: [...d.fases, { nome: "Nova fase", quando: "" }] })}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-[#1E3FA8] hover:bg-sit-info"
          >
            <Plus className="size-4" aria-hidden="true" /> Adicionar fase
          </button>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lancamento" className="text-[14px] font-medium">
            Lançamento previsto
          </label>
          <input
            id="lancamento"
            type="date"
            value={d.lancamento ?? ""}
            disabled={bloqueado}
            onChange={(e) => alterar({ lancamento: e.target.value || null })}
            className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base md:text-[15px]"
          />
        </div>
      </div>
    </BlocoEditor>
  );
}
