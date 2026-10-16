import { ArrowRightLeft, MoreHorizontal, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { colunasTarefa, type SituacaoTarefa, type Tarefa } from "@/lib/projetos";

/** Uma tarefa do quadro. Mover pelo menu (funciona no toque e no teclado). */
export function TarefaCartao({
  t,
  aoMover,
  aoRemover,
}: {
  t: Tarefa;
  aoMover: (s: SituacaoTarefa) => void;
  aoRemover: () => void;
}) {
  const temp = t.id.startsWith("temp-");
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-hub-borda bg-white p-3.5 shadow-[0_1px_2px_rgba(14,16,19,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.06em] text-hub-suave">
          {t.area ?? "Geral"}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={temp}
            className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-hub-fundo disabled:opacity-40"
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
      </div>
      <span className="text-[14.5px] font-semibold leading-snug">{t.title}</span>
      {t.description && <span className="text-[13.5px] text-hub-suave">{t.description}</span>}
    </li>
  );
}
