import { Plus, Trash2 } from "lucide-react";

import { classeEntrada } from "@/components/hub/Campo";
import type { Cena } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { classeAcaoTexto } from "@/lib/estilos";

/**
 * Roteiro em tabela Tempo · Fala · Na tela (skill de conteúdo): blocos de até 5 s, algo muda
 * em cada um, legenda na tela sempre. Salva quando a pessoa sai da tabela.
 */
export function RoteiroEditor({
  cenas,
  aoMudar,
  desativado,
}: {
  cenas: Cena[];
  aoMudar: (c: Cena[]) => void;
  desativado?: boolean;
}) {
  const trocar = (i: number, campo: keyof Cena, valor: string) =>
    aoMudar(cenas.map((c, n) => (n === i ? { ...c, [campo]: valor } : c)));
  const proximoTempo = () => {
    const n = cenas.length;
    return `${n * 5}-${n * 5 + 5}s`;
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="hidden grid-cols-[88px_1fr_1fr_44px] gap-2 px-1 text-[13px] text-hub-suave md:grid">
        <span>Tempo</span>
        <span>Fala</span>
        <span>Na tela</span>
        <span className="sr-only">Remover</span>
      </div>
      {cenas.map((c, i) => (
        <div
          key={i}
          className="grid grid-cols-[88px_1fr_44px] gap-2 rounded-xl border border-hub-borda p-2 md:grid-cols-[88px_1fr_1fr_44px] md:border-0 md:p-0"
        >
          <input
            aria-label={`Tempo do bloco ${i + 1}`}
            className={cn(classeEntrada, "h-11 font-rotulo text-[14px]")}
            value={c.tempo}
            maxLength={20}
            disabled={desativado}
            onChange={(e) => trocar(i, "tempo", e.target.value)}
          />
          <textarea
            aria-label={`Fala do bloco ${i + 1}`}
            className={cn(classeEntrada, "min-h-11 py-2.5 max-md:col-span-1")}
            rows={2}
            value={c.fala}
            maxLength={600}
            disabled={desativado}
            onChange={(e) => trocar(i, "fala", e.target.value)}
          />
          <button
            type="button"
            aria-label={`Remover bloco ${i + 1}`}
            disabled={desativado}
            onClick={() => aoMudar(cenas.filter((_, n) => n !== i))}
            className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-sit-risco-t md:order-last"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
          <textarea
            aria-label={`Texto na tela do bloco ${i + 1}`}
            className={cn(classeEntrada, "col-span-3 min-h-11 py-2.5 md:col-span-1")}
            rows={2}
            value={c.na_tela}
            maxLength={300}
            disabled={desativado}
            placeholder="Texto na tela"
            onChange={(e) => trocar(i, "na_tela", e.target.value)}
          />
        </div>
      ))}
      {!desativado && (
        <button
          type="button"
          onClick={() => aoMudar([...cenas, { tempo: proximoTempo(), fala: "", na_tela: "" }])}
          className={`${classeAcaoTexto} gap-2 self-start`}
        >
          <Plus className="size-4" aria-hidden="true" /> Adicionar bloco
        </button>
      )}
    </div>
  );
}
