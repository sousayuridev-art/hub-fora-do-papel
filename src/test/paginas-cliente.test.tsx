import { describe, expect, it } from "vitest";

import {
  mensagemDaPagina,
  temMarcador,
  textosDaPagina,
  type DadosPagina,
} from "@/lib/paginasCliente";
import { criarConfigSecoes, tiposDeSecao } from "@/secoes/config";

const pagina = (titulo: string): DadosPagina => ({
  root: { props: { titulo: "Início", cor: "oceano" } },
  content: [
    {
      type: "Capa",
      props: {
        id: "capa-1",
        formato: "lado",
        chamada: "",
        titulo,
        texto: "Consultas e exames.",
        botao: "Falar no WhatsApp",
        link: "https://wa.me/5579",
        foto: "https://x.supabase.co/storage/v1/object/public/site-midia/s/capa.webp",
        descricaoFoto: "",
      },
    },
  ],
});

describe("PC-4 · páginas", () => {
  it("acha marcador pendente como o banco", () => {
    expect(temMarcador(pagina("[TÍTULO DA CAPA]"))).toBe(true);
    expect(temMarcador(pagina("Cuidado para o seu pet"))).toBe(false);
    // link em markdown com texto em caixa alta não é marcador
    expect(temMarcador(pagina("Veja o [FAQ](/perguntas)"))).toBe(false);
  });
  it("junta os textos digitados para copiar no conflito, sem links nem ids", () => {
    const t = textosDaPagina(pagina("Cuidado para o seu pet"));
    expect(t).toContain("Cuidado para o seu pet");
    expect(t).toContain("Consultas e exames.");
    expect(t).not.toContain("https://");
    expect(t).not.toContain("capa-1");
  });
  it("seções novas nascem com marcador, para não irem ao ar sem texto real", () => {
    const config = criarConfigSecoes({
      campoFoto: { type: "custom", render: () => <span /> },
    });
    for (const t of tiposDeSecao)
      expect(JSON.stringify(config.components[t].defaultProps)).toMatch(/\[[A-ZÀ-Ý ]+\]/);
  });
  it("travada não se move, não se duplica e não sai", () => {
    const config = criarConfigSecoes({
      campoFoto: { type: "custom", render: () => <span /> },
      travadas: ["Rodape"],
    });
    expect(config.components.Rodape.permissions).toEqual({
      drag: false,
      delete: false,
      duplicate: false,
    });
    expect(config.components.Capa.permissions).toBeUndefined();
  });
  it("explica as recusas do banco em português", () => {
    expect(mensagemDaPagina({ message: "secao_travada" })).toContain("seção fixa");
    expect(mensagemDaPagina({ message: "pagina_alterada" })).toContain("outra pessoa");
  });
});

describe("Revisão de segurança · links das seções", () => {
  it("só deixa passar https, caminho, âncora, mailto e tel", async () => {
    const { linkSeguro } = await import("@/secoes/link");
    expect(linkSeguro("javascript:alert(1)")).toBe("#");
    expect(linkSeguro("http://inseguro.test")).toBe("#");
    expect(linkSeguro("https://wa.me/5579999990001")).toBe("https://wa.me/5579999990001");
    expect(linkSeguro("/contato")).toBe("/contato");
    expect(linkSeguro("tel:+55 79 99999-0001")).toBe("tel:+55 79 99999-0001");
    expect(linkSeguro("")).toBe("#");
  });
});
