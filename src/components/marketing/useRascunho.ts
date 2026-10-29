import { useEffect, useRef, useState } from "react";

/**
 * Rascunho de um campo que salva ao sair (MK-1, revisão).
 * - Segue o valor do banco enquanto a pessoa não mandou nada.
 * - Depois de mandar, se o banco voltar a outro valor (a gravação falhou e a tela desfez),
 *   o que foi digitado fica no campo: basta sair dele de novo para tentar outra vez.
 *
 * `liberar` volta a seguir o banco depois de uma mudança feita por outro caminho.
 * `marcar` recebe o valor como o banco vai devolvê-lo (já sem espaços nas pontas, por exemplo).
 */
export function useRascunho(servidor: string) {
  const [valor, setValor] = useState(servidor);
  const enviado = useRef<string | null>(null);
  useEffect(() => {
    if (enviado.current !== null && servidor !== enviado.current) return;
    setValor(servidor);
  }, [servidor]);
  const marcar = (v: string) => {
    enviado.current = v;
  };
  /** O banco mudou por outro caminho (ex.: sugestão da IA usada): volta a seguir o banco. */
  const liberar = () => {
    enviado.current = null;
  };
  return [valor, setValor, marcar, liberar] as const;
}
