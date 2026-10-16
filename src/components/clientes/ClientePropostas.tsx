import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Selo, type Tom } from "@/components/hub/Selo";
import { diaMes, moeda } from "@/lib/formatar";
import { supabase } from "@/lib/supabase";
import type { PropostaLinha } from "@/lib/propostas";

const situacoes: Record<PropostaLinha["situacao"], { texto: string; tom: Tom }> = {
  rascunho: { texto: "Rascunho", tom: "neutro" },
  enviada: { texto: "Enviada", tom: "info" },
  vencida: { texto: "Vencida", tom: "risco" },
  aceita: { texto: "Aceita", tom: "ok" },
  recusada: { texto: "Recusada", tom: "risco" },
};

/** Propostas desta ficha (todas as versões e situações), com atalho para o editor. */
export function ClientePropostas({ clienteId }: { clienteId: string }) {
  const lista = useQuery({
    queryKey: ["propostas", "do-cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_propostas")
        .select("*")
        .eq("client_id", clienteId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PropostaLinha[];
    },
  });
  return (
    <section
      aria-labelledby="propostas-cliente-t"
      className="rounded-2xl border border-hub-borda bg-white"
    >
      <h2 id="propostas-cliente-t" className="px-5 pt-4 font-titulo text-lg font-bold">
        Propostas
      </h2>
      {lista.isPending ? (
        <div className="m-5 h-16 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : lista.isError ? (
        <p className="px-5 py-4 text-[14.5px] text-sit-risco-t">
          Não foi possível carregar as propostas.{" "}
          <button
            type="button"
            className="min-h-11 font-medium underline"
            onClick={() => void lista.refetch()}
          >
            Tentar de novo
          </button>
        </p>
      ) : lista.data.length === 0 ? (
        <p className="px-5 pb-5 pt-2 text-[14.5px] text-hub-suave">
          Nenhuma proposta ainda. Use "Proposta" na oportunidade para criar.
        </p>
      ) : (
        <ul className="mt-2">
          {lista.data.map((p) => {
            const s = situacoes[p.situacao];
            const quando = p.accepted_at ?? p.sent_at ?? p.created_at;
            return (
              <li key={p.id} className="border-t border-hub-borda">
                <Link
                  to="/app/propostas"
                  search={{ id: p.id }}
                  className="flex min-h-14 items-center gap-3 px-5 py-3 hover:bg-hub-fundo"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {p.title || p.project_type || "Proposta sem título"}
                    </span>
                    <span className="text-[13px] text-hub-suave">
                      Versão {p.version} · {diaMes(quando)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">{moeda(p.total_cents)}</span>
                    <Selo tom={s.tom}>{s.texto}</Selo>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
