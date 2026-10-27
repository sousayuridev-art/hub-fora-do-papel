import { describe, expect, it } from "vitest";

import { origemDoPedido } from "@/lib/pedidos";
import { anexosDoPedido, problemaDoAnexo } from "@/lib/portal";

const arquivo = (nome: string, tipo: string, bytes: number) =>
  new File([new Uint8Array(bytes)], nome, { type: tipo });

describe("PC-2 · origem do pedido no Hub", () => {
  it("mostra a página quando o pedido veio do painel", () => {
    expect(origemDoPedido({ origin: "painel", contexto: { pagina: "Página inicial" } })).toBe(
      "Painel · Página inicial",
    );
  });
  it("sem página, mostra só a origem", () => {
    expect(origemDoPedido({ origin: "painel", contexto: null })).toBe("Painel");
    expect(origemDoPedido({ origin: "portal", contexto: { pagina: "Contato" } })).toBe("Portal");
    expect(origemDoPedido({ origin: "whatsapp", contexto: null })).toBe("WhatsApp");
  });
});

describe("PC-2 · anexos do pedido", () => {
  it("aceita print e PDF até 5 MB", () => {
    expect(problemaDoAnexo(arquivo("print.png", "image/png", 1000))).toBeNull();
    expect(problemaDoAnexo(arquivo("foto.jpg", "image/jpeg", 1000))).toBeNull();
    expect(
      problemaDoAnexo(arquivo("doc.pdf", "application/pdf", anexosDoPedido.tamanho)),
    ).toBeNull();
  });
  it("recusa acima de 5 MB com o motivo", () => {
    expect(
      problemaDoAnexo(arquivo("grande.pdf", "application/pdf", anexosDoPedido.tamanho + 1)),
    ).toBe("grande.pdf: passa de 5 MB.");
  });
  it("recusa formato fora da lista com o motivo", () => {
    expect(problemaDoAnexo(arquivo("texto.docx", "application/msword", 10))).toContain(
      "use foto (JPG, PNG ou WebP) ou PDF",
    );
    expect(problemaDoAnexo(arquivo("video.mp4", "video/mp4", 10))).not.toBeNull();
  });
});
