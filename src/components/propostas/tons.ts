import type { TomCartao } from "@/lib/propostas";

/** Cor do texto da linha de situação nos cartões e na lista de propostas. */
export const corDoTom: Record<TomCartao, string> = {
  neutro: "text-hub-suave",
  atencao: "text-sit-atencao-t",
  risco: "text-sit-risco-t",
  ok: "text-sit-ok-t",
};
