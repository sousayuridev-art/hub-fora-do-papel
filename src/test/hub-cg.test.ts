import { describe, expect, it } from "vitest";

import { mensagemDoCatalogo, problemasDoProduto, type DadosProduto } from "@/lib/catalogo";
import { centavosDoTexto, textoDinheiroCompleto, textoDinheiroDigitando } from "@/lib/formatar";

const base: DadosProduto = {
  nome: "Polo Azul",
  categoria: "c1",
  marca: null,
  preco_cents: 1999000,
  tamanhos: [],
  cores: [],
  selo: null,
  promo_pct: null,
  fotos: [],
};

describe("HUB-CG-02 · produto", () => {
  it("promoção sem percentual é bloqueada no campo", () => {
    expect(problemasDoProduto({ ...base, selo: "promo" }).promo_pct).toMatch(/desconto/);
    expect(problemasDoProduto({ ...base, selo: "promo", promo_pct: 20 }).promo_pct).toBeUndefined();
  });
  it("nome e categoria obrigatórios", () => {
    const e = problemasDoProduto({ ...base, nome: " ", categoria: "" });
    expect(e.nome).toBeDefined();
    expect(e.categoria).toBeDefined();
  });
  it("preço: 19990 digitado vira 19.990 / 19.990,00 e vai como 1999000 centavos", () => {
    expect(textoDinheiroDigitando("19990")).toBe("19.990");
    expect(textoDinheiroCompleto("19990")).toBe("19.990,00");
    expect(centavosDoTexto("19.990,00")).toBe(1999000);
  });
  it("erros do banco em português", () => {
    expect(mensagemDoCatalogo({ message: "categoria_com_produtos" })).toMatch(/ainda tem produtos/);
    expect(mensagemDoCatalogo({ message: "preco_invalido" })).toMatch(/reais e centavos/);
  });
});
