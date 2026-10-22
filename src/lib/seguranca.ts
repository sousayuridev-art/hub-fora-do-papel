import { supabase } from "@/lib/supabase";

/**
 * Login do gestor (card SEG-1): senha + código de 6 dígitos de um app autenticador (TOTP).
 * O banco também exige a sessão verificada pelo código (aal2) para qualquer ação de dono.
 */

export const SENHA_MINIMA = 12;

export type AppAutenticador = { id: string; nome: string; criadoEm: string };
export type NovoApp = { id: string; qr: string; segredo: string };

export const chavesSeguranca = {
  apps: ["seguranca", "apps"] as const,
};

/** Nível da sessão: "aal2" = código verificado; proximo "aal2" = tem app e falta o código. */
export async function nivelDaSessao(): Promise<{ atual: string | null; proximo: string | null }> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return { atual: data.currentLevel, proximo: data.nextLevel };
}

export async function appsAtivos(): Promise<AppAutenticador[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp
    .filter((f) => f.status === "verified")
    .map((f) => ({
      id: f.id,
      nome: f.friendly_name ?? "App autenticador",
      criadoEm: f.created_at,
    }));
}

export async function entrarComSenha(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
}

/** Segunda etapa: confere o código no primeiro app ativo. */
export async function verificarCodigo(codigo: string) {
  const [app] = await appsAtivos();
  if (!app) throw new Error("sem_app");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: app.id, code: codigo });
  if (error) throw error;
}

/** Começa a ativação: o Supabase devolve o QR (imagem SVG) e a chave para digitar à mão. */
export async function iniciarApp(nome: string): Promise<NovoApp> {
  // Ativações que ficaram pela metade atrapalham uma nova: tira as não confirmadas antes.
  const { data: lista } = await supabase.auth.mfa.listFactors();
  for (const f of lista?.all ?? []) {
    if (f.factor_type === "totp" && f.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `${nome} · ${new Date().toISOString().slice(0, 16)}`,
  });
  if (error) throw error;
  return { id: data.id, qr: imagemDoQr(data.totp.qr_code), segredo: data.totp.secret };
}

/** O Supabase manda o SVG cru ("data:image/svg+xml;utf-8,<svg…"); codificado, toda imagem abre. */
export function imagemDoQr(qr: string): string {
  const m = /^data:image\/svg\+xml;utf-8,(.*)$/s.exec(qr);
  return m ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(m[1] ?? "")}` : qr;
}

export async function confirmarApp(id: string, codigo: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code: codigo });
  if (error) throw error;
}

export async function removerApp(id: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
  if (error) throw error;
}

export async function definirSenha(senha: string) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) throw error;
}

/** "Esqueci a senha": o link leva ao código do app e depois a "Criar nova senha". */
export async function enviarLinkRecuperacao(email: string) {
  const retorno = new URL("/auth/callback", window.location.origin);
  retorno.searchParams.set("volta", "/seguranca?acao=senha");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: retorno.toString(), shouldCreateUser: false },
  });
  if (error) throw error;
}

/** Força da senha em 3 níveis, sem bibliotecas pesadas. */
export function forcaDaSenha(s: string): { nivel: 0 | 1 | 2 | 3; texto: string } {
  if (s.length < SENHA_MINIMA)
    return { nivel: 0, texto: `Use pelo menos ${SENHA_MINIMA} caracteres` };
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(s)).length;
  if (s.length >= 16 && tipos >= 3) return { nivel: 3, texto: "Forte" };
  if (tipos >= 2) return { nivel: 2, texto: "Boa" };
  return { nivel: 1, texto: "Fraca: misture letras, números ou símbolos" };
}

/** Erros do login e do código em português. */
export function mensagemDeSeguranca(e: unknown): string {
  const t = (
    e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? "")
  ).toLowerCase();
  if (/invalid login credentials/.test(t)) return "E-mail ou senha não conferem.";
  if (/rate limit|too many/.test(t))
    return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  if (/invalid totp|invalid code|code.*invalid|expired/.test(t))
    return "Código não confere. Confira a hora do celular e tente de novo.";
  if (/weak|password should|at least/.test(t))
    return `Senha fraca. Use pelo menos ${SENHA_MINIMA} caracteres, com letras e números.`;
  if (/same.*password|different from the old/.test(t))
    return "A nova senha precisa ser diferente da atual.";
  if (/sem_app/.test(t)) return "Nenhum app autenticador ativado nesta conta.";
  if (/email not confirmed/.test(t)) return "Confirme o e-mail antes de entrar.";
  if (/aal2|mfa/.test(t)) return "Confirme o código do app antes de continuar.";
  return "Não foi possível concluir. Tente de novo em instantes.";
}
