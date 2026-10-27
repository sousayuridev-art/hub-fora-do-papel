import { ChevronRight } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { SeloSituacaoArtigo } from "@/components/site/SeloSituacaoArtigo";
import { chavesBlocos, rotuloBloco, type ChaveBloco } from "@/lib/paginasSite";
import type { BlocoSalvo } from "@/lib/site";

const dataFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** As partes editáveis das páginas do site (card CMS-4), com a situação de cada uma. */
export function PaginasLista({
  blocos,
  aoAbrir,
}: {
  blocos: BlocoSalvo[];
  aoAbrir: (chave: ChaveBloco) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {chavesBlocos.map((chave) => {
        const b = blocos.find((x) => x.chave === chave);
        return (
          <li key={chave}>
            <button
              type="button"
              onClick={() => aoAbrir(chave)}
              className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-2xl border border-hub-borda bg-white p-4 text-left hover:bg-hub-selecao"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-titulo text-[16px] font-semibold">
                  {rotuloBloco[chave].titulo}
                </span>
                <span className="text-[14px] text-hub-suave">{rotuloBloco[chave].resumo}</span>
                {b && (
                  <span className="text-[13px] text-hub-suave">
                    Alterado em {dataFmt.format(new Date(b.atualizado_em))}
                  </span>
                )}
              </span>
              {b ? (
                <SeloSituacaoArtigo situacao={b.situacao} />
              ) : (
                <Selo tom="neutro">Texto do código</Selo>
              )}
              <ChevronRight className="size-5 shrink-0 text-hub-suave" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
