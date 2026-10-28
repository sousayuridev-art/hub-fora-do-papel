/**
 * Pacote compartilhado de seções (card PC-4): o editor do Hub e os sites dos clientes usam
 * estes mesmos componentes, para o que se vê no editor ser o que vai ao ar.
 * Regra: nada aqui importa do Hub (`@/…`); só React. Fica pronto para virar pacote.
 */

/** Cor de destaque do site do cliente (não é a do painel). */
export const coresDoSite = {
  terracota: { rotulo: "Terracota", cor: "#B5532F", suave: "#F6E7DF" },
  oliva: { rotulo: "Oliva", cor: "#5E6B3A", suave: "#ECEEE2" },
  oceano: { rotulo: "Oceano", cor: "#1F5F7A", suave: "#E1EEF3" },
  grafite: { rotulo: "Grafite", cor: "#1C1D20", suave: "#ECECE8" },
} as const;

export type CorDoSite = keyof typeof coresDoSite;
