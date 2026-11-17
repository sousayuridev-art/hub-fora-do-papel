import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { minuto, textoDaTranscricao, type Fala } from "@/lib/reunioes";

/**
 * Card RE-2: copiar a transcrição inteira. A lista é virtualizada, então selecionar com o mouse
 * pega só o que está na tela; aqui o texto completo vai num campo e num botão de copiar.
 */
function CopiarTranscricao({ falas }: { falas: Fala[] }) {
  const texto = textoDaTranscricao(falas);
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success("Transcrição copiada.");
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão para a área de transferência: seleciona o campo para copiar à mão.
      campo.current?.closest("details")?.setAttribute("open", "");
      campo.current?.select();
      toast.error("Não deu para copiar sozinho. O texto ficou selecionado: use Ctrl+C.");
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-hub-suave">
          {falas.length === 1 ? "1 fala" : `${falas.length} falas`}
        </span>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hub-borda bg-white px-4 text-[14px] font-medium text-hub-tinta hover:bg-hub-fundo"
        >
          {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copiado ? "Copiada" : "Copiar transcrição"}
        </button>
      </div>
      <details className="group">
        <summary className="min-h-11 cursor-pointer list-none py-2 text-[14px] font-medium text-hub-tinta">
          Ver o texto completo <span aria-hidden="true">⌄</span>
        </summary>
        <label className="sr-only" htmlFor="transcricao-texto">
          Transcrição completa
        </label>
        <textarea
          id="transcricao-texto"
          ref={campo}
          readOnly
          value={texto}
          onFocus={(e) => e.currentTarget.select()}
          className="h-[40dvh] w-full resize-y rounded-xl border border-hub-borda bg-white p-3 font-rotulo text-[13px] leading-relaxed text-hub-tinta"
        />
      </details>
    </div>
  );
}

/** Falas da reunião, virtualizadas (uma hora de conversa passa de mil falas). */
export function TranscricaoLista({ falas }: { falas: Fala[] }) {
  const caixa = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: falas.length,
    getScrollElement: () => caixa.current,
    estimateSize: () => 64,
    overscan: 12,
  });
  if (falas.length === 0) {
    return (
      <p className="rounded-xl bg-hub-fundo p-4 text-[14.5px] text-hub-suave">
        A transcrição ainda não chegou. Ela aparece aqui alguns minutos depois que o Meet termina de
        gerar.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <CopiarTranscricao falas={falas} />
      <div ref={caixa} className="max-h-[50dvh] overflow-y-auto rounded-xl border border-hub-borda">
        <ol className="relative" style={{ height: v.getTotalSize() }}>
          {v.getVirtualItems().map((linha) => {
            const f = falas[linha.index];
            if (!f) return null;
            return (
              <li
                key={linha.index}
                ref={v.measureElement}
                data-index={linha.index}
                className="absolute inset-x-0 flex flex-col gap-0.5 border-b border-hub-borda px-3.5 py-2.5"
                style={{ transform: `translateY(${linha.start}px)` }}
              >
                <span className="flex items-baseline gap-2 text-[13px]">
                  <b className="font-semibold text-hub-tinta">{f.quem}</b>
                  <span className="font-rotulo tabular-nums text-hub-suave">{minuto(f.seg)}</span>
                </span>
                <span className="text-[14.5px] leading-relaxed">{f.texto}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
