import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { Simbolo } from "@/components/layout/Marca";
import { useAccess } from "@/hooks/useAccess";
import { exigirAcesso } from "@/lib/acesso";
import { chavesFinanceiro, lerRecibo, rotuloForma } from "@/lib/financeiro";
import { dataLocal, moeda } from "@/lib/formatar";
import { mensagemDeErro } from "@/lib/notify";

/** Recibo imprimível (card S4). O banco só devolve para o dono ou para alguém da empresa do cliente. */
export const Route = createFileRoute("/recibo/$id")({
  ssr: false,
  beforeLoad: ({ context, location }) => exigirAcesso(context.queryClient, location.href),
  head: () => ({ meta: [{ title: "Recibo · Fora do Papel" }] }),
  pendingComponent: () => <TelaCarregando />,
  component: Recibo,
});

function Recibo() {
  const { id } = Route.useParams();
  const { acesso } = useAccess();
  const q = useQuery({ queryKey: chavesFinanceiro.recibo(id), queryFn: () => lerRecibo(id) });
  const voltar = acesso?.papel === "client" ? "/portal/pagamentos" : "/app/financeiro";

  if (q.isPending) return <TelaCarregando />;
  if (q.isError)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-hub-fundo p-6 text-center">
        <p className="text-[15px]">
          {/recibo_inexistente/.test(String((q.error as { message?: string }).message))
            ? "Recibo não encontrado."
            : mensagemDeErro(q.error)}
        </p>
        <Link to={voltar} className="inline-flex min-h-11 items-center font-medium underline">
          Voltar
        </Link>
      </main>
    );
  const r = q.data;
  const data = dataLocal(r.pago_em).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <main className="min-h-dvh bg-hub-fundo px-4 py-8 text-hub-tinta print:bg-white print:p-0">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between print:hidden">
          <Link
            to={voltar}
            className="inline-flex min-h-11 items-center text-[15px] font-medium underline"
          >
            Voltar
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white"
          >
            <Printer className="size-4" aria-hidden="true" /> Imprimir ou salvar em PDF
          </button>
        </div>
        <article className="flex flex-col gap-8 rounded-3xl border border-hub-borda bg-white p-6 md:p-10 print:border-0">
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Simbolo tamanho={36} />
              <span className="font-marca text-xl font-semibold">{r.agencia}</span>
            </div>
            <span className="text-right font-rotulo text-[13px] uppercase tracking-[0.1em] text-hub-suave">
              Recibo nº {r.numero}
            </span>
          </header>
          <h1 className="font-titulo text-[26px] font-bold leading-snug md:text-[32px]">
            Recebemos {moeda(r.valor_cents)}
          </h1>
          <p className="text-[16px] leading-relaxed">
            Recebemos de <strong>{r.cliente}</strong>
            {r.documento ? ` (${r.documento})` : ""} a quantia de{" "}
            <strong>{moeda(r.valor_cents)}</strong>, referente a <strong>{r.descricao}</strong>,
            paga por {rotuloForma[r.forma].toLowerCase()} em {data}.
          </p>
          <dl className="grid gap-3 rounded-2xl bg-hub-fundo p-5 text-[15px] sm:grid-cols-3 print:bg-white">
            <div>
              <dt className="text-hub-suave">Valor</dt>
              <dd className="font-semibold tabular-nums">{moeda(r.valor_cents)}</dd>
            </div>
            <div>
              <dt className="text-hub-suave">Data</dt>
              <dd className="font-semibold">{data}</dd>
            </div>
            <div>
              <dt className="text-hub-suave">Forma</dt>
              <dd className="font-semibold">{rotuloForma[r.forma]}</dd>
            </div>
          </dl>
          <footer className="flex flex-col gap-1 border-t border-hub-borda pt-6 text-[14px] text-hub-suave">
            <span className="font-semibold text-hub-tinta">{r.responsavel ?? r.agencia}</span>
            <span>{r.agencia}</span>
            <span>Este recibo não substitui nota fiscal.</span>
          </footer>
        </article>
      </div>
    </main>
  );
}
