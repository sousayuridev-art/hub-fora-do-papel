import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Cartao } from "@/components/trafego/Cartao";
import { moeda } from "@/lib/formatar";
import type { PainelTrafego } from "@/lib/trafego";
import { cn } from "@/lib/utils";

/** Do clique ao contrato: as etapas, a taxa entre elas e onde está a maior perda. */
export function TrafegoFunil({ p, etiqueta }: { p: PainelTrafego; etiqueta: string }) {
  const i = p.indicadores;
  const etapas = [
    { nome: "Cliques", n: i.cliques },
    { nome: "Contatos", n: i.contatos },
    { nome: "Diagnóstico", n: i.diagnosticos },
    { nome: "Proposta", n: i.propostas },
    { nome: "Fechado", n: i.fechados },
  ];
  const taxas = etapas.slice(1).map((e, k) => {
    const antes = etapas[k]?.n;
    return antes && antes > 0 && e.n != null
      ? { pct: (e.n / antes) * 100, de: antes, para: e.n }
      : null;
  });
  // Maior perda: menor taxa entre contato → diagnóstico → proposta → fechado (cliques ficam de fora)
  let pior = -1;
  taxas.forEach((t, k) => {
    if (k === 0 || !t) return;
    const atual = pior >= 0 ? taxas[pior] : null;
    if (!atual || t.pct < atual.pct) pior = k;
  });
  const frasePerda =
    pior > 0 && taxas[pior]
      ? `A maior perda está entre ${etapas[pior]?.nome.toLowerCase()} e ${etapas[pior + 1]?.nome.toLowerCase()}: ${Math.round(taxas[pior]?.pct ?? 0)} em cada 100 seguem adiante.`
      : "Ainda não há contatos de anúncio suficientes para comparar as etapas.";

  return (
    <Cartao
      id="funil-trafego"
      titulo="Do clique ao contrato"
      texto="Só contatos com origem Anúncio (Instagram/Facebook ou Google), contados no mês em que chegaram, inclusive os arquivados."
      etiqueta={etiqueta}
    >
      <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        {etapas.map((e, k) => (
          <li key={e.nome} className="flex flex-col gap-2 lg:flex-1 lg:flex-row lg:items-center">
            {k > 0 && (
              <span
                className={cn(
                  "flex items-center gap-1 self-center rounded-full px-2 py-0.5 text-[12.5px] font-semibold tabular-nums",
                  k - 1 === pior
                    ? "bg-sit-atencao text-sit-atencao-t"
                    : "bg-hub-fundo text-hub-suave",
                )}
              >
                {taxas[k - 1] ? `${Math.round(taxas[k - 1]?.pct ?? 0)}%` : "—"}
                <ArrowRight className="size-3.5 max-lg:rotate-90" aria-hidden="true" />
              </span>
            )}
            <div
              className={cn(
                "flex flex-1 items-center justify-between gap-2 rounded-xl border p-4 lg:flex-col lg:items-start",
                e.nome === "Fechado"
                  ? "border-sit-ok bg-sit-ok"
                  : "border-hub-borda bg-hub-fundo/60",
              )}
            >
              <span className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-hub-suave">
                {e.nome}
              </span>
              <span className="font-titulo text-[26px] font-bold tabular-nums">{e.n ?? "—"}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-[14.5px]">{frasePerda}</p>
      <div className="grid gap-4 border-t border-hub-borda pt-4 md:grid-cols-3">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-hub-suave">
            Diagnósticos vindos de anúncio
          </p>
          <p className="font-titulo text-xl font-bold tabular-nums">
            {moeda(i.receita_diagnosticos_cents)}
          </p>
        </div>
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-hub-suave">
            Projetos fechados
          </p>
          <p className="font-titulo text-xl font-bold tabular-nums">
            {moeda(i.valor_fechado_cents)}
          </p>
          {i.fechados === 0 && (
            <p className="text-[13px] text-hub-suave">Nenhum contrato fechado no período.</p>
          )}
        </div>
        <div className="flex flex-col gap-1 text-[14px] text-hub-suave">
          Os números vêm dos contatos com origem Anúncio no funil de vendas.
          <Link
            to="/app/clientes"
            className="inline-flex min-h-11 items-center gap-1 font-medium text-[#1E3FA8]"
          >
            Ver esses contatos <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Cartao>
  );
}
