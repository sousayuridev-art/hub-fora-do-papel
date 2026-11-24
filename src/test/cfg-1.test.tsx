import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// CFG-1: Configurações em abas. A rota usa o componente Abas e a busca `aba`.
const fonte = readFileSync("src/routes/app/configuracoes.tsx", "utf8");

describe("CFG-1 · Configurações em abas", () => {
  it("tem uma aba por assunto, na ordem combinada", () => {
    const rotulos = [...fonte.matchAll(/\{ id: "(\w+)", rotulo: "([^"]+)" \}/g)].map((m) => m[2]);
    expect(rotulos).toEqual(["Preços", "Recebimento", "Google Meet", "Segurança", "Avançado"]);
    expect(fonte).toContain("<Abas<Aba>");
  });

  it("a volta do Google abre na aba do Google", () => {
    expect(fonte).toContain('abaBusca ?? (google ? "google" : "precos")');
    expect(fonte).toContain('search: { aba: "google" }');
  });
});
