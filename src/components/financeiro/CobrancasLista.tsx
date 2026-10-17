import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BellRing } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { situacaoDaCobranca, type CobrancaLinha } from "@/lib/financeiro";

/** Lista virtualizada de cobranças. Toque abre o painel da cobrança. */
export function CobrancasLista({
  itens,
  hoje,
  aoAbrir,
}: {
  itens: CobrancaLinha[];
  hoje: string;
  aoAbrir: (c: CobrancaLinha) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: itens.length,
    getScrollElement: () => caixa.current,
    estimateSize: () => 78,
    overscan: 8,
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <div ref={caixa} className="max-h-[calc(100dvh-320px)] min-h-32 overflow-y-auto">
        <ul className="relative" style={{ height: v.getTotalSize() }}>
          {v.getVirtualItems().map((linha) => {
            const c = itens[linha.index];
            if (!c) return null;
            const s = situacaoDaCobranca(c, hoje);
            return (
              <li
                key={c.id}
                ref={v.measureElement}
                data-index={linha.index}
                className="absolute inset-x-0 border-b border-hub-borda"
                style={{ transform: `translateY(${linha.start}px)` }}
              >
                <button
                  type="button"
                  onClick={() => aoAbrir(c)}
                  className="grid w-full gap-1.5 px-5 py-3.5 text-left hover:bg-hub-fundo md:grid-cols-[minmax(0,1fr)_220px_120px] md:items-center md:gap-4"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{c.empresa}</span>
                    <span className="truncate text-[14px] text-hub-suave">{c.descricao}</span>
                  </span>
                  <span className="flex flex-col items-start gap-1">
                    <Selo tom={s.tom}>{s.texto}</Selo>
                    <span className="text-[13px] text-hub-suave">
                      {c.situacao === "paga"
                        ? `Paga em ${c.pago_em ? diaMes(dataLocal(c.pago_em)) : "—"} · recibo ${c.recibo}`
                        : c.vencimento
                          ? `Vence ${diaMes(dataLocal(c.vencimento))}`
                          : (c.quando ?? "Sem data")}
                    </span>
                    {c.cliente_avisou_em && c.situacao === "aberta" && (
                      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1E3FA8]">
                        <BellRing className="size-3.5" aria-hidden="true" /> Cliente avisou que
                        pagou
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums md:text-right">
                    {moeda(c.situacao === "paga" ? (c.pago_cents ?? c.valor_cents) : c.valor_cents)}
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
