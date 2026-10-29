import { describe, expect, it } from "vitest";

import { comCabecalhosDeSeguranca } from "@/server";
import { mensagemDoFunil } from "@/lib/funil";
import { tiposAceitos } from "@/lib/materiais";

describe("REV-5 · correções urgentes", () => {
  it("página HTML sai com proteção contra abrir dentro de outro site", () => {
    const r = comCabecalhosDeSeguranca(
      new Response("<p>oi</p>", { headers: { "content-type": "text/html; charset=utf-8" } }),
    );
    expect(r.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("respostas que não são HTML ficam como estão", () => {
    const original = new Response("{}", { headers: { "content-type": "application/json" } });
    expect(comCabecalhosDeSeguranca(original)).toBe(original);
  });

  it("Fechado sem proposta explica o que fazer", () => {
    expect(mensagemDoFunil(new Error("fechar_sem_proposta"))).toMatch(/por que/);
  });

  it("materiais não aceitam SVG", () => {
    expect(tiposAceitos).not.toContain("image/svg+xml");
  });
});
