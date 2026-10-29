import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { TarefaLinha } from "@/components/tarefas/TarefaLinha";
import { naoRemovida, useMutacoesTarefa } from "@/components/tarefas/useMutacoesTarefa";
import { chavesTarefas, listarTarefas, type TarefaVista } from "@/lib/tarefas";
import { classeAcaoTexto } from "@/lib/estilos";

/** Quantas tarefas o bloco mostra antes de mandar para a Central. */
const LIMITE = 6;

/**
 * Painel inicial (TA-4): tarefas atrasadas e de hoje, com atalho para a Central já filtrada.
 * Usa as mesmas chaves de cache da Central (mudou lá, muda aqui).
 */
export function PainelTarefas() {
  const atrasadas = useQuery({
    queryKey: chavesTarefas.lista({ prazo: "atrasadas" }),
    queryFn: () => listarTarefas({ prazo: "atrasadas" }),
  });
  const deHoje = useQuery({
    queryKey: chavesTarefas.lista({ prazo: "hoje" }),
    queryFn: () => listarTarefas({ prazo: "hoje" }),
  });
  const m = useMutacoesTarefa();
  const irPara = useNavigate();

  if (atrasadas.isError || deHoje.isError) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar as tarefas"
        aoTentarDeNovo={() => {
          void atrasadas.refetch();
          void deHoje.refetch();
        }}
      />
    );
  }
  if (!atrasadas.data || !deHoje.data) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  }

  const hoje = deHoje.data.hoje;
  const nAtrasadas = atrasadas.data.itens.filter(naoRemovida).length;
  const itens: TarefaVista[] = [...atrasadas.data.itens, ...deHoje.data.itens].filter(naoRemovida);
  const visiveis = itens.slice(0, LIMITE);

  return (
    <section aria-labelledby="painel-tarefas-t" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="painel-tarefas-t" className="font-titulo text-xl font-bold">
          Tarefas atrasadas e de hoje
        </h2>
        <Link
          to="/app/tarefas"
          search={{ prazo: nAtrasadas > 0 ? "atrasadas" : "hoje" }}
          className={`${classeAcaoTexto} shrink-0 gap-1`}
        >
          Abrir a Central <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {itens.length === 0 ? (
        <p className="rounded-2xl border border-hub-borda bg-white p-6 text-[15px] text-hub-suave">
          Nenhuma tarefa atrasada ou para hoje.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
          <ul className="divide-y divide-[#F0F0EA]">
            {visiveis.map((t) => (
              <li key={t.id}>
                <TarefaLinha
                  t={t}
                  hoje={hoje}
                  aoAbrir={() => void irPara({ to: "/app/tarefas", search: { tarefa: t.id } })}
                  aoConcluir={() => m.alternarPronta(t)}
                />
              </li>
            ))}
          </ul>
          {itens.length > LIMITE && (
            <Link
              to="/app/tarefas"
              search={{ prazo: nAtrasadas > 0 ? "atrasadas" : "hoje" }}
              className="flex min-h-12 items-center border-t border-hub-borda bg-[#FAFAF7] px-5 text-[14px] text-[#4A4D54] hover:text-hub-tinta"
            >
              Mais {itens.length - LIMITE} na Central
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
