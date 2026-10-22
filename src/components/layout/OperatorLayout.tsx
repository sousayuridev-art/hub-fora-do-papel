import { useEffect, useState, type ReactNode } from "react";
import { Menu, Search } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Marca } from "@/components/layout/Marca";
import { MenuOperador } from "@/components/layout/MenuOperador";
import { BuscaGeral } from "@/components/layout/BuscaGeral";

/**
 * Casca do sistema interno (proposta 2).
 * Computador: menu escuro da marca, fixo, de 280 px (HUB-VIS-2). Celular: barra no topo com o menu em gaveta.
 */
export function OperatorLayout({ children }: { children: ReactNode }) {
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);

  useEffect(() => {
    function atalho(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((v) => !v);
      }
    }
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  return (
    <div className="min-h-dvh bg-hub-fundo text-hub-tinta">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-70 border-r border-menu-borda md:block">
        <MenuOperador aoBuscar={() => setBuscaAberta(true)} />
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
        <button
          type="button"
          onClick={() => setBuscaAberta(true)}
          className="ml-auto flex size-11 items-center justify-center rounded-lg text-hub-tinta hover:bg-hub-selecao"
          aria-label="Buscar"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      </header>

      <Sheet open={gavetaAberta} onOpenChange={setGavetaAberta}>
        <SheetContent side="left" className="w-72 border-0 bg-menu p-0 text-menu-texto">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <MenuOperador
            aoNavegar={() => setGavetaAberta(false)}
            aoBuscar={() => {
              setGavetaAberta(false);
              setBuscaAberta(true);
            }}
          />
        </SheetContent>
      </Sheet>

      <BuscaGeral aberta={buscaAberta} aoMudar={setBuscaAberta} />

      <main className="overflow-x-clip md:pl-70">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-8 md:py-7">{children}</div>
      </main>
    </div>
  );
}
