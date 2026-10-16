import { moeda } from "@/lib/formatar";
import type { DocumentoPublico } from "@/lib/propostas";

/** ActionBar do celular (card P, M2): valor + botão que leva ao bloco de aceite, sem aceitar direto. */
export function BarraAceite({ doc, aceita }: { doc: DocumentoPublico; aceita: string | null }) {
  const m = doc.mensalidade;
  return (
    <div className="barra-fixa fixed inset-x-0 bottom-0 z-30 border-t border-hub-borda bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:hidden print:hidden">
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="font-titulo text-[18px] font-bold tabular-nums">
            {moeda(doc.investimento.total_cents)}
          </span>
          {m && (
            <span className="truncate text-[13px] text-hub-suave">
              + {moeda(m.cents)}/mês depois
            </span>
          )}
        </span>
        <a
          href="#aceite"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#FFB020] px-5 text-[15px] font-semibold text-hub-tinta"
        >
          {aceita ? "Ver comprovante" : "Aceitar proposta"}
        </a>
      </div>
    </div>
  );
}
