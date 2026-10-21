import { supabase } from "@/lib/supabase";

/** Quem do cliente entra no portal: convites por e-mail e acessos ativos (só o dono gerencia). */

/** Responsável pelo contrato vê tudo; equipe não vê valores, pagamentos nem serviços adicionais (CX-0). */
export type PerfilPortal = "responsavel" | "equipe";

export const nomeDoPerfil: Record<PerfilPortal, string> = {
  responsavel: "Responsável pelo contrato",
  equipe: "Equipe",
};

export type AcessosPortal = {
  pessoas: {
    user_id: string;
    email: string;
    nome: string | null;
    desde: string;
    perfil: PerfilPortal;
    pode_aprovar: boolean;
  }[];
  convites: {
    id: string;
    email: string;
    enviado_em: string;
    vale_ate: string;
    perfil: PerfilPortal;
    pode_aprovar: boolean;
  }[];
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
export const convidarParaPortal = (
  clienteId: string,
  email: string,
  perfil: PerfilPortal,
  podeAprovar: boolean,
) =>
  rpc<{ id: string; vale_ate: string; perfil: PerfilPortal }>("portal_convidar", {
    p_cliente: clienteId,
    p_email: email,
    p_perfil: perfil,
    p_pode_aprovar: podeAprovar,
  });
export const mudarPerfil = (
  clienteId: string,
  usuarioId: string,
  perfil: PerfilPortal,
  podeAprovar: boolean,
) =>
  rpc<{ perfil: PerfilPortal; pode_aprovar: boolean }>("portal_acesso_perfil", {
    p_cliente: clienteId,
    p_usuario: usuarioId,
    p_perfil: perfil,
    p_pode_aprovar: podeAprovar,
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
    precisa_responsavel:
      "A empresa precisa de ao menos um responsável pelo contrato. Promova outra pessoa antes.",
    perfil_invalido: "Escolha o perfil: responsável pelo contrato ou equipe.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
