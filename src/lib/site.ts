import { supabase } from "@/lib/supabase";
import type { ConteudoArtigo } from "@/lib/editorArtigo";

/**
 * Conteúdo do site (cards CMS-1 e CMS-2). Leitura pela RLS (só o dono do tenant);
 * gravação só pelas RPCs `site_artigo_*` (evento no event_outbox na mesma transação).
 * Imagens no bucket público `site-midia`, caminho {site_id}/{arquivo}.
 */

export type SituacaoSite = "rascunho" | "publicado" | "arquivado";
export type CapaArtigo = "cv0" | "cv1" | "cv2" | "cv3";

export type Site = { id: string; nome: string; dominio: string };

/** Linha da lista (sem corpo). */
export type ArtigoResumo = {
  id: string;
  slug: string;
  categoria: string;
  titulo: string;
  situacao: SituacaoSite;
  publicado_em: string | null;
  atualizado_em: string;
};

export type ArtigoCompleto = ArtigoResumo & {
  site_id: string;
  titulo_seo: string | null;
  descricao: string | null;
  resumo: string | null;
  capa: string;
  corpo: unknown;
  leitura: string | null;
  autor: string | null;
  ordem: number;
};

/** O que vai em `p_dados` de site_artigo_salvar. */
export type DadosArtigo = {
  id?: string;
  atualizado_em?: string;
  slug: string;
  categoria: string;
  titulo: string;
  titulo_seo: string;
  descricao: string;
  resumo: string;
  leitura: string;
  autor: string;
  capa: string;
  corpo: ConteudoArtigo;
};

export type ImagemSite = {
  caminho: string;
  nome: string;
  url: string;
  tamanho: number | null;
  criado_em: string | null;
};

export const chavesSite = {
  tudo: ["site"] as const,
  sites: ["site", "sites"] as const,
  artigos: (siteId: string) => ["site", "artigos", siteId] as const,
  artigo: (id: string) => ["site", "artigo", id] as const,
  midia: (siteId: string) => ["site", "midia", siteId] as const,
};

export const rotuloSituacao: Record<SituacaoSite, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};
export const tomSituacao = { rascunho: "atencao", publicado: "ok", arquivado: "neutro" } as const;

/** Categorias que o site já mostra nos filtros (src/data/artigos.ts do site). */
export const categoriasDoSite = [
  "Ganhar tempo",
  "Inteligência artificial",
  "Organização",
  "Sites e lojas",
  "Por dentro da equipe",
];

export const capas: { id: CapaArtigo; rotulo: string }[] = [
  { id: "cv0", rotulo: "Desenho 1" },
  { id: "cv1", rotulo: "Desenho 2" },
  { id: "cv2", rotulo: "Desenho 3" },
  { id: "cv3", rotulo: "Desenho 4" },
];

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export async function listarSites(): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("id, nome, dominio")
    .order("criado_em", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Site[];
}

export async function listarArtigos(siteId: string): Promise<ArtigoResumo[]> {
  const { data, error } = await supabase
    .from("site_artigos")
    .select("id, slug, categoria, titulo, situacao, publicado_em, atualizado_em")
    .eq("site_id", siteId)
    .order("atualizado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ArtigoResumo[];
}

export async function buscarArtigo(id: string): Promise<ArtigoCompleto> {
  const { data, error } = await supabase
    .from("site_artigos")
    .select(
      "id, site_id, slug, categoria, titulo, titulo_seo, descricao, resumo, capa, corpo, leitura, autor, situacao, publicado_em, ordem, atualizado_em",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ArtigoCompleto;
}

export const salvarArtigo = (siteId: string, dados: DadosArtigo) =>
  rpc<ArtigoCompleto>("site_artigo_salvar", { p_site: siteId, p_dados: dados });
export const publicarArtigo = (id: string) =>
  rpc<ArtigoCompleto>("site_artigo_publicar", { p_id: id });
export const arquivarArtigo = (id: string) =>
  rpc<ArtigoCompleto>("site_artigo_arquivar", { p_id: id });

// ---------------------------------------------------------------------------
// Mídia (bucket site-midia)
// ---------------------------------------------------------------------------

export const BUCKET_MIDIA = "site-midia";
export const tiposImagem = ["image/jpeg", "image/png", "image/webp"];
export const tamanhoMaximoImagem = 2 * 1024 * 1024;
const extensaoDoTipo: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Tipo pela extensão quando o navegador não informa. */
export function tipoDaImagem(f: Pick<File, "name" | "type">): string {
  if (f.type) return f.type;
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext ? `image/${ext}` : "";
}

/** Confere tipo e tamanho antes de enviar; devolve a mensagem ou null. */
export function problemaDaImagem(f: Pick<File, "name" | "type" | "size">): string | null {
  if (!tiposImagem.includes(tipoDaImagem(f))) return `${f.name}: use uma imagem JPG, PNG ou WebP.`;
  if (f.size > tamanhoMaximoImagem)
    return `${f.name}: passa de 2 MB. Reduza a imagem e tente de novo.`;
  return null;
}

/**
 * Nome no bucket: só letras, números, ponto, hífen e sublinhado (regra do banco),
 * com um sufixo para não substituir imagem de mesmo nome.
 */
export function nomeNoBucket(f: Pick<File, "name" | "type">, sufixo: string): string {
  const ext = extensaoDoTipo[tipoDaImagem(f)] ?? "jpg";
  const base =
    f.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "imagem";
  return `${base}-${sufixo}.${ext}`;
}

const urlPublica = (caminho: string) =>
  supabase.storage.from(BUCKET_MIDIA).getPublicUrl(caminho).data.publicUrl;

export async function listarMidia(siteId: string): Promise<ImagemSite[]> {
  const { data, error } = await supabase.storage.from(BUCKET_MIDIA).list(siteId, {
    limit: 1000,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;
  return (data ?? [])
    .filter((o) => /\.(jpe?g|png|webp)$/i.test(o.name))
    .map((o) => {
      const caminho = `${siteId}/${o.name}`;
      const meta = o.metadata as { size?: number } | null;
      return {
        caminho,
        nome: o.name,
        url: urlPublica(caminho),
        tamanho: typeof meta?.size === "number" ? meta.size : null,
        criado_em: o.created_at ?? null,
      };
    });
}

export async function enviarImagem(siteId: string, arquivo: File): Promise<ImagemSite> {
  const caminho = `${siteId}/${nomeNoBucket(arquivo, Date.now().toString(36))}`;
  const { error } = await supabase.storage
    .from(BUCKET_MIDIA)
    .upload(caminho, arquivo, { contentType: tipoDaImagem(arquivo), upsert: false });
  if (error) throw error;
  return {
    caminho,
    nome: caminho.split("/")[1] ?? caminho,
    url: urlPublica(caminho),
    tamanho: arquivo.size,
    criado_em: new Date().toISOString(),
  };
}

export async function apagarImagem(caminho: string) {
  const { data, error } = await supabase.storage.from(BUCKET_MIDIA).remove([caminho]);
  if (error) throw error;
  // O Storage não dá erro quando a política impede: volta lista vazia.
  if (!data?.length) throw new Error("imagem_nao_apagada");
}

// ---------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------

const mensagens: Record<string, string> = {
  artigo_alterado:
    "Este artigo foi salvo em outro lugar depois que você abriu. Para não apagar a versão mais nova, nada foi gravado.",
  slug_publicado: "O endereço não muda depois da primeira publicação.",
  slug_em_uso: "Já existe um artigo com esse endereço. Escolha outro.",
  slug_invalido: "O endereço precisa ter de 3 a 80 letras minúsculas, números ou hífens.",
  titulo_invalido: "O título precisa ter de 3 a 160 caracteres.",
  categoria_invalida: "Escolha a categoria.",
  titulo_seo_longo: "O título para o Google passa de 60 caracteres.",
  descricao_longa: "A descrição passa de 155 caracteres.",
  resumo_longo: "O resumo passa de 300 caracteres.",
  campo_longo: "O tempo de leitura ou o autor estão longos demais.",
  capa_invalida: "A capa precisa ser um dos desenhos ou um endereço https:// de imagem.",
  falta_seo: "Para publicar, preencha o título para o Google, a descrição e o resumo.",
  corpo_incompleto: "Para publicar, preencha os 3 pontos e escreva pelo menos uma seção.",
  marcador_pendente: "Há marcador pendente, como [PREÇO]. Troque pelo texto final antes.",
  artigo_inexistente: "Esse artigo não existe mais. Recarregue a página.",
  site_inexistente: "Esse site não está mais disponível. Recarregue a página.",
  imagem_nao_apagada: "Não foi possível apagar a imagem. Recarregue a página e tente de novo.",
  "The resource already exists": "Já existe uma imagem com esse nome. Tente de novo.",
  "Payload too large": "A imagem passa de 2 MB.",
  "maximum allowed size": "A imagem passa de 2 MB.",
  mime: "Tipo de imagem não aceito. Use JPG, PNG ou WebP.",
};

/** Mensagem do banco/Storage em português, ou null se for um erro genérico. */
export function mensagemDoSite(e: unknown): string | null {
  const o = (e ?? {}) as { message?: unknown; details?: unknown };
  const texto = e instanceof Error ? e.message : String(o.message ?? "");
  // corpo_invalido traz o detalhe (ex.: "parágrafo vazio ou longo demais na seção x")
  if (texto.includes("corpo_invalido"))
    return `O corpo do artigo tem um problema: ${
      typeof o.details === "string" && o.details ? o.details : "formato não aceito"
    }.`;
  const chave = Object.keys(mensagens).find((k) => texto.includes(k));
  return chave ? (mensagens[chave] ?? null) : null;
}

export const ehConflito = (e: unknown) =>
  String((e as { message?: unknown } | null)?.message ?? "").includes("artigo_alterado");
