import { Check } from "lucide-react";

import { diaMes } from "@/lib/formatar";
import type { SituacaoFase } from "@/lib/projetos";
import { cn } from "@/lib/utils";

type FaseLinha = {
  id?: string;
  nome: string;
  quando: string | null;
  status: SituacaoFase;
  concluida_em: string | null;
};

/**
 * Fases em linha: concluídas com ✓, a atual em destaque, as próximas apagadas.
 * No celular vira lista vertical (sem rolagem lateral).
 */
export function LinhaFases({
  fases,
  compacta = false,
}: {
  fases: FaseLinha[];
  compacta?: boolean;
}) {
  return (
    <ol
      aria-label="Fases do projeto"
      className={cn(
        "grid gap-x-3 gap-y-3 max-sm:grid-cols-1",
        compacta ? "sm:grid-flow-col sm:auto-cols-fr" : "sm:grid-flow-col sm:auto-cols-fr",
      )}
    >
      {fases.map((f, i) => (
        <li key={f.id ?? `${f.nome}-${i}`} className="flex min-w-0 gap-3 sm:flex-col sm:gap-2">
          <span
            className={cn(
              "h-1.5 rounded-full max-sm:hidden",
              f.status === "concluida"
                ? "bg-hub-tinta"
                : f.status === "andamento"
                  ? "bg-[repeating-linear-gradient(135deg,#0E1013_0_6px,#FFB020_6px_12px)]"
                  : "bg-[#E6E6E0]",
            )}
            aria-hidden="true"
          />
          <span
            aria-hidden="true"
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full sm:hidden",
              f.status === "concluida"
                ? "bg-sit-ok text-sit-ok-t"
                : f.status === "andamento"
                  ? "bg-hub-tinta text-white"
                  : "border border-[#D6D6CF] bg-white",
            )}
          >
            {f.status === "concluida" ? (
              <Check className="size-3.5" />
            ) : f.status === "andamento" ? (
              <span className="size-2 rounded-full bg-[#FFB020]" />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-col">
            <span
              className={cn(
                "truncate text-[14px]",
                f.status === "andamento" ? "font-semibold" : "",
                f.status === "pendente" ? "text-hub-suave" : "",
              )}
            >
              {f.nome}
              {f.status === "andamento" && <span className="sr-only"> (fase atual)</span>}
              {f.status === "concluida" && <span className="sr-only"> (concluída)</span>}
            </span>
            {!compacta || f.status !== "pendente" ? (
              <span className="truncate text-[13px] text-hub-suave">
                {f.status === "concluida" && f.concluida_em
                  ? `Concluída ${diaMes(f.concluida_em)}`
                  : (f.quando ?? (f.status === "andamento" ? "Em andamento" : "—"))}
              </span>
            ) : (
              <span className="truncate text-[13px] text-hub-suave">{f.quando ?? "—"}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
