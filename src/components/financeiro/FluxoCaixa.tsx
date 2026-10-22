import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { moeda } from "@/lib/formatar";
import { chavesFinanceiro, fluxoDeCaixa, mesCurto, type MesFluxo } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

const entradas = (m: MesFluxo) => m.entradas_cents;
const saidas = (m: MesFluxo) => m.saidas_cents;

/** Fluxo de caixa: 3 meses para trás, o atual e 3 para frente (contas do banco). */
export function FluxoCaixa() {
  const q = useQuery({ queryKey: chavesFinanceiro.fluxo, queryFn: fluxoDeCaixa });
  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar o fluxo de caixa"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data) return <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  const meses = q.data.meses;
  const maior = Math.max(1, ...meses.map((m) => Math.max(entradas(m), saidas(m))));
  const atual = meses.find((m) => m.tipo === "atual");

  return (
    <section
      aria-labelledby="fluxo-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="fluxo-t" className="font-titulo text-lg font-bold">
          Fluxo de caixa
        </h2>
        <p className="text-[14px] text-hub-suave">
          Meses passados: o que entrou de fato. Mês atual e próximos: recebido + a receber pelo
          vencimento, incluindo as mensalidades ativas.
          {atual && atual.em_atraso_cents > 0
            ? ` Há ${moeda(atual.em_atraso_cents)} em atraso fora desta conta.`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-4 text-[13px] text-hub-suave">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-serie-1" /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-serie-2" /> Saídas
        </span>
      </div>
      <table className="w-full border-collapse text-[14px]">
        <caption className="sr-only">Entradas, saídas e saldo por mês</caption>
        <thead>
          <tr className="text-left text-[13px] text-hub-suave">
            <th scope="col" className="py-2 pr-2 font-medium">
              Mês
            </th>
            <th scope="col" className="hidden py-2 pr-2 font-medium sm:table-cell">
              Entradas e saídas
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Entradas
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Saídas
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Saldo
            </th>
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr
              key={m.mes}
              className={cn(
                "border-t border-hub-borda",
                m.tipo === "atual" && "bg-hub-fundo font-semibold",
              )}
            >
              <th scope="row" className="py-3 pr-2 text-left font-medium capitalize">
                {mesCurto(m.mes)}
                {m.tipo === "futuro" && (
                  <span className="block text-[12.5px] font-normal text-hub-suave">previsto</span>
                )}
              </th>
              <td className="hidden w-[40%] py-3 pr-4 sm:table-cell" aria-hidden="true">
                <span className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "h-2 rounded-full bg-serie-1",
                      m.tipo === "futuro" && "opacity-50",
                    )}
                    style={{ width: `${(entradas(m) / maior) * 100}%` }}
                  />
                  <span
                    className={cn(
                      "h-2 rounded-full bg-serie-2",
                      m.tipo === "futuro" && "opacity-50",
                    )}
                    style={{ width: `${(saidas(m) / maior) * 100}%` }}
                  />
                </span>
              </td>
              <td className="py-3 pr-2 text-right tabular-nums">{moeda(entradas(m))}</td>
              <td className="py-3 pr-2 text-right tabular-nums">{moeda(saidas(m))}</td>
              <td
                className={cn(
                  "py-3 text-right tabular-nums",
                  m.saldo_cents < 0 && "text-sit-risco-t",
                )}
              >
                {moeda(m.saldo_cents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
