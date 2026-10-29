import { useEffect } from "react";

import { erro } from "@/lib/notify";

/** Leitura secundária que falhou (contagens, canais, clientes): avisa com "Tentar de novo". */
export function useAvisoDeErro(falhou: boolean, mensagem: string, tentarDeNovo: () => unknown) {
  useEffect(() => {
    if (falhou) erro(mensagem, { tentarDeNovo: () => void tentarDeNovo() });
    // Avisa uma vez por falha; a função de nova tentativa muda a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [falhou, mensagem]);
}
