import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Cabeçalho das telas do Hub (redesenho, card RD-0): faixa branca de ponta a ponta,
 * separada do conteúdo por um fio. Rótulo do grupo, título em azul-marinho, frase de apoio,
 * ações à direita (âmbar só na principal) e, opcionalmente, abas que trocam a tela inteira.
 *
 * A faixa sai do contêiner da página com margens negativas e se estende até as bordas da
 * janela com sombra + clip-path, sem criar rolagem lateral.
 */
export function CabecalhoPagina({
  grupo,
  titulo,
  resumo,
  acao,
  migalha,
  abas,
  selo,
  className,
}: {
  grupo?: string;
  titulo: ReactNode;
  resumo?: ReactNode;
  acao?: ReactNode;
  /** Caminho de volta (ex.: Projetos › Sistema), acima do título. */
  migalha?: ReactNode;
  /** Abas sublinhadas presas ao fio de baixo da faixa. */
  abas?: ReactNode;
  /** Selo de situação ao lado do título (fora do h1, ex.: etapa na ficha do cliente). */
  selo?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative -mx-4 -mt-6 flex flex-col gap-4 bg-white px-4 pt-5 shadow-[0_0_0_100vmax_#fff] [clip-path:inset(0_-100vmax)] md:-mx-8 md:-mt-7 md:px-8 md:pt-7",
        "after:pointer-events-none after:absolute after:-inset-x-[100vmax] after:bottom-0 after:h-px after:bg-hub-borda",
        abas ? "pb-0" : "pb-5 md:pb-6",
        className,
      )}
    >
      {migalha && <div className="text-[13.5px] text-hub-suave">{migalha}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {grupo && <span className="text-[12.5px] text-hub-suave">{grupo}</span>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-titulo text-[28px] font-bold leading-tight tracking-[-0.02em] text-titulo">
              {titulo}
            </h1>
            {selo}
          </div>
          {resumo && <div className="text-[14.5px] text-hub-suave">{resumo}</div>}
        </div>
        {acao && <div className="flex shrink-0 flex-wrap items-center gap-2">{acao}</div>}
      </div>
      {abas && <div className="relative z-10 -mb-px">{abas}</div>}
    </header>
  );
}
