import { describe, expect, it } from "vitest";

import { siglaDoTipo, tipoDePrevia } from "@/lib/materiais";

describe("RD2-7 · prévia dos materiais", () => {
  it("só mostra no Hub o que é seguro e o navegador sabe abrir", () => {
    expect(tipoDePrevia({ tipo: "arquivo", mime: "image/png" })).toBe("imagem");
    expect(tipoDePrevia({ tipo: "arquivo", mime: "application/pdf" })).toBe("pdf");
    expect(tipoDePrevia({ tipo: "arquivo", mime: "video/mp4" })).toBe("video");
    expect(tipoDePrevia({ tipo: "arquivo", mime: "audio/mpeg" })).toBe("audio");
    expect(tipoDePrevia({ tipo: "arquivo", mime: "image/svg+xml" })).toBeNull();
    expect(tipoDePrevia({ tipo: "arquivo", mime: "text/plain" })).toBeNull();
    expect(tipoDePrevia({ tipo: "arquivo", mime: "image/heic" })).toBeNull();
    expect(tipoDePrevia({ tipo: "link", mime: null })).toBeNull();
  });
  it("sigla do tipo na miniatura", () => {
    expect(siglaDoTipo({ tipo: "arquivo", arquivo: "Contrato.docx" })).toBe("DOCX");
    expect(siglaDoTipo({ tipo: "arquivo", arquivo: null })).toBe("ARQUIVO");
    expect(siglaDoTipo({ tipo: "link", arquivo: null })).toBe("LINK");
  });
});
