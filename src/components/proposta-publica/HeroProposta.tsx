import { ArrowDown } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { dataCurta } from "@/components/proposta-publica/util";
import { moeda } from "@/lib/formatar";
import type { DocumentoPublico } from "@/lib/propostas";

/** Topo da proposta: promessa, para quem é, situação e o cartão de investimento. */
export function HeroProposta({
  doc,
  aceitaEm,
  aceitaPor,
}: {
  doc: DocumentoPublico;
  aceitaEm: string | null;
  aceitaPor: string | null;
}) {
  const inv = doc.investimento;
  const m = doc.mensalidade;
  return (
    <section className="grid gap-8 py-8 md:grid-cols-[minmax(0,1fr)_420px] md:items-start md:py-14">
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[#9A5B00]">
          Proposta · {doc.tipo}
        </p>
        <h1 className="font-titulo text-[28px] font-bold leading-[1.08] tracking-tight md:text-[52px]">
          {doc.titulo}
        </h1>
        {doc.apresentacao && (
          <p className="max-w-[56ch] whitespace-pre-line text-[16px] text-hub-suave">
            {doc.apresentacao}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Selo tom="neutro">Enviada em {dataCurta(doc.enviada_em)}</Selo>
          {aceitaEm ? (
            <Selo tom="ok">
              Aceita em {dataCurta(aceitaEm)}
              {aceitaPor ? ` por ${aceitaPor}` : ""}
            </Selo>
          ) : (
            <Selo tom="atencao">Vale até {dataCurta(doc.vence_em)}</Selo>
          )}
          {doc.lancamento && (
            <Selo tom="info">Lançamento previsto: {dataCurta(doc.lancamento)}</Selo>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl bg-hub-tinta p-6 text-white shadow-[0_24px_48px_-24px_rgba(14,16,19,0.6)] md:p-7">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[#C9CBD0]">
            Investimento
          </span>
          <span aria-hidden="true" className="h-1 w-7 rounded-full bg-[#FFB020]" />
        </div>
        <p className="font-titulo text-[36px] font-bold leading-none tabular-nums">
          {moeda(inv.total_cents)}
        </p>
        {inv.diagnostico && (
          <p className="-mt-2 text-[14px] text-[#C9CBD0]">
            {moeda(inv.projeto_cents)} com os {moeda(inv.diagnostico.cents)} do diagnóstico já
            descontados
          </p>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex gap-1" aria-hidden="true">
            {inv.parcelas.map((p, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full ${i === 0 ? "bg-[#FFB020]" : "bg-white/20"}`}
                style={{ flex: p.pct }}
              />
            ))}
          </div>
          <ul className="flex justify-between gap-2 text-[13px] text-[#C9CBD0]">
            {inv.parcelas.map((p, i) => (
              <li key={i}>
                {p.pct}%{" "}
                {p.quando
                  .replace("na entrega de um ciclo", "num ciclo")
                  .replace("na entrega final", "no fim")}
              </li>
            ))}
          </ul>
        </div>
        {m && (
          <p className="flex flex-wrap justify-between gap-2 border-t border-white/10 pt-4 text-[14px]">
            <span className="text-[#C9CBD0]">Depois do lançamento</span>
            <span className="font-medium">
              {moeda(m.cents)}/mês{m.infra_pelo_custo ? " + infraestrutura" : ""}
            </span>
          </p>
        )}
        <a
          href={aceitaEm ? "#aceite" : "#investimento"}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-hub-tinta hover:bg-[#F1F1EC] print:hidden"
        >
          {aceitaEm ? "Ver comprovante" : "Ver o investimento"}
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
