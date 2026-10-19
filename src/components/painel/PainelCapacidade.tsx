import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";

import type { Capacidade } from "@/lib/painel";

const horas = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;

/** Capacidade do mês: mensalidades ocupam horas todo mês; projetos em andamento, o que falta. */
export function PainelCapacidade({ c }: { c: Capacidade }) {
  const pctMens = Math.min(100, (c.mensalidades_h / c.capacidade_h) * 100);
  const pctLanc = Math.min(100, (c.lancadas_mes_h / c.capacidade_h) * 100);
  const apertado = c.mensalidades_h + c.projetos_restantes_h > c.capacidade_h;
  return (
    <section
      aria-labelledby="capacidade-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="capacidade-t" className="flex items-center gap-2.5 font-titulo text-lg font-bold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#FFF1D6] text-[#9A5B00]">
            <Gauge className="size-[18px]" aria-hidden="true" />
          </span>
          Capacidade do mês
        </h2>
        <Link
          to="/app/configuracoes"
          className="inline-flex min-h-11 items-center text-[14px] font-medium text-[#1E3FA8]"
        >
          {horas(c.capacidade_h)} por mês
        </Link>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-[14px] text-hub-suave">Mensalidades (todo mês)</dt>
          <dd className="font-titulo text-2xl font-bold tabular-nums">{horas(c.mensalidades_h)}</dd>
          <dd className="text-[13.5px] text-hub-suave">
            Livre para vender: {horas(c.livre_mes_h)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[14px] text-hub-suave">Projetos em andamento (falta)</dt>
          <dd className="font-titulo text-2xl font-bold tabular-nums">
            {horas(c.projetos_restantes_h)}
          </dd>
          <dd
            className={apertado ? "text-[13.5px] text-sit-risco-t" : "text-[13.5px] text-hub-suave"}
          >
            {apertado
              ? "Mensalidades e projetos passam de um mês de trabalho"
              : "Cabem junto com as mensalidades"}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[14px] text-hub-suave">Lançadas neste mês</dt>
          <dd className="font-titulo text-2xl font-bold tabular-nums">{horas(c.lancadas_mes_h)}</dd>
          <dd className="text-[13.5px] text-hub-suave">Horas registradas nos projetos</dd>
        </div>
      </dl>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-sit-neutro"
        role="img"
        aria-label={`Mensalidades ocupam ${Math.round(pctMens)}% e já foram lançadas ${Math.round(pctLanc)}% das horas do mês`}
      >
        <span className="absolute inset-y-0 left-0 bg-[#FFB020]" style={{ width: `${pctMens}%` }} />
        <span
          className="absolute inset-y-0 left-0 border-r-2 border-hub-tinta"
          style={{ width: `${pctLanc}%` }}
        />
      </div>
    </section>
  );
}
