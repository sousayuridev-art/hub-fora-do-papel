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
  senhas: (clienteId: string) => ["acesso-portal", clienteId, "senhas"] as const,
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

/** Quem já criou a senha (SEG-2), por id de usuário. Só o dono lê. */
export const quemTemSenha = (clienteId: string) =>
  rpc<Record<string, boolean>>("portal_acesso_tem_senha", { p_cliente: clienteId });

export type TipoLink = "invite" | "magiclink" | "signup" | "email";

/** Link de primeiro acesso: volta pelo /auth/callback e cai na tela "Crie sua senha". */
export function linkDePrimeiroAcesso(origem: string, tokenHash: string, tipo: TipoLink): string {
  const u = new URL("/auth/callback", origem);
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", tipo);
  u.searchParams.set("volta", "/entrar/senha?tipo=primeiro");
  return u.toString();
}

/**
 * Gera o link de primeiro acesso pela função de servidor `portal-acesso` (SEG-2). O Auth não manda
 * e-mail; o Yuri envia o link pelo WhatsApp. Só para conta sem senha (o banco confere).
 */
export async function gerarPrimeiroAcesso(clienteId: string, email: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("portal-acesso", {
    method: "POST",
    body: { cliente: clienteId, email },
  });
  if (error) {
    const corpo: unknown = await (error as { context?: Response }).context
      ?.json?.()
      .catch(() => null);
    const msg =
      corpo && typeof corpo === "object" && "erro" in corpo ? String(corpo.erro) : "falha";
    throw new Error(msg);
  }
  const r = data as { token_hash?: unknown; tipo?: unknown } | null;
  if (typeof r?.token_hash !== "string" || typeof r.tipo !== "string") throw new Error("falha");
  return linkDePrimeiroAcesso(window.location.origin, r.token_hash, r.tipo as TipoLink);
}

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
    ja_tem_senha:
      "Essa pessoa já criou a senha. Se esqueceu, ela pode usar “Primeiro acesso ou esqueceu a senha?” na tela de entrada.",
    sem_convite: "Convide a pessoa antes de gerar o link.",
    conta_de_outro:
      "Esse e-mail já é usado em outra conta. Peça para a pessoa usar “Primeiro acesso ou esqueceu a senha?” na tela de entrada.",
    muitas_tentativas: "Muitos links gerados hoje. Tente de novo amanhã.",
    precisa_codigo: "Confirme o código do app antes de continuar.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
