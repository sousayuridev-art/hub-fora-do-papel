import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Abas sublinhadas (card RD-0): trocam de assunto. Pílulas (FiltrosChip) filtram a mesma lista;
 * nunca dois níveis com o mesmo estilo. Rolam de lado no celular; a ativa fica à vista ao abrir
 * (RD-11), sem mexer na rolagem da página.
 */
export function Abas<T extends string>({
  rotulo,
  opcoes,
  ativa,
  aoEscolher,
  className,
}: {
  rotulo: string;
  opcoes: { id: T; rotulo: string; contagem?: number | string | undefined }[];
  ativa: T;
  aoEscolher: (id: T) => void;
  className?: string;
}) {
  const lista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = lista.current;
    const sel = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !sel) return;
    const inicio =
      sel.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
    const fim = inicio + sel.offsetWidth;
    if (inicio < el.scrollLeft) el.scrollLeft = inicio - 16;
    else if (fim > el.scrollLeft + el.clientWidth) el.scrollLeft = fim - el.clientWidth + 16;
  }, [ativa]);
  return (
    <div
      ref={lista}
      role="tablist"
      aria-label={rotulo}
      className={cn("-mx-4 flex gap-6 overflow-x-auto px-4 md:mx-0 md:gap-7 md:px-0", className)}
    >
      {opcoes.map((o) => {
        const sel = o.id === ativa;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={sel}
            onClick={() => aoEscolher(o.id)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[14.5px] transition-colors",
              sel
                ? "border-hub-tinta font-semibold text-hub-tinta"
                : "border-transparent text-[#4A4D54] hover:text-hub-tinta",
            )}
          >
            {o.rotulo}
            {o.contagem !== undefined && o.contagem !== "" && (
              <span className={cn("tabular-nums", sel ? "text-hub-tinta" : "text-hub-suave")}>
                {o.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
