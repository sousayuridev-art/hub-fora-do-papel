import { Puck } from "@puckeditor/core";
import { Plus } from "lucide-react";

import { useEditor } from "@/components/editor/contexto";
import { usePuck } from "@/components/editor/usePuck";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { sobreAsSecoes, type TipoSecao } from "@/secoes/config";

/** Celular: tocar numa seção abre os campos de baixo; "+ Seção" entra antes da última (o rodapé). */
export function ControlesCelular({ podeAdicionar }: { podeAdicionar: boolean }) {
  const dispatch = usePuck((s) => s.dispatch);
  const selecionada = usePuck((s) => s.selectedItem);
  const total = usePuck((s) => s.appState.data.content.length);
  const { adicionarEm } = useEditor();
  const tipo = selecionada?.type as TipoSecao | undefined;
  return (
    <>
      {podeAdicionar && (
        <button
          type="button"
          onClick={() => adicionarEm(Math.max(0, total - 1))}
          className="fixed bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 z-30 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-hub-tinta px-6 text-[15px] font-semibold text-white shadow-lg lg:hidden"
        >
          <Plus className="size-4" aria-hidden="true" /> Seção
        </button>
      )}
      <Sheet
        open={Boolean(selecionada)}
        onOpenChange={(v) => !v && dispatch({ type: "setUi", ui: { itemSelector: null } })}
      >
        <SheetContent
          side="bottom"
          className="flex h-[80dvh] flex-col gap-0 rounded-t-[24px] p-0 lg:hidden"
        >
          <div className="border-b border-hub-borda px-5 pt-5 pb-3">
            <SheetTitle className="text-[18px] font-semibold">
              {tipo ? sobreAsSecoes[tipo].nome : "Seção"}
            </SheetTitle>
            <SheetDescription className="text-[13.5px]">
              As mudanças aparecem na página na hora.
            </SheetDescription>
          </div>
          <div className="editor-campos min-h-0 flex-1 overflow-y-auto pb-[calc(24px+env(safe-area-inset-bottom))]">
            <Puck.Fields />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
