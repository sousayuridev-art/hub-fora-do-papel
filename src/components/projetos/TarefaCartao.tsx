import { ArrowRightLeft, MoreHorizontal, Trash2 } from "lucide-react";

import { PrazoTarefa } from "@/components/tarefas/PrazoTarefa";
import { SeloPrioridade } from "@/components/tarefas/SeloPrioridade";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { colunasTarefa, type SituacaoTarefa, type Tarefa } from "@/lib/projetos";
import { cn } from "@/lib/utils";

/**
 * Uma tarefa no quadro (projeto e Kanban da Central): área ou origem, título, prazo e prioridade.
 * Clique abre o painel da tarefa; o menu "…" move ou remove (funciona no toque e no teclado).
 */
export function TarefaCartao({
  t,
  hoje,
  topo,
  extra,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  t: Tarefa;
  hoje: string;
  /** Linha de cima: área (no projeto) ou cliente › projeto (na Central). */
  topo: string;
  /** Selo pequeno no rodapé (ciclo, código do pedido). */
  extra?: string | null;
  aoAbrir: () => void;
  aoMover: (s: SituacaoTarefa) => void;
  aoRemover: () => void;
}) {
  const temp = t.id.startsWith("temp-");
  return (
    <li className="relative flex flex-col gap-1 rounded-xl border border-hub-borda bg-white p-3.5 pr-11 shadow-[0_1px_2px_rgba(14,16,19,0.04)] transition-colors hover:border-[#CFCFC8]">
      <span className="min-w-0 truncate text-[12.5px] text-hub-suave">{topo}</span>
      <button
        type="button"
        onClick={aoAbrir}
        disabled={temp}
        className="text-left text-[14.5px] font-semibold leading-snug after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-hub-tinta"
      >
        {t.title}
      </button>
      {(t.status === "pronto" || t.due_date || t.priority !== "normal" || extra) && (
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {(t.status === "pronto" || t.due_date) && <PrazoTarefa t={t} hoje={hoje} />}
          <SeloPrioridade p={t.priority} />
          {extra && <span className="text-[12.5px] text-hub-suave">{extra}</span>}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={temp}
          className={cn(
            "absolute right-1 top-1 z-10 flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-hub-tinta disabled:opacity-40",
          )}
          aria-label={`Ações da tarefa ${t.title}`}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex items-center gap-2 text-[13px] text-hub-suave">
            <ArrowRightLeft className="size-3.5" aria-hidden="true" /> Mover para
          </DropdownMenuLabel>
          {colunasTarefa
            .filter((c) => c.id !== t.status)
            .map((c) => (
              <DropdownMenuItem key={c.id} className="min-h-11" onSelect={() => aoMover(c.id)}>
                <span aria-hidden="true" className={`size-2 rounded-full ${c.cor}`} /> {c.rotulo}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11 text-sit-risco-t" onSelect={aoRemover}>
            <Trash2 className="size-4" aria-hidden="true" /> Remover tarefa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
