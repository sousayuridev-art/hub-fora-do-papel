import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";

import { corDoTom } from "@/components/propostas/tons";
import { moeda } from "@/lib/formatar";
import { infoDoCartao, type CartaoProposta } from "@/lib/propostas";
import { cn } from "@/lib/utils";

/**
 * Lista virtualizada de propostas (coluna recolhível ao lado do editor, card RD-5).
 * Cada linha mostra valor e o que importa (há quantos dias, se abriu, o que falta).
 */
export function PropostasLista({
  itens,
  selecionada,
}: {
  itens: CartaoProposta[];
  selecionada: string | undefined;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: itens.length,
    getScrollElement: () => caixa.current,
    estimateSize: () => 96,
    overscan: 6,
  });

  return (
    <div ref={caixa} className="max-h-[calc(100dvh-300px)] min-h-40 overflow-y-auto">
      <ul className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((linha) => {
          const p = itens[linha.index];
          if (!p) return null;
          const info = infoDoCartao(p);
          const ativa = p.id === selecionada;
          return (
            <li
              key={p.id}
              ref={v.measureElement}
              data-index={linha.index}
              className="absolute inset-x-0 pb-2"
              style={{ transform: `translateY(${linha.start}px)` }}
            >
              <Link
                to="/app/propostas"
                search={(s) => ({ ...s, id: p.id })}
                aria-current={ativa ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border bg-white p-3 transition-colors",
                  ativa
                    ? "border-hub-tinta ring-1 ring-hub-tinta"
                    : "border-hub-borda hover:border-[#C9C9C2]",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14.5px] font-semibold">{p.empresa}</span>
                  <span className="shrink-0 text-[13.5px] font-semibold tabular-nums">
                    {p.valor_cents === null ? "—" : moeda(p.valor_cents)}
                  </span>
                </span>
                <span className="truncate text-[13.5px] text-hub-suave">
                  {p.titulo ?? "Sem título ainda"}
                </span>
                <span className={cn("truncate text-[12.5px]", corDoTom[info.tom])}>
                  {info.texto}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
