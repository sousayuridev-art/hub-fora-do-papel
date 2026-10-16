import type { Precos } from "@/lib/precos";

/** Props comuns das seções de preço: o rascunho e como mudar um campo. */
export type PropsSecao = {
  p: Precos;
  mudar: <K extends keyof Precos>(campo: K, valor: Precos[K]) => void;
};
