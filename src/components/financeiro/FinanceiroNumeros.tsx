import { FaixaNumeros, type ItemNumero } from "@/components/hub/FaixaNumeros";
import { dataLocal, moeda, moedaComSinal } from "@/lib/formatar";
import type { GraficosFinanceiro, PainelFinanceiro } from "@/lib/financeiro";

/**
 * Os 4 números do topo (card RD-3), todos calculados no banco. "Em atraso" pinta só a própria
 * célula; clicar em atraso ou a receber filtra a lista de cobranças.
 */
export function FinanceiroNumeros({
  n,
  hoje,
  resultado,
  filtro,
  aoFiltrar,
}: {
  n: PainelFinanceiro["numeros"];
  hoje: string;
  /** Vem da RPC dos gráficos; enquanto carrega, mostra um traço. */
  resultado: GraficosFinanceiro["resultado_mes"] | undefined;
  filtro: "atrasadas" | "todas";
  aoFiltrar: (f: "atrasadas" | "todas") => void;
}) {
  const mes = dataLocal(hoje).toLocaleDateString("pt-BR", { month: "long" });
  const itens: ItemNumero[] = [
    {
      rotulo: "Em atraso",
      valor: moeda(n.em_atraso_cents),
      apoio:
        n.em_atraso === 0
          ? "Nada atrasado"
          : `${n.em_atraso} ${n.em_atraso === 1 ? "cobrança" : "cobranças"}`,
      tom: n.em_atraso > 0 ? "risco" : undefined,
      aoClicar: () => aoFiltrar(filtro === "atrasadas" ? "todas" : "atrasadas"),
      ativo: filtro === "atrasadas",
    },
    {
      rotulo: "A receber em 30 dias",
      valor: moeda(n.a_receber_30_cents),
      apoio: n.sem_data_cents > 0 ? `+ ${moeda(n.sem_data_cents)} sem data` : "Pelo vencimento",
      aoClicar: () => aoFiltrar("todas"),
    },
    {
      rotulo: `Recebido em ${mes}`,
      valor: moeda(n.recebido_mes_cents),
      apoio: `${n.recebidos_mes} ${n.recebidos_mes === 1 ? "pagamento" : "pagamentos"}`,
    },
    {
      rotulo: `Resultado de ${mes}`,
      valor: resultado ? (
        <span className={resultado.resultado_cents < 0 ? "text-sit-risco-t" : "text-sit-ok-t"}>
          {moedaComSinal(resultado.resultado_cents)}
        </span>
      ) : (
        "—"
      ),
      apoio: resultado
        ? `recebido menos ${moeda(resultado.despesas_cents)} de despesas`
        : "Calculando…",
    },
  ];
  return <FaixaNumeros itens={itens} />;
}
