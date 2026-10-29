import { describe, expect, it } from "vitest";

import type { Versao } from "@/lib/marketing";
import {
  avisosDoModelo,
  geraModelo,
  nomeDoArquivo,
  papelGerado,
  partesComTudo,
  quadrosDaVersao,
  tamanhoDoTitulo,
  temaSeguinte,
} from "@/lib/modelosMarca";

function versao(extra: Partial<Versao> = {}): Versao {
  return {
    id: "v",
    piece_id: "p",
    channel: "instagram",
    canal_nome: "Instagram",
    limite_texto: 2200,
    format: "carrossel",
    hook: "A planilha cresceu.",
    body: null,
    script: [],
    slides: [],
    cta: null,
    hashtags: null,
    warnings: [],
    scheduled_at: null,
    published_at: null,
    published_url: null,
    results: null,
    ad_campaign_id: null,
    position: 0,
    midias: [],
    ...extra,
  };
}
const slides = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ titulo: `Título ${i + 1}`, texto: `Texto ${i + 1}` }));
const escolha = { capa: "escuro" as const, final: "ambar" as const };

describe("quadros do modelo", () => {
  it("carrossel: capa, meios e chamada final com as palavras do manual", () => {
    const q = quadrosDaVersao(
      versao({ slides: slides(5), cta: "marcar_conversa" }),
      "problema",
      escolha,
    );
    expect(q.map((x) => x.tipo)).toEqual(["capa", "meio", "meio", "meio", "final"]);
    expect(q[0]).toMatchObject({
      tema: "escuro",
      rotulo: "Problema reconhecível",
      arraste: true,
      indice: 1,
      total: 5,
    });
    expect(q[1]?.tema).toBe("escuro");
    expect(q[4]).toMatchObject({ tema: "ambar", chamada: "Marcar uma conversa" });
  });

  it("capa clara deixa os slides do meio claros", () => {
    const q = quadrosDaVersao(versao({ slides: slides(3) }), null, {
      capa: "claro",
      final: "escuro",
    });
    expect(q[1]?.tema).toBe("claro");
  });

  it("sem chamada, o último slide sai como slide do meio", () => {
    const q = quadrosDaVersao(versao({ slides: slides(3) }), null, escolha);
    expect(q.map((x) => x.tipo)).toEqual(["capa", "meio", "meio"]);
  });

  it("slides vazios não viram quadro", () => {
    const q = quadrosDaVersao(
      versao({ slides: [...slides(2), { titulo: " ", texto: "" }] }),
      null,
      escolha,
    );
    expect(q).toHaveLength(2);
  });

  it("slide vazio no começo: a capa usa o primeiro com texto", () => {
    const q = quadrosDaVersao(
      versao({ slides: [{ titulo: "", texto: " " }, ...slides(3)] }),
      null,
      escolha,
    );
    expect(q[0]?.titulo).toBe("Título 1");
    expect(q).toHaveLength(3);
  });

  it("carrossel de um slide com chamada: só a capa (não há onde pôr a chamada)", () => {
    const q = quadrosDaVersao(versao({ slides: slides(1), cta: "marcar_conversa" }), null, escolha);
    expect(q.map((x) => x.tipo)).toEqual(["capa"]);
  });

  it("Reels: uma capa vertical com o gancho", () => {
    const q = quadrosDaVersao(versao({ format: "reels" }), null, escolha);
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({
      tipo: "capa",
      vertical: true,
      titulo: "A planilha cresceu.",
      arraste: false,
    });
  });
});

describe("limites e avisos", () => {
  it("título da capa desce em degraus e bloqueia quando passa", () => {
    expect(tamanhoDoTitulo("x".repeat(20), "capa")).toBe(124);
    expect(tamanhoDoTitulo("x".repeat(40), "capa")).toBe(96);
    expect(tamanhoDoTitulo("x".repeat(65), "capa")).toBe(80);
    expect(tamanhoDoTitulo("x".repeat(90), "capa")).toBeNull();
  });

  it("diz qual slide não cabe e avisa acima de 8", () => {
    const longos = slides(9);
    longos[2] = { titulo: "ok", texto: "y".repeat(400) };
    const a = avisosDoModelo(quadrosDaVersao(versao({ slides: longos }), null, escolha));
    expect(a.bloqueia).toEqual(["Texto longo para o slide 3: encurte."]);
    expect(a.avisa).toEqual(["São 9 slides; o manual pede de 3 a 8."]);
  });

  it("capa sem título bloqueia", () => {
    const a = avisosDoModelo(
      quadrosDaVersao(versao({ format: "reels", hook: null }), null, escolha),
    );
    expect(a.bloqueia[0]).toMatch(/capa precisa de título/);
  });
});

describe("apoio", () => {
  it("grade alterna escuro → claro → âmbar", () => {
    expect([
      temaSeguinte(null),
      temaSeguinte("escuro"),
      temaSeguinte("claro"),
      temaSeguinte("ambar"),
    ]).toEqual(["escuro", "claro", "ambar", "escuro"]);
  });
  it("TUDO vira etiqueta", () => {
    expect(partesComTudo("TUDO em um lugar só.")).toEqual([
      { texto: "TUDO", tudo: true },
      { texto: " em um lugar só.", tudo: false },
    ]);
  });
  it("papel do arquivo gerado e formatos sem modelo", () => {
    expect(papelGerado("carrossel")).toBe("slide");
    expect(papelGerado("reels")).toBe("capa");
    expect(papelGerado("stories")).toBe("imagem");
    expect(geraModelo("texto")).toBe(false);
    expect(geraModelo("documento")).toBe(false);
  });
  it("nome do arquivo sem acento", () => {
    const q = quadrosDaVersao(versao({ slides: slides(3) }), null, escolha)[1]!;
    expect(nomeDoArquivo("Por que a planilha trava?", q)).toBe("por-que-a-planilha-trava-02.png");
  });
});
