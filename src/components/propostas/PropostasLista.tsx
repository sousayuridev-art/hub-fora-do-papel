import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Selo, type Tom } from "@/components/hub/Selo";
import { diaMes, moeda } from "@/lib/formatar";
import type { PropostaLinha } from "@/lib/propostas";
import { cn } from "@/lib/utils";

function linhaDe(p: PropostaLinha): { texto: string; selo: string; tom: Tom } {
  switch (p.situacao) {
    case "rascunho":
      return { texto: `Criada em ${diaMes(p.created_at)}`, selo: "Rascunho", tom: "neutro" };
    case "vencida":
      return {
        texto: `Venceu em ${p.expires_at ? diaMes(p.expires_at) : "—"}`,
        selo: "Vencida",
        tom: "risco",
      };
    case "enviada":
      return {
        texto: `Enviada em ${p.sent_at ? diaMes(p.sent_at) : "—"}`,
        selo: p.viewed_at ? "Aberta pelo cliente" : "Ainda não aberta",
        tom: p.viewed_at ? "info" : "neutro",
      };
    case "aceita":
      return {
        texto: `Aceita em ${p.accepted_at ? diaMes(p.accepted_at) : "—"}`,
        selo: "Aceita",
        tom: "ok",
      };
    case "recusada":
      return {
        texto: p.refused_reason ? `Motivo: ${p.refused_reason}` : "Sem motivo informado",
        selo: "Recusada",
        tom: "risco",
      };
  }
}

/** Lista virtualizada de propostas (coluna da esquerda). */
export function PropostasLista({
  itens,
  selecionada,
}: {
  itens: PropostaLinha[];
  selecionada: string | undefined;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: itens.length,
    getScrollElement: () => caixa.current,
    estimateSize: () => 112,
    overscan: 6,
  });

  return (
    <div
      ref={caixa}
      className="max-h-[calc(100dvh-260px)] min-h-40 overflow-y-auto lg:max-h-[calc(100dvh-230px)]"
    >
      <ul className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((linha) => {
          const p = itens[linha.index];
          if (!p) return null;
          const info = linhaDe(p);
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
                  "flex flex-col gap-1.5 rounded-xl border bg-white p-3.5 transition-colors",
                  ativa
                    ? "border-hub-tinta ring-1 ring-hub-tinta"
                    : "border-hub-borda hover:border-[#C9C9C2]",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{p.company_name}</span>
                  <span className="shrink-0 text-[14px] font-semibold tabular-nums">
                    {moeda(p.total_cents)}
                  </span>
                </span>
                <span className="truncate text-[13.5px] text-hub-suave">
                  {p.contact_name} · {info.texto}
                </span>
                <span className="self-start">
                  <Selo tom={info.tom}>{info.selo}</Selo>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
