import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ChaveBloco } from "@/lib/paginasSite";
import {
  chavesSite,
  publicarBloco,
  salvarBloco,
  type BlocoSalvo,
  type SituacaoSite,
} from "@/lib/site";

/**
 * Salvar e publicar um bloco de página (card CMS-4). A lista muda na hora e volta como
 * estava se o banco recusar. Os avisos (toast) ficam com o editor.
 */
export function useMutacoesBlocos(siteId: string) {
  const qc = useQueryClient();
  const chave = chavesSite.blocos(siteId);

  async function guardar(c: ChaveBloco, mudar: (b: BlocoSalvo | undefined) => BlocoSalvo) {
    await qc.cancelQueries({ queryKey: chave });
    const antes = qc.getQueryData<BlocoSalvo[]>(chave);
    if (antes) {
      const atual = antes.find((b) => b.chave === c);
      qc.setQueryData<BlocoSalvo[]>(
        chave,
        atual ? antes.map((b) => (b.chave === c ? mudar(b) : b)) : [...antes, mudar(undefined)],
      );
    }
    return { antes };
  }
  const voltar = (ctx: { antes: BlocoSalvo[] | undefined } | undefined) => {
    if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
  };
  const gravado = (r: BlocoSalvo) =>
    qc.setQueryData<BlocoSalvo[]>(chave, (lista) =>
      lista ? [...lista.filter((b) => b.chave !== r.chave), r] : [r],
    );
  const recarregar = () => void qc.invalidateQueries({ queryKey: chave });
  const provisorio = (c: ChaveBloco, valor: unknown, situacao: SituacaoSite): BlocoSalvo => ({
    id: `provisorio-${c}`,
    site_id: siteId,
    chave: c,
    valor,
    situacao,
    publicado_em: null,
    atualizado_em: new Date().toISOString(),
  });

  const salvar = useMutation({
    mutationFn: (d: { chave: ChaveBloco; valor: unknown }) => salvarBloco(siteId, d.chave, d.valor),
    onMutate: (d) =>
      guardar(d.chave, (b) =>
        b
          ? { ...b, valor: d.valor, atualizado_em: new Date().toISOString() }
          : provisorio(d.chave, d.valor, "rascunho"),
      ),
    onError: (_e, _d, ctx) => voltar(ctx),
    onSuccess: gravado,
    onSettled: recarregar,
  });

  const publicar = useMutation({
    mutationFn: (c: ChaveBloco) => publicarBloco(siteId, c),
    onMutate: (c) =>
      guardar(c, (b) =>
        b
          ? { ...b, situacao: "publicado", publicado_em: new Date().toISOString() }
          : provisorio(c, null, "publicado"),
      ),
    onError: (_e, _c, ctx) => voltar(ctx),
    onSuccess: gravado,
    onSettled: recarregar,
  });

  return { salvar, publicar };
}
