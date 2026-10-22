import { GraficoLinha } from "@/components/hub/Graficos";
import { moeda } from "@/lib/formatar";
import { mesCurto, type GraficosFinanceiro } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

/** Mensalidades cobradas por mês (card RD-3): receita que se repete, 6 meses, contas do banco. */
export function GraficoMensalidades({
  meses,
  planos,
  mrrCents,
  ativas,
}: {
  meses: GraficosFinanceiro["meses"];
  planos: GraficosFinanceiro["planos"];
  /** Soma das mensalidades ativas hoje (financeiro_painel). */
  mrrCents: number;
  ativas: number;
}) {
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];
  const variacao = primeiro && ultimo ? ultimo.mensalidades_cents - primeiro.mensalidades_cents : 0;
  return (
    <section
      aria-labelledby="mensal-t"
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-4 md:px-6 md:py-5"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="mensal-t" className="text-[16px] font-semibold">
          Mensalidades por mês
        </h2>
        <span className="text-[13px] text-hub-suave">Receita que se repete · 6 meses</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <b className="text-[24px] font-semibold tabular-nums">{moeda(mrrCents)}</b>
        <span className="text-[13px] text-hub-suave">por mês hoje</span>
        {primeiro && variacao !== 0 && (
          <span className={cn("text-[13px]", variacao > 0 ? "text-sit-ok-t" : "text-sit-risco-t")}>
            {variacao > 0 ? "+ " : "− "}
            {moeda(Math.abs(variacao))} desde {mesCurto(primeiro.mes, false)}
          </span>
        )}
      </div>
      <GraficoLinha
        rotulo="Mensalidades cobradas por mês, nos últimos 6 meses"
        pontos={meses.map((m) => ({
          rotulo: mesCurto(m.mes, false),
          valor: m.mensalidades_cents,
        }))}
        formatar={moeda}
      />
      <span className="text-[12.5px] text-hub-suave">
        {ativas === 0
          ? "Nenhuma mensalidade ativa."
          : `${ativas} ${ativas === 1 ? "mensalidade ativa" : "mensalidades ativas"} · ${moeda(mrrCents * 12)} por ano`}
        {planos.length > 0 && ` · ${planos.map((p) => `${p.plano} ${p.quantidade}`).join(", ")}`}
      </span>
    </section>
  );
}
