import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Quadro em colunas (card RD-0, formato aprovado em 22/10): colunas separadas por fio fino,
 * barra de cor no topo, nome, descrição curta e total. Cartões brancos com borda.
 * No celular, as colunas rolam de lado (uma por vez, com encaixe).
 */
export function Quadro({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-0 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:auto-cols-fr md:grid-flow-col md:overflow-visible md:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ColunaQuadro({
  titulo,
  descricao,
  total,
  cor,
  vazia,
  rodape,
  children,
  primeira = false,
}: {
  titulo: string;
  descricao?: string;
  total?: number | string;
  /** Cor da barra do topo (a cor da situação). */
  cor: string;
  vazia?: boolean;
  rodape?: ReactNode;
  children?: ReactNode;
  primeira?: boolean;
}) {
  return (
    <section
      aria-label={titulo}
      className={cn(
        "flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col gap-2.5 px-3 md:w-auto md:max-w-none md:px-4",
        !primeira && "border-l border-hub-borda",
      )}
    >
      <span aria-hidden="true" className="h-[3px] rounded-full" style={{ background: cor }} />
      <div className="flex flex-col gap-0.5 px-0.5 pb-1 pt-1.5">
        <span className="flex items-baseline justify-between gap-2">
          <b className="text-[15.5px] font-semibold">{titulo}</b>
          {total !== undefined && (
            <span className="text-[14px] font-semibold tabular-nums text-[#4A4D54]">{total}</span>
          )}
        </span>
        {descricao && <span className="text-[12.5px] text-hub-suave">{descricao}</span>}
      </div>
      {vazia ? (
        <div className="flex min-h-16 items-center justify-center rounded-2xl border border-dashed border-[#D6D6CF] text-[14px] text-hub-suave">
          Nada por aqui
        </div>
      ) : (
        children
      )}
      {rodape}
    </section>
  );
}
