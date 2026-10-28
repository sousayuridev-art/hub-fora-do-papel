import { supabase } from "@/lib/supabase";

/** Dados do negócio e "Aparecer no Google" (card PC-6). Salvou, o site lê na hora. */

export type Horario = { dias: string; abre?: string; fecha?: string; fechado?: boolean };

export type Negocio = {
  nome?: string;
  whatsapp?: string;
  endereco?: string;
  instagram?: string;
  horario?: Horario[];
};

export type Google = { titulo?: string; descricao?: string };

export type PessoaEquipe = { nome: string | null; email: string; perfil: "responsavel" | "equipe" };

export type AjustesSite = {
  negocio: Negocio;
  google: Google;
  dominio: string;
  no_ar: boolean;
  equipe: PessoaEquipe[];
};

export const limitesGoogle = { titulo: 60, descricao: 155 };

export const chavesAjustes = { doSite: (siteId: string) => ["ajustes", siteId] as const };

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const ajustesDoSite = (siteId: string) =>
  rpc<AjustesSite>("portal_ajustes", { p_site: siteId });
export const salvarNegocio = (siteId: string, dados: Negocio) =>
  rpc<Negocio>("site_negocio_salvar", { p_site: siteId, p_dados: dados });
export const salvarGoogle = (siteId: string, dados: Google) =>
  rpc<Google>("site_google_salvar", { p_site: siteId, p_dados: dados });

export const horarioPadrao: Horario[] = [
  { dias: "Segunda a sexta", abre: "08:00", fecha: "18:00" },
  { dias: "Sábado", abre: "08:00", fecha: "12:00" },
  { dias: "Domingo", fechado: true },
];

/** Confere o que o banco também confere; devolve o motivo ou null (o banco tem a última palavra). */
export function problemaDoNegocio(n: Negocio): string | null {
  if ((n.nome ?? "").trim().length < 2) return "Escreva o nome do negócio.";
  const tel = (n.whatsapp ?? "").replace(/\D/g, "");
  if (tel && (tel.length < 10 || tel.length > 13))
    return "WhatsApp: use DDD e número, como (79) 99999-0000.";
  if (n.instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(n.instagram.trim()))
    return "Instagram: só o nome do perfil, como @seunegocio.";
  for (const h of n.horario ?? []) {
    if (h.dias.trim().length < 2) return "Horário: diga os dias de cada linha.";
    if (!h.fechado && (!h.abre || !h.fecha || h.abre >= h.fecha))
      return `Horário de ${h.dias}: a hora de abrir precisa ser antes da hora de fechar.`;
  }
  return null;
}

export function mensagemDosAjustes(e: unknown): string | null {
  const o = (e ?? {}) as { message?: unknown; details?: unknown };
  const texto = e instanceof Error ? e.message : String(o.message ?? "");
  const detalhe = typeof o.details === "string" ? o.details : "";
  if (texto.includes("negocio_invalido") || texto.includes("google_invalido"))
    return `O banco recusou: ${detalhe || "formato não aceito"}.`;
  if (texto.includes("site_inexistente"))
    return "Esse site não está disponível para você. Recarregue a página.";
  return null;
}
