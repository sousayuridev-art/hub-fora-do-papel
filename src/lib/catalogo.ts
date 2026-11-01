import { BUCKET_MIDIA } from "@/lib/site";
import { supabase } from "@/lib/supabase";

/**
 * Catálogo de loja no Hub (cards HUB-CG-01 a 04). Mesmo formato do conteúdo do site da Fora do Papel:
 * rascunho nas tabelas (só o dono escreve, por RPC), versão publicada validada e lida pelo site
 * pela função pública `site_publico_catalogo(dominio)`. Fotos no bucket público site-midia.
 */

export type Selo = "novo" | "mais-vendido" | "promo";
export type Cor = { nome: string; tom: string };

export type ProdutoCatalogo = {
  id: string;
  codigo: number;
  categoria: string;
  nome: string;
  marca: string | null;
  preco_cents: number | null;
  tamanhos: string[];
  cores: Cor[];
  selo: Selo | null;
  promo_pct: number | null;
  fotos: string[];
  ordem: number;
};

export type CategoriaCatalogo = {
  id: string;
  slug: string;
  nome: string;
  foto: string | null;
  ordem: number;
  produtos: number;
};

export type DepoimentoCatalogo = { id: string; texto: string; autor: string; ordem: number };

export type SlotFoto = "hero" | "fachada" | "ig1" | "ig2" | "ig3" | "ig4" | "ig5" | "ig6";

export type ConfigCatalogo = {
  whatsapp: string | null;
  endereco: string | null;
  horario: string | null;
  instagram: string | null;
  mostrar_promocoes: boolean;
  marcas: string[];
  fotos: Partial<Record<SlotFoto, string>>;
};

export type EditorCatalogo = {
  contagem: {
    produtos: number;
    categorias: number;
    depoimentos: number;
    marcas: number;
    fotos_fixas: number;
  };
  problemas: string[];
  avisos: string[];
  mudou: boolean;
  ultima: { versao: number; publicado_em: string; resumo: Record<string, number> } | null;
};

export type PublicacaoCatalogo = {
  versao: number;
  publicado_em: string;
  resumo: Record<string, number>;
  por: string | null;
};

export const chavesCatalogo = {
  tudo: (site: string) => ["catalogo", site] as const,
  produtos: (site: string) => ["catalogo", site, "produtos"] as const,
  categorias: (site: string) => ["catalogo", site, "categorias"] as const,
  depoimentos: (site: string) => ["catalogo", site, "depoimentos"] as const,
  config: (site: string) => ["catalogo", site, "config"] as const,
  editor: (site: string) => ["catalogo", site, "editor"] as const,
  publicacoes: (site: string) => ["catalogo", site, "publicacoes"] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export async function listarProdutos(site: string): Promise<ProdutoCatalogo[]> {
  const { data, error } = await supabase
    .from("site_catalogo_produtos")
    .select(
      "id, codigo, categoria, nome, marca, preco_cents, tamanhos, cores, selo, promo_pct, fotos, ordem",
    )
    .eq("site_id", site)
    .order("ordem")
    .order("codigo");
  if (error) throw error;
  return (data ?? []) as ProdutoCatalogo[];
}

export async function listarCategorias(site: string): Promise<CategoriaCatalogo[]> {
  const { data, error } = await supabase
    .from("v_site_catalogo_categorias")
    .select("id, slug, nome, foto, ordem, produtos")
    .eq("site_id", site)
    .order("ordem")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as CategoriaCatalogo[];
}

export async function listarDepoimentos(site: string): Promise<DepoimentoCatalogo[]> {
  const { data, error } = await supabase
    .from("site_catalogo_depoimentos")
    .select("id, texto, autor, ordem")
    .eq("site_id", site)
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as DepoimentoCatalogo[];
}

const configVazia: ConfigCatalogo = {
  whatsapp: null,
  endereco: null,
  horario: null,
  instagram: null,
  mostrar_promocoes: true,
  marcas: [],
  fotos: {},
};

export async function lerConfig(site: string): Promise<ConfigCatalogo> {
  const { data, error } = await supabase
    .from("site_catalogo_config")
    .select("whatsapp, endereco, horario, instagram, mostrar_promocoes, marcas, fotos")
    .eq("site_id", site)
    .maybeSingle();
  if (error) throw error;
  return (data as ConfigCatalogo | null) ?? configVazia;
}

export const editorCatalogo = (site: string) =>
  rpc<EditorCatalogo>("site_catalogo_editor", { p_site: site });
export const publicacoesCatalogo = (site: string) =>
  rpc<PublicacaoCatalogo[]>("site_catalogo_publicacoes_lista", { p_site: site });

export type DadosProduto = Omit<ProdutoCatalogo, "id" | "codigo" | "ordem"> & { id?: string };

export const salvarProduto = (site: string, p: DadosProduto) =>
  rpc<ProdutoCatalogo>("site_catalogo_produto_salvar", { p_site: site, p_dados: p });
export const apagarProduto = (id: string) =>
  rpc<void>("site_catalogo_produto_apagar", { p_id: id });
export const salvarCategoria = (
  site: string,
  c: { id?: string; nome: string; foto: string | null },
) => rpc<CategoriaCatalogo>("site_catalogo_categoria_salvar", { p_site: site, p_dados: c });
export const apagarCategoria = (id: string) =>
  rpc<void>("site_catalogo_categoria_apagar", { p_id: id });
export const salvarDepoimento = (site: string, d: { id?: string; texto: string; autor: string }) =>
  rpc<DepoimentoCatalogo>("site_catalogo_depoimento_salvar", { p_site: site, p_dados: d });
export const apagarDepoimento = (id: string) =>
  rpc<void>("site_catalogo_depoimento_apagar", { p_id: id });
export const salvarConfig = (site: string, c: ConfigCatalogo) =>
  rpc<ConfigCatalogo>("site_catalogo_config_salvar", { p_site: site, p_dados: c });
/** `baseFotos`: URL pública do bucket site-midia (as fotos vão ao contrato do site com URL https). */
export const publicarCatalogo = (site: string, baseFotos: string) =>
  rpc<{ publicado: boolean; versao?: number; repetido?: boolean; problemas: string[] }>(
    "site_catalogo_publicar",
    { p_site: site, p_base_fotos: baseFotos },
  );

/** Endereço público da foto (bucket site-midia). */
export const urlDaFoto = (caminho: string | null | undefined) =>
  caminho ? supabase.storage.from(BUCKET_MIDIA).getPublicUrl(caminho).data.publicUrl : null;

export const rotuloSelo: Record<Selo, string> = {
  novo: "Novo",
  "mais-vendido": "Mais vendido",
  promo: "Promoção",
};

export const slotsFoto: { id: SlotFoto; rotulo: string; maiorLado: number }[] = [
  { id: "hero", rotulo: "Capa do site", maiorLado: 1400 },
  { id: "fachada", rotulo: "Fachada da loja", maiorLado: 1200 },
  { id: "ig1", rotulo: "Instagram 1", maiorLado: 700 },
  { id: "ig2", rotulo: "Instagram 2", maiorLado: 700 },
  { id: "ig3", rotulo: "Instagram 3", maiorLado: 700 },
  { id: "ig4", rotulo: "Instagram 4", maiorLado: 700 },
  { id: "ig5", rotulo: "Instagram 5", maiorLado: 700 },
  { id: "ig6", rotulo: "Instagram 6", maiorLado: 700 },
];

/** Regras do formulário de produto (as mesmas do banco), para avisar no campo antes de salvar. */
type CampoProduto = "nome" | "categoria" | "preco" | "tamanhos" | "cores" | "promo_pct" | "fotos";

export function problemasDoProduto(p: DadosProduto): Partial<Record<CampoProduto, string>> {
  // Mesmas regras do contrato do site (validarCatalogo): preço > 0, pelo menos 1 tamanho e 1 cor
  const e: Partial<Record<CampoProduto, string>> = {};
  if (p.nome.trim().length < 2) e.nome = "Dê um nome com pelo menos 2 letras.";
  if (!p.categoria) e.categoria = "Escolha a categoria.";
  if (p.preco_cents == null || p.preco_cents <= 0) e.preco = "Informe o preço.";
  if (p.tamanhos.length === 0) e.tamanhos = "Inclua pelo menos um tamanho.";
  if (p.cores.length === 0) e.cores = "Inclua pelo menos uma cor.";
  else if (p.cores.some((c) => !c.nome.trim() || !/^#[0-9a-fA-F]{6}$/.test(c.tom)))
    e.cores = "Toda cor precisa de nome.";
  if (p.selo === "promo" && (p.promo_pct == null || p.promo_pct < 1 || p.promo_pct > 90))
    e.promo_pct = "Informe o desconto da promoção (de 1% a 90%).";
  if (p.fotos.length > 4) e.fotos = "No máximo 4 fotos.";
  return e;
}

export function mensagemDoCatalogo(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : String((e as { message?: unknown } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    preco_invalido: "O preço precisa estar em reais e centavos.",
    promo_sem_percentual: "Informe o desconto da promoção (de 1% a 90%).",
    categoria_com_produtos: "Essa categoria ainda tem produtos. Mova ou apague os produtos antes.",
    categoria_inexistente: "Essa categoria não existe mais. Recarregue a página.",
    produto_inexistente: "Esse produto não existe mais. Recarregue a página.",
    foto_invalida: "Essa foto não é deste site. Envie de novo.",
    fotos_demais: "No máximo 4 fotos por produto.",
    catalogo_desligado:
      "O catálogo não está ligado neste site. Ligue em “O que o cliente pode editar”.",
    nome_invalido: "Use um nome com letras ou números.",
    html_sem_contrato: "Esse arquivo não é o site do catálogo (faltam os marcadores __CG_DATA__).",
    html_sem_remoto: "Esse arquivo é de uma versão antiga do site (falta o bloco __CG_REMOTE__).",
    sem_base: "Envie o HTML do site (o arquivo em produção) antes de gerar o arquivo.",
    sem_publicacao: "Publique o catálogo antes de gerar o arquivo do site.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
