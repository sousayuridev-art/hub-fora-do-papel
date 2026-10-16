import { Cartao } from "@/components/trafego/Cartao";
import { moeda } from "@/lib/formatar";
import type { PainelTrafego } from "@/lib/trafego";

const mesFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

/** Retorno por mês de entrada: o mês que pagou o anúncio recebe o resultado do contato. */
export function TrafegoRetorno({ p, etiqueta }: { p: PainelTrafego; etiqueta: string }) {
  const i = p.indicadores;
  const x = (r: number | null) => (r == null ? "—" : `${r.toLocaleString("pt-BR")}×`);
  return (
    <Cartao
      id="retorno"
      titulo="Retorno por mês de entrada"
      texto="Um contato que chegou em setembro e fecha em novembro conta para setembro. Assim o mês que pagou o anúncio recebe o resultado."
      etiqueta={etiqueta}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[14.5px]">
            <thead>
              <tr className="border-b border-hub-borda text-left text-[13px] text-hub-suave">
                <th className="py-2 pr-3 font-medium">Mês de entrada</th>
                <th className="py-2 pr-3 text-right font-medium">Investido</th>
                <th className="py-2 pr-3 text-right font-medium">Contatos</th>
                <th className="py-2 pr-3 text-right font-medium">Fechados</th>
                <th className="py-2 pr-3 text-right font-medium">Valor fechado</th>
                <th className="py-2 text-right font-medium">Retorno</th>
              </tr>
            </thead>
            <tbody>
              {p.retorno.map((r) => (
                <tr key={r.mes} className="border-b border-hub-borda">
                  <td className="py-2.5 pr-3 first-letter:uppercase">
                    {mesFmt.format(new Date(`${r.mes}T12:00:00`))}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {moeda(r.investido_cents)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{r.contatos}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{r.fechados}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {moeda(r.valor_fechado_cents)}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{x(r.retorno)}</td>
                </tr>
              ))}
              <tr className="bg-hub-fundo font-semibold">
                <td className="py-2.5 pl-2 pr-3">Total</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{moeda(i.investido_cents)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{i.contatos}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{i.fechados}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {moeda(i.valor_fechado_cents)}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{x(i.retorno)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <dl className="flex flex-col gap-3 rounded-xl bg-hub-fundo p-4 text-[14px]">
          <div>
            <dt className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-hub-suave">
              Valor fechado
            </dt>
            <dd>Valor do projeto no aceite. A mensalidade e o diagnóstico contam à parte.</dd>
          </div>
          <div>
            <dt className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-hub-suave">
              Retorno
            </dt>
            <dd>
              Valor fechado ÷ investido no mesmo mês de entrada. 12× quer dizer R$ 12 de projeto
              para cada R$ 1 em anúncio.
            </dd>
          </div>
          <div>
            <dt className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-hub-suave">
              Mês de entrada
            </dt>
            <dd>Mês em que o contato chegou pelo anúncio, não o mês em que fechou.</dd>
          </div>
        </dl>
      </div>
    </Cartao>
  );
}
