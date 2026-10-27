import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  arquivarArtigo,
  chavesSite,
  publicarArtigo,
  salvarArtigo,
  type ArtigoCompleto,
  type ArtigoResumo,
  type DadosArtigo,
  type SituacaoSite,
} from "@/lib/site";

/**
 * Ações do artigo: a lista muda na hora e volta como estava se o banco recusar.
 * Os avisos (toast) ficam com o editor, que sabe o que oferecer ("Tentar de novo", conflito).
 */
export function useMutacoesArtigos(siteId: string) {
  const qc = useQueryClient();
  const chave = chavesSite.artigos(siteId);

  async function guardar(mudar: (lista: ArtigoResumo[]) => ArtigoResumo[]) {
    await qc.cancelQueries({ queryKey: chave });
    const antes = qc.getQueryData<ArtigoResumo[]>(chave);
    if (antes) qc.setQueryData(chave, mudar(antes));
    return { antes };
  }
  const voltar = (ctx: { antes: ArtigoResumo[] | undefined } | undefined) => {
    if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
  };
  const situacao = (id: string, s: SituacaoSite) => (lista: ArtigoResumo[]) =>
    lista.map((a) => (a.id === id ? { ...a, situacao: s } : a));
  const gravado = (a: ArtigoCompleto) => {
    qc.setQueryData(chavesSite.artigo(a.id), a);
  };
  const recarregar = () => void qc.invalidateQueries({ queryKey: chave });

  const salvar = useMutation({
    mutationFn: (d: DadosArtigo) => salvarArtigo(siteId, d),
    onMutate: (d) =>
      guardar((lista) =>
        d.id
          ? lista.map((a) =>
              a.id === d.id ? { ...a, titulo: d.titulo, categoria: d.categoria, slug: d.slug } : a,
            )
          : [
              {
                id: `provisorio-${Date.now()}`,
                slug: d.slug,
                categoria: d.categoria,
                titulo: d.titulo,
                situacao: "rascunho",
                publicado_em: null,
                atualizado_em: new Date().toISOString(),
              },
              ...lista,
            ],
      ),
    onError: (_e, _d, ctx) => voltar(ctx),
    onSuccess: gravado,
    onSettled: recarregar,
  });

  const publicar = useMutation({
    mutationFn: (id: string) => publicarArtigo(id),
    onMutate: (id) => guardar(situacao(id, "publicado")),
    onError: (_e, _id, ctx) => voltar(ctx),
    onSuccess: gravado,
    onSettled: recarregar,
  });

  const arquivar = useMutation({
    mutationFn: (id: string) => arquivarArtigo(id),
    onMutate: (id) => guardar(situacao(id, "arquivado")),
    onError: (_e, _id, ctx) => voltar(ctx),
    onSuccess: gravado,
    onSettled: recarregar,
  });

  return { salvar, publicar, arquivar };
}
