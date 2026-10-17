import { moeda } from "@/lib/formatar";
import type { PainelFinanceiro } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

/** Os 5 números do topo (todos calculados no banco). */
export function FinanceiroNumeros({ n }: { n: PainelFinanceiro["numeros"] }) {
  const itens = [
    {
      rotulo: "A receber em 30 dias",
      valor: moeda(n.a_receber_30_cents),
      apoio: n.sem_data_cents > 0 ? `+ ${moeda(n.sem_data_cents)} sem data` : "Pelo vencimento",
      destaque: false,
    },
    {
      rotulo: "Em atraso",
      valor: moeda(n.em_atraso_cents),
      apoio:
        n.em_atraso === 0
          ? "Nada atrasado"
          : `${n.em_atraso} ${n.em_atraso === 1 ? "cobrança" : "cobranças"}`,
      destaque: n.em_atraso > 0,
    },
    {
      rotulo: "Recebido no mês",
      valor: moeda(n.recebido_mes_cents),
      apoio: `${n.recebidos_mes} ${n.recebidos_mes === 1 ? "pagamento" : "pagamentos"}`,
      destaque: false,
    },
    {
      rotulo: "Mensalidades por mês",
      valor: moeda(n.mrr_cents),
      apoio: `${n.mensalidades_ativas} ${n.mensalidades_ativas === 1 ? "ativa" : "ativas"} · ${moeda(n.mrr_cents * 12)} por ano`,
      destaque: false,
    },
    {
      rotulo: "Despesas do mês",
      valor: moeda(n.despesas_mes_cents),
      apoio: "Fixas, avulsas e anúncios",
      destaque: false,
    },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {itens.map((i) => (
        <div
          key={i.rotulo}
          className={cn(
            "flex flex-col gap-1 rounded-2xl border bg-white p-5",
            i.destaque ? "border-[#F4C7C2]" : "border-hub-borda",
          )}
        >
          <dt className="text-[14px] text-hub-suave">{i.rotulo}</dt>
          <dd
            className={cn(
              "font-titulo text-[26px] font-bold tabular-nums",
              i.destaque && "text-sit-risco-t",
            )}
          >
            {i.valor}
          </dd>
          <dd className="text-[13.5px] text-hub-suave">{i.apoio}</dd>
        </div>
      ))}
    </dl>
  );
}
