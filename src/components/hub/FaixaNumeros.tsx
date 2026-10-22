import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TomNumero = "risco" | "atencao" | "ok";

export type ItemNumero = {
  rotulo: string;
  /** Ícone de ajuda ao lado do rótulo (só em células sem clique, para não aninhar botões). */
  ajuda?: ReactNode;
  valor: ReactNode;
  apoio?: ReactNode;
  /** Pinta só a célula que pede ação (risco/atenção) ou o apoio positivo (ok). */
  tom?: TomNumero | undefined;
  /** Clicar no número filtra a lista. */
  aoClicar?: (() => void) | undefined;
  ativo?: boolean | undefined;
};

const fundo: Record<TomNumero, string> = {
  risco: "bg-sit-risco text-sit-risco-t",
  atencao: "bg-sit-atencao text-sit-atencao-t",
  ok: "",
};

/**
 * Faixa de indicadores (card RD-0): uma caixa só, células divididas por fio.
 * No celular, rola de lado em uma linha (não empilha cartões).
 */
export function FaixaNumeros({ itens, className }: { itens: ItemNumero[]; className?: string }) {
  return (
    <div
      className={cn(
        "-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:gap-0 md:overflow-hidden md:rounded-2xl md:border md:border-hub-borda md:bg-white md:px-0",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}
    >
      {itens.map((i, n) => {
        const conteudo = (
          <>
            <span
              className={cn(
                "flex items-center gap-1 text-[13px]",
                i.tom && i.tom !== "ok" ? "" : "text-hub-suave",
              )}
            >
              {i.rotulo}
              {!i.aoClicar && i.ajuda}
            </span>
            <span className="text-[22px] font-semibold tabular-nums leading-tight md:text-[24px]">
              {i.valor}
            </span>
            {i.apoio !== undefined && (
              <span
                className={cn(
                  "text-[12.5px]",
                  i.tom === "ok" ? "text-sit-ok-t" : i.tom ? "" : "text-hub-suave",
                )}
              >
                {i.apoio}
              </span>
            )}
          </>
        );
        const base = cn(
          "flex min-w-[150px] max-w-[230px] shrink-0 snap-start md:max-w-none flex-col gap-1 rounded-2xl border border-hub-borda bg-white px-4 py-3 text-left md:min-w-0 md:rounded-none md:border-0 md:px-5 md:py-4",
          n > 0 && "md:border-l md:border-[#ECECE6]",
          i.tom && i.tom !== "ok" && fundo[i.tom],
          i.ativo && "ring-2 ring-inset ring-hub-tinta",
        );
        return i.aoClicar ? (
          <button
            key={i.rotulo}
            type="button"
            onClick={i.aoClicar}
            aria-pressed={i.ativo ?? false}
            className={cn(base, "transition-colors hover:brightness-[0.98]")}
          >
            {conteudo}
          </button>
        ) : (
          <div key={i.rotulo} className={base}>
            {conteudo}
          </div>
        );
      })}
    </div>
  );
}
