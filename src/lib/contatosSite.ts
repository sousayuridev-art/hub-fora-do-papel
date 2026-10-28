import { supabase } from "@/lib/supabase";

/** Contatos do site do cliente (card PC-5): formulário e cliques no WhatsApp numa caixa só. */

export type OrigemContato = "formulario" | "whatsapp";
export type FiltroContatos = "esperando" | "todos";

export type ContatoSite = {
  id: string;
  origem: OrigemContato;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  pagina: string | null;
  mensagem: string | null;
  respondido: boolean;
  respondido_em: string | null;
  criado_em: string;
};

export type ListaContatos = {
  contagem: Record<FiltroContatos, number>;
  itens: ContatoSite[];
};

export const chavesContatos = {
  tudo: ["contatos"] as const,
  lista: (siteId: string, filtro: FiltroContatos) => ["contatos", siteId, filtro] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const contatosDoSite = (siteId: string, filtro: FiltroContatos) =>
  rpc<ListaContatos>("portal_contatos", { p_site: siteId, p_filtro: filtro });

export const marcarRespondido = (id: string, respondido: boolean) =>
  rpc<{ id: string; respondido: boolean }>("portal_contato_respondido", {
    p_id: id,
    p_respondido: respondido,
  });

/** Mensagem pronta do WhatsApp; a pessoa revisa antes de enviar. */
export function linkWhatsApp(
  c: Pick<ContatoSite, "nome" | "telefone">,
  empresa: string,
): string | null {
  if (!c.telefone) return null;
  const numero = c.telefone.length <= 11 ? `55${c.telefone}` : c.telefone;
  const primeiro = c.nome?.trim().split(/\s+/)[0];
  const texto = `Oi${primeiro ? `, ${primeiro}` : ""}! Aqui é da ${empresa}. Vi sua mensagem pelo site.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** (79) 99999-0001 */
export function telefoneLegivel(t: string | null): string {
  if (!t) return "";
  const d = t.length > 11 ? t.slice(-11) : t;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

export function mensagemDoContato(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : String((e as { message?: unknown } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    contato_inexistente: "Esse contato não existe mais. Recarregue a página.",
    modulo_nao_contratado: "Contatos não faz parte do que foi contratado para o seu site.",
    site_inexistente: "Esse site não está disponível para você. Recarregue a página.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
