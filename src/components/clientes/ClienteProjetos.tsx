import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Selo } from "@/components/hub/Selo";
import { dataLocal, diaMes } from "@/lib/formatar";
import { chavesProjetos, projetosDoCliente, rotuloProjeto } from "@/lib/projetos";

/** Projetos desta ficha. Some quando o cliente ainda não tem projeto. */
export function ClienteProjetos({ clienteId }: { clienteId: string }) {
  const q = useQuery({
    queryKey: chavesProjetos.doCliente(clienteId),
    queryFn: () => projetosDoCliente(clienteId),
  });
  if (q.isPending || (q.data && q.data.length === 0)) return null;
  return (
    <section
      aria-labelledby="projetos-cliente-t"
      className="rounded-2xl border border-hub-borda bg-white"
    >
      <h2 id="projetos-cliente-t" className="px-5 pt-4 font-titulo text-lg font-bold">
        Projetos
      </h2>
      {q.isError ? (
        <p className="px-5 py-4 text-[14.5px] text-sit-risco-t">
          Não foi possível carregar os projetos.{" "}
          <button
            type="button"
            className="min-h-11 font-medium underline"
            onClick={() => void q.refetch()}
          >
            Tentar de novo
          </button>
        </p>
      ) : (
        <ul className="mt-2">
          {q.data.map((p) => (
            <li key={p.id} className="border-t border-hub-borda">
              <Link
                to="/app/projetos/$id"
                params={{ id: p.id }}
                className="flex min-h-14 items-center justify-between gap-3 px-5 py-3 hover:bg-hub-fundo"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="text-[13px] text-hub-suave">
                    {p.launched_at
                      ? `Lançado em ${diaMes(p.launched_at)}`
                      : p.launch_date
                        ? `Lançamento ${diaMes(dataLocal(p.launch_date))}`
                        : "Sem data de lançamento"}
                  </span>
                </span>
                <Selo tom={p.status === "andamento" ? "info" : "ok"}>
                  {rotuloProjeto[p.status]}
                </Selo>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
