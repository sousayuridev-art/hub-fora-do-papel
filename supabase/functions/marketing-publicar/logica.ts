/**
 * Lógica pura da função `marketing-publicar` (card MK-5): monta o pedido ao Upload-Post a partir do
 * pacote da versão e lê as respostas (situação e números) sem depender do formato exato. Sem rede.
 * Testada pelo Vitest em src/test/marketing-publicar-logica.test.ts.
 *
 * Campos conferidos na especificação do Upload-Post (docs.upload-post.com/openapi.json, 29/10/2026):
 * /upload_photos (photos[] em arquivo), /upload (video em arquivo ou URL, cover_url),
 * /upload_document (document em URL), /upload_text (title). A conferir no primeiro teste real:
 * `media_type=STORIES` no Instagram e o formato da resposta de /uploadposts/status.
 */

export const API_UPLOAD_POST = "https://api.upload-post.com/api";

/** Endereço do Upload-Post. A troca (servidor falso) só vale com o Supabase local. */
export function enderecoUploadPost(supabaseUrl: string, troca: string | undefined): string {
  const local = /^http:\/\/(kong:8000|127\.0\.0\.1:[0-9]+|localhost:[0-9]+)$/.test(supabaseUrl);
  return local && troca ? troca : API_UPLOAD_POST;
}

export type Arquivo = { papel: string; caminho: string; mime: string; nome: string };
export type Pacote = {
  versao_id: string;
  canal: string;
  formato: string;
  titulo: string;
  legenda: string;
  link: string | null;
  arquivos: Arquivo[];
};
export type Config = { perfil: string; paginaLinkedin: string | null };

/** Pedido pronto: campos de texto, arquivos para baixar e anexar, e URLs que vão como texto. */
export type Pedido = {
  caminho: "/upload_photos" | "/upload" | "/upload_document" | "/upload_text";
  campos: [string, string][];
  /** Arquivos que vão como arquivo (fotos): baixar do link assinado e anexar com este nome de campo. */
  anexos: { campo: string; caminho: string; nome: string; mime: string }[];
  /** Arquivos que vão como link assinado (vídeo, capa, documento): campo → caminho no Storage. */
  links: { campo: string; caminho: string }[];
};

const FOTOS = ["carrossel", "carrossel_fotos", "post_unico", "stories"];
const VIDEOS = ["reels", "shorts", "video", "video_curto", "video_longo"];

const corta = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

export class ErroPedido extends Error {}

export function montarPedido(p: Pacote, c: Config): Pedido {
  const base: [string, string][] = [
    ["user", c.perfil],
    ["platform[]", p.canal],
    ["async_upload", "true"],
  ];
  const linkedin: [string, string][] =
    p.canal === "linkedin" && c.paginaLinkedin
      ? [["target_linkedin_page_id", c.paginaLinkedin]]
      : [];
  const imagens = p.arquivos.filter((a) => a.papel === "slide" || a.papel === "imagem");
  const video = p.arquivos.find((a) => a.papel === "video");
  const capa = p.arquivos.find((a) => a.papel === "capa");
  const pdf = p.arquivos.find((a) => a.papel === "documento");

  if (p.canal === "linkedin" && (p.formato === "texto" || p.formato === "artigo")) {
    if (!p.legenda.trim()) throw new ErroPedido("Texto vazio.");
    return {
      caminho: "/upload_text",
      campos: [...base, ["title", p.legenda], ...linkedin],
      anexos: [],
      links: [],
    };
  }
  if (p.formato === "documento") {
    if (!pdf) throw new ErroPedido("Falta o PDF do documento.");
    return {
      caminho: "/upload_document",
      campos: [...base, ["title", corta(p.titulo, 200)], ["description", p.legenda], ...linkedin],
      anexos: [],
      links: [{ campo: "document", caminho: pdf.caminho }],
    };
  }
  if (FOTOS.includes(p.formato)) {
    if (imagens.length === 0) throw new ErroPedido("Falta a imagem da versão.");
    if (p.canal === "instagram" && imagens.length > 10)
      throw new ErroPedido("O Instagram aceita até 10 imagens.");
    const campos: [string, string][] = [...base, ["title", p.legenda], ...linkedin];
    if (p.canal === "instagram" && p.formato === "stories") campos.push(["media_type", "STORIES"]);
    if (p.canal === "tiktok")
      campos.push(
        ["tiktok_title", corta(p.titulo, 90)],
        ["tiktok_description", p.legenda],
        ["privacy_level", "PUBLIC_TO_EVERYONE"],
      );
    return {
      caminho: "/upload_photos",
      campos,
      anexos: imagens.map((a) => ({
        campo: "photos[]",
        caminho: a.caminho,
        nome: a.nome,
        mime: a.mime,
      })),
      links: [],
    };
  }
  if (VIDEOS.includes(p.formato)) {
    if (!video) throw new ErroPedido("Falta o vídeo da versão.");
    const campos: [string, string][] = [...base, ...linkedin];
    if (p.canal === "youtube")
      campos.push(["title", corta(p.titulo, 100)], ["description", p.legenda]);
    else if (p.canal === "tiktok")
      campos.push(
        ["title", p.legenda],
        ["tiktok_title", p.legenda],
        ["privacy_level", "PUBLIC_TO_EVERYONE"],
      );
    else campos.push(["title", p.legenda]);
    if (p.canal === "instagram" && p.formato === "stories") campos.push(["media_type", "STORIES"]);
    const links = [{ campo: "video", caminho: video.caminho }];
    if (capa && p.canal === "instagram") links.push({ campo: "cover_url", caminho: capa.caminho });
    if (capa && p.canal === "youtube" && p.formato === "video_longo")
      links.push({ campo: "thumbnail_url", caminho: capa.caminho });
    return { caminho: "/upload", campos, anexos: [], links };
  }
  throw new ErroPedido(`Formato sem publicação automática: ${p.formato}.`);
}

// ---------------------------------------------------------------------
// Respostas (lidas com cuidado: o formato exato muda entre versões da API)
// ---------------------------------------------------------------------
type Qualquer = unknown;

/** Procura a primeira chave com um dos nomes, em qualquer profundidade. */
export function achar(obj: Qualquer, nomes: string[], profundidade = 0): Qualquer {
  if (!obj || typeof obj !== "object" || profundidade > 6) return undefined;
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const r = achar(x, nomes, profundidade + 1);
      if (r !== undefined) return r;
    }
    return undefined;
  }
  const o = obj as Record<string, Qualquer>;
  for (const n of nomes) if (o[n] !== undefined && o[n] !== null && o[n] !== "") return o[n];
  for (const v of Object.values(o)) {
    const r = achar(v, nomes, profundidade + 1);
    if (r !== undefined) return r;
  }
  return undefined;
}

const texto = (x: Qualquer) =>
  typeof x === "string" ? x : typeof x === "number" ? String(x) : null;

export type Situacao =
  | { tipo: "publicada"; link: string; id: string | null }
  | { tipo: "enviada"; id: string }
  | { tipo: "falhou"; erro: string }
  | { tipo: "aguardando" };

/** Lê a resposta do envio ou da consulta de situação. */
export function lerSituacao(r: Qualquer): Situacao {
  const link = texto(achar(r, ["post_url", "url", "permalink", "postUrl"]));
  const id = texto(achar(r, ["post_id", "platform_post_id", "media_id", "video_id", "id"]));
  const erro = texto(achar(r, ["error", "error_message", "message"]));
  const situacao = (texto(achar(r, ["status", "state"])) ?? "").toLowerCase();
  const sucesso = achar(r, ["success"]);
  // Nunca confundir o link do nosso arquivo (Storage) com o link do post.
  if (link && /^https:\/\//.test(link) && !link.includes("/storage/v1/"))
    return { tipo: "publicada", link, id };
  if (["failed", "error", "failure", "rejected"].includes(situacao) || (sucesso === false && erro))
    return { tipo: "falhou", erro: (erro ?? "A rede não aceitou a publicação.").slice(0, 300) };
  const pedido = texto(achar(r, ["request_id", "job_id"]));
  if (pedido) return { tipo: "enviada", id: pedido };
  return { tipo: "aguardando" };
}

/** Números de um post, nos nomes do Hub (só os que vierem). */
const MAPA: Record<string, string[]> = {
  alcance: ["reach", "impressions_unique", "unique_impressions", "accounts_reached"],
  salvamentos: ["saved", "saves", "save_count"],
  cliques: ["clicks", "link_clicks", "website_clicks"],
  comentarios: ["comments", "comment_count", "comments_count"],
  curtidas: ["likes", "like_count", "reactions"],
  compartilhamentos: ["shares", "share_count", "reposts"],
  visualizacoes: ["views", "video_views", "plays", "view_count", "impressions"],
};
export function lerNumeros(metricas: Qualquer): Record<string, number> {
  const saida: Record<string, number> = {};
  if (!metricas || typeof metricas !== "object") return saida;
  const m = metricas as Record<string, Qualquer>;
  for (const [nosso, deles] of Object.entries(MAPA)) {
    for (const k of deles) {
      const v = m[k];
      const n =
        typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN;
      if (Number.isFinite(n) && n >= 0) {
        saida[nosso] = Math.floor(n);
        break;
      }
    }
  }
  return saida;
}

/** Acha o post da versão na lista de números (pelo link ou pelo id). */
export function acharPost(
  posts: { post_url?: unknown; post_id?: unknown; metrics?: unknown }[],
  link: string | null,
  id: string | null,
) {
  const limpa = (u: string) => u.replace(/[?#].*$/, "").replace(/\/$/, "");
  return posts.find(
    (p) =>
      (link && typeof p.post_url === "string" && limpa(p.post_url) === limpa(link)) ||
      (id && (p.post_id === id || String(p.post_id) === id)),
  );
}

/** Enviada há mais de 24 h sem confirmação: vira falha para a pessoa decidir. */
export const esperouDemais = (enviadaEm: string, agora = Date.now()) =>
  agora - new Date(enviadaEm).getTime() > 24 * 3600 * 1000;
