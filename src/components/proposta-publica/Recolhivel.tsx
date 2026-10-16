import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** No celular começa recolhido com "Ver os N itens"; no computador fica sempre aberto (card P, M7). */
export function Recolhivel({ quantidade, children }: { quantidade: number; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className={aberto ? "" : "max-md:hidden print:block"}>{children}</div>
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white text-[15px] font-medium md:hidden print:hidden"
      >
        {aberto ? "Ocultar" : `Ver ${quantidade === 1 ? "o item" : `os ${quantidade} itens`}`}
        <ChevronDown
          className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
