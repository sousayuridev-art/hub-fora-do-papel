import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TODOS = "__todos__";

/** Um filtro em menu (Cliente ▾, Projeto ▾ …). Mostra o escolhido no próprio botão. */
export function MenuFiltro({
  rotulo,
  valor,
  opcoes,
  aoEscolher,
}: {
  rotulo: string;
  valor: string | undefined;
  opcoes: { id: string; rotulo: string }[];
  aoEscolher: (id: string | undefined) => void;
}) {
  const escolhido = valor ? opcoes.find((o) => o.id === valor) : undefined;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-10 max-w-[220px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[14px] transition-colors",
          valor
            ? "border-hub-tinta bg-hub-tinta font-medium text-white"
            : "border-[#DADAD3] bg-white text-hub-tinta hover:bg-hub-selecao",
        )}
      >
        <span className="truncate">{escolhido ? escolhido.rotulo : rotulo}</span>
        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only">{escolhido ? ` (filtro de ${rotulo.toLowerCase()})` : ""}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        <DropdownMenuRadioGroup
          value={valor ?? TODOS}
          onValueChange={(v) => aoEscolher(v === TODOS ? undefined : v)}
        >
          <DropdownMenuRadioItem value={TODOS} className="min-h-11">
            {rotulo}: todos
          </DropdownMenuRadioItem>
          {opcoes.map((o) => (
            <DropdownMenuRadioItem key={o.id} value={o.id} className="min-h-11">
              {o.rotulo}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
