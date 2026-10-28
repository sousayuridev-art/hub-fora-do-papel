import { Plus, X } from "lucide-react";

import type { Horario } from "@/lib/ajustesSite";

const campo =
  "h-11 min-w-0 rounded-xl border border-[#DADAD3] bg-white px-3 text-base outline-none focus:border-hub-tinta md:text-[15px]";

/** Horário de atendimento: uma linha por grupo de dias, com "Fechado". */
export function HorarioEditor({
  valor,
  aoMudar,
}: {
  valor: Horario[];
  aoMudar: (h: Horario[]) => void;
}) {
  const mudar = (i: number, h: Partial<Horario>) =>
    aoMudar(valor.map((x, j) => (j === i ? { ...x, ...h } : x)));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[14px] font-medium">Horário de atendimento</legend>
      <p className="-mt-1 mb-1 text-[13px] text-hub-suave">
        Aparece no rodapé, na página de contato e no Google.
      </p>
      {valor.map((h, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-hub-fundo p-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
        >
          <input
            aria-label={`Dias da linha ${i + 1}`}
            className={campo}
            value={h.dias}
            maxLength={40}
            onChange={(e) => mudar(i, { dias: e.target.value })}
            placeholder="Segunda a sexta"
          />
          <button
            type="button"
            onClick={() => aoMudar(valor.filter((_, j) => j !== i))}
            aria-label={`Tirar ${h.dias || `a linha ${i + 1}`}`}
            className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-white hover:text-hub-tinta sm:order-last"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <label className="flex min-h-11 items-center gap-2 text-[14.5px]">
            <input
              type="checkbox"
              className="size-5 accent-hub-tinta"
              checked={Boolean(h.fechado)}
              onChange={(e) =>
                mudar(i, {
                  fechado: e.target.checked,
                  abre: h.abre ?? "08:00",
                  fecha: h.fecha ?? "18:00",
                })
              }
            />
            Fechado
          </label>
          {!h.fechado && (
            <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
              <input
                type="time"
                aria-label={`Abre (${h.dias})`}
                className={campo}
                value={h.abre ?? ""}
                onChange={(e) => mudar(i, { abre: e.target.value })}
              />
              <span className="text-[14px] text-hub-suave">às</span>
              <input
                type="time"
                aria-label={`Fecha (${h.dias})`}
                className={campo}
                value={h.fecha ?? ""}
                onChange={(e) => mudar(i, { fecha: e.target.value })}
              />
            </span>
          )}
        </div>
      ))}
      {valor.length < 7 && (
        <button
          type="button"
          onClick={() => aoMudar([...valor, { dias: "", abre: "08:00", fecha: "18:00" }])}
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-2 text-[14.5px] font-medium text-[#1E3FA8] hover:bg-hub-fundo"
        >
          <Plus className="size-4" aria-hidden="true" /> Adicionar dias
        </button>
      )}
    </fieldset>
  );
}
