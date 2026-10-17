import { BlocoRelatorio } from "@/components/relatorios/BlocoRelatorio";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import type { Relatorio } from "@/lib/relatorios";

/** O que entrou e o que vai entrar: implantação, diagnósticos, recebido, mensalidades e próximas entradas. */
export function RelatorioReceita({ r }: { r: Relatorio["receita"] }) {
  const cartoes = [
    {
      rotulo: "Implantação fechada",
      valor: moeda(r.fechado_cents),
      apoio: `${r.fechados} ${r.fechados === 1 ? "proposta aceita" : "propostas aceitas"}`,
    },
    {
      rotulo: "Diagnósticos pagos",
      valor: moeda(r.diagnosticos_cents),
      apoio: `${r.diagnosticos} ${r.diagnosticos === 1 ? "diagnóstico" : "diagnósticos"}`,
    },
    {
      rotulo: "Recebido no período",
      valor: moeda(r.recebido_cents),
      apoio: "Pagamentos registrados",
    },
    {
      rotulo: "Mensalidades por mês",
      valor: moeda(r.mrr_cents),
      apoio: `${r.mensalidades_ativas} ativas · ${moeda(r.mrr_cents * 12)} por ano${
        r.churn_pct !== null ? ` · ${r.churn_pct.toLocaleString("pt-BR")}% encerradas` : ""
      }`,
    },
  ];
  return (
    <BlocoRelatorio
      id="receita"
      rotulo="Receita"
      titulo="O que entrou e o que vai entrar"
      resumo={`${moeda(r.a_receber_30_cents)} chegam nos próximos 30 dias${
        r.em_atraso_cents > 0 ? `, e ${moeda(r.em_atraso_cents)} estão em atraso` : ""
      }. ${r.mensalidades_novas} ${r.mensalidades_novas === 1 ? "mensalidade começou" : "mensalidades começaram"} e ${r.mensalidades_encerradas} ${r.mensalidades_encerradas === 1 ? "foi encerrada" : "foram encerradas"} no período.`}
    >
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="flex flex-col gap-1 rounded-xl bg-hub-fundo p-4">
            <dt className="text-[13.5px] text-hub-suave">{c.rotulo}</dt>
            <dd className="font-titulo text-[22px] font-bold tabular-nums">{c.valor}</dd>
            <dd className="text-[13px] text-hub-suave">{c.apoio}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Próximas entradas</h3>
        {r.proximas.length === 0 ? (
          <p className="text-[14px] text-hub-suave">Nenhuma cobrança com data pela frente.</p>
        ) : (
          <ul className="flex flex-col">
            {r.proximas.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-3 border-t border-hub-borda py-2.5 first:border-t-0"
              >
                <span className="w-12 shrink-0 font-rotulo text-[13px] tabular-nums text-hub-suave">
                  {diaMes(dataLocal(p.vencimento))}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{p.empresa}</span>
                  <span className="truncate text-[13px] text-hub-suave">{p.descricao}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{moeda(p.valor_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BlocoRelatorio>
  );
}
