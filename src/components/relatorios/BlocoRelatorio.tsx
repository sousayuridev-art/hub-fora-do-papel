import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Moldura dos blocos do relatório (card RD-8): um título só por bloco, frase de resumo e conteúdo.
 * O `id` é o destino do índice do cabeçalho.
 */
export function BlocoRelatorio({
  id,
  titulo,
  resumo,
  extra,
  children,
  className,
}: {
  id: string;
  titulo: string;
  resumo?: ReactNode;
  /** Algo à direita do título (legenda, por exemplo). */
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-t`}
      className={cn(
        "flex min-w-0 scroll-mt-20 flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-4 md:scroll-mt-6 md:px-6 md:py-[22px] print:break-inside-avoid print:border-[#ccc]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-t`} className="text-[18px] font-semibold leading-snug">
            {titulo}
          </h2>
          {resumo && <p className="max-w-3xl text-[14px] text-hub-suave">{resumo}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}
