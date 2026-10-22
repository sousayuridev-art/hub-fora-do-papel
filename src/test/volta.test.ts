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
