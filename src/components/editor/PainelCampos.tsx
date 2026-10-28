import { Puck } from "@puckeditor/core";
import { Lock, MousePointerClick, Settings2 } from "lucide-react";

import { iconeDaSecao } from "@/components/editor/icones";
import { usePuck } from "@/components/editor/usePuck";
import { sobreAsSecoes, type TipoSecao } from "@/secoes/config";

/** Campos da seção selecionada (à direita no computador); sem seleção, os dados da página. */
export function PainelCampos({ travadas }: { travadas: readonly string[] }) {
  const selecionada = usePuck((s) => s.selectedItem);
  const tipo = selecionada?.type as TipoSecao | undefined;
  const Icone = tipo ? iconeDaSecao[tipo] : Settings2;
  return (
    <aside className="hidden w-[340px] shrink-0 flex-col border-l border-hub-borda bg-white lg:flex">
      <div className="border-b border-hub-borda px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={
              tipo
                ? "flex size-9 items-center justify-center rounded-lg bg-hub-tinta text-white"
                : "flex size-9 items-center justify-center rounded-lg bg-hub-fundo"
            }
          >
            <Icone className="size-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[12.5px] text-hub-suave">{tipo ? "Seção escolhida" : "Página"}</p>
            <p className="truncate text-[15px] font-semibold">
              {tipo ? sobreAsSecoes[tipo].nome : "Dados da página"}
            </p>
          </div>
        </div>
        {tipo && travadas.includes(tipo) && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-hub-fundo px-3 py-2 text-[13px] leading-relaxed">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Seção fixa do site: você edita os textos, mas ela não sai do lugar.
          </p>
        )}
        {!tipo && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-hub-suave">
            <MousePointerClick className="size-3.5 shrink-0" aria-hidden="true" /> Clique em
            qualquer texto da página para editar ali mesmo.
          </p>
        )}
      </div>
      <div className="editor-campos min-h-0 flex-1 overflow-y-auto">
        <Puck.Fields />
      </div>
    </aside>
  );
}
