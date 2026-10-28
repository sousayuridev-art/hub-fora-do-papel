import { useNavigate } from "@tanstack/react-router";

import type { AcaoRapida } from "@/components/layout/navegacao";
import { cn } from "@/lib/utils";

/** Ações rápidas do Início (card PC-1). As que dependem dos cards PC-3 a PC-6 aparecem com "Em breve". */
export function AcoesRapidas({ acoes, aoPedir }: { acoes: AcaoRapida[]; aoPedir: () => void }) {
  const navigate = useNavigate();
  return (
    <section aria-labelledby="acoes-t" className="flex flex-col gap-3">
      <h2 id="acoes-t" className="text-[18px] font-semibold md:text-[19px]">
        Ações rápidas
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {acoes.map((a) => {
          const Icone = a.icone;
          const classe =
            "flex h-full min-h-[88px] w-full flex-col items-start justify-between gap-3 rounded-2xl border p-4 text-left";
          return (
            <li key={a.id}>
              {a.emBreve ? (
                <span
                  aria-disabled="true"
                  className={cn(classe, "border-dashed border-[#D6D6CF] text-hub-suave")}
                >
                  <Icone className="size-5" aria-hidden="true" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14.5px] font-medium">{a.rotulo}</span>
                    <span className="text-[12.5px]">Em breve</span>
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    a.para ? void navigate({ to: a.para, search: { artigo: "novo" } }) : aoPedir()
                  }
                  className={cn(
                    classe,
                    "border-hub-borda bg-white hover:border-hub-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta",
                  )}
                >
                  <Icone className="size-5 text-[#B86E00]" aria-hidden="true" />
                  <span className="text-[14.5px] font-semibold">{a.rotulo}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
