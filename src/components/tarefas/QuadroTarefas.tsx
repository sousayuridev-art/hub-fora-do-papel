import { useState, type ReactNode } from "react";

import { ColunaQuadro, Quadro } from "@/components/hub/Quadro";
import { corColuna } from "@/lib/estilos";
import { TarefaCartao } from "@/components/projetos/TarefaCartao";
import type { SituacaoTarefa, Tarefa } from "@/lib/projetos";
import { rotuloSituacao } from "@/lib/tarefas";

const colunas: { id: SituacaoTarefa; descricao: string; cor: string }[] = [
  { id: "a_fazer", descricao: "Ainda não começadas", cor: corColuna.neutro },
  { id: "fazendo", descricao: "Em execução agora", cor: corColuna.info },
  { id: "para_aprovar", descricao: "Esperando aprovação", cor: corColuna.atencao },
  { id: "pronto", descricao: "Concluídas", cor: corColuna.ok },
];

/** Quantas prontas aparecem antes de "Mostrar as N". */
const PRONTAS_VISIVEIS = 0;

/**
 * As 4 colunas de tarefas (A fazer, Fazendo, Para aprovar, Pronto) no formato Quadro/ColunaQuadro.
 * Usado no projeto (um ciclo) e no Kanban da Central. "Pronto" fica recolhido.
 */
export function QuadroTarefas<T extends Tarefa>({
  tarefas,
  hoje,
  descricaoPronto,
  topo,
  extra,
  rodapeAFazer,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  tarefas: T[];
  hoje: string;
  descricaoPronto: string;
  topo: (t: T) => string;
  extra?: (t: T) => string | null;
  rodapeAFazer?: ReactNode;
  aoAbrir: (t: T) => void;
  aoMover: (t: T, s: SituacaoTarefa) => void;
  aoRemover: (t: T) => void;
}) {
  const [verProntas, setVerProntas] = useState(false);
  return (
    <Quadro>
      {colunas.map((c, n) => {
        const daColuna = tarefas.filter((t) => t.status === c.id);
        const recolhida = c.id === "pronto" && !verProntas && daColuna.length > PRONTAS_VISIVEIS;
        const visiveis = recolhida ? daColuna.slice(0, PRONTAS_VISIVEIS) : daColuna;
        return (
          <ColunaQuadro
            key={c.id}
            primeira={n === 0}
            titulo={rotuloSituacao[c.id]}
            descricao={c.id === "pronto" ? descricaoPronto : c.descricao}
            total={daColuna.length}
            cor={c.cor}
            vazia={daColuna.length === 0}
            rodape={
              c.id === "pronto" && daColuna.length > PRONTAS_VISIVEIS ? (
                <button
                  type="button"
                  onClick={() => setVerProntas((v) => !v)}
                  aria-expanded={verProntas}
                  className="inline-flex min-h-11 items-center self-start px-0.5 text-[14px] font-medium text-[#1E3FA8] underline-offset-2 hover:underline"
                >
                  {verProntas
                    ? "Recolher"
                    : `Mostrar ${daColuna.length === 1 ? "a pronta" : `as ${daColuna.length}`}`}
                </button>
              ) : c.id === "a_fazer" ? (
                rodapeAFazer
              ) : undefined
            }
          >
            {visiveis.length > 0 && (
              <ul className="flex flex-col gap-2">
                {visiveis.map((t) => (
                  <TarefaCartao
                    key={t.id}
                    t={t}
                    hoje={hoje}
                    topo={topo(t)}
                    extra={extra?.(t) ?? null}
                    aoAbrir={() => aoAbrir(t)}
                    aoMover={(s) => aoMover(t, s)}
                    aoRemover={() => aoRemover(t)}
                  />
                ))}
              </ul>
            )}
          </ColunaQuadro>
        );
      })}
    </Quadro>
  );
}
