import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Ícone de ajuda (card RD-6): a definição sai do corpo da tela e abre ao tocar, clicar ou
 * pelo teclado (Enter/Espaço). Alvo de 44 px sem empurrar a linha do rótulo.
 */
export function Ajuda({ sobre, children }: { sobre: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={`O que é ${sobre}?`}
        className="-my-3.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-hub-suave hover:text-hub-tinta focus-visible:outline-2 focus-visible:outline-hub-tinta"
      >
        <CircleHelp className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-72 rounded-xl border-hub-borda bg-hub-tinta p-3 text-[13px] leading-snug font-normal text-white"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
