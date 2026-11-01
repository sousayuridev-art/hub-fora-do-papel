/**
 * Contrato do site da CG (porta do `catalogo-cg.mjs` entregue com o site; original e documentação em
 * docs/integracoes/catalogo-cg/). É a ÚNICA porta de leitura e escrita do HTML do catálogo no Hub:
 *   - extrairCatalogo(html)        → { data, meta }
 *   - injetarCatalogo(html, data)  → html novo (valida antes de escrever)
 *   - validarCatalogo(data)        → lista de erros ([] = ok)
 *   - preencherRemoto(html, r)     → html com o bloco __CG_REMOTE__ (o site busca o banco do Hub)
 * O teste src/test/catalogo-cg-contrato.test.ts compara esta porta com o módulo original.
 */

const MARCA_INICIO = "/*__CG_DATA__*/";
const MARCA_FIM = "/*__CG_DATA_END__*/";
const REMOTO_INICIO = "/*__CG_REMOTE__*/";
const REMOTO_FIM = "/*__CG_REMOTE_END__*/";

export const SELOS = ["novo", "mais-vendido", "promo"] as const;

export type ProdutoCg = {
  id: number;
  name: string;
  category: string;
  brand: string;
  priceCents: number;
  sizes: string[];
  colors: { n: string; h: string }[];
  badge: (typeof SELOS)[number] | null;
  promoPct?: number;
};

export type CatalogoCg = {
  config: {
    whatsappNumber: string;
    showPromoBanner: boolean;
    address: string;
    hours: string;
    instagram: string;
  };
  categories: { id: string; name: string }[];
  products: ProdutoCg[];
  testimonials: { quote: string; author: string }[];
  brands: string[];
  img: Record<string, string>;
  productImgs: Record<string, string[]>;
};

export type RemotoCg = { url: string; headers: Record<string, string> };

export function extrairCatalogo(html: string): {
  data: CatalogoCg;
  meta: { inicio: number; fim: number };
} {
  const a = html.indexOf(MARCA_INICIO);
  const b = html.indexOf(MARCA_FIM);
  if (a < 0 || b < 0 || b <= a) {
    throw new Error(
      "Marcadores __CG_DATA__ não encontrados: este arquivo não é o catálogo da CG (ou foi alterado fora do contrato).",
    );
  }
  const bruto = html.slice(a + MARCA_INICIO.length, b);
  let data: CatalogoCg;
  try {
    data = JSON.parse(bruto) as CatalogoCg;
  } catch (e) {
    throw new Error(
      "Bloco de dados ilegível (JSON inválido): " + (e instanceof Error ? e.message : String(e)),
    );
  }
  data.productImgs = data.productImgs || {};
  return { data, meta: { inicio: a, fim: b } };
}

export function injetarCatalogo(html: string, data: CatalogoCg): string {
  const erros = validarCatalogo(data);
  if (erros.length) {
    throw new Error("Catálogo inválido:\n- " + erros.join("\n- "));
  }
  const a = html.indexOf(MARCA_INICIO);
  const b = html.indexOf(MARCA_FIM);
  if (a < 0 || b < 0 || b <= a) {
    throw new Error("Marcadores __CG_DATA__ não encontrados no HTML de destino.");
  }
  const json = JSON.stringify(data).replace(/<\//g, "<\\/"); // não fechar o <script>
  return html.slice(0, a + MARCA_INICIO.length) + json + html.slice(b);
}

/** Mesma técnica do __CG_DATA__ para o bloco da fonte remota (o Hub preenche uma vez). */
export function preencherRemoto(html: string, remoto: RemotoCg): string {
  const a = html.indexOf(REMOTO_INICIO);
  const b = html.indexOf(REMOTO_FIM);
  if (a < 0 || b < 0 || b <= a) {
    throw new Error("Marcadores __CG_REMOTE__ não encontrados no HTML de destino.");
  }
  if (remoto.url && !/^https:\/\/\S+$/.test(remoto.url))
    throw new Error("Endereço remoto precisa ser https.");
  const json = JSON.stringify(remoto).replace(/<\//g, "<\\/");
  return html.slice(0, a + REMOTO_INICIO.length) + json + html.slice(b);
}

export function validarCatalogo(data: CatalogoCg | null | undefined): string[] {
  const erros: string[] = [];
  const ehImagem = (s: unknown) =>
    typeof s === "string" &&
    (/^data:image\/(jpeg|png|webp);base64,/.test(s) || /^https:\/\/\S+$/.test(s));

  if (!data || typeof data !== "object") return ["dados ausentes"];

  const c = (data.config || {}) as Partial<CatalogoCg["config"]>;
  if (!/^\+?[\d\s()-]{10,}$/.test(String(c.whatsappNumber || "")))
    erros.push("config.whatsappNumber inválido (use +55 DDD número)");
  if (typeof c.showPromoBanner !== "boolean") erros.push("config.showPromoBanner deve ser boolean");
  for (const k of ["address", "hours", "instagram"] as const) {
    if (!String(c[k] || "").trim()) erros.push(`config.${k} vazio`);
  }

  if (!Array.isArray(data.categories) || !data.categories.length) erros.push("categories vazio");
  const catIds = new Set<string>();
  for (const cat of data.categories || []) {
    if (!/^[a-z0-9-]+$/.test(cat.id || ""))
      erros.push(`categoria com id inválido: "${cat.id}" (use letras minúsculas, números e hífen)`);
    if (catIds.has(cat.id)) erros.push(`categoria duplicada: ${cat.id}`);
    catIds.add(cat.id);
    if (!String(cat.name || "").trim()) erros.push(`categoria ${cat.id} sem nome`);
  }

  if (!Array.isArray(data.products)) erros.push("products ausente");
  const prodIds = new Set<number>();
  for (const p of data.products || []) {
    const rot = `produto "${p.name || p.id}"`;
    if (!Number.isInteger(p.id)) erros.push(`${rot}: id deve ser inteiro`);
    if (prodIds.has(p.id)) erros.push(`${rot}: id duplicado (${p.id})`);
    prodIds.add(p.id);
    if (!String(p.name || "").trim()) erros.push(`produto ${p.id} sem nome`);
    if (!catIds.has(p.category)) erros.push(`${rot}: categoria inexistente (${p.category})`);
    if (!Number.isInteger(p.priceCents) || p.priceCents <= 0)
      erros.push(
        `${rot}: priceCents deve ser inteiro de centavos > 0 (veio ${JSON.stringify(p.priceCents)})`,
      );
    if (!Array.isArray(p.sizes) || !p.sizes.length) erros.push(`${rot}: ao menos 1 tamanho`);
    if (!Array.isArray(p.colors) || !p.colors.length) erros.push(`${rot}: ao menos 1 cor`);
    for (const cor of p.colors || []) {
      if (!String(cor.n || "").trim() || !/^#[0-9a-fA-F]{6}$/.test(cor.h || ""))
        erros.push(`${rot}: cor inválida (${JSON.stringify(cor)})`);
    }
    if (p.badge != null && !(SELOS as readonly string[]).includes(p.badge))
      erros.push(`${rot}: badge inválido (${p.badge})`);
    if (
      p.badge === "promo" &&
      !(Number.isInteger(p.promoPct) && (p.promoPct ?? 0) >= 1 && (p.promoPct ?? 0) <= 90)
    ) {
      erros.push(`${rot}: promoPct obrigatório (1–90) quando badge é "promo"`);
    }
  }

  for (const t of data.testimonials || []) {
    if (!String(t.quote || "").trim() || !String(t.author || "").trim())
      erros.push("depoimento sem texto ou sem autor");
  }
  if (!Array.isArray(data.brands)) erros.push("brands ausente");

  const img = data.img || {};
  for (const k of ["hero", "fachada", "ig-1", "ig-2", "ig-3", "ig-4", "ig-5", "ig-6"]) {
    if (img[k] && !ehImagem(img[k]))
      erros.push(`img.${k} não é imagem válida (data-URL ou URL https)`);
  }
  for (const [pid, fotos] of Object.entries(data.productImgs || {})) {
    if (!prodIds.has(Number(pid))) erros.push(`productImgs: produto ${pid} não existe`);
    if (!Array.isArray(fotos) || fotos.length > 4)
      erros.push(`productImgs[${pid}]: lista de até 4 fotos`);
    for (const f of fotos || [])
      if (!ehImagem(f))
        erros.push(`productImgs[${pid}]: foto não é imagem válida (data-URL ou URL https)`);
  }

  return erros;
}
