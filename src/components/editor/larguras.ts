import { Monitor, Smartphone } from "lucide-react";

/** Larguras do editor: computador e celular (o canvas reduz para caber). */
export const larguras = [
  { largura: 1280, rotulo: "Computador", icone: Monitor },
  { largura: 390, rotulo: "Celular", icone: Smartphone },
] as const;
