import { useMutation, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { buscarAgora, chavesReunioes } from "@/lib/reunioes";

/** Traduz os erros da ligação com o Google para o Yuri. */
export function textoDoErroGoogle(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  if (/sem_permissao|sem_login/.test(m))
    return "Só o dono da agência pode mudar a ligação com o Google.";
  if (/Google|permissão|Ligue/.test(m)) return m;
  return mensagemDeErro(e);
}

/** "Buscar agora" (Configurações e Reuniões): pede ao servidor as reuniões novas do Meet. */
export function useBuscarAgora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: buscarAgora,
    onSuccess: (r) => {
      if (r.aguarde) ok("Uma busca acabou de rodar. Espere um minuto para buscar de novo.");
      else
        ok(
          r.reunioes
            ? `${r.reunioes} ${r.reunioes === 1 ? "reunião atualizada" : "reuniões atualizadas"}.`
            : "Busca feita. Nenhuma reunião nova.",
        );
    },
    onError: (e) => erro(textoDoErroGoogle(e)),
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesReunioes.tudo }),
  });
}
