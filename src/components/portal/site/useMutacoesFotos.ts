import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  apagarFoto,
  chavesFotos,
  descreverFoto,
  enviarFoto,
  mensagemDaFoto,
  type FotoSite,
} from "@/lib/fotosSite";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/** Fotos do site no painel (PC-3): a grade muda na hora e volta como estava se o banco recusar. */
export function useMutacoesFotos(siteId: string) {
  const qc = useQueryClient();
  const chave = chavesFotos.doSite(siteId);
  const falhou = (e: unknown) => mensagemDaFoto(e) ?? mensagemDeErro(e);

  async function guardar(mudar: (l: FotoSite[]) => FotoSite[]) {
    await qc.cancelQueries({ queryKey: chave });
    const antes = qc.getQueryData<FotoSite[]>(chave);
    if (antes) qc.setQueryData(chave, mudar(antes));
    return { antes };
  }
  const voltar = (ctx: { antes: FotoSite[] | undefined } | undefined) => {
    if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
  };
  const recarregar = () => void qc.invalidateQueries({ queryKey: chave });

  const enviar = useMutation({
    mutationFn: (f: File) => enviarFoto(siteId, f),
    onSuccess: (foto) => {
      qc.setQueryData<FotoSite[]>(chave, (l) => [foto, ...(l ?? [])]);
      ok(`"${foto.nome}" enviada. Agora escreva a descrição.`);
    },
    onError: (e, f) => erro(falhou(e), { tentarDeNovo: () => enviar.mutate(f) }),
    onSettled: recarregar,
  });

  const descrever = useMutation({
    mutationFn: (v: { caminho: string; descricao: string }) =>
      descreverFoto(v.caminho, v.descricao),
    onMutate: (v) =>
      guardar((l) =>
        l.map((f) =>
          f.caminho === v.caminho ? { ...f, descricao: v.descricao.trim() || null } : f,
        ),
      ),
    onSuccess: () => ok("Descrição salva."),
    onError: (e, v, ctx) => {
      voltar(ctx);
      erro(falhou(e), { tentarDeNovo: () => descrever.mutate(v) });
    },
    onSettled: recarregar,
  });

  const apagar = useMutation({
    mutationFn: (f: FotoSite) => apagarFoto(f.caminho),
    onMutate: (f) => guardar((l) => l.filter((x) => x.caminho !== f.caminho)),
    onSuccess: () => ok("Foto apagada."),
    onError: (e, f, ctx) => {
      voltar(ctx);
      erro(falhou(e), { tentarDeNovo: () => apagar.mutate(f) });
    },
    onSettled: recarregar,
  });

  return { enviar, descrever, apagar };
}
