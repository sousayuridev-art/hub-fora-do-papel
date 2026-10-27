import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Painel lateral do Hub: à direita no computador, painel de baixo no celular
 * (proposta 2, decisão de 16/10: cantos arredondados, alça no topo, até 85% da altura).
 */
export function PainelLateral({
  aberto,
  aoMudar,
  titulo,
  descricao,
  children,
  rodape,
  largo = false,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao?: string | undefined;
  children: ReactNode;
  rodape?: ReactNode;
  /** Editor com mais conteúdo (ex.: artigo do site, CMS-2): mais largo no computador e mais alto no celular. */
  largo?: boolean;
}) {
  const celular = useIsMobile();
  return (
    <Sheet open={aberto} onOpenChange={aoMudar}>
      <SheetContent
        side={celular ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 bg-white p-0 text-hub-tinta",
          celular
            ? cn("rounded-t-3xl", largo ? "h-[92dvh] max-h-[92dvh]" : "max-h-[85dvh]")
            : cn("w-full", largo ? "sm:max-w-[880px]" : "sm:max-w-[460px]"),
        )}
      >
        {celular && (
          <span
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-[#DADAD3]"
          />
        )}
        <div className="flex flex-col gap-1 border-b border-hub-borda px-6 pb-4 pt-5 pr-12">
          <SheetTitle className="font-titulo text-xl font-bold tracking-tight text-hub-tinta">
            {titulo}
          </SheetTitle>
          {descricao ? (
            <SheetDescription className="text-[14px] text-hub-suave">{descricao}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{titulo}</SheetDescription>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {rodape && (
          <div className="flex flex-col gap-2 border-t border-hub-borda bg-white px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            {rodape}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
