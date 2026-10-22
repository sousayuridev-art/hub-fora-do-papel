import { describe, expect, it } from "vitest";

import { moeda } from "@/lib/formatar";
import {
  comparadoCom,
  funilDoTrafego,
  ritmoOrcamento,
  variacaoContatos,
  variacaoCusto,
  type PainelTrafego,
} from "@/lib/trafego";

const indicadores = (x: Partial<PainelTrafego["indicadores"]>): PainelTrafego["indicadores"] => ({
  investido_cents: 0,
  cliques: null,
  contatos: 0,
  diagnosticos: 0,
  propostas: 0,
  fechados: 0,
  valor_fechado_cents: 0,
  receita_diagnosticos_cents: 0,
  custo_contato_cents: null,
  custo_diagnostico_cents: null,
  retorno: null,
  ...x,
});

describe("tráfego (RD-6)", () => {
  it("diz com o que compara", () => {
    expect(comparadoCom("mes", "2026-09-01")).toBe("em setembro");
    expect(comparadoCom("3meses", "2026-05-01")).toBe("nos 3 meses antes");
    expect(comparadoCom("ano", "2025-01-01")).toBe("em 2025");
  });

  it("mais contatos é bom; custo menor é bom", () => {
    expect(variacaoContatos(9, "em setembro")).toEqual({
      texto: "▲ 9 a mais que em setembro",
      tom: "bom",
    });
    expect(variacaoContatos(-2, "em setembro").tom).toBe("ruim");
    expect(variacaoCusto(3700, -800, "em setembro", moeda)).toEqual({
      texto: "▼ R$ 8 menor que em setembro",
      tom: "bom",
    });
    expect(variacaoCusto(3700, 500, "em setembro", moeda).tom).toBe("ruim");
  });

  it("não inventa comparação sem base", () => {
    expect(variacaoCusto(null, null, "em setembro", moeda).tom).toBe("neutro");
    expect(variacaoCusto(3700, null, "em setembro", moeda).texto).toBe(
      "Sem base para comparar em setembro",
    );
  });

  it("ritmo do orçamento", () => {
    const o = {
      mensal_cents: 200000,
      google_cents: 80000,
      meta_cents: 120000,
      gasto_cents: 142000,
      gasto_google_cents: 44000,
      gasto_meta_cents: 98000,
      dia: 22,
      dias_no_mes: 31,
      mes: "2026-10-01",
    };
    const r = ritmoOrcamento(o);
    expect(r.linha).toBe(71);
    expect(r.tom).toBe("ok");
    expect(r.diasRestantes).toBe(10);
    expect(ritmoOrcamento({ ...o, gasto_cents: 190000 }).tom).toBe("risco");
    expect(ritmoOrcamento({ ...o, mensal_cents: 0 }).tom).toBe("neutro");
  });

  it("maior perda do funil ignora cliques", () => {
    const f = funilDoTrafego(
      indicadores({ cliques: 1240, contatos: 38, diagnosticos: 14, propostas: 6, fechados: 3 }),
    );
    expect(f.etapas.map((e) => e.passou)).toEqual([3, 37, 43, 50, null]);
    expect(f.pior).toBe(1);
    expect(funilDoTrafego(indicadores({})).pior).toBeNull();
  });
});
