import type { ArtigoCompleto, CapaArtigo, DadosArtigo } from "@/lib/site";

/**
 * Editor de artigo (card CMS-2): funções puras que montam, validam e reorganizam o corpo.
 * O formato gravado é o ConteudoArtigo do site (migração CMS-1, `site_artigos.corpo`):
 *   { pontos: [3 textos], secoes: [{ id, titulo, blocos: Bloco[] }] }
 * As regras aqui espelham as do banco para avisar antes; quem decide é a RPC.
 */

export type Bloco =
  | string
  | { lista: string[] }
  | { passos: string[] }
  | { dica: string }
  | { exemplo: { titulo: string; texto: string } };
export type Secao = { id: string; titulo: string; blocos: Bloco[] };
export type ConteudoArtigo = { pontos: string[]; secoes: Secao[] };

export type TipoBloco = "paragrafo" | "lista" | "passos" | "dica" | "exemplo";

/** Bloco na tela. Lista e passos: um item por linha em `texto`. `titulo` só no exemplo. */
export type BlocoEditor = { chave: string; tipo: TipoBloco; texto: string; titulo: string };
/** Seção na tela. `id` vazio = seção nova (o id nasce do título ao salvar). */
export type SecaoEditor = { chave: string; id: string; titulo: string; blocos: BlocoEditor[] };
export type CorpoEditor = { pontos: [string, string, string]; secoes: SecaoEditor[] };

export type FormArtigo = {
  titulo: string;
  categoria: string;
  slug: string;
  /** A pessoa mexeu no endereço: ele deixa de acompanhar o título. */
  slugManual: boolean;
  resumo: string;
  titulo_seo: string;
  descricao: string;
  leitura: string;
  autor: string;
  capa: CapaArtigo | "imagem";
  capaUrl: string;
  corpo: CorpoEditor;
};

/** Limites (mesmos da migração CMS-1). */
export const limites = {
  titulo: 160,
  categoria: 60,
  slug: 80,
  titulo_seo: 60,
  descricao: 155,
  resumo: 300,
  leitura: 20,
  autor: 80,
  capaUrl: 600,
  ponto: 400,
  secoes: 40,
  tituloSecao: 160,
  blocos: 80,
  paragrafo: 4000,
  itens: 30,
  item: 2000,
  dica: 2000,
  tituloExemplo: 160,
  textoExemplo: 4000,
} as const;

export const rotuloTipoBloco: Record<TipoBloco, string> = {
  paragrafo: "Parágrafo",
  lista: "Lista",
  passos: "Passos",
  dica: "Dica",
  exemplo: "Exemplo",
};

let sequencia = 0;
/** Chave local para o React (não vai ao banco). */
export const novaChave = () => `k${(++sequencia).toString(36)}`;

/** Tamanho como o Postgres conta (caracteres, não unidades UTF-16). */
export const tamanho = (t: string) => [...t].length;

export type Contagem = { usados: number; limite: number; tom: "normal" | "perto" | "passou" };

/** Contador dos campos com limite: perto a partir de 90% do limite. */
export function contagem(texto: string, limite: number): Contagem {
  const usados = tamanho(texto);
  const tom = usados > limite ? "passou" : usados >= Math.ceil(limite * 0.9) ? "perto" : "normal";
  return { usados, limite, tom };
}

/** Marcador pendente ([PREÇO], [NOME DO CLIENTE]); link em caixa alta ([FAQ](/x)) não conta. */
export function temMarcador(texto: string): boolean {
  return /\[[A-ZÀ-Ý][A-ZÀ-Ý ]*\](?!\()/.test(texto);
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Endereço a partir do título: minúsculas, sem acento, palavras separadas por hífen. */
export function slugDoTitulo(titulo: string, max: number = limites.slug): string {
  return semAcento(titulo)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

export const slugValido = (s: string) => /^[a-z0-9-]{3,80}$/.test(s);

/** Id da seção (âncora no site) a partir do título, sem repetir os já usados. */
export function idDaSecao(titulo: string, usados: ReadonlySet<string>): string {
  const base = slugDoTitulo(titulo, 34) || "secao";
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  return id;
}

// ---------------------------------------------------------------------------
// Blocos e seções
// ---------------------------------------------------------------------------

export function novoBloco(tipo: TipoBloco): BlocoEditor {
  return { chave: novaChave(), tipo, texto: "", titulo: "" };
}

export function novaSecao(): SecaoEditor {
  return { chave: novaChave(), id: "", titulo: "", blocos: [novoBloco("paragrafo")] };
}

/** Itens de lista e passos: um por linha, sem linhas vazias. */
export const itensDoTexto = (t: string) =>
  t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

function blocoParaEditor(b: unknown): BlocoEditor | null {
  const base = { chave: novaChave(), texto: "", titulo: "" };
  if (typeof b === "string") return { ...base, tipo: "paragrafo", texto: b };
  if (!b || typeof b !== "object") return null;
  const o = b as {
    lista?: unknown;
    passos?: unknown;
    dica?: unknown;
    exemplo?: { titulo?: unknown; texto?: unknown } | null;
  };
  const textos = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").join("\n") : "";
  if ("lista" in o) return { ...base, tipo: "lista", texto: textos(o.lista) };
  if ("passos" in o) return { ...base, tipo: "passos", texto: textos(o.passos) };
  if ("dica" in o)
    return { ...base, tipo: "dica", texto: typeof o.dica === "string" ? o.dica : "" };
  if ("exemplo" in o && o.exemplo && typeof o.exemplo === "object") {
    const e = o.exemplo;
    return {
      ...base,
      tipo: "exemplo",
      titulo: typeof e.titulo === "string" ? e.titulo : "",
      texto: typeof e.texto === "string" ? e.texto : "",
    };
  }
  return null;
}

/** Corpo do banco para a tela (tolerante a formato incompleto). */
export function corpoParaEditor(c: unknown): CorpoEditor {
  const o = (c && typeof c === "object" ? c : {}) as { pontos?: unknown; secoes?: unknown };
  const p = Array.isArray(o.pontos) ? o.pontos : [];
  const ponto = (i: number) => (typeof p[i] === "string" ? (p[i] as string) : "");
  const secoes = Array.isArray(o.secoes) ? o.secoes : [];
  return {
    pontos: [ponto(0), ponto(1), ponto(2)],
    secoes: secoes.flatMap((s): SecaoEditor[] => {
      if (!s || typeof s !== "object") return [];
      const x = s as { id?: unknown; titulo?: unknown; blocos?: unknown };
      return [
        {
          chave: novaChave(),
          id: typeof x.id === "string" ? x.id : "",
          titulo: typeof x.titulo === "string" ? x.titulo : "",
          blocos: (Array.isArray(x.blocos) ? x.blocos : []).flatMap((b) => {
            const e = blocoParaEditor(b);
            return e ? [e] : [];
          }),
        },
      ];
    }),
  };
}

/** Bloco da tela para o formato do site. Bloco vazio some (null). */
export function montarBloco(b: BlocoEditor): Bloco | null {
  const texto = b.texto.trim();
  switch (b.tipo) {
    case "paragrafo":
      return texto ? texto : null;
    case "dica":
      return texto ? { dica: texto } : null;
    case "lista":
    case "passos": {
      const itens = itensDoTexto(b.texto);
      if (!itens.length) return null;
      return b.tipo === "lista" ? { lista: itens } : { passos: itens };
    }
    case "exemplo": {
      const titulo = b.titulo.trim();
      if (!titulo && !texto) return null;
      return { exemplo: { titulo, texto } };
    }
  }
}

/** Seção vazia (sem título e sem blocos com conteúdo) não vai ao banco. */
const secaoVazia = (s: SecaoEditor) =>
  !s.titulo.trim() && s.blocos.every((b) => montarBloco(b) === null);

/**
 * Corpo da tela para o formato gravado: tira espaços, descarta blocos e seções vazios e dá id
 * às seções novas a partir do título (sem repetir). Ids que já existem não mudam (são âncoras).
 */
export function montarCorpo(c: CorpoEditor): ConteudoArtigo {
  const secoes = c.secoes.filter((s) => !secaoVazia(s));
  const usados = new Set(secoes.map((s) => s.id).filter(Boolean));
  return {
    pontos: c.pontos.map((p) => p.trim()),
    secoes: secoes.map((s) => {
      let id = s.id;
      if (!id) {
        id = idDaSecao(s.titulo, usados);
        usados.add(id);
      }
      return {
        id,
        titulo: s.titulo.trim(),
        blocos: s.blocos.flatMap((b) => {
          const m = montarBloco(b);
          return m === null ? [] : [m];
        }),
      };
    }),
  };
}

/** Move um item uma casa para cima (-1) ou para baixo (1). Fora dos limites, nada muda. */
export function mover<T>(lista: readonly T[], indice: number, direcao: -1 | 1): T[] {
  const alvo = indice + direcao;
  if (indice < 0 || indice >= lista.length || alvo < 0 || alvo >= lista.length) return [...lista];
  const nova = [...lista];
  const [item] = nova.splice(indice, 1) as [T];
  nova.splice(alvo, 0, item);
  return nova;
}

export function remover<T>(lista: readonly T[], indice: number): T[] {
  return lista.filter((_, i) => i !== indice);
}

export function trocar<T>(lista: readonly T[], indice: number, f: (x: T) => T): T[] {
  return lista.map((x, i) => (i === indice ? f(x) : x));
}

// ---------------------------------------------------------------------------
// Validação (avisa antes de ir ao banco)
// ---------------------------------------------------------------------------

/** Problemas do corpo que o banco recusaria em qualquer gravação (formato). */
export function problemasDoCorpo(c: CorpoEditor): string[] {
  const p: string[] = [];
  c.pontos.forEach((x, i) => {
    if (tamanho(x.trim()) > limites.ponto)
      p.push(`O ponto ${i + 1} passa de ${limites.ponto} caracteres.`);
  });
  const secoes = c.secoes.filter((s) => !secaoVazia(s));
  if (secoes.length > limites.secoes) p.push(`Use no máximo ${limites.secoes} seções.`);
  secoes.forEach((s, i) => {
    const nome = s.titulo.trim() ? `"${s.titulo.trim()}"` : `${i + 1}`;
    if (!s.titulo.trim()) p.push(`A seção ${i + 1} está sem título.`);
    else if (tamanho(s.titulo.trim()) > limites.tituloSecao)
      p.push(`O título da seção ${nome} passa de ${limites.tituloSecao} caracteres.`);
    const blocos = s.blocos.filter((b) => montarBloco(b) !== null);
    if (blocos.length > limites.blocos)
      p.push(`A seção ${nome} tem mais de ${limites.blocos} blocos.`);
    for (const b of blocos) {
      const r = rotuloTipoBloco[b.tipo].toLowerCase();
      if (b.tipo === "paragrafo" && tamanho(b.texto.trim()) > limites.paragrafo)
        p.push(`Um parágrafo da seção ${nome} passa de ${limites.paragrafo} caracteres.`);
      if (b.tipo === "dica" && tamanho(b.texto.trim()) > limites.dica)
        p.push(`A dica da seção ${nome} passa de ${limites.dica} caracteres.`);
      if (b.tipo === "lista" || b.tipo === "passos") {
        const itens = itensDoTexto(b.texto);
        if (itens.length > limites.itens)
          p.push(`Uma ${r} da seção ${nome} tem mais de ${limites.itens} itens.`);
        if (itens.some((x) => tamanho(x) > limites.item))
          p.push(`Um item de ${r} da seção ${nome} passa de ${limites.item} caracteres.`);
      }
      if (b.tipo === "exemplo") {
        if (!b.titulo.trim() || !b.texto.trim())
          p.push(`O exemplo da seção ${nome} precisa de título e texto.`);
        else if (
          tamanho(b.titulo.trim()) > limites.tituloExemplo ||
          tamanho(b.texto.trim()) > limites.textoExemplo
        )
          p.push(`O exemplo da seção ${nome} está longo demais.`);
      }
    }
  });
  return p;
}

/**
 * Problemas do artigo. Sem `publicar`, só o que impede salvar o rascunho;
 * com `publicar` (ou artigo no ar), também o que falta para ir ao site.
 */
export function problemasDoArtigo(f: FormArtigo, publicar: boolean): string[] {
  const p: string[] = [];
  const t = (s: string) => tamanho(s.trim());
  if (t(f.titulo) < 3) p.push("Escreva o título (pelo menos 3 letras).");
  else if (t(f.titulo) > limites.titulo) p.push(`O título passa de ${limites.titulo} caracteres.`);
  if (t(f.categoria) < 2) p.push("Escolha a categoria.");
  if (!slugValido(f.slug.trim()))
    p.push("O endereço precisa ter de 3 a 80 letras minúsculas, números ou hífens.");
  if (t(f.titulo_seo) > limites.titulo_seo)
    p.push(`O título para o Google passa de ${limites.titulo_seo} caracteres.`);
  if (t(f.descricao) > limites.descricao)
    p.push(`A descrição passa de ${limites.descricao} caracteres.`);
  if (t(f.resumo) > limites.resumo) p.push(`O resumo passa de ${limites.resumo} caracteres.`);
  if (t(f.leitura) > limites.leitura) p.push("O tempo de leitura está longo demais.");
  if (t(f.autor) > limites.autor) p.push("O nome do autor está longo demais.");
  if (f.capa === "imagem" && !/^https:\/\/\S{3,}$/.test(f.capaUrl.trim()))
    p.push("Cole o endereço da imagem da capa (começa com https://).");
  p.push(...problemasDoCorpo(f.corpo));
  if (!publicar) return p;

  if (!f.titulo_seo.trim()) p.push("Para publicar, escreva o título para o Google.");
  if (!f.descricao.trim()) p.push("Para publicar, escreva a descrição para o Google.");
  if (!f.resumo.trim()) p.push("Para publicar, escreva o resumo.");
  if (f.corpo.pontos.some((x) => !x.trim())) p.push("Para publicar, preencha os 3 pontos.");
  if (montarCorpo(f.corpo).secoes.length === 0)
    p.push("Para publicar, escreva pelo menos uma seção.");
  const tudo = [
    f.titulo,
    f.titulo_seo,
    f.descricao,
    f.resumo,
    f.categoria,
    f.leitura,
    f.autor,
    JSON.stringify(montarCorpo(f.corpo)),
  ].join(" ");
  if (temMarcador(tudo))
    p.push("Há marcador pendente, como [PREÇO]. Troque pelo texto final antes de publicar.");
  return p;
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

export function formVazio(): FormArtigo {
  return {
    titulo: "",
    categoria: "",
    slug: "",
    slugManual: false,
    resumo: "",
    titulo_seo: "",
    descricao: "",
    leitura: "",
    autor: "",
    capa: "cv0",
    capaUrl: "",
    corpo: { pontos: ["", "", ""], secoes: [novaSecao()] },
  };
}

const ehDesenho = (c: string): c is CapaArtigo => /^cv[0-3]$/.test(c);

export function formDoArtigo(a: ArtigoCompleto): FormArtigo {
  return {
    titulo: a.titulo,
    categoria: a.categoria,
    slug: a.slug,
    slugManual: true,
    resumo: a.resumo ?? "",
    titulo_seo: a.titulo_seo ?? "",
    descricao: a.descricao ?? "",
    leitura: a.leitura ?? "",
    autor: a.autor ?? "",
    capa: ehDesenho(a.capa) ? a.capa : "imagem",
    capaUrl: ehDesenho(a.capa) ? "" : a.capa,
    corpo: corpoParaEditor(a.corpo),
  };
}

/** Título novo: o endereço acompanha até a pessoa editar o endereço à mão. */
export function mudarTitulo(f: FormArtigo, titulo: string, slugTravado: boolean): FormArtigo {
  return {
    ...f,
    titulo,
    slug: f.slugManual || slugTravado ? f.slug : slugDoTitulo(titulo),
  };
}

/** Dados para `site_artigo_salvar` (sem id e versão; quem chama acrescenta). */
export function dadosDoForm(f: FormArtigo): DadosArtigo {
  return {
    slug: f.slug.trim(),
    categoria: f.categoria.trim(),
    titulo: f.titulo.trim(),
    titulo_seo: f.titulo_seo.trim(),
    descricao: f.descricao.trim(),
    resumo: f.resumo.trim(),
    leitura: f.leitura.trim(),
    autor: f.autor.trim(),
    capa: f.capa === "imagem" ? f.capaUrl.trim() : f.capa,
    corpo: montarCorpo(f.corpo),
  };
}

/** Mudou algo que vai ao banco? (compara o que seria gravado, não as chaves da tela) */
export function mudou(a: FormArtigo, b: FormArtigo): boolean {
  return JSON.stringify(dadosDoForm(a)) !== JSON.stringify(dadosDoForm(b));
}

// ---------------------------------------------------------------------------
// Texto do site: [texto](/caminho) e **destaque** (mesma regra de article-body.tsx do site)
// ---------------------------------------------------------------------------

export type ParteTexto =
  | { tipo: "texto"; texto: string }
  | { tipo: "destaque"; texto: string }
  | { tipo: "link"; texto: string; destino: string; externo: boolean };

export function partesDoTexto(t: string): ParteTexto[] {
  const partes: ParteTexto[] = [];
  const padrao = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = padrao.exec(t))) {
    if (m.index > ultimo) partes.push({ tipo: "texto", texto: t.slice(ultimo, m.index) });
    const [, rotulo, destino, forte] = m;
    if (forte) partes.push({ tipo: "destaque", texto: forte });
    else if (rotulo && destino)
      partes.push({ tipo: "link", texto: rotulo, destino, externo: destino.startsWith("http") });
    ultimo = padrao.lastIndex;
  }
  if (ultimo < t.length) partes.push({ tipo: "texto", texto: t.slice(ultimo) });
  return partes;
}
