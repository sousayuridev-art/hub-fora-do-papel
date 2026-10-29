import { describe, expect, it } from "vitest";

import {
  contarAvisos,
  ehSlides,
  ehVideo,
  formatosDe,
  gradeDoMes,
  mensagemDoMarketing,
  mesVizinho,
  nomeDoMes,
  pecaNaEtapa,
  type Peca,
} from "@/lib/marketing";

const peca = (extra: Partial<Peca> = {}): Peca => ({
  id: "p1",
  title: "Por que a planilha trava",
  core_idea: null,
  objective: null,
  funnel: null,
  pillar: null,
  front: null,
  audience: null,
  series: null,
  art_direction: null,
  campaign_id: null,
  client_id: null,
  client_authorized: false,
  due_date: null,
  stage: "ideia",
  stage_changed_at: "2026-10-29T12:00:00Z",
  created_at: "2026-10-29T12:00:00Z",
  coluna: "planejamento",
  campanha: null,
  cliente: null,
  versoes: [],
  falta: [],
  ...extra,
});

describe("Central de conteúdo (MK-1)", () => {
  it("monta a grade do mês de domingo a sábado", () => {
    const g = gradeDoMes("2026-10");
    expect(g.inicio).toBe("2026-09-27");
    expect(g.fim).toBe("2026-10-31");
    expect(g.dias).toHaveLength(35);
  });

  it("anda entre meses e escreve o nome em português", () => {
    expect(mesVizinho("2026-12", 1)).toBe("2027-01");
    expect(mesVizinho("2026-01", -1)).toBe("2025-12");
    expect(nomeDoMes("2026-10")).toBe("Outubro de 2026");
  });

  it("segue as mesmas regras de formato do banco", () => {
    expect(formatosDe("linkedin")).not.toContain("reels");
    expect(formatosDe("instagram")).toContain("anuncio");
    expect(formatosDe("canal_novo")).toContain("reels");
    expect(ehVideo("shorts")).toBe(true);
    expect(ehSlides("documento")).toBe(true);
  });

  it("move a peça para a coluna certa na prévia otimista", () => {
    expect(pecaNaEtapa(peca(), "refinamento").coluna).toBe("criacao");
    expect(pecaNaEtapa(peca(), "analisado").coluna).toBe("publicado");
  });

  it("conta avisos e os que bloqueiam", () => {
    const base = peca().versoes;
    expect(base).toHaveLength(0);
    const p = peca({
      versoes: [
        {
          id: "v1",
          piece_id: "p1",
          channel: "instagram",
          canal_nome: "Instagram",
          limite_texto: 2200,
          format: "carrossel",
          hook: null,
          body: "[PREÇO]",
          script: [],
          slides: [],
          cta: null,
          hashtags: null,
          warnings: [
            { codigo: "marcador", bloqueia: true, texto: "" },
            { codigo: "exclamacao", bloqueia: false, texto: "" },
          ],
          scheduled_at: null,
          published_at: null,
          published_url: null,
          results: null,
          ad_campaign_id: null,
          position: 0,
          midias: [],
        },
      ],
    });
    expect(contarAvisos(p)).toEqual({ total: 2, bloqueiam: 1 });
  });

  it("traduz o erro da porta com o que falta", () => {
    expect(
      mensagemDoMarketing({ message: "briefing_incompleto", details: "objetivo, pilar" }),
    ).toBe("Complete o briefing antes de seguir. Falta: objetivo, pilar.");
    expect(mensagemDoMarketing({ message: "link_invalido" })).toContain("https://");
    expect(mensagemDoMarketing({ message: "outra coisa" })).toBeNull();
  });
});
