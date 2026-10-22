import { QuadroTarefas } from "@/components/tarefas/QuadroTarefas";
import type { SituacaoTarefa } from "@/lib/projetos";
import { origemDaTarefa, type ResumoTarefas, type TarefaVista } from "@/lib/tarefas";

function Numero({ n, texto, risco = false }: { n: number; texto: string; risco?: boolean }) {
  return (
    <span className="whitespace-nowrap text-[14.5px] text-[#4A4D54]">
      <b className={risco && n > 0 ? "text-sit-risco-t" : "text-hub-tinta"}>{n}</b> {texto}
    </span>
  );
}

/**
 * Kanban da Central (TA-3): as mesmas 4 colunas do projeto; cartão com cliente › projeto.
 * Ciclo não vira coluna: aparece como detalhe no cartão. Pronto mostra só os últimos 7 dias.
 */
export function KanbanTarefas({
  itens,
  hoje,
  resumo,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  itens: TarefaVista[];
  hoje: string;
  resumo: ResumoTarefas | undefined;
  aoAbrir: (t: TarefaVista) => void;
  aoMover: (t: TarefaVista, s: SituacaoTarefa) => void;
  aoRemover: (t: TarefaVista) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {resumo && (
        <p className="flex flex-wrap gap-x-6 gap-y-1" aria-label="Resumo">
          <Numero
            n={resumo.atrasadas}
            texto={resumo.atrasadas === 1 ? "atrasada" : "atrasadas"}
            risco
          />
          <Numero n={resumo.para_hoje} texto="para hoje" />
          <Numero n={resumo.fazendo} texto="em andamento" />
          <Numero
            n={resumo.prontas_semana}
            texto={resumo.prontas_semana === 1 ? "pronta na semana" : "prontas na semana"}
          />
        </p>
      )}
      <QuadroTarefas
        tarefas={itens}
        hoje={hoje}
        descricaoPronto="Concluídas nos últimos 7 dias"
        topo={origemDaTarefa}
        extra={(t) => t.pedido?.codigo ?? (t.projeto ? `ciclo ${t.cycle}` : null)}
        aoAbrir={aoAbrir}
        aoMover={aoMover}
        aoRemover={aoRemover}
      />
    </div>
  );
}
