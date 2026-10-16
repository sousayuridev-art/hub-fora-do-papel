import { Check, CreditCard, Landmark } from "lucide-react";

import { TituloSecao } from "@/components/proposta-publica/TituloSecao";
import { dataCurta } from "@/components/proposta-publica/util";
import { moeda } from "@/lib/formatar";
import { rotuloDiagnostico } from "@/lib/funil";
import type { DocumentoPublico } from "@/lib/propostas";

const pct = (n: number) => `${n.toLocaleString("pt-BR")}%`;

/** 05 Investimento */
export function SecaoInvestimento({ doc }: { doc: DocumentoPublico }) {
  const inv = doc.investimento;
  const c = doc.condicoes;
  const formas = [c.pix && "Pix", c.boleto && "boleto"].filter(Boolean).join(" ou ");
  return (
    <section id="investimento" aria-labelledby="investimento-t" className="flex flex-col gap-5">
      <TituloSecao numero={5} id="investimento">
        Investimento
      </TituloSecao>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-6">
          <dl className="flex flex-col text-[15px]">
            <div className="flex justify-between gap-3 border-b border-hub-borda py-2.5">
              <dt>{doc.tipo}</dt>
              <dd className="tabular-nums">{moeda(inv.projeto_cents)}</dd>
            </div>
            {inv.diagnostico && (
              <div className="flex justify-between gap-3 border-b border-hub-tinta py-2.5 text-hub-suave">
                <dt>
                  Diagnóstico {rotuloDiagnostico[inv.diagnostico.tipo].toLowerCase()}, pago em{" "}
                  {dataCurta(inv.diagnostico.pago_em)}
                </dt>
                <dd className="tabular-nums">− {moeda(inv.diagnostico.cents)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 pt-3">
              <dt className="font-semibold">Total do projeto</dt>
              <dd className="font-titulo text-[28px] font-bold tabular-nums md:text-[32px]">
                {moeda(inv.total_cents)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-hub-suave">
              Em {inv.parcelas.length} partes
            </span>
            <ol>
              {inv.parcelas.map((p, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-hub-borda py-3 last:border-b-0"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-hub-fundo text-[13px] font-semibold tabular-nums">
                    {p.pct}%
                  </span>
                  <span className="text-[15px] font-medium first-letter:uppercase">{p.quando}</span>
                  <span className="font-semibold tabular-nums">{moeda(p.cents)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5">
            <h3 className="font-titulo text-[17px] font-bold">Como pagar</h3>
            {formas && (
              <p className="flex gap-3 text-[14.5px]">
                <Landmark className="mt-0.5 size-5 shrink-0 text-hub-suave" aria-hidden="true" />
                <span>
                  <strong className="font-semibold first-letter:uppercase">{formas}</strong>
                  <span className="block text-hub-suave">Sem taxa.</span>
                </span>
              </p>
            )}
            {c.cartao && (
              <p className="flex gap-3 text-[14.5px]">
                <CreditCard className="mt-0.5 size-5 shrink-0 text-hub-suave" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">Cartão de crédito</strong>
                  <span className="block text-hub-suave">
                    A taxa da operadora é repassada. Você vê o valor final antes de confirmar.
                  </span>
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-[#FFF8EA] p-5 text-[14.5px]">
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[#7A4200]">
              Condições
            </span>
            <p>
              Atraso tem multa de {pct(c.multa_pct)} e juros de {pct(c.juros_pct)} ao mês. Avisamos
              por escrito no 1º dia; no 10º dia, pausamos trabalho novo. O que já está no ar
              continua no ar.
            </p>
            <p className="text-hub-suave">Esta proposta vale até {dataCurta(doc.vence_em)}.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 06 Depois do lançamento */
export function SecaoDepois({ doc }: { doc: DocumentoPublico }) {
  const m = doc.mensalidade;
  if (!m) return null;
  const horas = m.horas_mes.toLocaleString("pt-BR");
  const reajuste =
    doc.condicoes.reajuste === "nenhum" ? "" : ` Reajuste anual pelo ${doc.condicoes.reajuste}.`;
  return (
    <section id="depois" aria-labelledby="depois-t" className="flex flex-col gap-5">
      <TituloSecao numero={6} id="depois">
        Depois do lançamento
      </TituloSecao>
      <div className="grid gap-6 rounded-3xl bg-hub-tinta p-6 text-white md:grid-cols-2 md:p-8">
        <div className="flex flex-col gap-3">
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[#C9CBD0]">
            Mensalidade · plano {m.nome}
          </span>
          <p className="font-titulo text-[36px] font-bold leading-none tabular-nums">
            {moeda(m.cents)}
            <span className="text-[15px] font-normal text-[#C9CBD0]"> /mês</span>
          </p>
          {m.infra_pelo_custo && (
            <p className="text-[14.5px] text-[#C9CBD0]">
              + infraestrutura pelo custo{m.infra_cents ? `, hoje ${moeda(m.infra_cents)}/mês` : ""}
            </p>
          )}
          <p className="border-t border-white/10 pt-3 text-[14.5px] text-[#C9CBD0]">
            Começa no lançamento
            {doc.lancamento ? `, previsto para ${dataCurta(doc.lancamento)}` : ""}. Contrato mínimo
            de {m.minimo_meses} meses.{reajuste}
          </p>
        </div>
        <ul className="flex flex-col gap-3 text-[15px]">
          {[
            `${horas} h por mês para ajustes e melhorias`,
            "Tudo no ar, atualizado e com cópias de segurança",
            `Pedidos de ajuste com resposta de ${doc.responsavel}`,
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <Check className="mt-0.5 size-5 shrink-0 text-[#FFB020]" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
