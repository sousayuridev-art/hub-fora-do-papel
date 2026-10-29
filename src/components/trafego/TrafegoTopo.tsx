import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { Ajuda } from "@/components/trafego/Ajuda";
import { diaMes, moeda } from "@/lib/formatar";
import {
  comparadoCom,
  ritmoOrcamento,
  rotuloPlataforma,
  variacaoContatos,
  variacaoCusto,
  type PainelTrafego,
  type TendenciaTrafego,
  type Variacao,
} from "@/lib/trafego";
import { cn } from "@/lib/utils";
import { classeAcaoTexto } from "@/lib/estilos";

const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long" });
const corRitmo = {
  ok: "text-sit-ok-t",
  atencao: "text-sit-atencao-t",
  risco: "text-sit-risco-t",
  neutro: "text-hub-suave",
} as const;
const corVariacao: Record<Variacao["tom"], string> = {
  bom: "text-sit-ok-t",
  ruim: "text-sit-risco-t",
  neutro: "text-hub-suave",
};
const dm = (iso: string) => diaMes(`${iso}T12:00:00`);

function Apoio({ v, falhou }: { v: Variacao | null; falhou: boolean }) {
  if (!v && falhou) return <span className="text-hub-suave">Comparação indisponível</span>;
  if (!v) return <span className="inline-block h-4 w-28 animate-pulse rounded bg-[#ECECE6]" />;
  return <span className={corVariacao[v.tom]}>{v.texto}</span>;
}

/** Orçamento do mês com a marca do ritmo (sempre o mês atual, independente do período). */
function Orcamento({
  o,
  investidoPeriodo,
  periodoRotulo,
  aoAjustar,
}: {
  o: PainelTrafego["orcamento"];
  investidoPeriodo: number | null;
  periodoRotulo: string | null;
  aoAjustar: () => void;
}) {
  const r = ritmoOrcamento(o);
  const larg = (v: number) => (o.mensal_cents > 0 ? Math.min(100, (v / o.mensal_cents) * 100) : 0);
  const mes = nomeMes.format(new Date(`${o.mes}T12:00:00`));
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-hub-borda bg-white px-4 py-3.5 md:rounded-none md:border-0 md:px-6 md:py-4">
      <span className="flex items-center justify-between gap-2 text-[13px] text-hub-suave">
        <span className="flex items-center gap-1">
          Orçamento de {mes}
          <Ajuda sobre="o orçamento do mês">
            O orçamento é mensal, por isso esta faixa mostra sempre o mês atual. A marca escura é
            quanto do mês já passou (dia {o.dia} de {o.dias_no_mes}). Sobram {moeda(r.sobraCents)}{" "}
            para {r.diasRestantes} {r.diasRestantes === 1 ? "dia" : "dias"}, cerca de{" "}
            {moeda(r.porDiaCents)} por dia.
          </Ajuda>
        </span>
        <button type="button" onClick={aoAjustar} className={`${classeAcaoTexto} -my-2.5`}>
          Ajustar
        </button>
      </span>
      <p className="m-0 text-[22px] font-semibold tabular-nums leading-tight md:text-[24px]">
        {moeda(o.gasto_cents)}{" "}
        <span className="text-[14px] font-normal text-hub-suave">de {moeda(o.mensal_cents)}</span>
      </p>
      <span
        role="img"
        aria-label={`${r.pctGasto}% do orçamento usado; ${r.linha}% do mês já passou`}
        className="relative flex h-2 gap-0.5 rounded bg-[#EDEDE7]"
      >
        <span className="rounded-l bg-serie-1" style={{ width: `${larg(o.gasto_meta_cents)}%` }} />
        <span className="bg-serie-2" style={{ width: `${larg(o.gasto_google_cents)}%` }} />
        <span
          className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-hub-tinta"
          style={{ left: `${r.linha}%` }}
        />
      </span>
      <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] text-[#2A2D33]">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-serie-1" />
          {rotuloPlataforma.meta} {moeda(o.gasto_meta_cents)} de {moeda(o.meta_cents)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-serie-2" />
          Google {moeda(o.gasto_google_cents)} de {moeda(o.google_cents)}
        </span>
        <span className={cn("font-medium", corRitmo[r.tom])}>{r.texto}</span>
      </span>
      {periodoRotulo && investidoPeriodo != null && (
        <span className="text-[12.5px] text-hub-suave">
          Investido {periodoRotulo}:{" "}
          <b className="font-semibold text-hub-tinta">{moeda(investidoPeriodo)}</b>
        </span>
      )}
    </div>
  );
}

/** Topo de decisão (RD-6): orçamento do mês + 3 números com variação contra o período anterior. */
export function TrafegoTopo({
  p,
  t,
  tFalhou,
  aoAjustar,
}: {
  p: PainelTrafego;
  t: TendenciaTrafego | undefined;
  /** A comparação não carregou: os números aparecem, a variação não. */
  tFalhou: boolean;
  aoAjustar: () => void;
}) {
  const i = p.indicadores;
  const em = t ? comparadoCom(p.periodo.id, t.anterior.inicio) : "";
  const trecho = t
    ? `Comparação com o mesmo trecho do período anterior: ${dm(t.anterior.inicio)} a ${dm(t.anterior.fim)}.`
    : "";
  const periodoRotulo =
    p.periodo.id === "3meses" ? "em 3 meses" : p.periodo.id === "ano" ? "no ano" : null;

  return (
    <section
      aria-label="Orçamento e números do período"
      className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,3fr)] md:gap-0 md:overflow-hidden md:rounded-2xl md:border md:border-hub-borda md:bg-white"
    >
      <Orcamento
        o={p.orcamento}
        investidoPeriodo={i.investido_cents}
        periodoRotulo={periodoRotulo}
        aoAjustar={aoAjustar}
      />
      <FaixaNumeros
        className="md:rounded-none md:border-0 md:border-l md:border-[#ECECE6]"
        itens={[
          {
            rotulo: "Contatos de anúncio",
            ajuda: (
              <Ajuda sobre="contatos de anúncio">
                Contatos com origem Anúncio ({rotuloPlataforma.meta} ou Google), contados no dia em
                que chegaram, inclusive os arquivados. {trecho}
              </Ajuda>
            ),
            valor: i.contatos,
            apoio: (
              <Apoio falhou={tFalhou} v={t ? variacaoContatos(t.variacao.contatos, em) : null} />
            ),
          },
          {
            rotulo: "Custo por contato",
            ajuda: (
              <Ajuda sobre="custo por contato">
                Investido no período dividido pelos contatos de anúncio do período. Menor é melhor.{" "}
                {trecho}
              </Ajuda>
            ),
            valor: moeda(i.custo_contato_cents),
            apoio: (
              <Apoio
                falhou={tFalhou}
                v={
                  t
                    ? variacaoCusto(
                        i.custo_contato_cents,
                        t.variacao.custo_contato_cents,
                        em,
                        moeda,
                      )
                    : null
                }
              />
            ),
          },
          {
            rotulo: "Custo por diagnóstico vendido",
            ajuda: (
              <Ajuda sobre="custo por diagnóstico vendido">
                Investido no período dividido pelos diagnósticos pagos por contatos de anúncio.{" "}
                {i.diagnosticos === 0
                  ? "Nenhum diagnóstico pago vindo de anúncio no período."
                  : `${i.diagnosticos} ${i.diagnosticos === 1 ? "diagnóstico vendido" : "diagnósticos vendidos"}, ${moeda(i.receita_diagnosticos_cents)}.`}{" "}
                {trecho}
              </Ajuda>
            ),
            valor: moeda(i.custo_diagnostico_cents),
            apoio: (
              <Apoio
                falhou={tFalhou}
                v={
                  t
                    ? variacaoCusto(
                        i.custo_diagnostico_cents,
                        t.variacao.custo_diagnostico_cents,
                        em,
                        moeda,
                      )
                    : null
                }
              />
            ),
          },
        ]}
      />
    </section>
  );
}
