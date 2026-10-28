import type { Data } from "@puckeditor/core";

import type { PropsDaPagina, Secoes } from "@/secoes/config";
import { supabase } from "@/lib/supabase";

/**
 * Páginas montadas por seções (card PC-4). Leitura pela RLS (dono e pessoa do portal com o módulo
 * "paginas"); gravação pelas RPCs site_pagina_*, que validam formato, travas e marcadores.
 */

export type DadosPagina = Data<Secoes, PropsDaPagina>;

export type PaginaResumo = {
  id: string;
  site_id: string;
  nome: string;
  caminho: string;
  publicado_em: string | null;
  atualizado_em: string;
};

export type PaginaCompleta = PaginaResumo & {
  rascunho: DadosPagina;
  versao: number;
  /** O rascunho tem mudança que ainda não foi ao ar. */
  tem_rascunho: boolean;
};

export type SecaoPermitida = { tipo: string; travada: boolean };

export const chavesPaginas = {
  doSite: (siteId: string) => ["paginas", siteId] as const,
  pagina: (id: string) => ["paginas", "uma", id] as const,
  secoes: (siteId: string) => ["paginas", "secoes", siteId] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export async function paginasDoSite(siteId: string): Promise<PaginaResumo[]> {
  const { data, error } = await supabase
    .from("site_paginas")
    .select("id, site_id, nome, caminho, publicado_em, atualizado_em")
    .eq("site_id", siteId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PaginaResumo[];
}

export async function buscarPagina(id: string): Promise<PaginaCompleta> {
  const { data, error } = await supabase
    .from("site_paginas")
    .select("id, site_id, nome, caminho, rascunho, publicado, publicado_em, versao, atualizado_em")
    .eq("id", id)
    .single();
  if (error) throw error;
  const { publicado, ...resto } = data as PaginaCompleta & { publicado: DadosPagina | null };
  return { ...resto, tem_rascunho: JSON.stringify(publicado) !== JSON.stringify(resto.rascunho) };
}

export async function secoesDoSite(siteId: string): Promise<SecaoPermitida[]> {
  const { data, error } = await supabase
    .from("site_secoes_permitidas")
    .select("tipo, travada")
    .eq("site_id", siteId);
  if (error) throw error;
  return (data ?? []) as SecaoPermitida[];
}

type PaginaRpc = Omit<PaginaCompleta, "caminho" | "nome"> & { caminho: string; nome: string };

export const salvarRascunho = (id: string, dados: DadosPagina, versao: number) =>
  rpc<PaginaRpc>("site_pagina_salvar_rascunho", { p_id: id, p_dados: dados, p_versao: versao });
export const publicarPagina = (id: string) => rpc<PaginaRpc>("site_pagina_publicar", { p_id: id });
export const criarPagina = (siteId: string, nome: string, caminho: string) =>
  rpc<PaginaRpc>("site_pagina_criar", { p_site: siteId, p_nome: nome, p_caminho: caminho });
export const definirSecoes = (siteId: string, secoes: SecaoPermitida[]) =>
  rpc<SecaoPermitida[]>("site_secoes_definir", { p_site: siteId, p_secoes: secoes });

/** Textos digitados na página, para a pessoa copiar quando há conflito de versão. */
export function textosDaPagina(d: DadosPagina): string {
  const textos: string[] = [];
  const coletar = (v: unknown) => {
    if (typeof v === "string") {
      if (v.trim() && !/^https?:\/\//.test(v)) textos.push(v.trim());
    } else if (Array.isArray(v)) v.forEach(coletar);
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, x]) => k !== "id" && coletar(x));
  };
  d.content.forEach((c) => coletar(c.props));
  return [...new Set(textos)].join("\n\n");
}

/** Há marcador pendente ([TÍTULO], [PREÇO]…)? Mesma regra do banco (_site_tem_marcador). */
export const temMarcador = (d: DadosPagina) =>
  /\[[A-ZÀ-Ý][A-ZÀ-Ý ]*\](?!\()/.test(JSON.stringify(d));

export function mensagemDaPagina(e: unknown): string | null {
  const o = (e ?? {}) as { message?: unknown; details?: unknown };
  const texto = e instanceof Error ? e.message : String(o.message ?? "");
  const detalhe = typeof o.details === "string" ? o.details : "";
  const mapa: Record<string, string> = {
    pagina_alterada: "Esta página foi alterada por outra pessoa.",
    marcador_pendente:
      "Ainda há textos de exemplo entre colchetes, como [TÍTULO]. Troque pelo texto final antes de publicar.",
    secao_nao_permitida: `Esta seção não está liberada para o seu site${detalhe ? ` (${detalhe})` : ""}.`,
    secao_travada:
      "Uma seção fixa do site foi movida ou removida. Volte ela para o lugar antes de publicar.",
    pagina_nao_liberada: "Esta página ainda não foi liberada pela Fora do Papel.",
    pagina_invalida: `A página tem um problema${detalhe ? `: ${detalhe}` : ""}.`,
    pagina_inexistente: "Essa página não existe mais. Recarregue.",
    modulo_nao_contratado: "Editar páginas não faz parte do que foi contratado para o seu site.",
    caminho_em_uso: "Já existe uma página com esse endereço.",
    caminho_invalido:
      "O endereço precisa começar com / e ter só letras minúsculas, números e hífens.",
    nome_obrigatorio: "Dê um nome à página.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}

export const ehConflitoDePagina = (e: unknown) =>
  String((e as { message?: unknown } | null)?.message ?? "").includes("pagina_alterada");
