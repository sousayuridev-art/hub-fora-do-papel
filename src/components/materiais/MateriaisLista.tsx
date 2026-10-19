import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { IconeMaterial } from "@/components/materiais/IconeMaterial";
import { Selo } from "@/components/hub/Selo";
import { diaMes } from "@/lib/formatar";
import { rotuloCategoria, tamanhoLegivel, tipoLegivel, type Material } from "@/lib/materiais";

/** Lista virtualizada de materiais. Toque abre o painel do material. */
export function MateriaisLista({
  itens,
  aoAbrir,
}: {
  itens: Material[];
  aoAbrir: (m: Material) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: itens.length,
    getScrollElement: () => caixa.current,
    estimateSize: () => 76,
    overscan: 8,
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <div ref={caixa} className="max-h-[calc(100dvh-300px)] min-h-32 overflow-y-auto">
        <ul className="relative" style={{ height: v.getTotalSize() }}>
          {v.getVirtualItems().map((linha) => {
            const m = itens[linha.index];
            if (!m) return null;
            const detalhe = [
              tipoLegivel(m),
              tamanhoLegivel(m.tamanho),
              m.empresa,
              m.projeto,
            ].filter(Boolean);
            return (
              <li
                key={m.id}
                ref={v.measureElement}
                data-index={linha.index}
                className="absolute inset-x-0 border-b border-hub-borda"
                style={{ transform: `translateY(${linha.start}px)` }}
              >
                <button
                  type="button"
                  onClick={() => aoAbrir(m)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hub-fundo md:px-5"
                >
                  <IconeMaterial m={m} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-semibold">{m.titulo}</span>
                    <span className="truncate text-[13.5px] text-hub-suave">
                      {detalhe.join(" · ")}
                    </span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    {m.origem === "cliente" ? (
                      <Selo tom="info">Do cliente</Selo>
                    ) : m.compartilhado ? (
                      <Selo tom="ok">Compartilhado</Selo>
                    ) : (
                      <span className="text-[13px] text-hub-suave">
                        {rotuloCategoria[m.categoria]}
                      </span>
                    )}
                    <span className="text-[13px] text-hub-suave">{diaMes(m.atualizado_em)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
