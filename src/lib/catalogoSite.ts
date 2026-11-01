import {
  extrairCatalogo,
  injetarCatalogo,
  preencherRemoto,
  validarCatalogo,
  type CatalogoCg,
} from "@/lib/catalogoCg";
import { enviarFoto } from "@/lib/fotosSite";
import { BUCKET_MIDIA } from "@/lib/site";
import { supabase } from "@/lib/supabase";

/**
 * Ponte entre o banco do Hub e o arquivo do site da CG (contrato em docs/integracoes/catalogo-cg/):
 * importação inicial a partir do HTML em produção, HTML base e geração do arquivo com o bloco
 * __CG_DATA__ (reserva embutida) e o __CG_REMOTE__ (o site lê o banco do Hub).
 */

/** Base pública das fotos (bucket site-midia), enviada ao publicar para montar as URLs do contrato. */
export function baseDasFotos(): string {
  const u = supabase.storage.from(BUCKET_MIDIA).getPublicUrl("x").data.publicUrl;
  return u.slice(0, -1);
}

/** Endereço que o bloco __CG_REMOTE__ busca (GET da função pública, com a chave publishable). */
export function remotoDoSite(dominio: string) {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  return {
    url: `${base.replace(/\/$/, "")}/rest/v1/rpc/site_catalogo_publicado?p_dominio=${encodeURIComponent(dominio)}`,
    headers: { apikey: chave },
  };
}

export type BaseDoSite = { nome_arquivo: string | null; atualizado_em: string; tamanho: number };

export async function lerBase(site: string): Promise<BaseDoSite | null> {
  const { data, error } = await supabase
    .from("site_catalogo_base")
    .select("nome_arquivo, atualizado_em, html")
    .eq("site_id", site)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = data as { nome_arquivo: string | null; atualizado_em: string; html: string };
  return { nome_arquivo: d.nome_arquivo, atualizado_em: d.atualizado_em, tamanho: d.html.length };
}

export async function salvarBase(site: string, html: string, nome: string) {
  extrairCatalogo(html); // confere o contrato antes de subir
  const { error } = await supabase.rpc("site_catalogo_base_salvar", {
    p_site: site,
    p_html: html,
    p_nome: nome,
  });
  if (error) throw error;
}

/** Gera o arquivo do site de uma versão publicada (padrão: a última) sobre o HTML base. */
export async function gerarArquivoDoSite(
  site: string,
  dominio: string,
  versao?: number,
): Promise<string> {
  const [{ data: base, error: e1 }, { data: contrato, error: e2 }] = await Promise.all([
    supabase.from("site_catalogo_base").select("html").eq("site_id", site).maybeSingle(),
    supabase.rpc("site_catalogo_contrato", { p_site: site, p_versao: versao ?? null }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (!base) throw new Error("sem_base");
  if (!contrato) throw new Error("sem_publicacao");
  const html = injetarCatalogo((base as { html: string }).html, contrato as CatalogoCg);
  return preencherRemoto(html, remotoDoSite(dominio));
}

export function baixarArquivo(html: string, nome = "index.html") {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ---------------------------------------------------------------------------
// Importação inicial
// ---------------------------------------------------------------------------

const MAIOR_LADO: Record<string, number> = { hero: 1400, fachada: 1200 };
const ladoDe = (chave: string) =>
  MAIOR_LADO[chave] ?? (chave.startsWith("ig-") ? 700 : chave.startsWith("cat-") ? 800 : 900);

function dataUrlParaArquivo(dataUrl: string, nome: string): File {
  const [cab, b64 = ""] = dataUrl.split(",", 2);
  const tipo = /data:([^;]+)/.exec(cab ?? "")?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
  return new File([bytes], `${nome}.${ext}`, { type: tipo });
}

/** Resumo do que será importado (para conferir antes de substituir). */
export function resumoDoArquivo(data: CatalogoCg) {
  return {
    produtos: data.products.length,
    categorias: data.categories.length,
    depoimentos: data.testimonials.length,
    marcas: data.brands.length,
    fotos:
      Object.keys(data.img).length +
      Object.values(data.productImgs).reduce((t, l) => t + l.length, 0),
    erros: validarCatalogo(data),
  };
}

/**
 * Lê o HTML em produção, sobe as fotos para o bucket (uma a uma, 3 por vez) e grava tudo no banco
 * numa só chamada (site_catalogo_importar substitui o catálogo). Guarda o HTML como base.
 */
export async function importarDoSite(
  site: string,
  html: string,
  nomeArquivo: string,
  aoProgresso: (feitas: number, total: number) => void,
) {
  const { data } = extrairCatalogo(html);
  const prefixo = baseDasFotos();
  const tarefas: { chave: string; valor: string }[] = [
    ...Object.entries(data.img).map(([chave, valor]) => ({ chave, valor })),
    ...Object.entries(data.productImgs).flatMap(([id, fotos]) =>
      fotos.map((valor, i) => ({ chave: `p-${id}-${i}`, valor })),
    ),
  ];
  const caminhos = new Map<string, string>();
  let feitas = 0;
  aoProgresso(0, tarefas.length);
  const fila = [...tarefas];
  const trabalhar = async () => {
    for (let t = fila.shift(); t; t = fila.shift()) {
      if (t.valor.startsWith(prefixo)) caminhos.set(t.chave, t.valor.slice(prefixo.length));
      else if (t.valor.startsWith("data:image/")) {
        const lado = ladoDe(t.chave.startsWith("p-") ? "produto" : t.chave);
        const foto = await enviarFoto(site, dataUrlParaArquivo(t.valor, `cg-${t.chave}`), lado);
        caminhos.set(t.chave, foto.caminho);
      }
      feitas += 1;
      aoProgresso(feitas, tarefas.length);
    }
  };
  await Promise.all([trabalhar(), trabalhar(), trabalhar()]);

  const fotosFixas: Record<string, string> = {};
  for (const k of ["hero", "fachada", "ig-1", "ig-2", "ig-3", "ig-4", "ig-5", "ig-6"]) {
    const c = caminhos.get(k);
    if (c) fotosFixas[k.replace("ig-", "ig")] = c;
  }
  const dados = {
    config: {
      whatsapp: data.config.whatsappNumber.replace(/\D/g, ""),
      endereco: data.config.address,
      horario: data.config.hours,
      instagram: data.config.instagram.replace(/^@/, ""),
      mostrar_promocoes: data.config.showPromoBanner,
      marcas: data.brands,
      fotos: fotosFixas,
    },
    categorias: data.categories.map((c) => ({
      slug: c.id,
      nome: c.name,
      foto: caminhos.get(`cat-${c.id}`) ?? null,
    })),
    produtos: data.products.map((p) => ({
      codigo: p.id,
      nome: p.name,
      categoria: p.category,
      marca: p.brand || null,
      preco_cents: p.priceCents,
      tamanhos: p.sizes,
      cores: p.colors.map((c) => ({ nome: c.n, tom: c.h })),
      selo: p.badge ?? null,
      promo_pct: p.badge === "promo" ? (p.promoPct ?? null) : null,
      fotos: (data.productImgs[String(p.id)] ?? [])
        .map((_, i) => caminhos.get(`p-${p.id}-${i}`))
        .filter((c): c is string => Boolean(c)),
    })),
    depoimentos: data.testimonials.map((t) => ({ texto: t.quote, autor: t.author })),
  };
  const { error } = await supabase.rpc("site_catalogo_importar", { p_site: site, p_dados: dados });
  if (error) throw error;
  await salvarBase(site, html, nomeArquivo);
}
