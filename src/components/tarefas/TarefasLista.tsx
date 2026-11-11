import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { TarefaLinha } from "@/components/tarefas/TarefaLinha";
import { gradeListaTarefas } from "@/lib/estilos";
import {
  agruparPorPrazo,
  estaAtrasada,
  linhasDaLista,
  opcoesDeAdiar,
  type GrupoPrazo,
  type TarefaVista,
} from "@/lib/tarefas";
import { cn } from "@/lib/utils";

const corGrupo: Partial<Record<GrupoPrazo, string>> = {
  atrasadas: "text-sit-risco-t",
  hoje: "text-sit-atencao-t",
};

/**
 * Lista da Central agrupada por prazo (Atrasadas, Hoje, Esta semana, Depois, Sem prazo e
 * "Concluídas nos últimos 7 dias" recolhido). Virtualizada com a rolagem da própria página.
 */
export function TarefasLista({
  itens,
  hoje,
  aoAbrir,
  aoConcluir,
  aoMudarPrazos,
}: {
  itens: TarefaVista[];
  hoje: string;
  aoAbrir: (t: TarefaVista) => void;
  aoConcluir: (t: TarefaVista) => void;
  /** Muda o prazo de todas as atrasadas de uma vez (REV-6). */
  aoMudarPrazos?: (ids: string[], prazo: string, rotulo: string) => void;
}) {
  const [concluidas, setConcluidas] = useState(false);
  const linhas = useMemo(
    () => linhasDaLista(agruparPorPrazo(itens, hoje), concluidas),
    [itens, hoje, concluidas],
  );
  const atrasadas = useMemo(
    () =>
      itens
        .filter((t) => (t.atrasada ?? estaAtrasada(t, hoje)) && !t.id.startsWith("temp-"))
        .map((t) => t.id),
    [itens, hoje],
  );
  const caixa = useRef<HTMLDivElement>(null);
  const [margem, setMargem] = useState(0);
  useLayoutEffect(() => {
    const medir = () =>
      setMargem((caixa.current?.getBoundingClientRect().top ?? 0) + window.scrollY);
    medir();
    // O que fica acima da lista (filtros, avisos) pode mudar de altura: mede de novo.
    const obs = new ResizeObserver(medir);
    obs.observe(document.body);
    return () => obs.disconnect();
  }, []);

  const v = useWindowVirtualizer({
    count: linhas.length,
    estimateSize: (i) => (linhas[i]?.tipo === "tarefa" ? 64 : 44),
    overscan: 10,
    scrollMargin: margem,
  });

  return (
    <div
      role="table"
      aria-label="Tarefas por prazo"
      aria-rowcount={linhas.length}
      className="overflow-hidden rounded-2xl border border-hub-borda bg-white"
    >
      <div
        role="row"
        className={cn(
          "hidden items-center gap-x-3 border-b border-hub-borda px-3 py-3 text-[13px] text-hub-suave md:grid",
          gradeListaTarefas,
        )}
      >
        <span role="columnheader">
          <span className="sr-only">Concluir</span>
        </span>
        <span role="columnheader">Tarefa</span>
        <span role="columnheader">Situação</span>
        <span role="columnheader">Prioridade</span>
        <span role="columnheader" className="text-right">
          Prazo
        </span>
      </div>
      <div ref={caixa} className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((item) => {
          const l = linhas[item.index];
          if (!l) return null;
          return (
            <div
              key={item.key}
              role="row"
              data-index={item.index}
              ref={v.measureElement}
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(${item.start - v.options.scrollMargin}px)` }}
            >
              {l.tipo === "grupo" ? (
                <div
                  role="cell"
                  className={cn(
                    "flex items-center justify-between gap-3 border-t border-hub-borda px-4 pb-1.5 pt-4 text-[14px] font-semibold first:border-t-0 md:px-5",
                    corGrupo[l.id],
                  )}
                >
                  <span>
                    {l.rotulo} · {l.total}
                  </span>
                  {l.id === "atrasadas" && aoMudarPrazos && atrasadas.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="-my-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[14px] font-medium text-hub-tinta hover:bg-hub-selecao md:min-h-9">
                        Mudar o prazo
                        <ChevronDown className="size-4" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {opcoesDeAdiar(hoje).map((o) => (
                          <DropdownMenuItem
                            key={o.prazo}
                            className="min-h-11 md:min-h-9"
                            onSelect={() => aoMudarPrazos(atrasadas, o.prazo, o.rotulo)}
                          >
                            {o.texto}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ) : l.tipo === "concluidas" ? (
                <div role="cell" className="border-t border-hub-borda bg-[#FAFAF7]">
                  <button
                    type="button"
                    aria-expanded={l.aberto}
                    onClick={() => setConcluidas((x) => !x)}
                    className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-[14px] text-[#4A4D54] hover:text-hub-tinta md:px-5"
                  >
                    <ChevronDown
                      className={cn("size-4 transition-transform", !l.aberto && "-rotate-90")}
                      aria-hidden="true"
                    />
                    Concluídas nos últimos 7 dias · {l.total}
                  </button>
                </div>
              ) : (
                <div role="cell" className="border-t border-[#F0F0EA]">
                  <TarefaLinha
                    t={l.t}
                    hoje={hoje}
                    aoAbrir={() => aoAbrir(l.t)}
                    aoConcluir={() => aoConcluir(l.t)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
