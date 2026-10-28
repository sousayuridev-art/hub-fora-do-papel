import { supabase } from "@/lib/supabase";
import { apagarImagem, BUCKET_MIDIA, enviarImagem, tamanhoMaximoImagem } from "@/lib/site";

/**
 * Fotos e arquivos do site (card PC-3). O arquivo fica no bucket público site-midia;
 * a descrição fica em site_midia; "onde é usada" o banco calcula na hora.
 */

export type UsoFoto = { tipo: "artigo" | "pagina"; id: string; nome: string };

export type FotoSite = {
  caminho: string;
  nome: string;
  url: string;
  tamanho: number | null;
  criado_em: string | null;
  descricao: string | null;
  usos: UsoFoto[];
};

export const chavesFotos = {
  doSite: (siteId: string) => ["fotos", siteId] as const,
};

/** Fotos aceitas para escolher no aparelho (antes de comprimir). */
export const tiposFotoEntrada = ["image/jpeg", "image/png", "image/webp"];
export const tamanhoMaximoEntrada = 20 * 1024 * 1024;

const urlPublica = (caminho: string) =>
  supabase.storage.from(BUCKET_MIDIA).getPublicUrl(caminho).data.publicUrl;

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export async function fotosDoSite(siteId: string): Promise<FotoSite[]> {
  const lista = await rpc<Omit<FotoSite, "url">[]>("site_midia_lista", { p_site: siteId });
  return (lista ?? []).map((f) => ({ ...f, usos: f.usos ?? [], url: urlPublica(f.caminho) }));
}

export const descreverFoto = (caminho: string, descricao: string) =>
  rpc<{ caminho: string; descricao: string | null }>("site_midia_descrever", {
    p_caminho: caminho,
    p_descricao: descricao,
  });

/** Confere a foto escolhida antes de comprimir; devolve o motivo ou null. */
export function problemaDaFoto(f: Pick<File, "name" | "type" | "size">): string | null {
  if (!tiposFotoEntrada.includes(f.type)) return `${f.name}: use uma foto JPG, PNG ou WebP.`;
  if (f.size > tamanhoMaximoEntrada) return `${f.name}: passa de 20 MB.`;
  return null;
}

/** Medidas para caber em `max` px no lado maior, sem aumentar foto pequena. */
export function medidasReduzidas(largura: number, altura: number, max: number) {
  const fator = Math.min(1, max / Math.max(largura, altura));
  return { largura: Math.round(largura * fator), altura: Math.round(altura * fator) };
}

/**
 * Comprime no navegador antes de subir: até 2000 px e WebP, baixando a qualidade
 * até ficar dentro dos 2 MB do bucket. Foto que já cabe e é pequena sobe como está.
 */
export async function comprimirFoto(f: File): Promise<File> {
  const bitmap = await createImageBitmap(f);
  try {
    if (f.size <= tamanhoMaximoImagem && Math.max(bitmap.width, bitmap.height) <= 2000) return f;
    for (const max of [2000, 1600, 1200]) {
      const { largura, altura } = medidasReduzidas(bitmap.width, bitmap.height, max);
      const tela = document.createElement("canvas");
      tela.width = largura;
      tela.height = altura;
      const ctx = tela.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, largura, altura);
      for (const qualidade of [0.85, 0.75, 0.65]) {
        const blob = await new Promise<Blob | null>((ok) =>
          tela.toBlob(ok, "image/webp", qualidade),
        );
        if (blob && blob.type === "image/webp" && blob.size <= tamanhoMaximoImagem) {
          const nome = f.name.replace(/\.[^.]+$/, "") + ".webp";
          return new File([blob], nome, { type: "image/webp" });
        }
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error(`${f.name}: não foi possível reduzir para 2 MB. Tente uma foto menor.`);
}

export async function enviarFoto(siteId: string, f: File): Promise<FotoSite> {
  const pronta = await comprimirFoto(f);
  const img = await enviarImagem(siteId, pronta);
  await rpc("site_midia_enviada", { p_caminho: img.caminho });
  return { ...img, descricao: null, usos: [] };
}

export const apagarFoto = (caminho: string) => apagarImagem(caminho);

export function mensagemDaFoto(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : String((e as { message?: unknown } | null)?.message ?? "");
  if (/não foi possível reduzir|use uma foto|passa de 20 MB/.test(texto)) return texto;
  const mapa: Record<string, string> = {
    foto_inexistente: "Essa foto não existe mais. Recarregue a página.",
    site_inexistente: "Esse site não está disponível para você. Recarregue a página.",
    imagem_nao_apagada:
      "A foto não foi apagada. Se ela estiver em uso em algum artigo ou página, tire de lá antes.",
    "row-level security": "Seu acesso não permite enviar fotos para este site.",
    "Payload too large": "A foto passa de 2 MB.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
