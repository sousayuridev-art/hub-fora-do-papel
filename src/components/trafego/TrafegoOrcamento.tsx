import { Selo } from "@/components/hub/Selo";
import { Cartao } from "@/components/trafego/Cartao";
import { moeda } from "@/lib/formatar";
import { rotuloPlataforma, type PainelTrafego } from "@/lib/trafego";

const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function Barra({ gasto, total, linha }: { gasto: number; total: number; linha: number }) {
  const pct = total > 0 ? Math.min(100, (gasto / total) * 100) : 0;
  return (
    <div className="relative h-2.5 rounded-full bg-[#ECECE6]" aria-hidden="true">
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-hub-tinta"
        style={{ width: `${pct}%` }}
      />
      <span className="absolute -top-1 h-4.5 w-0.5 bg-[#B86E00]" style={{ left: `${linha}%` }} />
    </div>
  );
}

/** Orçamento do mês atual: gasto, ritmo (linha = quanto do mês já passou) e quanto sobra por dia. */
export function TrafegoOrcamento({
  o,
  aoAjustar,
}: {
  o: PainelTrafego["orcamento"];
  aoAjustar: () => void;
}) {
  const mes = nomeMes.format(new Date(`${o.mes}T12:00:00`));
  const linha = Math.round((o.dia / o.dias_no_mes) * 100);
  const pctGasto = o.mensal_cents > 0 ? Math.round((o.gasto_cents / o.mensal_cents) * 100) : 0;
  const sobra = Math.max(0, o.mensal_cents - o.gasto_cents);
  const diasRestantes = Math.max(1, o.dias_no_mes - o.dia + 1);
  const ritmo =
    o.mensal_cents === 0
      ? { tom: "neutro" as const, texto: "Sem orçamento" }
      : pctGasto > linha + 10
        ? { tom: "risco" as const, texto: "Acima do ritmo" }
        : pctGasto < linha - 20
          ? { tom: "atencao" as const, texto: "Abaixo do ritmo" }
          : { tom: "ok" as const, texto: "No ritmo" };

  return (
    <Cartao
      id="orcamento"
      titulo={`Orçamento de ${mes}`}
      texto="O orçamento é mensal, por isso esta faixa mostra sempre o mês atual."
      etiqueta={`Hoje · dia ${o.dia} de ${o.dias_no_mes}`}
      acao={
        <button
          type="button"
          onClick={aoAjustar}
          className="min-h-11 rounded-lg px-3 text-[14px] font-medium text-[#1E3FA8] hover:bg-sit-info"
        >
          Ajustar
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-2.5">
          <p className="text-[15px]">
            <strong className="font-titulo text-xl font-bold tabular-nums">
              {moeda(o.gasto_cents)}
            </strong>{" "}
            <span className="text-hub-suave">gastos de {moeda(o.mensal_cents)} até hoje</span>
          </p>
          <Barra gasto={o.gasto_cents} total={o.mensal_cents} linha={linha} />
          <p className="flex justify-between text-[13px] text-hub-suave">
            <span>{pctGasto}% do orçamento</span>
            <span>Linha: {linha}% do mês já passou</span>
          </p>
          <p className="flex flex-wrap items-center gap-2 text-[14.5px]">
            <Selo tom={ritmo.tom}>{ritmo.texto}</Selo>
            Sobram {moeda(sobra)} para {diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}, cerca
            de {moeda(Math.floor(sobra / diasRestantes))} por dia.
          </p>
        </div>
        <ul className="flex flex-col gap-4">
          {(
            [
              ["google", o.gasto_google_cents, o.google_cents],
              ["meta", o.gasto_meta_cents, o.meta_cents],
            ] as const
          ).map(([p, gasto, total]) => (
            <li key={p} className="flex flex-col gap-1.5">
              <span className="flex justify-between text-[14px]">
                <span className="font-medium">{rotuloPlataforma[p]}</span>
                <span className="tabular-nums text-hub-suave">
                  {moeda(gasto)} de {moeda(total)}
                </span>
              </span>
              <Barra gasto={gasto} total={total} linha={linha} />
            </li>
          ))}
        </ul>
      </div>
    </Cartao>
  );
}
