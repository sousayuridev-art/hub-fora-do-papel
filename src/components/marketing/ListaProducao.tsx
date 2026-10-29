import { useMemo } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

import { PecaCartao } from "@/components/marketing/PecaCartao";
import { colunas, type Etapa, type Peca } from "@/lib/marketing";
import { useMargemDaLista } from "@/lib/useMargemDaLista";

type Linha =
  { tipo: "grupo"; id: string; rotulo: string; total: number } | { tipo: "peca"; p: Peca };

/**
 * Produção no celular (MK-1): uma lista só, agrupada pelas 5 colunas, virtualizada com a
 * rolagem da página (o catálogo de peças cresce a cada semana).
 */
export function ListaProducao({
  itens,
  hoje,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  itens: Peca[];
  hoje: string;
  aoAbrir: (p: Peca) => void;
  aoMover: (p: Peca, e: Etapa) => void;
  aoRemover: (p: Peca) => void;
}) {
  const linhas = useMemo<Linha[]>(() => {
    const l: Linha[] = [];
    for (const c of colunas) {
      const doGrupo = itens.filter((p) => p.coluna === c.id);
      if (doGrupo.length === 0) continue;
      l.push({ tipo: "grupo", id: c.id, rotulo: c.titulo, total: doGrupo.length });
      for (const p of doGrupo) l.push({ tipo: "peca", p });
    }
    return l;
  }, [itens]);
  const { ref, margem } = useMargemDaLista<HTMLUListElement>();
  const v = useWindowVirtualizer({
    count: linhas.length,
    estimateSize: (i) => (linhas[i]?.tipo === "peca" ? 132 : 44),
    overscan: 8,
    scrollMargin: margem,
  });

  if (linhas.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-[#D6D6CF] p-6 text-center text-[14.5px] text-hub-suave">
        Nenhuma peça com esses filtros.
      </p>
    );

  return (
    <ul
      ref={ref}
      aria-label="Peças por etapa"
      className="relative"
      style={{ height: v.getTotalSize() }}
    >
      {v.getVirtualItems().map((item) => {
        const l = linhas[item.index];
        if (!l) return null;
        return (
          <li
            key={item.key}
            data-index={item.index}
            ref={v.measureElement}
            className="absolute inset-x-0 top-0 list-none pb-2"
            style={{ transform: `translateY(${item.start - v.options.scrollMargin}px)` }}
          >
            {l.tipo === "grupo" ? (
              <h2 className="pb-1 pt-3 text-[14px] font-semibold">
                {l.rotulo} · {l.total}
              </h2>
            ) : (
              <ul>
                <PecaCartao
                  p={l.p}
                  hoje={hoje}
                  aoAbrir={() => aoAbrir(l.p)}
                  aoMover={(e) => aoMover(l.p, e)}
                  aoRemover={() => aoRemover(l.p)}
                />
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
