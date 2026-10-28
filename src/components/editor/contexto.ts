import { createContext, useContext } from "react";

/** O que as peças do editor compartilham: abrir "Adicionar seção" numa posição. */
export const EditorContexto = createContext<{ adicionarEm: (indice: number) => void }>({
  adicionarEm: () => undefined,
});
export const useEditor = () => useContext(EditorContexto);
