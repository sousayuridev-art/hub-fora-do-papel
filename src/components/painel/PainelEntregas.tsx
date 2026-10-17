import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { chavesEntregas, entregasDoPainel } from "@/lib/painel";

/** Entregas que pedem atenção: lançamento atrasado, horas, aprovação parada, ajuste pedido. */
export function PainelEntregas() {
  const q = useQuery({ queryKey: chavesEntregas, queryFn: entregasDoPainel });
  if (q.isPending)
    return <div className="h-24 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  if (q.isError)
    return (
      <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[14.5px] text-sit-risco-t">
        Não foi possível carregar as entregas.{" "}
        <button
          type="button"
          className="min-h-11 font-medium underline"
          onClick={() => void q.refetch()}
        >
          Tentar de novo
        </button>
      </p>
    );
  return (
    <section aria-labelledby="entregas-t" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="entregas-t" className="font-titulo text-xl font-bold">
          Entregas que pedem atenção
        </h2>
        <Link
          to="/app/projetos"
          className="inline-flex min-h-11 items-center gap-1 text-[14.5px] font-medium text-[#1E3FA8]"
        >
          Ver projetos <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {q.data.length === 0 ? (
        <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
          Todas as entregas em dia.
        </p>
      ) : (
        <ul className="flex flex-col rounded-2xl border border-hub-borda bg-white">
          {q.data.map((e) => (
            <li key={e.id} className="border-b border-hub-borda last:border-b-0">
              <Link
                to="/app/projetos/$id"
                params={{ id: e.id }}
                className="flex min-h-14 flex-col gap-1.5 px-5 py-3.5 hover:bg-hub-fundo sm:flex-row sm:items-start sm:gap-4"
              >
                <span className="shrink-0 sm:w-28">
                  <Selo tom={e.saude.nivel === "risco" ? "risco" : "atencao"}>
                    {e.saude.nivel === "risco" ? "Em risco" : "Atenção"}
                  </Selo>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">
                    {e.empresa} · {e.nome}
                  </span>
                  <span className="text-[14px] text-hub-suave">
                    {e.saude.motivos.map((m) => m.texto).join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
