/**
 * Modelos da marca (card MK-6): transforma o texto de uma versão em quadros com o desenho fixo da
 * Fora do Papel (skill marca-fora-do-papel, 28/10). Lógica pura: quais quadros, com que texto, em
 * que tamanho e o que não cabe. O desenho fica em `components/marketing/modelos/QuadroMarca`.
 */
import { rotuloChamada, rotuloPilar, type Formato, type Pilar, type Versao } from "@/lib/marketing";

export type TemaCapa = "escuro" | "claro" | "ambar";
export type TemaFinal = "ambar" | "escuro";
export type EscolhaModelo = { capa: TemaCapa; final: TemaFinal };

export const rotuloTemaCapa: Record<TemaCapa, string> = {
  escuro: "Escura",
  claro: "Clara",
  ambar: "Âmbar",
};
export const rotuloTemaFinal: Record<TemaFinal, string> = {
  ambar: "Âmbar com botão escuro",
  escuro: "Escura com botão âmbar",
};

export type TipoQuadro = "capa" | "meio" | "final";
export type Quadro = {
  tipo: TipoQuadro;
  tema: "escuro" | "claro" | "ambar";
  vertical: boolean;
  /** Rótulo da capa (pilar), em caixa alta no desenho. */
  rotulo: string | null;
  titulo: string;
  texto: string;
  /** Só na chamada final: as palavras do manual. */
  chamada: string | null;
  /** "Arraste para o lado →" (capa de carrossel). */
  arraste: boolean;
  indice: number;
  total: number;
  /** Tamanho do título em px (no quadro de 1080 de largura); null = não cabe. */
  tamanhoTitulo: number | null;
  /** Tamanho do texto em px; null = não cabe. */
  tamanhoTexto: number | null;
};

export const LARGURA = 1080;
export const altura = (vertical: boolean) => (vertical ? 1920 : 1350);

/** Formatos que o modelo gera e em que papel o arquivo entra na versão. */
const PAPEL_GERADO: Partial<Record<Formato, "slide" | "imagem" | "capa">> = {
  carrossel: "slide",
  carrossel_fotos: "slide",
  post_unico: "imagem",
  stories: "imagem",
  reels: "capa",
  shorts: "capa",
  video: "capa",
  video_curto: "capa",
};
export const papelGerado = (f: Formato) => PAPEL_GERADO[f] ?? null;
export const geraModelo = (f: Formato) => papelGerado(f) !== null;
const ehVertical = (f: Formato) =>
  ["carrossel_fotos", "stories", "reels", "shorts", "video", "video_curto"].includes(f);

/** Degraus do título: maior quando cabe; null quando passa do limite (bloqueia a geração). */
export function tamanhoDoTitulo(texto: string, tipo: TipoQuadro): number | null {
  const n = texto.trim().length;
  if (tipo === "capa") return n <= 28 ? 124 : n <= 48 ? 96 : n <= 70 ? 80 : null;
  return n <= 40 ? 72 : n <= 70 ? 60 : null;
}
export function tamanhoDoTexto(texto: string, tipo: TipoQuadro): number | null {
  const n = texto.trim().length;
  if (n === 0) return 40;
  if (tipo === "capa") return n <= 120 ? 40 : null;
  return n <= 220 ? 40 : n <= 320 ? 34 : null;
}

/** Ordem da grade: escuro → claro → âmbar (nunca duas capas iguais lado a lado). */
export function temaSeguinte(ultimo: TemaCapa | null): TemaCapa {
  if (ultimo === "escuro") return "claro";
  if (ultimo === "claro") return "ambar";
  return "escuro";
}

/** Quadros da versão, na ordem em que entram como arquivos. */
export function quadrosDaVersao(v: Versao, pilar: Pilar | null, e: EscolhaModelo): Quadro[] {
  const vertical = ehVertical(v.format);
  const rotulo = pilar ? rotuloPilar[pilar] : null;
  const temaMeio = e.capa === "claro" ? "claro" : "escuro";
  const base: Omit<Quadro, "tipo" | "tema" | "titulo" | "texto" | "chamada" | "arraste"> = {
    vertical,
    rotulo: null,
    indice: 0,
    total: 0,
    tamanhoTitulo: null,
    tamanhoTexto: null,
  };
  const lista: Omit<Quadro, "indice" | "total" | "tamanhoTitulo" | "tamanhoTexto">[] = [];

  const slides =
    v.format === "carrossel" || v.format === "carrossel_fotos"
      ? v.slides.filter((s) => s.titulo.trim() || s.texto.trim())
      : [];
  if (slides.length === 0) {
    const titulo =
      (v.hook ?? "").trim() ||
      (v.script[0]?.na_tela ?? "").trim() ||
      (v.slides[0]?.titulo ?? "").trim();
    lista.push({
      ...base,
      tipo: "capa",
      tema: e.capa,
      rotulo,
      titulo,
      texto: "",
      chamada: null,
      arraste: false,
    });
  } else {
    const [primeiro, ...resto] = slides as [(typeof slides)[number], ...typeof slides];
    lista.push({
      ...base,
      tipo: "capa",
      tema: e.capa,
      rotulo,
      titulo: primeiro.titulo.trim() || (v.hook ?? "").trim(),
      texto: primeiro.texto.trim(),
      chamada: null,
      arraste: slides.length > 1,
    });
    const temFinal = !!v.cta && resto.length > 0;
    const meios = temFinal ? resto.slice(0, -1) : resto;
    for (const s of meios)
      lista.push({
        ...base,
        tipo: "meio",
        tema: temaMeio,
        titulo: s.titulo.trim(),
        texto: s.texto.trim(),
        chamada: null,
        arraste: false,
      });
    if (temFinal && v.cta) {
      const ultimo = resto[resto.length - 1]!;
      lista.push({
        ...base,
        tipo: "final",
        tema: e.final,
        titulo: ultimo.titulo.trim(),
        texto: ultimo.texto.trim(),
        chamada: rotuloChamada[v.cta],
        arraste: false,
      });
    }
  }
  return lista.map((q, i) => ({
    ...q,
    indice: i + 1,
    total: lista.length,
    tamanhoTitulo: tamanhoDoTitulo(q.titulo, q.tipo),
    tamanhoTexto: tamanhoDoTexto(q.texto, q.tipo),
  }));
}

/** O que impede gerar (texto que não cabe, capa sem título) e avisos que não impedem. */
export function avisosDoModelo(qs: Quadro[]): { bloqueia: string[]; avisa: string[] } {
  const bloqueia: string[] = [];
  const avisa: string[] = [];
  for (const q of qs) {
    if (q.tipo === "capa" && !q.titulo)
      bloqueia.push("A capa precisa de título (gancho ou título do 1º slide).");
    if (q.titulo && q.tamanhoTitulo === null)
      bloqueia.push(`Título longo para o slide ${q.indice}: encurte.`);
    if (q.tamanhoTexto === null) bloqueia.push(`Texto longo para o slide ${q.indice}: encurte.`);
  }
  if (qs.length > 8) avisa.push(`São ${qs.length} slides; o manual pede de 3 a 8.`);
  return { bloqueia, avisa };
}

/** Partes do texto com o TUDO destacado (uma etiqueta por ocorrência). */
export function partesComTudo(texto: string): { texto: string; tudo: boolean }[] {
  return texto
    .split(/(\bTUDO\b)/)
    .filter((p) => p !== "")
    .map((p) => ({ texto: p, tudo: p === "TUDO" }));
}

/** Nome do arquivo gerado: título curto + número do slide. */
export function nomeDoArquivo(titulo: string, q: Quadro): string {
  const base =
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "peca";
  return `${base}-${String(q.indice).padStart(2, "0")}.png`;
}
