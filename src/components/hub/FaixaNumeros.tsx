import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TomNumero = "risco" | "atencao" | "ok";

export type ItemNumero = {
  rotulo: string;
  /** Ícone de ajuda ao lado do rótulo (só em células sem clique, para não aninhar botões). */
  ajuda?: ReactNode;
  valor: ReactNode;
  apoio?: ReactNode;
  /** Pinta a frase de apoio: risco/atenção quando pede ação, ok quando é boa notícia. */
  tom?: TomNumero | undefined;
  /** Clicar no número filtra a lista. */
  aoClicar?: (() => void) | undefined;
  ativo?: boolean | undefined;
  /** Linha de tendência ao lado do valor (valores do banco, do mais antigo ao atual). */
  serie?: number[] | undefined;
  /** Variação contra o período anterior, ex.: { texto: "6% sobre setembro", sobe: true }. */
  variacao?: { texto: string; sobe: boolean } | undefined;
  /** Barra dividida em partes (ex.: mensalidades, projetos, livre), com legenda embaixo. */
  barra?: { rotulo: string; valor: number; cor: string }[] | undefined;
};

const textoTom: Record<TomNumero, string> = {
  risco: "font-medium text-sit-risco-t",
  atencao: "font-medium text-sit-atencao-t",
  ok: "font-medium text-sit-ok-t",
};

/** Tendência pequena (sem eixo), na cor da série 1. */
function Tendencia({ serie, rotulo }: { serie: number[]; rotulo: string }) {
  if (serie.length < 2) return null;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const faixa = max - min || 1;
  const pontos = serie
    .map((v, i) => `${(i / (serie.length - 1)) * 76 + 2},${26 - ((v - min) / faixa) * 22}`)
    .join(" ");
  const sobe = (serie.at(-1) ?? 0) >= (serie[0] ?? 0);
  return (
    <svg
      width="80"
      height="30"
      viewBox="0 0 80 30"
      role="img"
      aria-label={`${rotulo}: tendência ${sobe ? "subindo" : "descendo"}`}
      className="shrink-0"
    >
      <polyline
        points={pontos}
        fill="none"
        stroke="var(--color-serie-1)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Números do topo (RD2, formato aprovado em 29/10): um cartão branco separado para cada
 * número, rótulo, valor grande, e embaixo a variação, a frase de apoio ou a barra dividida.
 * No computador, lado a lado; no celular, rolam de lado em uma linha.
 */
export function FaixaNumeros({ itens, className }: { itens: ItemNumero[]; className?: string }) {
  return (
    <div
      className={cn(
        "-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:overflow-visible md:px-0",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}
    >
      {itens.map((i) => {
        const total = i.barra?.reduce((s, b) => s + Math.max(0, b.valor), 0) ?? 0;
        const conteudo = (
          <>
            <span className="flex items-center gap-1 text-[13px] text-[#4A4D54]">
              {i.rotulo}
              {!i.aoClicar && i.ajuda}
            </span>
            <span className="flex items-center justify-between gap-3">
              <span className="text-[22px] font-semibold tabular-nums leading-tight md:text-[24px]">
                {i.valor}
              </span>
              {i.serie && <Tendencia serie={i.serie} rotulo={i.rotulo} />}
            </span>
            {i.barra && total > 0 && (
              <span
                aria-hidden="true"
                className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-[#ECECE6]"
              >
                {i.barra.map((b) => (
                  <span
                    key={b.rotulo}
                    className="h-full first:rounded-l-full"
                    style={{ width: `${(Math.max(0, b.valor) / total) * 100}%`, background: b.cor }}
                  />
                ))}
              </span>
            )}
            {i.variacao && (
              <span
                className={cn(
                  "text-[12.5px] font-medium",
                  i.variacao.sobe ? "text-sit-ok-t" : "text-sit-risco-t",
                )}
              >
                <span aria-hidden="true">{i.variacao.sobe ? "▲" : "▼"}</span> {i.variacao.texto}
              </span>
            )}
            {i.apoio !== undefined && i.apoio !== "" && (
              <span className={cn("text-[12.5px]", i.tom ? textoTom[i.tom] : "text-hub-suave")}>
                {i.apoio}
              </span>
            )}
          </>
        );
        const base = cn(
          "flex min-w-[170px] max-w-[240px] shrink-0 snap-start flex-col gap-1.5 rounded-xl border border-hub-borda bg-white px-4 py-3.5 text-left md:min-w-0 md:max-w-none md:px-5 md:py-4",
          i.ativo && "ring-2 ring-hub-tinta",
        );
        return i.aoClicar ? (
          <button
            key={i.rotulo}
            type="button"
            onClick={i.aoClicar}
            aria-pressed={i.ativo ?? false}
            className={cn(
              base,
              "transition-shadow hover:shadow-[0_6px_18px_-10px_rgba(14,16,19,0.25)]",
            )}
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
