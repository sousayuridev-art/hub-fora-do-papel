import { toast } from "sonner";

/**
 * Avisos padronizados (PRD, seção 21). Toda mutação usa estes dois.
 * - ok: confirma a ação; pode oferecer "Desfazer".
 * - erro: explica em português e pode oferecer "Tentar de novo".
 */
type OkOpcoes = { desfazer?: () => void };
type ErroOpcoes = { tentarDeNovo?: () => void; detalhe?: string };

export function ok(mensagem: string, opcoes: OkOpcoes = {}) {
  toast.success(mensagem, {
    action: opcoes.desfazer ? { label: "Desfazer", onClick: opcoes.desfazer } : undefined,
  });
}

export function erro(mensagem: string, opcoes: ErroOpcoes = {}) {
  toast.error(mensagem, {
    description: opcoes.detalhe,
    duration: opcoes.tentarDeNovo ? 10000 : 6000,
    action: opcoes.tentarDeNovo
      ? { label: "Tentar de novo", onClick: opcoes.tentarDeNovo }
      : undefined,
  });
}

/** Traduz erros comuns de rede e do Supabase para uma frase que o usuário entende. */
export function mensagemDeErro(e: unknown): string {
  const texto = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (/failed to fetch|network|load failed/i.test(texto))
    return "Sem conexão com o servidor. Confira sua internet.";
  if (/rate limit|too many|429/i.test(texto))
    return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  if (/email.*invalid|invalid.*email/i.test(texto))
    return "Não conseguimos enviar para esse e-mail. Confira o endereço digitado.";
  if (/jwt|token|session/i.test(texto)) return "Sua sessão expirou. Entre de novo.";
  if (/permission|42501|row-level security/i.test(texto))
    return "Você não tem permissão para essa ação.";
  return "Algo deu errado. Tente de novo em instantes.";
}
