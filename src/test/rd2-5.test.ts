import { describe, expect, it } from "vitest";

import { problemaNaLogo, textoAgora, type AgoraCliente } from "@/lib/clientes";

const base: AgoraCliente = {
  grupo: "ativo",
  relacao: "projeto",
  mensalidade_cents: 0,
  projeto: null,
  projetos_andamento: 0,
  pedidos_abertos: 0,
  proxima_cobranca: null,
  atrasada_desde: null,
  em_atraso_cents: 0,
  recebido_ano_cents: 0,
};
const projeto = (nivel: "ok" | "atencao" | "risco") => ({
  id: "p",
  nome: "Sistema",
  fase_posicao: 3,
  fase_nome: "Protótipo",
  fases_total: 4,
  saude: { nivel, motivos: [] },
});

describe("RD2-5 · clientes", () => {
  it("cobrança atrasada vem antes de tudo", () => {
    expect(textoAgora({ ...base, atrasada_desde: "2026-10-19", projeto: projeto("ok") })).toEqual({
      texto: "Cobrança atrasada",
      tom: "risco",
    });
  });
  it("fase e saúde do projeto", () => {
    expect(textoAgora({ ...base, projeto: projeto("risco") }).texto).toBe("Fase 3 de 4 · em risco");
    expect(textoAgora({ ...base, projeto: projeto("ok") })).toEqual({
      texto: "Fase 3 de 4 · no ritmo",
      tom: null,
    });
  });
  it("pedidos abertos e tudo em dia", () => {
    expect(textoAgora({ ...base, pedidos_abertos: 2 }).texto).toBe("2 pedidos abertos");
    expect(textoAgora(base).texto).toBe("Tudo em dia");
    expect(textoAgora(undefined).texto).toBe("—");
  });
  it("logo: só PNG, JPG ou WEBP até 1 MB", () => {
    expect(problemaNaLogo(new File(["x"], "a.png", { type: "image/png" }))).toBeNull();
    expect(problemaNaLogo(new File(["x"], "a.svg", { type: "image/svg+xml" }))).toMatch(/PNG/);
    const grande = new File([new Uint8Array(1024 * 1024 + 1)], "a.png", { type: "image/png" });
    expect(problemaNaLogo(grande)).toMatch(/1 MB/);
  });
});
