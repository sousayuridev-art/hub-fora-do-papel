import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { chavesFinanceiro, financeiroDoCliente } from "@/lib/financeiro";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";

/** Resumo do financeiro na ficha: pago, a receber, em atraso e próxima cobrança. */
export function ClienteFinanceiro({ clienteId }: { clienteId: string }) {
  const q = useQuery({
    queryKey: chavesFinanceiro.cliente(clienteId),
    queryFn: () => financeiroDoCliente(clienteId),
  });
  if (q.isPending)
    return <div className="h-32 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  if (q.isError)
    return (
      <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[14px] text-sit-risco-t">
        Não foi possível carregar o financeiro.{" "}
        <button type="button" className="min-h-11 underline" onClick={() => void q.refetch()}>
          Tentar de novo
        </button>
      </p>
    );
  const f = q.data;
  if (f.pago_cents === 0 && f.a_receber_cents === 0 && f.mensalidade_cents === 0) return null;
  return (
    <section
      aria-labelledby="fin-cliente-t"
      className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <h2 id="fin-cliente-t" className="font-titulo text-lg font-bold">
        Financeiro
      </h2>
      <dl className="grid grid-cols-2 gap-3 text-[14.5px]">
        <div>
          <dt className="text-hub-suave">Pago</dt>
          <dd className="font-semibold tabular-nums">{moeda(f.pago_cents)}</dd>
        </div>
        <div>
          <dt className="text-hub-suave">A receber</dt>
          <dd className="font-semibold tabular-nums">{moeda(f.a_receber_cents)}</dd>
        </div>
        {f.em_atraso_cents > 0 && (
          <div className="col-span-2 text-sit-risco-t">
            <dt>Em atraso</dt>
            <dd className="font-semibold tabular-nums">{moeda(f.em_atraso_cents)}</dd>
          </div>
        )}
        {f.mensalidade_cents > 0 && (
          <div className="col-span-2">
            <dt className="text-hub-suave">Mensalidade</dt>
            <dd className="font-semibold tabular-nums">{moeda(f.mensalidade_cents)}/mês</dd>
          </div>
        )}
      </dl>
      {f.proxima && (
        <p className="text-[14px] text-hub-suave">
          Próxima: {f.proxima.descricao}, {moeda(f.proxima.valor_cents)} em{" "}
          {diaMes(dataLocal(f.proxima.vencimento))}.
        </p>
      )}
      <Link
        to="/app/financeiro"
        search={{ cliente: clienteId }}
        className="inline-flex min-h-11 items-center self-start text-[14.5px] font-medium text-[#1E3FA8] underline"
      >
        Abrir o financeiro
      </Link>
    </section>
  );
}
