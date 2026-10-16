import { describe, expect, it } from "vitest";

import {
  centavosDoTexto,
  linkWhatsapp,
  moeda,
  prazoRelativo,
  sigla,
  telefone,
} from "@/lib/formatar";
import { mensagemDoFunil } from "@/lib/funil";

describe("formatar", () => {
  it("mostra dinheiro em reais a partir de centavos", () => {
    expect(moeda(3650000)).toBe("R$ 36.500");
    expect(moeda(null)).toBe("—");
  });
  it("lê valores digitados em reais", () => {
    expect(centavosDoTexto("4500")).toBe(450000);
    expect(centavosDoTexto("R$ 12.500")).toBe(1250000);
    expect(centavosDoTexto("1.200,50")).toBe(120050);
    expect(centavosDoTexto("")).toBeNull();
  });
  it("classifica o prazo do próximo passo", () => {
    expect(prazoRelativo("2026-10-15", "2026-10-16")).toEqual({
      texto: "Venceu ontem, 15/10",
      tom: "risco",
    });
    expect(prazoRelativo("2026-10-16", "2026-10-16").tom).toBe("atencao");
    expect(prazoRelativo("2026-10-17", "2026-10-16").texto).toBe("Amanhã, 17/10");
    expect(prazoRelativo("2026-10-20", "2026-10-16")).toEqual({ texto: "20/10", tom: "neutro" });
  });
  it("monta sigla, telefone e link do WhatsApp", () => {
    expect(sigla("Padaria Grão Fino")).toBe("PG");
    expect(telefone("79900000001")).toBe("(79) 9 0000-0001");
    expect(linkWhatsapp("(79) 9 0000-0001")).toBe("https://wa.me/5579900000001");
    expect(linkWhatsapp("123")).toBeNull();
  });
});

describe("mensagens do funil", () => {
  it("traduz as regras do banco para o usuário", () => {
    expect(mensagemDoFunil({ message: "versao_desatualizada" })).toMatch(/mudou em outra tela/);
    expect(mensagemDoFunil(new Error("motivo_obrigatorio"))).toMatch(/motivo/);
    expect(mensagemDoFunil({ message: "outra coisa" })).toBeNull();
  });
});

describe("números digitados do jeito brasileiro", () => {
  it("lê milhar com ponto e decimal com vírgula", async () => {
    const { numeroBR, moeda: m } = await import("@/lib/formatar");
    expect(numeroBR("1.200")).toBe(1200);
    expect(numeroBR("1.200,50")).toBe(1200.5);
    expect(numeroBR("12,5")).toBe(12.5);
    expect(numeroBR("4.5")).toBe(4.5);
    expect(numeroBR("R$ 300")).toBe(300);
    expect(numeroBR("")).toBeNull();
    expect(m(4990)).toBe("R$ 49,90");
    expect(m(120000)).toBe("R$ 1.200");
  });
});
