import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  chavesAjustes,
  mensagemDosAjustes,
  salvarGoogle,
  salvarNegocio,
  type AjustesSite,
  type Google,
  type Negocio,
} from "@/lib/ajustesSite";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/** Salvar publica na hora (PC-6). A tela guarda o que foi digitado se o banco recusar. */
export function useMutacoesAjustes(siteId: string) {
  const qc = useQueryClient();
  const chave = chavesAjustes.doSite(siteId);
  const falhou = (e: unknown) => mensagemDosAjustes(e) ?? mensagemDeErro(e);

  async function guardar(parte: Partial<AjustesSite>) {
    await qc.cancelQueries({ queryKey: chave });
    const antes = qc.getQueryData<AjustesSite>(chave);
    if (antes) qc.setQueryData(chave, { ...antes, ...parte });
    return { antes };
  }
  const voltar = (ctx: { antes: AjustesSite | undefined } | undefined) => {
    if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
  };

  const negocio = useMutation({
    mutationFn: (d: Negocio) => salvarNegocio(siteId, d),
    onMutate: (d) => guardar({ negocio: d }),
    onSuccess: () => ok("Alterações salvas e publicadas no site."),
    onError: (e, d, ctx) => {
      voltar(ctx);
      erro(falhou(e), { tentarDeNovo: () => negocio.mutate(d) });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  const google = useMutation({
    mutationFn: (d: Google) => salvarGoogle(siteId, d),
    onMutate: (d) => guardar({ google: d }),
    onSuccess: () => ok("Alterações salvas e publicadas no site."),
    onError: (e, d, ctx) => {
      voltar(ctx);
      erro(falhou(e), { tentarDeNovo: () => google.mutate(d) });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  return { negocio, google };
}
