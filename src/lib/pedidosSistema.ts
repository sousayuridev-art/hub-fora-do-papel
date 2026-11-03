import { supabase } from "@/lib/supabase";

/**
 * Conversa, prints e chave de integração dos pedidos que vêm dos sistemas (card SIS-2).
 * O sistema do cliente fala com a função `sistema-pedidos`; aqui é o lado do Yuri no Hub.
 */

export type MensagemPedido = {
  id: string;
  autor: "equipe" | "cliente";
  autor_nome: string;
  texto: string;
  created_at: string;
  /** Mensagem ainda sendo enviada (atualização otimista). */
  enviando?: boolean;
};

export type PrintPedido = { id: string; caminho: string; tipo: string; created_at: string };

export type Integracao = {
  ligada: boolean;
  prefixo: string | null;
  criada_em: string | null;
  ultimo_uso_em: string | null;
  pedidos: number;
  abertos: number;
};

export const chavesPedidoSistema = {
  conversa: (pedido: string) => ["pedidos", pedido, "conversa"] as const,
  prints: (pedido: string) => ["pedidos", pedido, "prints"] as const,
  integracao: (sistema: string) => ["sistemas", sistema, "integracao"] as const,
};

const BUCKET = "pedidos-anexos";

export async function conversaDoPedido(pedido: string): Promise<MensagemPedido[]> {
  const { data, error } = await supabase
    .from("request_mensagens")
    .select("id, autor, autor_nome, texto, created_at")
    .eq("request_id", pedido)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as MensagemPedido[];
}

/** Prints com endereço temporário (10 min) para mostrar no painel. */
export async function printsDoPedido(
  pedido: string,
): Promise<(PrintPedido & { url: string | null })[]> {
  const { data, error } = await supabase
    .from("request_anexos")
    .select("id, caminho, tipo, created_at")
    .eq("request_id", pedido)
    .order("created_at");
  if (error) throw error;
  const lista = (data ?? []) as PrintPedido[];
  if (lista.length === 0) return [];
  const { data: urls, error: e2 } = await supabase.storage.from(BUCKET).createSignedUrls(
    lista.map((p) => p.caminho),
    600,
  );
  if (e2) throw e2;
  const mapa = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
  return lista.map((p) => ({ ...p, url: mapa.get(p.caminho) ?? null }));
}

async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const responderPedido = (pedido: string, texto: string) =>
  rpc<MensagemPedido>("pedido_mensagem_enviar", { p_pedido: pedido, p_texto: texto });

export const integracaoDoSistema = (sistema: string) =>
  rpc<Integracao>("sistema_integracao", { p_sistema: sistema });

export const gerarChave = (sistema: string) =>
  rpc<{ chave: string; prefixo: string }>("sistema_chave_gerar", { p_sistema: sistema });

export const revogarChave = (sistema: string) =>
  rpc<void>("sistema_chave_revogar", { p_sistema: sistema });

/** Endereço que o sistema do cliente chama (vai no segredo HUB_PEDIDOS_URL do sistema). */
export function enderecoDaFuncao(base = import.meta.env.VITE_SUPABASE_URL as string | undefined) {
  return `${(base ?? "").replace(/\/+$/, "")}/functions/v1/sistema-pedidos`;
}

export const rotuloTipoPedido = { erro: "Erro", melhoria: "Melhoria" } as const;
export const rotuloPrioridadePedido = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
} as const;

export function mensagemDoPedidoSistema(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : String((e as { message?: unknown } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    texto_obrigatorio: "Escreva a resposta antes de enviar.",
    pedido_inexistente: "Esse pedido não existe mais. Recarregue a página.",
    sistema_inexistente: "Esse sistema não existe mais. Recarregue a página.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
