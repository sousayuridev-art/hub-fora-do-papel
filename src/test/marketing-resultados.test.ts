import { describe, expect, it } from "vitest";

import { intervaloDoPeriodo, nomeDoGrupo, type LinhaResultado } from "@/lib/marketing";

const linha = (chave: string | null, nome: string | null = null): LinhaResultado => ({
  chave,
  nome,
  versoes: 1,
  com_resultado: 1,
  alcance: 0,
  salvamentos: 0,
  cliques: 0,
  mensagens: 0,
  contatos: 0,
  negocios_fechados: 0,
  valor_fechado: 0,
  salvamentos_por_mil: null,
});

describe("período da aba Resultados", () => {
  it("últimos 30 dias contam hoje", () => {
    expect(intervaloDoPeriodo("30", "2026-10-29")).toEqual({
      inicio: "2026-09-30",
      fim: "2026-10-29",
    });
  });
  it("últimos 90 dias", () => {
    expect(intervaloDoPeriodo("90", "2026-10-29")).toEqual({
      inicio: "2026-08-01",
      fim: "2026-10-29",
    });
  });
  it("mês inteiro, inclusive fevereiro de ano bissexto", () => {
    expect(intervaloDoPeriodo("2026-02", "2026-10-29")).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
    expect(intervaloDoPeriodo("2028-02", "2028-03-01")).toEqual({
      inicio: "2028-02-01",
      fim: "2028-02-29",
    });
    expect(intervaloDoPeriodo("2026-12", "2026-12-05")).toEqual({
      inicio: "2026-12-01",
      fim: "2026-12-31",
    });
  });
});

describe("nome da linha", () => {
  it("usa os rótulos do manual e trata o vazio", () => {
    expect(nomeDoGrupo("pilar", linha("escolha_honesta"))).toBe("Escolha honesta");
    expect(nomeDoGrupo("pilar", linha(null))).toBe("Sem pilar");
    expect(nomeDoGrupo("campanha", linha(null))).toBe("Sem campanha");
    expect(nomeDoGrupo("campanha", linha("x", "Lançamento"))).toBe("Lançamento");
    expect(nomeDoGrupo("canal", linha("instagram", "Instagram"))).toBe("Instagram");
  });
});
