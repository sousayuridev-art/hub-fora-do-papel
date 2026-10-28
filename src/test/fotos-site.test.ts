import { describe, expect, it } from "vitest";

import { medidasReduzidas, problemaDaFoto, tamanhoMaximoEntrada } from "@/lib/fotosSite";

describe("PC-3 · fotos do site", () => {
  it("reduz o lado maior sem distorcer e não aumenta foto pequena", () => {
    expect(medidasReduzidas(4000, 3000, 2000)).toEqual({ largura: 2000, altura: 1500 });
    expect(medidasReduzidas(1080, 1920, 1600)).toEqual({ largura: 900, altura: 1600 });
    expect(medidasReduzidas(800, 600, 2000)).toEqual({ largura: 800, altura: 600 });
  });
  it("aceita JPG, PNG e WebP até 20 MB e explica a recusa", () => {
    expect(problemaDaFoto({ name: "a.jpg", type: "image/jpeg", size: 5_000_000 })).toBeNull();
    expect(problemaDaFoto({ name: "a.heic", type: "image/heic", size: 10 })).toContain(
      "JPG, PNG ou WebP",
    );
    expect(
      problemaDaFoto({ name: "b.png", type: "image/png", size: tamanhoMaximoEntrada + 1 }),
    ).toBe("b.png: passa de 20 MB.");
  });
});
