import { useMutation, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  apagarImagem,
  chavesSite,
  enviarImagem,
  mensagemDoSite,
  type ImagemSite,
} from "@/lib/site";

/** Mídia do site: enviar (aparece quando chega ao Storage) e apagar (some na hora, volta se falhar). */
export function useMutacoesMidia(siteId: string) {
  const qc = useQueryClient();
  const chave = chavesSite.midia(siteId);
  const falhou = (e: unknown) => mensagemDoSite(e) ?? mensagemDeErro(e);

  const enviar = useMutation({
    mutationFn: (arquivo: File) => enviarImagem(siteId, arquivo),
    onSuccess: (img) => {
      qc.setQueryData<ImagemSite[]>(chave, (l) => [img, ...(l ?? [])]);
      ok(`"${img.nome}" enviada.`);
    },
    onError: (e, arquivo) => erro(falhou(e), { tentarDeNovo: () => enviar.mutate(arquivo) }),
    onSettled: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  const apagar = useMutation({
    mutationFn: (img: ImagemSite) => apagarImagem(img.caminho),
    onMutate: async (img) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<ImagemSite[]>(chave);
      if (antes)
        qc.setQueryData(
          chave,
          antes.filter((x) => x.caminho !== img.caminho),
        );
      return { antes };
    },
    onSuccess: () => ok("Imagem apagada."),
    onError: (e, img, ctx) => {
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
      erro(falhou(e), { tentarDeNovo: () => apagar.mutate(img) });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  return { enviar, apagar };
}
