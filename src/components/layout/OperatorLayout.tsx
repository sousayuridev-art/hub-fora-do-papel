import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Marca } from "@/components/layout/Marca";
import { MenuOperador } from "@/components/layout/MenuOperador";

/**
 * Casca do sistema interno.
 * Computador: menu lateral fixo. Celular: barra no topo com o menu em gaveta.
 */
export function OperatorLayout({ children }: { children: ReactNode }) {
  const [gavetaAberta, setGavetaAberta] = useState(false);

  return (
    <div className="min-h-dvh bg-hub-fundo text-hub-tinta">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-hub-borda bg-white md:flex">
        <div className="flex h-16 items-center px-6">
          <Marca />
        </div>
        <MenuOperador />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-hub-borda bg-white/95 px-2 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setGavetaAberta(true)}
          className="flex size-11 items-center justify-center rounded-lg text-hub-tinta hover:bg-hub-selecao"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <Marca />
      </header>

      <Sheet open={gavetaAberta} onOpenChange={setGavetaAberta}>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-14 items-center px-5">
            <Marca />
          </div>
          <div className="min-h-0 flex-1">
            <MenuOperador aoNavegar={() => setGavetaAberta(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
