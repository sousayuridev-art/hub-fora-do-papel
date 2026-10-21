import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { minuto, type Fala } from "@/lib/reunioes";

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
  );
}
