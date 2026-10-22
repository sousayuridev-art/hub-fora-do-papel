import { useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import type { HistoryState, ParsedHistoryState } from "@tanstack/history";

declare module "@tanstack/history" {
  interface HistoryState {
    /** Esta entrada do histórico foi criada ao abrir um painel lateral dentro do Hub. */
    painelNaUrl?: boolean;
  }
}

export type OpcoesPainel = {
  replace: boolean;
  state: (anterior: ParsedHistoryState) => HistoryState;
};

/**
 * Painel lateral (Sheet) aberto por um parâmetro do endereço (card RD-9).
 * - Abrir cria uma entrada no histórico: o Voltar do celular fecha o painel.
 *   Trocar de item com o painel já aberto só substitui a entrada.
 * - Fechar pela tela (X, fundo, Esc, salvar) não cria entrada: se o painel foi aberto aqui,
 *   volta uma casa no histórico; se a pessoa entrou direto pelo endereço com o painel aberto,
 *   tira o parâmetro com `replace`.
 *
 * `mudar` troca só o parâmetro do painel na rota, repassando `replace` e `state`.
 */
export function usePainelNaUrl(mudar: (id: string | undefined, opcoes: OpcoesPainel) => void) {
  const router = useRouter();
  // Evita voltar duas casas quando o fechamento é chamado duas vezes seguidas
  const fechada = useRef<string | undefined>(undefined);
  const atual = () => router.state.location.state;

  return {
    abrir: (id: string) =>
      mudar(id, {
        replace: atual().painelNaUrl === true,
        state: (anterior) => ({ ...anterior, painelNaUrl: true }),
      }),
    fechar: () => {
      const estado = atual();
      const chave = estado.__TSR_key ?? estado.key;
      if (chave !== undefined && fechada.current === chave) return;
      fechada.current = chave;
      if (estado.painelNaUrl === true) router.history.back();
      else mudar(undefined, { replace: true, state: (anterior) => ({ ...anterior }) });
    },
  };
}
