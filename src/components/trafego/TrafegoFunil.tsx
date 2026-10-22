import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Ajuda } from "@/components/trafego/Ajuda";
import { Cartao } from "@/components/trafego/Cartao";
import { moeda } from "@/lib/formatar";
import { funilDoTrafego, type PainelTrafego } from "@/lib/trafego";
import { cn } from "@/lib/utils";

const verbo: Record<string, string> = {
  Cliques: "viraram contato",
  Contatos: "compraram diagnóstico",
  Diagnósticos: "receberam proposta",
  Propostas: "fecharam",
};

/** Do clique ao contrato numa linha (RD-6): etapas, quanto passa de uma para outra e a maior perda. */
export function TrafegoFunil({ p, etiqueta }: { p: PainelTrafego; etiqueta: string }) {
  const i = p.indicadores;
  const { etapas, pior } = funilDoTrafego(i);
  // Barras na escala dos contatos (cliques costumam ser muito maiores e ficam cheios)
  const base = Math.max(1, i.contatos);
  const largura = (k: number, n: number | null) =>
    k === 0 ? (n == null ? 0 : 100) : Math.min(100, ((n ?? 0) / base) * 100);
  const perda =
    pior != null
      ? `Maior perda: de ${etapas[pior]?.nome.toLowerCase()} para ${etapas[pior + 1]?.nome.toLowerCase()} (${100 - (etapas[pior]?.passou ?? 0)}% param aqui)`
      : null;

  return (
    <Cartao
      id="funil-trafego"
      titulo={
        <>
          Do clique ao contrato
          <Ajuda sobre="do clique ao contrato">
            Só contatos com origem Anúncio, contados no mês em que chegaram ({etiqueta}), inclusive
            os arquivados. Cliques vêm dos lançamentos de investimento. Valor fechado é o valor do
            projeto no aceite; mensalidade e diagnóstico contam à parte.
          </Ajuda>
        </>
      }
      acao={
        perda ? (
          <span className="text-[13px] font-medium text-sit-risco-t">{perda}</span>
        ) : (
          <span className="text-[13px] text-hub-suave">
            Ainda não há contatos suficientes para comparar as etapas
          </span>
        )
      }
    >
      <ol className="m-0 grid list-none gap-2.5 p-0 md:grid-cols-5 md:gap-1">
        {etapas.map((e, k) => {
          const ultima = k === etapas.length - 1;
          return (
            <li
              key={e.nome}
              className="grid grid-cols-[96px_1fr_auto] items-center gap-x-3 md:flex md:flex-col md:items-stretch md:gap-2 md:px-1.5"
            >
              <span className="text-[13.5px] text-[#2A2D33] md:text-[13px] md:text-hub-suave">
                {e.nome}
              </span>
              <b className="order-3 text-right text-[15px] font-semibold tabular-nums md:order-none md:text-left md:text-[22px] md:leading-tight">
                {e.n ?? "—"}
              </b>
              <span aria-hidden="true" className="relative h-2.5 rounded bg-[#EDEDE7]">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded",
                    ultima ? "bg-sit-ok-t" : "bg-serie-1",
                  )}
                  style={{ width: `${largura(k, e.n)}%` }}
                />
              </span>
              <span
                className={cn(
                  "col-span-3 text-[12.5px] max-md:hidden",
                  k === pior ? "font-medium text-sit-risco-t" : "text-hub-suave",
                  ultima && "text-sit-ok-t",
                )}
              >
                {ultima
                  ? `${moeda(i.valor_fechado_cents)} fechados`
                  : e.passou == null
                    ? "—"
                    : `${e.passou}% ${verbo[e.nome] ?? "seguiram"}`}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="m-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-hub-suave">
        <span>
          Diagnósticos vindos de anúncio:{" "}
          <b className="font-semibold text-hub-tinta">{moeda(i.receita_diagnosticos_cents)}</b>
          <span className="md:hidden">
            {" "}
            · Projetos fechados:{" "}
            <b className="font-semibold text-hub-tinta">{moeda(i.valor_fechado_cents)}</b>
          </span>
        </span>
        <Link
          to="/app/clientes"
          className="inline-flex min-h-11 items-center gap-1 font-medium text-[#1E3FA8]"
        >
          Ver esses contatos <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </p>
    </Cartao>
  );
}
