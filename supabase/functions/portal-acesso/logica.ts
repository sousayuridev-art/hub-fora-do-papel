/**
 * Lógica pura da função `portal-acesso` (card SEG-2): sem rede, sem Deno.
 * Testada pelo Vitest em src/test/seg-2.test.ts.
 */

/** Origens que podem chamar a função (mesma lista das outras funções do Hub). */
const ORIGENS = [
  /^https:\/\/spring-board-kit\.lovable\.app$/,
  /^https:\/\/([a-z0-9-]+\.)*foradopapel\.com\.br$/,
  /^http:\/\/(localhost|127\.0\.0\.1):[0-9]{2,5}$/,
];
export function origemPermitida(origem: string | null | undefined): origem is string {
  return typeof origem === "string" && ORIGENS.some((r) => r.test(origem));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Pedido = { cliente: string; email: string };

/** Confere o corpo do pedido. Devolve null se estiver fora do formato. */
export function lerPedido(corpo: unknown): Pedido | null {
  if (!corpo || typeof corpo !== "object") return null;
  const { cliente, email } = corpo as Record<string, unknown>;
  if (typeof cliente !== "string" || !UUID.test(cliente)) return null;
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  if (e.length > 160 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return null;
  return { cliente, email: e };
}

/** Conta nova: convite (cria a conta). Conta sem senha que já existe: link mágico. */
export function tipoDoLink(existe: boolean): "invite" | "magiclink" {
  return existe ? "magiclink" : "invite";
}

/** Tipos aceitos pelo verifyOtp do navegador. */
export type TipoVerificacao = "invite" | "magiclink" | "signup" | "email";

/**
 * Da resposta do generate_link fica só o necessário: o token com hash e o tipo (vão ao navegador) e
 * o id da conta (fica na função, para prender a conta ao tenant). O código de 6 dígitos (email_otp)
 * e o action_link nunca saem da função.
 */
export function linkDaResposta(
  r: unknown,
): { token_hash: string; tipo: TipoVerificacao; usuario: string } | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const props = (
    o["properties"] && typeof o["properties"] === "object" ? o["properties"] : o
  ) as Record<string, unknown>;
  const conta = (o["user"] && typeof o["user"] === "object" ? o["user"] : o) as Record<
    string,
    unknown
  >;
  const token = props["hashed_token"];
  const tipo = props["verification_type"];
  const usuario = conta["id"];
  if (typeof token !== "string" || !/^[0-9a-f]{20,}$/i.test(token)) return null;
  if (typeof usuario !== "string" || !UUID.test(usuario)) return null;
  const aceitos: TipoVerificacao[] = ["invite", "magiclink", "signup", "email"];
  const t = aceitos.find((x) => x === tipo) ?? null;
  if (!t) return null;
  return { token_hash: token, tipo: t, usuario };
}

/** Erros que o navegador pode ver (o resto vira "falha"). */
const PUBLICOS = [
  "cliente_inexistente",
  "email_invalido",
  "sem_convite",
  "usar_entrada",
  "muitas_tentativas",
  "sem_permissao",
  "precisa_codigo",
] as const;
export type ErroPublico = (typeof PUBLICOS)[number] | "falha";

export function erroPublico(mensagem: string): ErroPublico {
  const m = PUBLICOS.find((p) => mensagem.includes(p));
  if (m) return m;
  // Conta já presa a outro tenant: mesma resposta das outras recusas (não vira sonda)
  if (mensagem.includes("conta_de_outro")) return "usar_entrada";
  if (/tenant_ambiguo|permission denied|jwt/i.test(mensagem)) return "sem_permissao";
  return "falha";
}
