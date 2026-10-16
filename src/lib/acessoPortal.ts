import { supabase } from "@/lib/supabase";

/** Quem do cliente entra no portal: convites por e-mail e acessos ativos (só o dono gerencia). */

export type AcessosPortal = {
  pessoas: { user_id: string; email: string; desde: string }[];
  convites: { id: string; email: string; enviado_em: string; vale_ate: string }[];
};

export const chavesAcessoPortal = {
  doCliente: (clienteId: string) => ["acesso-portal", clienteId] as const,
};

async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const acessosDoPortal = (clienteId: string) =>
  rpc<AcessosPortal>("portal_acessos", { p_cliente: clienteId });
export const convidarParaPortal = (clienteId: string, email: string) =>
  rpc<{ id: string; vale_ate: string }>("portal_convidar", {
    p_cliente: clienteId,
    p_email: email,
  });
export const cancelarConvite = (id: string) => rpc("portal_convite_cancelar", { p_id: id });
export const removerAcesso = (clienteId: string, usuarioId: string) =>
  rpc("portal_acesso_remover", { p_cliente: clienteId, p_usuario: usuarioId });

export function mensagemDoAcesso(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    email_invalido: "Confira o e-mail digitado.",
    email_de_dono: "Esse e-mail é de quem administra o Hub; use outro para o cliente.",
    ja_tem_acesso: "Essa pessoa já entra no portal.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
