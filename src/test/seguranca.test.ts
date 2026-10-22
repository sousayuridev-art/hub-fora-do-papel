import { describe, expect, it } from "vitest";

import { forcaDaSenha, imagemDoQr, mensagemDeSeguranca, SENHA_MINIMA } from "@/lib/seguranca";

describe("seguranca (SEG-1)", () => {
  it("codifica o SVG cru do QR para a imagem abrir", () => {
    const url = imagemDoQr('data:image/svg+xml;utf-8,<svg a="1"></svg>');
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,%3Csvg")).toBe(true);
    expect(imagemDoQr("data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA");
  });

  it("mede a força da senha", () => {
    expect(forcaDaSenha("a".repeat(SENHA_MINIMA - 1)).nivel).toBe(0);
    expect(forcaDaSenha("a".repeat(SENHA_MINIMA)).nivel).toBe(1);
    expect(forcaDaSenha("cafe com pao 12").nivel).toBe(2);
    expect(forcaDaSenha("Cafe com pao 1234").nivel).toBe(3);
  });

  it("traduz os erros do login", () => {
    expect(mensagemDeSeguranca(new Error("Invalid login credentials"))).toBe(
      "E-mail ou senha não conferem.",
    );
    expect(mensagemDeSeguranca({ message: "Invalid TOTP code entered" })).toMatch(
      /Código não confere/,
    );
  });
});
