import { describe, expect, it } from "vitest";
import { z } from "zod";

// Mesma regra de src/routes/entrar.tsx e auth/callback.tsx: só caminho interno.
const volta = z
  .string()
  .regex(/^\/(?![/\\])/, "caminho interno")
  .optional()
  .catch(undefined);

describe("parâmetro volta do login", () => {
  it("aceita caminhos internos", () => {
    expect(volta.parse("/app/pipeline")).toBe("/app/pipeline");
  });
  it("recusa endereços de outro site", () => {
    expect(volta.parse("//site-falso.com")).toBeUndefined();
    expect(volta.parse("/\\site-falso.com")).toBeUndefined();
    expect(volta.parse("https://site-falso.com")).toBeUndefined();
  });
});
