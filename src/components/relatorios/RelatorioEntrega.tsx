import { Link } from "@tanstack/react-router";

import { Selo } from "@/components/hub/Selo";
import { BlocoRelatorio } from "@/components/relatorios/BlocoRelatorio";
import { moeda } from "@/lib/formatar";
import { plural, type Relatorio } from "@/lib/relatorios";

/** Entrega: tempo de aprovação do cliente, pedidos, serviços adicionais e horas da mensalidade. */
export function RelatorioEntrega({ e }: { e: Relatorio["entrega"] }) {
  return (
    <BlocoRelatorio
      id="entrega"
      titulo="Entrega"
      resumo={
        e.aprovacao_media_dias === null
          ? `Nenhuma aprovação respondida no período. ${plural(e.aprovacoes_abertas.length, "aprovação aberta", "aprovações abertas")}.`
          : `Os clientes responderam ${plural(e.aprovacoes_decididas, "aprovação", "aprovações")} em ${e.aprovacao_media_dias.toLocaleString("pt-BR")} dias, em média.${
              e.ajustes_pct !== null ? ` ${e.ajustes_pct}% pediram ajuste.` : ""
            }`
      }
    >
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
        <div className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold">Aprovações abertas</h3>
          {e.aprovacoes_abertas.length === 0 ? (
            <p className="text-[14px] text-hub-suave">Nada esperando o cliente.</p>
          ) : (
            <ul className="flex flex-col">
              {e.aprovacoes_abertas.map((a, i) => (
                <li key={i} className="border-t border-hub-borda first:border-t-0">
                  <Link
                    to="/app/projetos/$id"
                    params={{ id: a.project_id }}
                    className="flex min-h-12 items-center gap-3 py-2 hover:bg-hub-fundo"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{a.titulo}</span>
                      <span className="text-[13px] text-hub-suave">{a.empresa}</span>
                    </span>
                    <Selo tom={a.dias >= 3 ? "atencao" : "neutro"}>
                      {a.dias === 0 ? "Hoje" : `${a.dias} ${a.dias === 1 ? "dia" : "dias"}`}
                    </Selo>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-[15px] font-semibold">Pedidos no período: {e.pedidos.total}</h3>
            <dl className="grid grid-cols-2 gap-2 text-[14px] sm:grid-cols-4 xl:grid-cols-2">
              {(
                [
                  ["Dentro do combinado", e.pedidos.escopo],
                  ["Mensalidade", e.pedidos.mensalidade],
                  ["Serviço adicional", e.pedidos.adicional],
                  ["A classificar", e.pedidos.sem_classificacao],
                ] as const
              ).map(([r, n]) => (
                <div key={r} className="rounded-xl bg-hub-fundo p-3">
                  <dt className="text-[13px] text-hub-suave">{r}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{n}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[14px] text-hub-suave">
              Serviços adicionais aprovados: {e.adicionais_aprovados.quantidade}, somando{" "}
              {moeda(e.adicionais_aprovados.valor_cents)}.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-[15px] font-semibold">Horas da mensalidade neste mês</h3>
            {e.mensalidade_horas.length === 0 ? (
              <p className="text-[14px] text-hub-suave">Nenhuma mensalidade ativa.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {e.mensalidade_horas.map((x) => {
                  const pct = x.horas_plano
                    ? Math.round((x.horas_usadas / x.horas_plano) * 100)
                    : null;
                  return (
                    <li key={x.empresa + x.plano} className="flex flex-col gap-1 text-[14px]">
                      <span className="flex justify-between gap-2">
                        <span>
                          {x.empresa} · {x.plano}
                        </span>
                        <span
                          className={`tabular-nums ${pct !== null && pct > 100 ? "font-semibold text-sit-risco-t" : ""}`}
                        >
                          {x.horas_usadas.toLocaleString("pt-BR")} h
                          {x.horas_plano ? ` de ${x.horas_plano.toLocaleString("pt-BR")} h` : ""}
                        </span>
                      </span>
                      {pct !== null && (
                        <span aria-hidden="true" className="h-1.5 rounded-full bg-[#E6E6E0]">
                          <span
                            className={`block h-full rounded-full ${pct > 100 ? "bg-[#9A1C12]" : "bg-hub-tinta"}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[13px] text-hub-suave">
              Conta as horas estimadas dos pedidos classificados como mensalidade.
            </p>
          </div>
        </div>
      </div>
    </BlocoRelatorio>
  );
}
