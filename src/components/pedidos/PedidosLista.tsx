import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Selo } from "@/components/hub/Selo";
import { diaMes, moeda } from "@/lib/formatar";
import {
  proximoPasso,
  rotuloClassificacao,
  origemDoPedido,
  rotuloSituacaoPedido,
  tomSituacaoPedido,
  type PedidoLinha,
} from "@/lib/pedidos";

/** Lista virtualizada de pedidos. Toque abre o painel do pedido. */
export function PedidosLista({
  itens,
  aoAbrir,
}: {
  itens: PedidoLinha[];
  aoAbrir: (p: PedidoLinha) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: itens.length,
    getScrollElement: () => caixa.current,
    estimateSize: () => 84,
    overscan: 8,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <div
        aria-hidden="true"
        className="hidden grid-cols-[72px_minmax(0,1.6fr)_minmax(0,1.2fr)_150px_110px_170px] gap-3 border-b border-hub-borda px-5 py-3 font-rotulo text-[13.5px] font-medium text-hub-suave lg:grid"
      >
        <span>Código</span>
        <span>Pedido</span>
        <span>Cliente · projeto</span>
        <span>Classificação</span>
        <span className="text-right">Valor</span>
        <span>Situação</span>
      </div>
      <div ref={caixa} className="max-h-[calc(100dvh-300px)] min-h-40 overflow-y-auto">
        <ul className="relative" style={{ height: v.getTotalSize() }}>
          {v.getVirtualItems().map((linha) => {
            const p = itens[linha.index];
            if (!p) return null;
            return (
              <li
                key={p.id}
                ref={v.measureElement}
                data-index={linha.index}
                className="absolute inset-x-0 border-b border-hub-borda"
                style={{ transform: `translateY(${linha.start}px)` }}
              >
                <button
                  type="button"
                  onClick={() => aoAbrir(p)}
                  className="grid w-full gap-1.5 px-5 py-3.5 text-left hover:bg-hub-fundo lg:grid-cols-[72px_minmax(0,1.6fr)_minmax(0,1.2fr)_150px_110px_170px] lg:items-center lg:gap-3"
                >
                  <span className="font-rotulo text-[13px] text-hub-suave">{p.code}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{p.title}</span>
                    <span className="text-[13px] text-hub-suave">
                      {origemDoPedido(p)} · {diaMes(p.created_at)}
                    </span>
                  </span>
                  <span className="min-w-0 truncate text-[14px]">
                    {p.company_name}
                    {p.project_name ? ` · ${p.project_name}` : ""}
                  </span>
                  <span className="text-[14px] text-hub-suave">
                    {p.classification ? rotuloClassificacao[p.classification] : "A classificar"}
                    {p.hours_estimated ? ` · ${p.hours_estimated.toLocaleString("pt-BR")} h` : ""}
                  </span>
                  <span className="text-[14px] font-semibold tabular-nums lg:text-right">
                    {p.value_cents ? moeda(p.value_cents) : "—"}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Selo tom={tomSituacaoPedido[p.status]}>{rotuloSituacaoPedido[p.status]}</Selo>
                    {proximoPasso(p) !== "—" && (
                      <span className="text-[13px] text-hub-suave lg:hidden">
                        {proximoPasso(p)}
                      </span>
                    )}
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
