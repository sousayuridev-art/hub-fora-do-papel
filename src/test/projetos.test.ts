import { describe, expect, it } from "vitest";

import { proximoPasso, type Pedido } from "@/lib/pedidos";
import { etapaDoPedido } from "@/lib/portal";
import { faseAtual, horasMin } from "@/lib/projetos";

const pedido = (p: Partial<Pedido>): Pedido => ({
  id: "1",
  client_id: "c",
  project_id: null,
  code: "CS-01",
  title: "x",
  description: null,
  origin: "portal",
  status: "recebido",
  classification: null,
  hours_estimated: null,
  value_cents: null,
  owner_note: null,
  client_decision: null,
  decided_at: null,
  done_at: null,
  created_at: "",
  updated_at: "",
  ...p,
});

describe("S3 · projetos e pedidos", () => {
  it("formata horas", () => {
    expect(horasMin(30)).toBe("30 min");
    expect(horasMin(60)).toBe("1h");
    expect(horasMin(90)).toBe("1h30");
  });

  it("acha a fase atual", () => {
    const fases = [
      { status: "concluida" as const },
      { status: "andamento" as const },
      { status: "pendente" as const },
    ];
    expect(faseAtual(fases)?.numero).toBe(2);
    expect(faseAtual([{ status: "concluida" as const }])).toBeNull();
  });

  it("serviço adicional só inicia depois do sim do cliente", () => {
    expect(proximoPasso(pedido({ status: "em_analise", classification: "adicional" }))).toBe(
      "Enviar ao cliente",
    );
    expect(
      proximoPasso(
        pedido({ status: "em_analise", classification: "adicional", client_decision: "aprovado" }),
      ),
    ).toBe("Iniciar");
  });

  it("mostra a etapa certa ao cliente", () => {
    expect(etapaDoPedido({ status: "recebido", classificacao: null, decisao: null })).toBe(0);
    expect(
      etapaDoPedido({ status: "aguardando_cliente", classificacao: "adicional", decisao: null }),
    ).toBe(2);
    expect(
      etapaDoPedido({ status: "em_analise", classificacao: "adicional", decisao: "aprovado" }),
    ).toBe(3);
    expect(etapaDoPedido({ status: "recusado", classificacao: null, decisao: null })).toBe(-1);
  });
});
