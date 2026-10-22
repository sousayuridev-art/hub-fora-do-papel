import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const blocos = [
  { id: "vendas", rotulo: "Vendas" },
  { id: "receita", rotulo: "Receita" },
  { id: "margem", rotulo: "Margem" },
  { id: "entrega", rotulo: "Entrega" },
] as const;

/**
 * Índice no cabeçalho dos relatórios (card RD-8): leva até o bloco e marca o que está na tela.
 * Mesmo visual das abas, mas são links para partes da mesma página. `pronto` avisa quando os
 * blocos já estão na página (para observar a rolagem).
 */
export function IndiceRelatorio({ pronto }: { pronto: boolean }) {
  const [ativo, setAtivo] = useState<string>("vendas");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel) setAtivo(visivel.target.id);
      },
      { rootMargin: "-80px 0px -55% 0px" },
    );
    for (const b of blocos) {
      const el = document.getElementById(b.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [pronto]);

  return (
    <nav aria-label="Ir para" className="print:hidden">
      <ul className="-mx-4 flex gap-6 overflow-x-auto px-4 md:mx-0 md:gap-7 md:px-0">
        {blocos.map((b) => (
          <li key={b.id} className="shrink-0">
            <a
              href={`#${b.id}`}
              aria-current={ativo === b.id ? "location" : undefined}
              onClick={(e) => {
                const el = document.getElementById(b.id);
                if (!el) return;
                e.preventDefault();
                setAtivo(b.id);
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "flex min-h-11 items-center border-b-2 pb-2.5 pt-1 text-[14.5px] transition-colors",
                ativo === b.id
                  ? "border-hub-tinta font-semibold text-hub-tinta"
                  : "border-transparent text-[#4A4D54] hover:text-hub-tinta",
              )}
            >
              {b.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
