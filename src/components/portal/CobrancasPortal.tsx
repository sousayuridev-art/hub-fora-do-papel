import { Link } from "@tanstack/react-router";
import { Check, FileText } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { situacaoDaCobranca, type Cobranca } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

/** Uma lista de cobranças no portal (parcelas, serviços adicionais ou mensalidades). */
export function CobrancasPortal({
  titulo,
  apoio,
  itens,
  hoje,
  selecionada,
  aoPagar,
}: {
  titulo: string;
  apoio?: string | undefined;
  itens: Cobranca[];
  hoje: string;
  selecionada: string | null;
  aoPagar: (c: Cobranca) => void;
}) {
  if (itens.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 md:flex-row md:items-end md:justify-between">
        <h2 className="font-titulo text-[20px] font-bold md:text-2xl">{titulo}</h2>
        {apoio && <span className="text-[13.5px] text-hub-suave">{apoio}</span>}
      </div>
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-hub-borda bg-white">
        {itens.map((c) => {
          const s = situacaoDaCobranca(c, hoje);
          const paga = c.situacao === "paga";
          return (
            <li
              key={c.id}
              className={cn(
                "flex flex-col gap-3 border-b border-hub-borda px-4 py-4 last:border-b-0 md:flex-row md:items-center md:gap-4 md:px-5",
                selecionada === c.id && "bg-hub-fundo",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "hidden size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold md:flex",
                  paga ? "bg-hub-tinta text-white" : "border border-[#D6D6CF]",
                )}
              >
                {paga ? <Check className="size-4" /> : (c.parte ?? "•")}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{c.descricao}</span>
                <span className="text-[14px] text-hub-suave">
                  {paga
                    ? `Paga em ${c.pago_em ? diaMes(dataLocal(c.pago_em)) : "—"}`
                    : c.vencimento
                      ? `Vence em ${diaMes(dataLocal(c.vencimento))}`
                      : `Cobrada ${c.quando ?? "na entrega"}`}
                </span>
              </span>
              <span className="flex items-center justify-between gap-3 md:justify-end">
                <Selo tom={s.tom}>{s.texto}</Selo>
                <span className="font-semibold tabular-nums">
                  {moeda(paga ? (c.pago_cents ?? c.valor_cents) : c.valor_cents)}
                </span>
              </span>
              {paga ? (
                <Link
                  to="/recibo/$id"
                  params={{ id: c.id }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-4 text-[14.5px] font-semibold max-md:w-full"
                >
                  <FileText className="size-4" aria-hidden="true" /> Recibo
                </Link>
              ) : c.vencimento ? (
                <button
                  type="button"
                  onClick={() => aoPagar(c)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-hub-tinta px-5 text-[14.5px] font-semibold text-white max-md:w-full"
                >
                  Pagar
                </button>
              ) : (
                <span className="text-center text-[13.5px] text-hub-suave md:w-20">—</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
