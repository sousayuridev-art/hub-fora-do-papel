import { useEffect, useState } from "react";

import { secoes } from "@/components/proposta-publica/util";
import { cn } from "@/lib/utils";

/** Seção que está na tela agora (a mais alta acima da metade da janela). */
function useSecaoAtual(): string {
  const [atual, setAtual] = useState<string>(secoes[0].id);
  useEffect(() => {
    const els = secoes
      .map((s) => document.getElementById(s.id))
      .filter((e): e is HTMLElement => e !== null);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const visiveis = new Map<string, boolean>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) visiveis.set(e.target.id, e.isIntersecting);
        const primeira = secoes.find((s) => visiveis.get(s.id));
        if (primeira) setAtual(primeira.id);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, []);
  return atual;
}

/**
 * Índice da proposta com progresso (card CX-3): fixo à esquerda no computador, com a seção atual
 * marcada; no celular vira uma faixa de atalhos que rola para o lado.
 */
export function IndiceProposta() {
  const atual = useSecaoAtual();
  const idx = secoes.findIndex((s) => s.id === atual);
  return (
    <>
      <nav aria-label="Nesta proposta" className="max-md:hidden print:hidden">
        <div className="sticky top-24 flex flex-col gap-0.5">
          <span className="mb-2 text-[13px] font-medium text-hub-suave">Nesta proposta</span>
          {secoes.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={s.id === atual ? "location" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2.5 border-l-2 py-1 pl-3 pr-2 text-[14px] transition-colors",
                s.id === atual
                  ? "border-[#FFB020] font-semibold text-hub-tinta"
                  : i < idx
                    ? "border-hub-tinta/30 text-hub-suave hover:text-hub-tinta"
                    : "border-transparent text-hub-suave hover:text-hub-tinta",
              )}
            >
              <span className="text-[12.5px] font-semibold tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.rotulo}
            </a>
          ))}
        </div>
      </nav>
      <nav
        aria-label="Nesta proposta"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden print:hidden"
      >
        {secoes.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-hub-borda bg-white px-4 text-[13.5px] font-medium"
          >
            <span className="tabular-nums text-hub-suave">{String(i + 1).padStart(2, "0")}</span>
            {s.rotulo}
          </a>
        ))}
      </nav>
    </>
  );
}
