import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { abrirEspelho } from "@/lib/espelho";
import { erro, mensagemDeErro } from "@/lib/notify";

/** "Ver como o cliente" (RD2-8): registra no banco, guarda na aba e abre o portal em modo leitura. */
export function useEspelho() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (v: { clienteId: string; siteId: string | null }) =>
      abrirEspelho({ ...v, perfil: "responsavel" }),
    onSuccess: () => {
      // nada do Hub fica no cache do portal (e vice-versa)
      qc.clear();
      void navigate({ to: "/portal" });
    },
    onError: (e) => erro(`Não foi possível abrir o portal do cliente. ${mensagemDeErro(e)}`),
  });
}
