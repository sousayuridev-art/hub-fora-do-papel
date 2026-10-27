import { describe, expect, it } from "vitest";

import {
  LIMITES,
  partesDoTitulo,
  problemasDoBloco,
  tamanhoVisivel,
  valorDoForm,
  valorParaForm,
  valorVazio,
  type BlocoFrente,
  type BlocoPergunta,
  type BlocoProjeto,
  type BlocoTopo,
} from "@/lib/paginasSite";
import { mensagemDoSite } from "@/lib/site";

/** Páginas editáveis (card CMS-4): mesmas regras da migração cms4_paginas_editaveis. */

const a = (n: number) => "a".repeat(n);
const IMAGEM = "https://abc.supabase.co/storage/v1/object/public/site-midia/7000/foto-1.webp";

const topo: BlocoTopo = {
  linha: "Para empresas de serviço",
  titulo: "**Sistemas sob medida** para empresas que cresceram.",
  apoio: "Apoio.",
  link_sites: "Precisa só de um site?",
};
const frentes: BlocoFrente[] = (["sistemas", "ia", "sites", "automacoes"] as const).map((id) => ({
  id,
  situacao: a(LIMITES.frente.situacao),
  titulo: a(LIMITES.frente.titulo),
  frase: a(LIMITES.frente.frase),
  topicos: Array.from({ length: LIMITES.frente.topicos }, () => a(LIMITES.frente.topico)),
}));
const pergunta: BlocoPergunta = {
  pergunta: a(LIMITES.pergunta.pergunta),
  resposta: a(LIMITES.pergunta.resposta),
  grupo: "preco",
  inicio: true,
};
const projeto: BlocoProjeto = {
  nome: a(LIMITES.projeto.nome),
  linha: a(LIMITES.projeto.linha),
  imagem: IMAGEM,
  link: "https://exemplo.com.br",
};

describe("Topo", () => {
  it("aceita os campos no limite e conta o título sem os asteriscos", () => {
    const t = { linha: a(40), titulo: `**${a(30)}** ${a(59)}`, apoio: a(300), link_sites: a(80) };
    expect(tamanhoVisivel(t.titulo)).toBe(90);
    expect(problemasDoBloco("inicio.topo", t)).toEqual([]);
  });
  it("recusa acima do limite, vazio, dois destaques e campo extra (chamada fixa)", () => {
    expect(problemasDoBloco("inicio.topo", { ...topo, linha: a(41) })).toHaveLength(1);
    expect(problemasDoBloco("inicio.topo", { ...topo, titulo: a(91) })).toHaveLength(1);
    expect(problemasDoBloco("inicio.topo", { ...topo, apoio: a(301) })).toHaveLength(1);
    expect(problemasDoBloco("inicio.topo", { ...topo, link_sites: a(81) })).toHaveLength(1);
    expect(problemasDoBloco("inicio.topo", { ...topo, apoio: "  " })).toHaveLength(1);
    expect(problemasDoBloco("inicio.topo", { ...topo, titulo: "**a** e **b**" })).toHaveLength(1);
    expect(problemasDoBloco("inicio.topo", { ...topo, chamada: "Comprar" })).toHaveLength(1);
  });
  it("marcador pendente só barra ao publicar", () => {
    const comMarcador = { ...topo, apoio: "Custa [PREÇO]." };
    expect(problemasDoBloco("inicio.topo", comMarcador)).toEqual([]);
    expect(problemasDoBloco("inicio.topo", comMarcador, true)).toHaveLength(1);
  });
  it("separa o destaque do título", () => {
    expect(partesDoTitulo("Do problema **ao sistema.**")).toEqual({
      antes: "Do problema ",
      forte: "ao sistema.",
      depois: "",
    });
    expect(partesDoTitulo("Sem destaque").forte).toBe("");
  });
});

describe("Frentes", () => {
  it("aceita as 4 frentes no limite", () => {
    expect(problemasDoBloco("inicio.frentes", frentes)).toEqual([]);
  });
  it("recusa limite estourado, 7 tópicos, nenhum tópico, frente repetida e 3 frentes", () => {
    const com = (i: number, f: Partial<BlocoFrente>) =>
      frentes.map((x, j) => (j === i ? { ...x, ...f } : x));
    expect(problemasDoBloco("inicio.frentes", com(0, { situacao: a(91) }))).not.toEqual([]);
    expect(problemasDoBloco("inicio.frentes", com(1, { titulo: a(41) }))).not.toEqual([]);
    expect(problemasDoBloco("inicio.frentes", com(2, { frase: a(161) }))).not.toEqual([]);
    expect(problemasDoBloco("inicio.frentes", com(3, { topicos: [a(91)] }))).not.toEqual([]);
    expect(problemasDoBloco("inicio.frentes", com(0, { topicos: Array(7).fill("x") }))).not.toEqual(
      [],
    );
    expect(problemasDoBloco("inicio.frentes", com(0, { topicos: [] }))).not.toEqual([]);
    expect(problemasDoBloco("inicio.frentes", com(1, { id: "sistemas" }))).not.toEqual([]);
    expect(problemasDoBloco("inicio.frentes", frentes.slice(0, 3))).not.toEqual([]);
  });
});

describe("Perguntas", () => {
  it("aceita pergunta 120 e resposta 600", () => {
    expect(problemasDoBloco("perguntas", [pergunta])).toEqual([]);
  });
  it("recusa limite, grupo, nenhuma ou mais de 6 na página inicial e repetidas", () => {
    expect(problemasDoBloco("perguntas", [{ ...pergunta, pergunta: a(121) }])).not.toEqual([]);
    expect(problemasDoBloco("perguntas", [{ ...pergunta, resposta: a(601) }])).not.toEqual([]);
    expect(problemasDoBloco("perguntas", [{ ...pergunta, grupo: "outro" }])).not.toEqual([]);
    expect(problemasDoBloco("perguntas", [{ ...pergunta, inicio: false }])).not.toEqual([]);
    const sete = Array.from({ length: 7 }, (_, i) => ({ ...pergunta, pergunta: `P${i}` }));
    expect(problemasDoBloco("perguntas", sete)).not.toEqual([]);
    expect(problemasDoBloco("perguntas", [pergunta, pergunta])).not.toEqual([]);
    expect(problemasDoBloco("perguntas", [])).not.toEqual([]);
  });
});

describe("Projetos", () => {
  it("aceita nome 60, linha 120, imagem do site-midia e link https ou do site", () => {
    expect(problemasDoBloco("projetos", [projeto])).toEqual([]);
    expect(problemasDoBloco("projetos", [{ ...projeto, imagem: null, link: "/artigos" }])).toEqual(
      [],
    );
  });
  it("recusa limite, imagem de fora, link inseguro e mais de 3 projetos", () => {
    expect(problemasDoBloco("projetos", [{ ...projeto, linha: a(121) }])).not.toEqual([]);
    expect(problemasDoBloco("projetos", [{ ...projeto, nome: a(61) }])).not.toEqual([]);
    expect(
      problemasDoBloco("projetos", [{ ...projeto, imagem: "https://x.com/foto.webp" }]),
    ).not.toEqual([]);
    expect(problemasDoBloco("projetos", [{ ...projeto, link: "javascript:alert(1)" }])).not.toEqual(
      [],
    );
    const quatro = ["A", "B", "C", "D"].map((nome) => ({ ...projeto, nome }));
    expect(problemasDoBloco("projetos", quatro)).not.toEqual([]);
  });
  it("campos opcionais vazios viram null ao salvar", () => {
    const v = valorDoForm("projetos", [{ nome: " X ", linha: "site", imagem: "", link: "  " }]);
    expect(v).toEqual([{ nome: "X", linha: "site", imagem: null, link: null }]);
    expect(problemasDoBloco("projetos", v)).toEqual([]);
  });
});

describe("Quem somos", () => {
  it("título 60 sem contar o destaque e texto 300", () => {
    expect(problemasDoBloco("quem-somos", { titulo: `**${a(60)}**`, texto: a(300) })).toEqual([]);
    expect(problemasDoBloco("quem-somos", { titulo: a(61), texto: "x" })).not.toEqual([]);
    expect(problemasDoBloco("quem-somos", { titulo: "T", texto: a(301) })).not.toEqual([]);
  });
});

describe("Formulário", () => {
  it("chave sem valor no banco começa em branco, com as 4 frentes", () => {
    expect(valorParaForm("inicio.frentes", undefined).map((f) => f.id)).toEqual([
      "sistemas",
      "ia",
      "sites",
      "automacoes",
    ]);
    expect(valorParaForm("quem-somos", null)).toEqual(valorVazio("quem-somos"));
  });
  it("não altera o objeto original (cópia para o formulário)", () => {
    const original = { titulo: "Q", texto: "T" };
    const copia = valorParaForm("quem-somos", original);
    copia.titulo = "Outro";
    expect(original.titulo).toBe("Q");
  });
  it("tira espaços das pontas antes de salvar", () => {
    expect(valorDoForm("quem-somos", { titulo: " Q ", texto: "T " })).toEqual({
      titulo: "Q",
      texto: "T",
    });
  });
  it("mostra o motivo da recusa do banco", () => {
    expect(
      mensagemDoSite({
        message: "bloco_invalido",
        details: "título: obrigatório, até 90 caracteres",
      }),
    ).toBe("O banco recusou: título: obrigatório, até 90 caracteres.");
    expect(mensagemDoSite({ message: "chave_invalida" })).toMatch(/não é editável/);
  });
});
