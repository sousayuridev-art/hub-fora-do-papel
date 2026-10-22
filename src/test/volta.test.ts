import { describe, expect, it } from "vitest";

import { caminhoInterno as volta } from "@/lib/volta";

describe("parâmetro volta do login", () => {
  it("aceita caminhos internos", () => {
    expect(volta.parse("/app/pipeline")).toBe("/app/pipeline");
    expect(volta.parse("/seguranca?acao=senha")).toBe("/seguranca?acao=senha");
  });
  it("recusa endereços de outro site", () => {
    expect(volta.parse("//site-falso.com")).toBeUndefined();
    expect(volta.parse("/\\site-falso.com")).toBeUndefined();
    expect(volta.parse("https://site-falso.com")).toBeUndefined();
    expect(volta.parse("/\t/site-falso.com")).toBeUndefined();
    expect(volta.parse("/\n/site-falso.com")).toBeUndefined();
  });
});

describe("tela de entrada certa", () => {
  it("gestor para o Hub e a Segurança; cliente para o resto", async () => {
    const { entradaPara } = await import("@/lib/volta");
    expect(entradaPara("/app/clientes")).toBe("/gestor");
    expect(entradaPara("/seguranca?acao=senha")).toBe("/gestor");
    expect(entradaPara("/portal")).toBe("/entrar");
    expect(entradaPara("/application")).toBe("/entrar");
    expect(entradaPara(undefined)).toBe("/entrar");
  });
});
