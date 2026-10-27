import { describe, expect, it } from "vitest";

import {
  contagem,
  corpoParaEditor,
  dadosDoForm,
  formDoArtigo,
  formVazio,
  idDaSecao,
  montarBloco,
  montarCorpo,
  mover,
  mudarTitulo,
  mudou,
  novaSecao,
  novoBloco,
  partesDoTexto,
  problemasDoArtigo,
  problemasDoCorpo,
  remover,
  slugDoTitulo,
  temMarcador,
  type BlocoEditor,
  type FormArtigo,
  type SecaoEditor,
} from "@/lib/editorArtigo";
import { mensagemDoSite, nomeNoBucket, problemaDaImagem, type ArtigoCompleto } from "@/lib/site";

const bloco = (p: Partial<BlocoEditor>): BlocoEditor => ({
  ...novoBloco(p.tipo ?? "paragrafo"),
  ...p,
});
const secao = (titulo: string, blocos: BlocoEditor[], id = ""): SecaoEditor => ({
  ...novaSecao(),
  id,
  titulo,
  blocos,
});

/** Artigo pronto para publicar. */
function completo(): FormArtigo {
  return {
    ...formVazio(),
    titulo: "Como decidir entre CRM pronto e sob medida",
    categoria: "Organização",
    slug: "crm-pronto-ou-sob-medida",
    resumo: "Quando um CRM pronto resolve e quando vale um sistema próprio.",
    titulo_seo: "CRM pronto ou sob medida: como decidir",
    descricao: "Os sinais de que o CRM pronto apertou e uma conta simples para escolher.",
    leitura: "6 min",
    autor: "Yuri Sousa",
    corpo: {
      pontos: ["Primeiro ponto.", "Segundo ponto.", "Terceiro ponto."],
      secoes: [secao("Quando o pronto resolve", [bloco({ texto: "Texto da seção." })])],
    },
  };
}

describe("montar blocos", () => {
  it("parágrafo e dica viram texto sem espaços sobrando; vazio some", () => {
    expect(montarBloco(bloco({ texto: "  Olá  " }))).toBe("Olá");
    expect(montarBloco(bloco({ texto: "   " }))).toBeNull();
    expect(montarBloco(bloco({ tipo: "dica", texto: " Use **isto** " }))).toEqual({
      dica: "Use **isto**",
    });
  });

  it("lista e passos: um item por linha, sem linhas vazias", () => {
    expect(montarBloco(bloco({ tipo: "lista", texto: "um\n\n  dois \n" }))).toEqual({
      lista: ["um", "dois"],
    });
    expect(montarBloco(bloco({ tipo: "passos", texto: "a\nb" }))).toEqual({ passos: ["a", "b"] });
    expect(montarBloco(bloco({ tipo: "lista", texto: "\n \n" }))).toBeNull();
  });

  it("exemplo guarda título e texto; totalmente vazio some", () => {
    expect(montarBloco(bloco({ tipo: "exemplo", titulo: " Loja ", texto: " Caso " }))).toEqual({
      exemplo: { titulo: "Loja", texto: "Caso" },
    });
    expect(montarBloco(bloco({ tipo: "exemplo" }))).toBeNull();
  });

  it("ida e volta: o corpo do banco volta igual depois de passar pela tela", () => {
    const corpo = {
      pontos: ["a", "b", "c"],
      secoes: [
        {
          id: "inicio",
          titulo: "Início",
          blocos: [
            "Parágrafo com [link](/contato).",
            { lista: ["x", "y"] },
            { passos: ["1", "2"] },
            { dica: "Dica" },
            { exemplo: { titulo: "Ex", texto: "Texto" } },
          ],
        },
      ],
    };
    expect(montarCorpo(corpoParaEditor(corpo))).toEqual(corpo);
  });

  it("corpo estranho do banco não quebra a tela", () => {
    const e = corpoParaEditor({ pontos: ["só um"], secoes: [null, { titulo: 3, blocos: [7] }] });
    expect(e.pontos).toEqual(["só um", "", ""]);
    expect(e.secoes).toHaveLength(1);
    expect(e.secoes[0]?.blocos).toHaveLength(0);
    expect(corpoParaEditor(null).secoes).toEqual([]);
  });

  it("seção nova ganha id do título sem repetir; id existente não muda", () => {
    const c = montarCorpo({
      pontos: ["", "", ""],
      secoes: [
        secao("Por onde começar", [bloco({ texto: "a" })], "por-onde-comecar"),
        secao("Por onde começar", [bloco({ texto: "b" })]),
        secao("Ação!", [bloco({ texto: "c" })], "fixo"),
      ],
    });
    expect(c.secoes.map((s) => s.id)).toEqual(["por-onde-comecar", "por-onde-comecar-2", "fixo"]);
  });

  it("seção vazia some; blocos vazios saem da seção", () => {
    const c = montarCorpo({
      pontos: ["", "", ""],
      secoes: [secao("", [bloco({})]), secao("Com texto", [bloco({}), bloco({ texto: "ok" })])],
    });
    expect(c.secoes).toEqual([{ id: "com-texto", titulo: "Com texto", blocos: ["ok"] }]);
  });

  it("id da seção cabe na regra do banco (até 40, só a-z0-9-)", () => {
    const id = idDaSecao("Título muito comprido ".repeat(5), new Set());
    expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
    expect(idDaSecao("???", new Set(["secao"]))).toBe("secao-2");
  });
});

describe("validar", () => {
  it("rascunho exige título, categoria e endereço válido", () => {
    const p = problemasDoArtigo(formVazio(), false);
    expect(p.join(" ")).toMatch(/título/);
    expect(p.join(" ")).toMatch(/categoria/);
    expect(p.join(" ")).toMatch(/endereço/);
    expect(problemasDoArtigo(completo(), false)).toEqual([]);
  });

  it("publicar exige título SEO, descrição, resumo, 3 pontos e uma seção", () => {
    const f: FormArtigo = {
      ...completo(),
      titulo_seo: "",
      descricao: "",
      resumo: "",
      corpo: { pontos: ["a", "", "c"], secoes: [] },
    };
    expect(problemasDoArtigo(f, false)).toEqual([]);
    const p = problemasDoArtigo(f, true).join(" | ");
    expect(p).toMatch(/título para o Google/);
    expect(p).toMatch(/descrição/);
    expect(p).toMatch(/resumo/);
    expect(p).toMatch(/3 pontos/);
    expect(p).toMatch(/uma seção/);
    expect(problemasDoArtigo(completo(), true)).toEqual([]);
  });

  it("limites de 60 e 155 caracteres", () => {
    const f = { ...completo(), titulo_seo: "x".repeat(61), descricao: "y".repeat(156) };
    const p = problemasDoArtigo(f, false).join(" ");
    expect(p).toMatch(/Google passa de 60/);
    expect(p).toMatch(/descrição passa de 155/);
  });

  it("marcador pendente impede publicar, mas link em caixa alta não", () => {
    expect(temMarcador("Custa [PREÇO] por mês")).toBe(true);
    expect(temMarcador("Veja o [NOME DO CLIENTE]")).toBe(true);
    expect(temMarcador("Leia o [FAQ](/perguntas)")).toBe(false);
    expect(temMarcador("[link](/x) e **destaque**")).toBe(false);
    const f = completo();
    f.corpo = {
      ...f.corpo,
      secoes: [secao("Preço", [bloco({ texto: "A partir de [PREÇO]." })])],
    };
    expect(problemasDoArtigo(f, false)).toEqual([]);
    expect(problemasDoArtigo(f, true).join(" ")).toMatch(/marcador/);
  });

  it("corpo: seção sem título, exemplo pela metade e lista longa", () => {
    const p = problemasDoCorpo({
      pontos: ["", "", ""],
      secoes: [
        secao("", [bloco({ texto: "sem título" })]),
        secao("Ok", [
          bloco({ tipo: "exemplo", titulo: "Só título" }),
          bloco({ tipo: "lista", texto: Array.from({ length: 31 }, (_, i) => `${i}`).join("\n") }),
        ]),
      ],
    }).join(" | ");
    expect(p).toMatch(/seção 1 está sem título/);
    expect(p).toMatch(/exemplo .* título e texto/);
    expect(p).toMatch(/mais de 30 itens/);
  });

  it("capa por imagem precisa de endereço https", () => {
    const f = { ...completo(), capa: "imagem" as const, capaUrl: "http://x.com/a.png" };
    expect(problemasDoArtigo(f, false).join(" ")).toMatch(/capa/);
    expect(problemasDoArtigo({ ...f, capaUrl: "https://x.supabase.co/a.png" }, false)).toEqual([]);
  });
});

describe("contadores", () => {
  it("conta caracteres como o banco e marca perto e passou", () => {
    expect(contagem("", 60)).toEqual({ usados: 0, limite: 60, tom: "normal" });
    expect(contagem("x".repeat(54), 60).tom).toBe("perto");
    expect(contagem("x".repeat(60), 60).tom).toBe("perto");
    expect(contagem("x".repeat(61), 60).tom).toBe("passou");
    expect(contagem("ação 🙂", 155).usados).toBe(6);
  });
});

describe("mover seções e blocos", () => {
  const l = ["a", "b", "c"];
  it("sobe e desce uma casa", () => {
    expect(mover(l, 1, -1)).toEqual(["b", "a", "c"]);
    expect(mover(l, 1, 1)).toEqual(["a", "c", "b"]);
  });
  it("nas pontas não muda e não altera a lista original", () => {
    expect(mover(l, 0, -1)).toEqual(l);
    expect(mover(l, 2, 1)).toEqual(l);
    expect(mover(l, 5, 1)).toEqual(l);
    expect(l).toEqual(["a", "b", "c"]);
  });
  it("remove pelo índice", () => {
    expect(remover(l, 1)).toEqual(["a", "c"]);
  });
  it("mover seções preserva os ids das âncoras", () => {
    const s = [secao("Um", [bloco({ texto: "1" })], "um"), secao("Dois", [bloco({ texto: "2" })])];
    const c = montarCorpo({ pontos: ["", "", ""], secoes: mover(s, 1, -1) });
    expect(c.secoes.map((x) => x.id)).toEqual(["dois", "um"]);
  });
});

describe("formulário", () => {
  it("endereço acompanha o título até ser editado ou travado", () => {
    let f = mudarTitulo(formVazio(), "Sites e Lojas: o que é?", false);
    expect(f.slug).toBe("sites-e-lojas-o-que-e");
    f = { ...f, slug: "meu-endereco", slugManual: true };
    expect(mudarTitulo(f, "Outro", false).slug).toBe("meu-endereco");
    expect(mudarTitulo({ ...f, slugManual: false }, "Outro", true).slug).toBe("meu-endereco");
    expect(slugDoTitulo("  Ação -- rápida!! ")).toBe("acao-rapida");
  });

  it("artigo do banco vira formulário e volta igual", () => {
    const a: ArtigoCompleto = {
      id: "1",
      site_id: "s",
      slug: "um-artigo",
      categoria: "Organização",
      titulo: "Um artigo",
      titulo_seo: null,
      descricao: "Desc",
      resumo: null,
      capa: "https://x.supabase.co/storage/v1/object/public/site-midia/s/a.png",
      corpo: { pontos: ["a", "b", "c"], secoes: [{ id: "x", titulo: "X", blocos: ["t"] }] },
      leitura: null,
      autor: "Yuri",
      situacao: "publicado",
      publicado_em: "2026-10-27T10:00:00+00:00",
      atualizado_em: "2026-10-27T10:00:00.123456+00:00",
      ordem: 0,
    };
    const f = formDoArtigo(a);
    expect(f.capa).toBe("imagem");
    expect(dadosDoForm(f)).toEqual({
      slug: "um-artigo",
      categoria: "Organização",
      titulo: "Um artigo",
      titulo_seo: "",
      descricao: "Desc",
      resumo: "",
      leitura: "",
      autor: "Yuri",
      capa: a.capa,
      corpo: a.corpo,
    });
    expect(mudou(f, formDoArtigo(a))).toBe(false);
    expect(mudou({ ...f, titulo: "Outro" }, f)).toBe(true);
  });
});

describe("texto do site", () => {
  it("separa links e destaques como o site", () => {
    expect(partesDoTexto("Veja [contato](/contato), **já** e [site](https://x.com).")).toEqual([
      { tipo: "texto", texto: "Veja " },
      { tipo: "link", texto: "contato", destino: "/contato", externo: false },
      { tipo: "texto", texto: ", " },
      { tipo: "destaque", texto: "já" },
      { tipo: "texto", texto: " e " },
      { tipo: "link", texto: "site", destino: "https://x.com", externo: true },
      { tipo: "texto", texto: "." },
    ]);
    expect(partesDoTexto("sem nada")).toEqual([{ tipo: "texto", texto: "sem nada" }]);
  });
});

describe("mídia e mensagens", () => {
  it("aceita jpg, png e webp até 2 MB", () => {
    expect(problemaDaImagem({ name: "a.png", type: "image/png", size: 1000 })).toBeNull();
    expect(problemaDaImagem({ name: "a.jpg", type: "", size: 1000 })).toBeNull();
    expect(problemaDaImagem({ name: "a.svg", type: "image/svg+xml", size: 10 })).toMatch(/JPG/);
    expect(
      problemaDaImagem({ name: "a.webp", type: "image/webp", size: 2 * 1024 * 1024 + 1 }),
    ).toMatch(/2 MB/);
  });

  it("nome no bucket segue a regra do banco", () => {
    const n = nomeNoBucket({ name: "Foto Ação (1).JPEG", type: "image/jpeg" }, "abc");
    expect(n).toBe("foto-acao-1-abc.jpg");
    expect(`00000000-0000-0000-0000-000000000000/${n}`).toMatch(
      /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$/,
    );
  });

  it("traduz as recusas da RPC", () => {
    expect(mensagemDoSite({ message: "artigo_alterado" })).toMatch(/versão mais nova/);
    expect(mensagemDoSite({ message: "marcador_pendente" })).toMatch(/\[PREÇO\]/);
    expect(mensagemDoSite({ message: "corpo_invalido", details: "seção inválida" })).toMatch(
      /seção inválida/,
    );
    expect(mensagemDoSite(new Error("Failed to fetch"))).toBeNull();
  });
});
