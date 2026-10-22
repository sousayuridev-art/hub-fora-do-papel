import { GraficoBarras, Legenda } from "@/components/hub/Graficos";
import { listrado } from "@/lib/estilos";
import { BlocoRelatorio } from "@/components/relatorios/BlocoRelatorio";
import { mesCurto, valorCurto } from "@/lib/financeiro";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { plural, type Relatorio, type ResumoRelatorio } from "@/lib/relatorios";

const cor = "var(--color-serie-1)";

/** Receita (card RD-8): recebido em 6 meses e previsto em 2 (listrado), cartões e próximas entradas. */
export function RelatorioReceita({
  r,
  meses,
}: {
  r: Relatorio["receita"];
  /** Receita mês a mês (relatorios_resumo); enquanto carrega, o gráfico fica de fora. */
  meses: ResumoRelatorio["receita_meses"] | undefined;
}) {
  const cartoes = [
    {
      rotulo: "Implantação fechada",
      valor: moeda(r.fechado_cents),
      apoio: plural(r.fechados, "proposta aceita", "propostas aceitas"),
    },
    {
      rotulo: "Diagnósticos pagos",
      valor: moeda(r.diagnosticos_cents),
      apoio: plural(r.diagnosticos, "diagnóstico", "diagnósticos"),
    },
    {
      rotulo: "Recebido no período",
      valor: moeda(r.recebido_cents),
      apoio: "Pagamentos registrados",
    },
    {
      rotulo: "Mensalidades por mês",
      valor: moeda(r.mrr_cents),
      apoio: `${plural(r.mensalidades_ativas, "ativa", "ativas")} · ${moeda(r.mrr_cents * 12)} por ano${
        r.churn_pct !== null ? ` · ${r.churn_pct.toLocaleString("pt-BR")}% encerradas` : ""
      }`,
    },
  ];
  const previstas = (meses ?? []).flatMap((m, i) => (m.tipo === "previsto" ? [i] : []));
  return (
    <BlocoRelatorio
      id="receita"
      titulo="Receita"
      resumo={`${moeda(r.a_receber_30_cents)} chegam nos próximos 30 dias${
        r.em_atraso_cents > 0 ? `, e ${moeda(r.em_atraso_cents)} estão em atraso` : ""
      }. ${plural(r.mensalidades_novas, "mensalidade começou", "mensalidades começaram")} e ${plural(
        r.mensalidades_encerradas,
        "foi encerrada",
        "foram encerradas",
      )} no período.`}
      extra={
        <Legenda
          series={[
            { nome: "Recebido", cor },
            { nome: "Previsto", cor: listrado(cor) },
          ]}
        />
      }
    >
      {meses && meses.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-hub-suave">
            6 meses recebidos e 2 previstos pelas cobranças com data e mensalidades ativas
          </p>
          <GraficoBarras
            rotulo="Receita por mês: recebido nos últimos 6 meses e previsto nos próximos 2"
            categorias={meses.map((m) => mesCurto(m.mes, false))}
            series={[{ nome: "Receita", cor, valores: meses.map((m) => m.valor_cents) }]}
            previstas={previstas}
            formatar={moeda}
            formatarEixo={valorCurto}
            altura={170}
            rodape={(i) => {
              const m = meses[i];
              if (!m) return null;
              return (
                <>
                  <b className="font-semibold leading-tight tabular-nums">
                    {valorCurto(m.valor_cents)}
                  </b>
                  {m.tipo === "atual" && (
                    <span className="leading-tight text-hub-suave">até hoje</span>
                  )}
                </>
              );
            }}
          />
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cartoes.map((c) => (
          <div
            key={c.rotulo}
            className="flex min-w-0 flex-col gap-1 rounded-xl bg-hub-fundo p-3 md:p-4"
          >
            <dt className="text-[13.5px] text-hub-suave">{c.rotulo}</dt>
            <dd className="text-[19px] font-semibold tabular-nums md:text-[22px]">{c.valor}</dd>
            <dd className="text-[13px] text-hub-suave">{c.apoio}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold">Próximas entradas</h3>
        {r.proximas.length === 0 ? (
          <p className="text-[14px] text-hub-suave">Nenhuma cobrança com data pela frente.</p>
        ) : (
          <ul className="flex flex-col">
            {r.proximas.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-3 border-t border-hub-borda py-2.5 first:border-t-0"
              >
                <span className="w-12 shrink-0 text-[13px] tabular-nums text-hub-suave">
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
