import { describe, expect, it } from "vitest";

import { acoesRapidas, gruposDoPortal } from "@/components/layout/navegacao";

const nomes = (g: ReturnType<typeof gruposDoPortal>) =>
  g.map((x) => `${x.titulo ?? "-"}: ${x.itens.map((i) => i.rotulo).join(", ")}`);

describe("PC-1 · menu do painel pelos módulos do site", () => {
  it("responsável com páginas, artigos e contatos: sem Loja, com Pagamentos", () => {
    expect(nomes(gruposDoPortal("responsavel", ["paginas", "artigos", "contatos"]))).toEqual([
      "-: Início",
      "Meu site: Páginas, Artigos, Fotos e arquivos",
      "Clientes: Contatos, Desempenho",
      "Fora do Papel: Aprovações, Pedidos de ajuste, Pagamentos, Arquivos",
      "-: Ajustes",
    ]);
  });

  it("equipe não vê Pagamentos", () => {
    const itens = gruposDoPortal("equipe", ["paginas", "artigos", "contatos"]).flatMap(
      (g) => g.itens,
    );
    expect(itens.map((i) => i.rotulo)).not.toContain("Pagamentos");
  });

  it("perfil ainda carregando não mostra Pagamentos", () => {
    const itens = gruposDoPortal(null, null).flatMap((g) => g.itens);
    expect(itens.map((i) => i.rotulo)).not.toContain("Pagamentos");
  });

  it("com loja: Produtos, Vendas e Cupons", () => {
    const loja = gruposDoPortal("responsavel", ["loja"]).find((g) => g.titulo === "Loja");
    expect(loja?.itens.map((i) => i.rotulo)).toEqual(["Produtos", "Vendas", "Cupons"]);
  });

  it("sem site (ou leitura falhou): só Início, Fora do Papel e Ajustes", () => {
    expect(gruposDoPortal("responsavel", null).map((g) => g.titulo)).toEqual([
      null,
      "Fora do Papel",
      null,
    ]);
  });

  it("telas dos próximos cards aparecem como Em breve; as que existem, não", () => {
    const itens = gruposDoPortal("responsavel", ["paginas", "loja", "contatos"]).flatMap(
      (g) => g.itens,
    );
    const emBreve = itens.filter((i) => i.emBreve).map((i) => i.rotulo);
    expect(emBreve).toContain("Páginas");
    expect(emBreve).not.toContain("Aprovações");
    expect(emBreve).not.toContain("Início");
    expect(emBreve).not.toContain("Fotos e arquivos");
  });
});

describe("PC-1 · ações rápidas", () => {
  it("seguem os módulos e sempre têm Pedir um ajuste", () => {
    expect(acoesRapidas(["paginas", "artigos"]).map((a) => a.id)).toEqual([
      "pedido",
      "capa",
      "artigo",
      "horario",
    ]);
    expect(acoesRapidas(null).map((a) => a.id)).toEqual(["pedido"]);
    expect(acoesRapidas(["loja"]).find((a) => a.id === "pedido")?.emBreve).toBeUndefined();
    // PC-3: escrever artigo já funciona e abre a tela de artigos
    expect(acoesRapidas(["artigos"]).find((a) => a.id === "artigo")).toMatchObject({
      para: "/portal/site/artigos",
    });
    expect(acoesRapidas(["artigos"]).find((a) => a.id === "artigo")?.emBreve).toBeUndefined();
  });
});
