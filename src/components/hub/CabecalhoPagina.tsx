import type { ReactNode } from "react";

/** Cabeçalho das telas do Hub: rótulo do grupo, título, linha de resumo e ação principal. */
export function CabecalhoPagina({
  grupo,
  titulo,
  resumo,
  acao,
}: {
  grupo?: string;
  titulo: string;
  resumo?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {grupo && (
          <span className="font-rotulo text-[12.5px] uppercase tracking-[0.1em] text-hub-suave">
            {grupo}
          </span>
        )}
        <h1 className="font-titulo text-[28px] font-bold leading-tight tracking-tight md:text-[32px]">
          {titulo}
        </h1>
        {resumo && <div className="text-[15px] text-hub-suave">{resumo}</div>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
  );
}
