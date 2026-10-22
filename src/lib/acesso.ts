import { redirect } from "@tanstack/react-router";
import { entradaPara } from "@/lib/volta";
import type { QueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type Papel = "owner" | "client";
export type Acesso = { papel: Papel | null; tenantId: string | null; clientId: string | null };
type LinhaAcesso = { tenant_id: string; role: Papel; client_id: string | null };

export const chavesAcesso = {
  todas: ["acesso"] as const,
  doUsuario: (userId: string) => ["acesso", userId] as const,
};

/** Destino padrão de cada papel. */
export const inicioDoPapel: Record<Papel, "/app" | "/portal"> = {
  owner: "/app",
  client: "/portal",
};

/** Papel do usuário pela RPC my_access() (security definer). Dono tem prioridade sobre cliente. */
export async function buscarAcesso(): Promise<Acesso> {
  const primeiro = await lerAcesso();
  if (primeiro.papel) return primeiro;
  // Sem papel: pode ser o primeiro acesso de um cliente convidado. O banco liga o e-mail ao convite.
  const { data, error } = await supabase.rpc("portal_aceitar_convite");
  if (error || !((data as { ligados?: number } | null)?.ligados ?? 0)) return primeiro;
  return lerAcesso();
}

async function lerAcesso(): Promise<Acesso> {
  const { data, error } = await supabase.rpc("my_access");
  if (error) throw error;
  const linhas = (data ?? []) as LinhaAcesso[];
  const dono = linhas.find((l) => l.role === "owner");
  if (dono) return { papel: "owner", tenantId: dono.tenant_id, clientId: null };
  const cliente = linhas.find((l) => l.role === "client" && l.client_id);
  if (cliente) return { papel: "client", tenantId: cliente.tenant_id, clientId: cliente.client_id };
  return { papel: null, tenantId: null, clientId: null };
}

/** Sessão + papel, com cache no TanStack Query (mesma chave usada por useAccess). */
export async function carregarAcesso(queryClient: QueryClient) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return { session: null, acesso: null };
  const acesso = await queryClient.ensureQueryData({
    queryKey: chavesAcesso.doUsuario(session.user.id),
    queryFn: buscarAcesso,
  });
  return { session, acesso };
}

/**
 * Porta de entrada das áreas, usada no beforeLoad das rotas.
 * Só decide para onde a pessoa vai; quem protege os dados é a RLS no banco.
 */
export async function exigirPapel(queryClient: QueryClient, papel: Papel, caminho: string) {
  const { session, acesso } = await carregarAcesso(queryClient);
  if (!session)
    throw redirect({ to: papel === "owner" ? "/gestor" : "/entrar", search: { volta: caminho } });
  if (!acesso?.papel) throw redirect({ to: "/sem-acesso" });
  if (acesso.papel !== papel) throw redirect({ to: inicioDoPapel[acesso.papel] });
  if (papel === "owner") await exigirCodigo(caminho);
  return { acesso };
}

/**
 * Gestor (card SEG-1): sem app autenticador, vai ativar; com app e sem o código nesta sessão,
 * vai digitar o código. O banco recusa as ações de dono do mesmo jeito (aal2).
 */
export async function exigirCodigo(caminho: string) {
  // Sessão ilegível (token corrompido) também volta para a entrada, em vez da tela de erro.
  const { data, error } = await supabase.auth.mfa
    .getAuthenticatorAssuranceLevel()
    .catch((e: unknown) => ({ data: null, error: e }));
  if (error || !data) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    throw redirect({ to: "/gestor", search: { volta: caminho } });
  }
  if (data.currentLevel === "aal2") return;
  if (data.nextLevel === "aal2")
    throw redirect({ to: "/entrar/codigo", search: { volta: caminho } });
  throw redirect({ to: "/seguranca", search: { volta: caminho, ativar: true } });
}

/** Páginas que servem aos dois papéis (ex.: recibo): só exige estar logado com algum acesso. */
export async function exigirAcesso(queryClient: QueryClient, caminho: string) {
  const { session, acesso } = await carregarAcesso(queryClient);
  if (!session) throw redirect({ to: entradaPara(caminho), search: { volta: caminho } });
  if (!acesso?.papel) throw redirect({ to: "/sem-acesso" });
  if (acesso.papel === "owner") await exigirCodigo(caminho);
  return { acesso };
}
