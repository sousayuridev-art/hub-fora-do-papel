import { Ajuda } from "@/components/trafego/Ajuda";
import { moeda } from "@/lib/formatar";
import type { PainelTrafego } from "@/lib/trafego";

const mesFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const mesCurtoFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const x = (r: number | null) => (r == null ? "—" : `${r.toLocaleString("pt-BR")}×`);

/**
 * Retorno por mês de entrada (aba do RD-6): o mês que pagou o anúncio recebe o resultado do
 * contato. As definições ficam na ajuda dos títulos das colunas.
 */
export function TrafegoRetorno({ p }: { p: PainelTrafego }) {
  const i = p.indicadores;
  const th = "py-3 pr-3 font-medium";
  return (
    <div className="overflow-x-auto rounded-2xl border border-hub-borda bg-white">
      <table className="w-full min-w-[560px] text-[14px] whitespace-nowrap tabular-nums">
        <caption className="sr-only">Retorno por mês de entrada</caption>
        <thead>
          <tr className="border-b border-hub-borda text-left text-[13.5px] text-hub-suave">
            <th className={`${th} pl-4 md:pl-5`}>
              <span className="inline-flex items-center gap-1">
                Mês de entrada
                <Ajuda sobre="mês de entrada">
                  Mês em que o contato chegou pelo anúncio, não o mês em que fechou. Um contato que
                  chegou em setembro e fecha em novembro conta para setembro.
                </Ajuda>
              </span>
            </th>
            <th className={`${th} text-right`}>Investido</th>
            <th className={`${th} text-right`}>Contatos</th>
            <th className={`${th} text-right`}>Fechados</th>
            <th className={`${th} text-right`}>
              <span className="inline-flex items-center gap-1">
                Valor fechado
                <Ajuda sobre="valor fechado">
                  Valor do projeto no aceite. A mensalidade e o diagnóstico contam à parte.
                </Ajuda>
              </span>
            </th>
            <th className={`${th} pr-4 text-right md:pr-5`}>
              <span className="inline-flex items-center gap-1">
                Retorno
                <Ajuda sobre="retorno">
                  Valor fechado dividido pelo investido no mesmo mês de entrada. 12× quer dizer R$
                  12 de projeto para cada R$ 1 em anúncio.
                </Ajuda>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {p.retorno.map((r) => {
            const d = new Date(`${r.mes}T12:00:00`);
            return (
              <tr key={r.mes} className="border-b border-[#F0F0EA]">
                <th scope="row" className="py-3 pr-3 pl-4 text-left font-normal md:pl-5">
                  <span className="first-letter:uppercase max-md:hidden">{mesFmt.format(d)}</span>
                  <span className="md:hidden">{mesCurtoFmt.format(d)}</span>
                </th>
                <td className="py-3 pr-3 text-right">{moeda(r.investido_cents)}</td>
                <td className="py-3 pr-3 text-right">{r.contatos}</td>
                <td className="py-3 pr-3 text-right">{r.fechados}</td>
                <td className="py-3 pr-3 text-right">{moeda(r.valor_fechado_cents)}</td>
                <td className="py-3 pr-4 text-right font-semibold md:pr-5">{x(r.retorno)}</td>
              </tr>
            );
          })}
          <tr className="bg-hub-fundo font-semibold">
            <th scope="row" className="py-3 pr-3 pl-4 text-left md:pl-5">
              Total
            </th>
            <td className="py-3 pr-3 text-right">{moeda(i.investido_cents)}</td>
            <td className="py-3 pr-3 text-right">{i.contatos}</td>
            <td className="py-3 pr-3 text-right">{i.fechados}</td>
            <td className="py-3 pr-3 text-right">{moeda(i.valor_fechado_cents)}</td>
            <td className="py-3 pr-4 text-right md:pr-5">{x(i.retorno)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
