import { describe, expect, it } from "vitest";

import * as original from "../../docs/integracoes/catalogo-cg/catalogo-cg.mjs";
import {
  extrairCatalogo,
  injetarCatalogo,
  preencherRemoto,
  validarCatalogo,
  type CatalogoCg,
} from "@/lib/catalogoCg";

const dados: CatalogoCg = {
  config: {
    whatsappNumber: "+55 79 99651-6350",
    showPromoBanner: true,
    address: "Rua A, 1",
    hours: "Seg a sáb",
    instagram: "@cg",
  },
  categories: [{ id: "moda-social", name: "Moda Social" }],
  products: [
    {
      id: 1,
      name: "Camisa",
      category: "moda-social",
      brand: "X",
      priceCents: 24990,
      sizes: ["P"],
      colors: [{ n: "Branco", h: "#f4f3f1" }],
      badge: "promo",
      promoPct: 10,
    },
  ],
  testimonials: [{ quote: "Ótimo </script><script>alert(1)</script> 👍", author: "Rafael" }],
  brands: ["X"],
  img: { hero: "https://abc.supabase.co/storage/v1/object/public/site-midia/s/hero.jpg" },
  productImgs: {},
};
const html = `<html><script>const DATA = /*__CG_DATA__*/{"config":{}}/*__CG_DATA_END__*/;
const REMOTE = /*__CG_REMOTE__*/{"url":"","headers":{}}/*__CG_REMOTE_END__*/;</script></html>`;

describe("Contrato do site da CG · porta igual ao módulo original", () => {
  it("injetar gera exatamente o mesmo HTML", () => {
    expect(injetarCatalogo(html, dados)).toBe(original.injetarCatalogo(html, dados));
  });
  it("ida e volta sem perda, e </script> escapado", () => {
    const novo = injetarCatalogo(html, dados);
    expect(novo).not.toContain("</script><script>alert");
    expect(extrairCatalogo(novo).data).toEqual({ ...dados });
  });
  it("validar dá os mesmos erros que o original", () => {
    const ruim = {
      ...dados,
      products: [
        {
          ...dados.products[0]!,
          priceCents: 199.9,
          sizes: [],
          badge: "promo" as const,
          promoPct: undefined,
        },
      ],
    };
    expect(validarCatalogo(ruim as unknown as CatalogoCg)).toEqual(original.validarCatalogo(ruim));
    expect(validarCatalogo(ruim as unknown as CatalogoCg).length).toBeGreaterThan(0);
    expect(() => injetarCatalogo(html, ruim as unknown as CatalogoCg)).toThrow(/Catálogo inválido/);
  });
  it("preenche o bloco remoto sem tocar nos dados", () => {
    const novo = preencherRemoto(html, {
      url: "https://abc.supabase.co/rest/v1/rpc/site_catalogo_publicado?p_dominio=cg.test",
      headers: { apikey: "pub" },
    });
    expect(novo).toContain(
      '/*__CG_REMOTE__*/{"url":"https://abc.supabase.co/rest/v1/rpc/site_catalogo_publicado?p_dominio=cg.test","headers":{"apikey":"pub"}}/*__CG_REMOTE_END__*/',
    );
    expect(extrairCatalogo(novo).data).toEqual(extrairCatalogo(html).data);
    expect(() => preencherRemoto(html, { url: "http://inseguro.test", headers: {} })).toThrow();
  });
});
