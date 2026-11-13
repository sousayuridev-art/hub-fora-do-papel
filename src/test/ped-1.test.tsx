import { describe, expect, it } from "vitest";

import { textoAlertaPedidos, type ResumoPedidos } from "@/lib/pedidos";

const r = (recebido: number, novos_urgentes = 0): ResumoPedidos => ({
  todos: 5,
  recebido,
  andamento: 1,
  aguardando_cliente: 0,
  concluidos: 2,
  adicional_aprovado_cents: 0,
  pendentes: recebido + 1,
  novos_urgentes,
});

describe("PED-1 · alerta de pedidos de ajuste", () => {
  it("sem pedido novo, sem alerta", () => {
    expect(textoAlertaPedidos(r(0))).toBeNull();
    expect(textoAlertaPedidos(undefined)).toBeNull();
  });

  it("conta os novos e os urgentes", () => {
    expect(textoAlertaPedidos(r(1))).toBe("1 pedido de ajuste novo esperando você");
    expect(textoAlertaPedidos(r(2, 1))).toBe("2 pedidos de ajuste novos esperando você, 1 urgente");
  });
});
