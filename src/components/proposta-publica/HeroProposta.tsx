import { ArrowDown } from "lucide-react";

import { dataCurta, dataPorExtenso } from "@/components/proposta-publica/util";
import { moeda } from "@/lib/formatar";
import type { DocumentoPublico } from "@/lib/propostas";

/**
 * Capa da proposta (card CX-3, direção A): promessa em destaque, para quem é, fatos em uma linha
 * e o cartão de investimento em papel claro sobre a capa escura.
 */
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
  const fatos: [string, string][] = [
    aceitaEm
      ? ["Aceita em", `${dataCurta(aceitaEm)}${aceitaPor ? ` por ${aceitaPor.split(" ")[0]}` : ""}`]
      : ["Vale até", dataPorExtenso(doc.vence_em).replace(/ de \d{4}$/, "")],
    ...(doc.lancamento
      ? ([["Lançamento previsto", dataPorExtenso(doc.lancamento).replace(/ de \d{4}$/, "")]] as [
          string,
          string,
        ][])
      : []),
    ["Responsável", doc.responsavel],
  ];
  return (
    <section className="mx-auto grid max-w-[1120px] gap-8 px-4 pb-16 pt-8 md:grid-cols-[minmax(0,1fr)_400px] md:items-end md:gap-14 md:px-6 md:pb-24 md:pt-16">
      <div className="flex flex-col gap-5">
        <p className="text-[14px] font-medium text-[#FFB020]">
          Proposta para {doc.contato.split(" ")[0]} · {doc.empresa}
        </p>
        <h1 className="font-marca text-[36px] font-extrabold leading-[1] tracking-[-0.035em] md:text-[60px]">
          {doc.titulo}
        </h1>
        {doc.apresentacao && (
          <p className="max-w-[56ch] whitespace-pre-line text-[16px] leading-relaxed text-[#C9CBD0] md:text-[17px]">
            {doc.apresentacao}
          </p>
        )}
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-5 md:flex md:flex-wrap md:gap-x-10">
          {fatos.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="text-[12.5px] text-[#A3A6AD]">{k}</dt>
              <dd className="font-marca text-[18px] font-bold md:text-[20px]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl bg-[#F5F5F2] p-6 text-hub-tinta shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] md:p-7">
        <span className="text-[14px] font-medium text-hub-suave">Investimento</span>
        <p className="-mt-3 font-marca text-[40px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
          {moeda(inv.total_cents)}
        </p>
        {inv.diagnostico && (
          <p className="-mt-2 text-[14px] text-hub-suave">
            {moeda(inv.projeto_cents)} com os {moeda(inv.diagnostico.cents)} do diagnóstico já
            descontados
          </p>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex gap-1" aria-hidden="true">
            {inv.parcelas.map((p, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full ${i === 0 ? "bg-[#FFB020]" : "bg-[#DCDCD5]"}`}
                style={{ flex: p.pct }}
              />
            ))}
          </div>
          <ul className="flex justify-between gap-2 text-[13px] text-hub-suave">
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
          <p className="flex flex-wrap justify-between gap-2 border-t border-[#DCDCD5] pt-4 text-[14px]">
            <span className="text-hub-suave">Depois do lançamento</span>
            <span className="font-semibold">
              {moeda(m.cents)}/mês{m.infra_pelo_custo ? " + infraestrutura" : ""}
            </span>
          </p>
        )}
        <a
          href={aceitaEm ? "#aceite" : "#investimento"}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hub-tinta text-[15px] font-semibold text-white hover:bg-[#2A2D33] print:hidden"
        >
          {aceitaEm ? "Ver comprovante" : "Ver o investimento"}
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
