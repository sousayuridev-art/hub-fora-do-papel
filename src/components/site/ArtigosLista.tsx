import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight } from "lucide-react";

import { SeloSituacaoArtigo } from "@/components/site/SeloSituacaoArtigo";
import { diaMes } from "@/lib/formatar";
import type { ArtigoResumo } from "@/lib/site";
import { useMargemDaLista } from "@/lib/useMargemDaLista";

/** Data que importa na linha: publicação (se já foi ao ar) ou última alteração. */
function quando(a: ArtigoResumo): string {
  if (a.situacao === "publicado" && a.publicado_em) return `Publicado em ${diaMes(a.publicado_em)}`;
  return `Alterado em ${diaMes(a.atualizado_em)}`;
}

/** Lista virtualizada de artigos, rolando com a página. Toque na linha abre o editor. */
export function ArtigosLista({
  itens,
  aoAbrir,
}: {
  itens: ArtigoResumo[];
  aoAbrir: (a: ArtigoResumo) => void;
}) {
  const { ref, margem } = useMargemDaLista<HTMLUListElement>();
  const v = useWindowVirtualizer({
    count: itens.length,
    estimateSize: () => 76,
    overscan: 8,
    scrollMargin: margem,
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <ul ref={ref} className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((linha) => {
          const a = itens[linha.index];
          if (!a) return null;
          const provisorio = a.id.startsWith("provisorio-");
          return (
            <li
              key={a.id}
              ref={v.measureElement}
              data-index={linha.index}
              className="absolute inset-x-0 top-0 border-b border-[#F0F0EA]"
              style={{ transform: `translateY(${linha.start - v.options.scrollMargin}px)` }}
            >
              <button
                type="button"
                disabled={provisorio}
                onClick={() => aoAbrir(a)}
                className="flex min-h-[72px] w-full min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-hub-fundo focus-visible:bg-hub-fundo focus-visible:outline-none disabled:opacity-60 md:px-5"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="line-clamp-2 text-[14.5px] font-semibold leading-snug">
                    {a.titulo}
                  </span>
                  <span className="truncate text-[13px] text-hub-suave">
                    {a.categoria} · /artigos/{a.slug}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
                    <SeloSituacaoArtigo situacao={a.situacao} />
                    <span className="text-[13px] text-hub-suave">{quando(a)}</span>
                  </span>
                </span>
                <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  <SeloSituacaoArtigo situacao={a.situacao} />
                  <span className="text-[13px] text-hub-suave">{quando(a)}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-hub-suave" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
