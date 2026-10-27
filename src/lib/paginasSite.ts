/**
 * Páginas do site editáveis por campos fixos (card CMS-4). Chaves de `site_blocos` e seus
 * campos, com os mesmos limites e regras da migração `cms4_paginas_editaveis` (o banco recusa
 * o que passar) e do site (`src/lib/blocos.ts` no fora-do-papel-blueprint).
 * Sem imports com "@/": o script `scripts/importar-paginas.ts` usa este arquivo pelo bun.
 */

export type FrenteId = "sistemas" | "ia" | "sites" | "automacoes";
export type GrupoPergunta = "preco" | "trabalho" | "depois";

export type BlocoTopo = { linha: string; titulo: string; apoio: string; link_sites: string };
export type BlocoFrente = {
  id: FrenteId;
  situacao: string;
  titulo: string;
  frase: string;
  topicos: string[];
};
export type BlocoPergunta = {
  pergunta: string;
  resposta: string;
  grupo: GrupoPergunta;
  inicio: boolean;
};
export type BlocoProjeto = {
  nome: string;
  linha: string;
  imagem: string | null;
  link: string | null;
};
export type BlocoQuemSomos = { titulo: string; texto: string };

export type Blocos = {
  "inicio.topo": BlocoTopo;
  "inicio.frentes": BlocoFrente[];
  perguntas: BlocoPergunta[];
  projetos: BlocoProjeto[];
  "quem-somos": BlocoQuemSomos;
};
export type ChaveBloco = keyof Blocos;

export const chavesBlocos: ChaveBloco[] = [
  "inicio.topo",
  "inicio.frentes",
  "perguntas",
  "projetos",
  "quem-somos",
];

export const rotuloBloco: Record<ChaveBloco, { titulo: string; resumo: string }> = {
  "inicio.topo": {
    titulo: "Topo da página inicial",
    resumo: "Linha acima, título, texto de apoio e link para sites.",
  },
  "inicio.frentes": {
    titulo: "O que fazemos",
    resumo: "As 4 frentes: situação, título, frase e tópicos.",
  },
  perguntas: {
    titulo: "Perguntas frequentes",
    resumo: "Página inicial e página de perguntas.",
  },
  projetos: {
    titulo: "Projetos reais",
    resumo: "Nome, linha, imagem e link de cada projeto.",
  },
  "quem-somos": { titulo: "Quem somos", resumo: "Título e texto." },
};

export const LIMITES = {
  topo: { linha: 40, titulo: 90, apoio: 300, link_sites: 80 },
  frente: { situacao: 90, titulo: 40, frase: 160, topico: 90, topicos: 6 },
  pergunta: { pergunta: 120, resposta: 600, itens: 30, inicio: 6 },
  projeto: { nome: 60, linha: 120, link: 300, itens: 3 },
  quemSomos: { titulo: 60, texto: 300 },
} as const;

export const frentesFixas: { id: FrenteId; rotulo: string }[] = [
  { id: "sistemas", rotulo: "01 · Sistemas sob medida (destaque)" },
  { id: "ia", rotulo: "02 · Inteligência artificial" },
  { id: "sites", rotulo: "03 · Sites" },
  { id: "automacoes", rotulo: "04 · Automações" },
];

export const gruposPerguntas: { id: GrupoPergunta; rotulo: string }[] = [
  { id: "preco", rotulo: "Preço e prazo" },
  { id: "trabalho", rotulo: "Como trabalhamos" },
  { id: "depois", rotulo: "Depois da entrega" },
];

/** Chamada fixa do topo (não editável, card CMS-4). */
export const CHAMADA_FIXA = "Marcar uma conversa";

// ---------------------------------------------------------------------------------------
// Contagem e títulos com destaque
// ---------------------------------------------------------------------------------------

const tamanho = (t: string) => [...t].length;
/** Caracteres que aparecem no site (sem os `**` do destaque). */
export const tamanhoVisivel = (t: string) => tamanho(t.replaceAll("**", ""));

const MARCADOR = /\[[A-ZÀ-Ý][A-ZÀ-Ý ]*\](?!\()/;
export const temMarcadorPagina = (t: string) => MARCADOR.test(t);

/** Partes do título: antes, destaque e depois. Sem destaque válido: tudo em `antes`. */
export function partesDoTitulo(t: string): { antes: string; forte: string; depois: string } {
  const m = /^([^*]*)\*\*([^*]+)\*\*([^*]*)$/.exec(t);
  if (!m) return { antes: t.replaceAll("*", ""), forte: "", depois: "" };
  return { antes: m[1] ?? "", forte: m[2] ?? "", depois: m[3] ?? "" };
}

const DESTAQUE_OK = /^[^*]*(\*\*[^*]+\*\*[^*]*)?$/;
export const IMAGEM_MIDIA =
  /^https:\/\/[a-z0-9.-]+(:\d+)?\/storage\/v1\/object\/public\/site-midia\/[A-Za-z0-9._/-]+\.(jpe?g|png|webp)$/;
export const LINK_PROJETO = /^(https:\/\/[^\s"'<>]+|\/[A-Za-z0-9/#?=&_.-]*)$/;

// ---------------------------------------------------------------------------------------
// Validação (espelho de public._site_bloco_erro). Lista vazia = pode salvar.
// ---------------------------------------------------------------------------------------

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const soChaves = (o: Record<string, unknown>, chaves: string[]) =>
  Object.keys(o).every((k) => chaves.includes(k));

function campo(problemas: string[], v: unknown, max: number, nome: string) {
  if (typeof v !== "string" || !v.trim()) problemas.push(`${nome}: preencha.`);
  else if (tamanho(v) > max) problemas.push(`${nome}: passa de ${max} caracteres.`);
}

function titulo(problemas: string[], v: unknown, max: number, nome: string) {
  if (typeof v !== "string" || !v.replaceAll("**", "").trim()) problemas.push(`${nome}: preencha.`);
  else if (!DESTAQUE_OK.test(v))
    problemas.push(`${nome}: use no máximo um destaque, entre ** e **, sem outros asteriscos.`);
  else if (tamanhoVisivel(v) > max) problemas.push(`${nome}: passa de ${max} caracteres.`);
}

function problemasTopo(v: unknown): string[] {
  if (!ehObjeto(v) || !soChaves(v, ["linha", "titulo", "apoio", "link_sites"]))
    return ["O topo tem só linha, título, apoio e link para sites."];
  const p: string[] = [];
  const L = LIMITES.topo;
  campo(p, v["linha"], L.linha, "Linha acima do título");
  titulo(p, v["titulo"], L.titulo, "Título");
  campo(p, v["apoio"], L.apoio, "Texto de apoio");
  campo(p, v["link_sites"], L.link_sites, "Link para sites");
  return p;
}

function problemasFrentes(v: unknown): string[] {
  if (!Array.isArray(v) || v.length !== 4) return ["São exatamente 4 frentes."];
  const p: string[] = [];
  const L = LIMITES.frente;
  const vistos = new Set<string>();
  v.forEach((f: unknown, i) => {
    const n = `Frente ${i + 1}`;
    if (!ehObjeto(f) || !soChaves(f, ["id", "situacao", "titulo", "frase", "topicos"])) {
      p.push(`${n}: formato inválido.`);
      return;
    }
    const id = f["id"];
    if (typeof id !== "string" || !frentesFixas.some((x) => x.id === id) || vistos.has(id))
      p.push(`${n}: frente desconhecida ou repetida.`);
    else vistos.add(id);
    campo(p, f["situacao"], L.situacao, `${n}, situação`);
    campo(p, f["titulo"], L.titulo, `${n}, título`);
    campo(p, f["frase"], L.frase, `${n}, frase`);
    const t = f["topicos"];
    if (!Array.isArray(t) || t.length < 1 || t.length > L.topicos)
      p.push(`${n}: de 1 a ${L.topicos} tópicos.`);
    else t.forEach((x: unknown, j) => campo(p, x, L.topico, `${n}, tópico ${j + 1}`));
  });
  return p;
}

function problemasPerguntas(v: unknown): string[] {
  const L = LIMITES.pergunta;
  if (!Array.isArray(v) || v.length < 1 || v.length > L.itens)
    return [`De 1 a ${L.itens} perguntas.`];
  const p: string[] = [];
  const vistas = new Set<string>();
  let naInicial = 0;
  v.forEach((q: unknown, i) => {
    const n = `Pergunta ${i + 1}`;
    if (!ehObjeto(q) || !soChaves(q, ["pergunta", "resposta", "grupo", "inicio"])) {
      p.push(`${n}: formato inválido.`);
      return;
    }
    campo(p, q["pergunta"], L.pergunta, n);
    campo(p, q["resposta"], L.resposta, `${n}, resposta`);
    if (!gruposPerguntas.some((g) => g.id === q["grupo"])) p.push(`${n}: escolha o grupo.`);
    if (typeof q["inicio"] !== "boolean") p.push(`${n}: formato inválido.`);
    else if (q["inicio"]) naInicial++;
    if (typeof q["pergunta"] === "string" && q["pergunta"].trim()) {
      if (vistas.has(q["pergunta"])) p.push(`${n}: repetida.`);
      vistas.add(q["pergunta"]);
    }
  });
  if (naInicial < 1 || naInicial > L.inicio)
    p.push(`Marque de 1 a ${L.inicio} perguntas para a página inicial (hoje: ${naInicial}).`);
  return p;
}

function problemasProjetos(v: unknown): string[] {
  const L = LIMITES.projeto;
  if (!Array.isArray(v) || v.length < 1 || v.length > L.itens)
    return [`De 1 a ${L.itens} projetos.`];
  const p: string[] = [];
  const vistos = new Set<string>();
  v.forEach((x: unknown, i) => {
    const n = `Projeto ${i + 1}`;
    if (!ehObjeto(x) || !soChaves(x, ["nome", "linha", "imagem", "link"])) {
      p.push(`${n}: formato inválido.`);
      return;
    }
    campo(p, x["nome"], L.nome, `${n}, nome`);
    campo(p, x["linha"], L.linha, `${n}, linha`);
    const imagem = x["imagem"] ?? null;
    if (imagem !== null && (typeof imagem !== "string" || !IMAGEM_MIDIA.test(imagem)))
      p.push(`${n}: escolha a imagem na Mídia do site (JPG, PNG ou WebP).`);
    const link = x["link"] ?? null;
    if (
      link !== null &&
      (typeof link !== "string" || tamanho(link) > L.link || !LINK_PROJETO.test(link))
    )
      p.push(`${n}: o link precisa começar com https:// ou / (sem espaços).`);
    if (typeof x["nome"] === "string" && x["nome"].trim()) {
      if (vistos.has(x["nome"])) p.push(`${n}: nome repetido.`);
      vistos.add(x["nome"]);
    }
  });
  return p;
}

function problemasQuemSomos(v: unknown): string[] {
  if (!ehObjeto(v) || !soChaves(v, ["titulo", "texto"]))
    return ["Quem somos tem só título e texto."];
  const p: string[] = [];
  titulo(p, v["titulo"], LIMITES.quemSomos.titulo, "Título");
  campo(p, v["texto"], LIMITES.quemSomos.texto, "Texto");
  return p;
}

const validadores: Record<ChaveBloco, (v: unknown) => string[]> = {
  "inicio.topo": problemasTopo,
  "inicio.frentes": problemasFrentes,
  perguntas: problemasPerguntas,
  projetos: problemasProjetos,
  "quem-somos": problemasQuemSomos,
};

/**
 * Problemas do valor da chave. `publicar`: também recusa marcador pendente ([PREÇO]),
 * como o banco faz ao publicar ou ao salvar bloco que já está no ar.
 */
export function problemasDoBloco(chave: ChaveBloco, valor: unknown, publicar = false): string[] {
  const p = validadores[chave](valor);
  if (publicar && temMarcadorPagina(JSON.stringify(valor ?? null)))
    p.push("Há marcador pendente, como [PREÇO]. Troque pelo texto final antes.");
  return p;
}

// ---------------------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------------------

/** Valor em branco para um site que ainda não tem a chave. */
export function valorVazio<K extends ChaveBloco>(chave: K): Blocos[K] {
  const vazios: Blocos = {
    "inicio.topo": { linha: "", titulo: "", apoio: "", link_sites: "" },
    "inicio.frentes": frentesFixas.map((f) => ({
      id: f.id,
      situacao: "",
      titulo: "",
      frase: "",
      topicos: [""],
    })),
    perguntas: [{ pergunta: "", resposta: "", grupo: "preco", inicio: true }],
    projetos: [{ nome: "", linha: "", imagem: null, link: null }],
    "quem-somos": { titulo: "", texto: "" },
  };
  return vazios[chave];
}

/** Valor do banco para o formulário; fora do formato esperado, começa em branco. */
export function valorParaForm<K extends ChaveBloco>(chave: K, valor: unknown): Blocos[K] {
  if (valor === undefined || valor === null) return valorVazio(chave);
  const vazio = valorVazio(chave);
  if (Array.isArray(vazio) !== Array.isArray(valor)) return vazio;
  // Cópia profunda: o formulário nunca altera o objeto do cache.
  return JSON.parse(JSON.stringify(valor)) as Blocos[K];
}

const limpar = (t: string) => t.trim();

/** O que vai para `site_bloco_salvar`: textos sem espaço nas pontas, opcionais vazios = null. */
export function valorDoForm<K extends ChaveBloco>(chave: K, v: Blocos[K]): Blocos[K] {
  const x = v as Blocos[ChaveBloco];
  switch (chave) {
    case "inicio.topo": {
      const t = x as BlocoTopo;
      return {
        linha: limpar(t.linha),
        titulo: limpar(t.titulo),
        apoio: limpar(t.apoio),
        link_sites: limpar(t.link_sites),
      } as Blocos[K];
    }
    case "inicio.frentes":
      return (x as BlocoFrente[]).map((f) => ({
        id: f.id,
        situacao: limpar(f.situacao),
        titulo: limpar(f.titulo),
        frase: limpar(f.frase),
        topicos: f.topicos.map(limpar),
      })) as Blocos[K];
    case "perguntas":
      return (x as BlocoPergunta[]).map((p) => ({
        pergunta: limpar(p.pergunta),
        resposta: limpar(p.resposta),
        grupo: p.grupo,
        inicio: p.inicio,
      })) as Blocos[K];
    case "projetos":
      return (x as BlocoProjeto[]).map((p) => ({
        nome: limpar(p.nome),
        linha: limpar(p.linha),
        imagem: p.imagem?.trim() || null,
        link: p.link?.trim() || null,
      })) as Blocos[K];
    default: {
      const q = x as BlocoQuemSomos;
      return { titulo: limpar(q.titulo), texto: limpar(q.texto) } as Blocos[K];
    }
  }
}

export const mesmoValor = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
