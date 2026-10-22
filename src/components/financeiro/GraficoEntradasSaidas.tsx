import { GraficoBarras, Legenda } from "@/components/hub/Graficos";
import { moeda } from "@/lib/formatar";
import { mesCurto, valorCurto, type MesGrafico } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

import { moedaComSinal } from "@/lib/formatar";

const entradas = { nome: "Entradas", cor: "var(--color-serie-1)" };
const saidas = { nome: "Saídas", cor: "var(--color-serie-2)" };

/** Entradas e saídas dos últimos 6 meses (card RD-3), com o resultado embaixo de cada mês. */
export function GraficoEntradasSaidas({ meses }: { meses: MesGrafico[] }) {
  return (
    <section
      aria-labelledby="entradas-t"
      className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-hub-borda bg-white p-4 md:px-6 md:py-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="entradas-t" className="text-[16px] font-semibold">
            Entradas e saídas
          </h2>
        </div>
        <Legenda series={[entradas, saidas]} />
      </div>
      <GraficoBarras
        rotulo="Entradas, saídas e resultado por mês, nos últimos 6 meses"
        categorias={meses.map((m) => mesCurto(m.mes, false))}
        series={[
          { ...entradas, valores: meses.map((m) => m.entradas_cents) },
          { ...saidas, valores: meses.map((m) => m.saidas_cents) },
        ]}
        formatar={moeda}
        formatarEixo={valorCurto}
        altura={190}
        rodape={(i) => {
          const m = meses[i];
          if (!m) return null;
          return (
            <>
              <b
                className={cn(
                  "font-semibold leading-tight tabular-nums",
                  m.resultado_cents < 0 ? "text-sit-risco-t" : "text-sit-ok-t",
                )}
              >
                {m.resultado_cents < 0 ? "−" : m.resultado_cents > 0 ? "+" : ""}
                {valorCurto(Math.abs(m.resultado_cents))}
              </b>
              {m.atual && <span className="leading-tight text-hub-suave">até hoje</span>}
            </>
          );
        }}
      />
      <p className="sr-only">
        Resultado de cada mês:{" "}
        {meses.map((m) => `${mesCurto(m.mes)} ${moedaComSinal(m.resultado_cents)}`).join("; ")}.
      </p>
    </section>
  );
}
