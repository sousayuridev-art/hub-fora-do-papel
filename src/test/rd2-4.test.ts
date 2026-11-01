import { describe, expect, it } from "vitest";

import { colunasPedidos, idadeEmDias, type SituacaoPedido } from "@/lib/pedidos";

describe("RD2-4 · quadro de pedidos", () => {
  it("conta a idade pelo dia local, nunca negativa", () => {
    const agora = new Date(2026, 10, 4, 9, 0);
    expect(idadeEmDias(new Date(2026, 10, 4, 8, 0).toISOString(), agora)).toBe(0);
    expect(idadeEmDias(new Date(2026, 10, 3, 23, 50).toISOString(), agora)).toBe(1);
    expect(idadeEmDias(new Date(2026, 10, 1, 10, 0).toISOString(), agora)).toBe(3);
    expect(idadeEmDias(new Date(2026, 10, 5, 10, 0).toISOString(), agora)).toBe(0);
  });

  it("cada situação cai em exatamente uma coluna", () => {
    const todas: SituacaoPedido[] = [
      "recebido",
      "em_analise",
      "aguardando_cliente",
      "fazendo",
      "pronto",
      "recusado",
    ];
    for (const s of todas)
      expect(colunasPedidos.filter((c) => c.situacoes.includes(s))).toHaveLength(1);
  });
});
