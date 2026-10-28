import { ActionBar } from "@puckeditor/core";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { useEditor } from "@/components/editor/contexto";
import { usePuck } from "@/components/editor/usePuck";

/** Barra da seção selecionada: ações do Puck + "Adicionar seção abaixo" (card PC-4). */
export function BarraSecao({
  label,
  children,
  parentAction,
}: {
  label?: string;
  children: ReactNode;
  parentAction: ReactNode;
}) {
  const indice = usePuck((s) => s.appState.ui.itemSelector?.index ?? null);
  const { adicionarEm } = useEditor();
  return (
    <ActionBar {...(label ? { label } : {})}>
      <ActionBar.Group>
        {parentAction}
        {children}
      </ActionBar.Group>
      <ActionBar.Group>
        <ActionBar.Action
          label="Adicionar seção abaixo"
          onClick={() => indice !== null && adicionarEm(indice + 1)}
        >
          <Plus size={16} />
        </ActionBar.Action>
      </ActionBar.Group>
    </ActionBar>
  );
}
