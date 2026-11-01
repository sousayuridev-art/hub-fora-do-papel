import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import {
  apagarCategoria,
  apagarDepoimento,
  apagarProduto,
  chavesCatalogo,
  mensagemDoCatalogo,
  salvarCategoria,
  salvarConfig,
  salvarDepoimento,
  salvarProduto,
  type CategoriaCatalogo,
  type ConfigCatalogo,
  type DadosProduto,
  type DepoimentoCatalogo,
  type ProdutoCatalogo,
} from "@/lib/catalogo";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/**
 * Mutações do catálogo (HUB-CG-02/03): atualização otimista na lista, volta no erro com aviso
 * e "Tentar de novo"; ao terminar, recarrega a lista e o resumo da publicação.
 */
export function useMutacoesCatalogo(site: string) {
  const qc = useQueryClient();
  const atualizar = () => void qc.invalidateQueries({ queryKey: chavesCatalogo.tudo(site) });

  function otimista<V, T extends { id: string }>(
    chave: QueryKey,
    aplicar: (lista: T[], v: V) => T[],
  ) {
    return {
      onMutate: async (v: V) => {
        await qc.cancelQueries({ queryKey: chave });
        const antes = qc.getQueryData<T[]>(chave);
        if (antes) qc.setQueryData<T[]>(chave, aplicar(antes, v));
        return { antes };
      },
      rollback: (ctx: { antes?: T[] | undefined } | undefined) => {
        if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
      },
    };
  }
  const falhou = (acao: string, e: unknown, tentar: () => void) =>
    erro(mensagemDoCatalogo(e) ?? `Não foi possível ${acao}. ${mensagemDeErro(e)}`, {
      tentarDeNovo: tentar,
    });

  const op = otimista<DadosProduto, ProdutoCatalogo>(chavesCatalogo.produtos(site), (l, v) =>
    v.id ? l.map((p) => (p.id === v.id ? { ...p, ...v, id: p.id } : p)) : l,
  );
  const produto = useMutation({
    mutationFn: (v: DadosProduto) => salvarProduto(site, v),
    onMutate: op.onMutate,
    onError: (e, v, ctx) => {
      op.rollback(ctx);
      falhou("salvar o produto", e, () => produto.mutate(v));
    },
    onSuccess: () => ok("Produto salvo. Publique para ir ao site."),
    onSettled: atualizar,
  });

  const opA = otimista<ProdutoCatalogo, ProdutoCatalogo>(chavesCatalogo.produtos(site), (l, v) =>
    l.filter((p) => p.id !== v.id),
  );
  const apagar = useMutation({
    mutationFn: (v: ProdutoCatalogo) => apagarProduto(v.id),
    onMutate: opA.onMutate,
    onError: (e, v, ctx) => {
      opA.rollback(ctx);
      falhou("apagar o produto", e, () => apagar.mutate(v));
    },
    onSuccess: (_, v) => ok(`${v.nome} apagado.`),
    onSettled: atualizar,
  });

  const opC = otimista<{ id?: string; nome: string; foto: string | null }, CategoriaCatalogo>(
    chavesCatalogo.categorias(site),
    (l, v) => (v.id ? l.map((c) => (c.id === v.id ? { ...c, nome: v.nome, foto: v.foto } : c)) : l),
  );
  const categoria = useMutation({
    mutationFn: (v: { id?: string; nome: string; foto: string | null }) => salvarCategoria(site, v),
    onMutate: opC.onMutate,
    onError: (e, v, ctx) => {
      opC.rollback(ctx);
      falhou("salvar a categoria", e, () => categoria.mutate(v));
    },
    onSettled: atualizar,
  });

  const opCA = otimista<CategoriaCatalogo, CategoriaCatalogo>(
    chavesCatalogo.categorias(site),
    (l, v) => l.filter((c) => c.id !== v.id),
  );
  const apagarCat = useMutation({
    mutationFn: (v: CategoriaCatalogo) => apagarCategoria(v.id),
    onMutate: opCA.onMutate,
    onError: (e, v, ctx) => {
      opCA.rollback(ctx);
      falhou("apagar a categoria", e, () => apagarCat.mutate(v));
    },
    onSettled: atualizar,
  });

  const opD = otimista<{ id?: string; texto: string; autor: string }, DepoimentoCatalogo>(
    chavesCatalogo.depoimentos(site),
    (l, v) => (v.id ? l.map((d) => (d.id === v.id ? { ...d, ...v, id: d.id } : d)) : l),
  );
  const depoimento = useMutation({
    mutationFn: (v: { id?: string; texto: string; autor: string }) => salvarDepoimento(site, v),
    onMutate: opD.onMutate,
    onError: (e, v, ctx) => {
      opD.rollback(ctx);
      falhou("salvar o depoimento", e, () => depoimento.mutate(v));
    },
    onSettled: atualizar,
  });

  const opDA = otimista<DepoimentoCatalogo, DepoimentoCatalogo>(
    chavesCatalogo.depoimentos(site),
    (l, v) => l.filter((d) => d.id !== v.id),
  );
  const apagarDep = useMutation({
    mutationFn: (v: DepoimentoCatalogo) => apagarDepoimento(v.id),
    onMutate: opDA.onMutate,
    onError: (e, v, ctx) => {
      opDA.rollback(ctx);
      falhou("apagar o depoimento", e, () => apagarDep.mutate(v));
    },
    onSettled: atualizar,
  });

  const config = useMutation({
    mutationFn: (v: ConfigCatalogo) => salvarConfig(site, v),
    onMutate: async (v) => {
      const chave = chavesCatalogo.config(site);
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<ConfigCatalogo>(chave);
      qc.setQueryData(chave, v);
      return { antes };
    },
    onError: (e, v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavesCatalogo.config(site), ctx.antes);
      falhou("salvar os ajustes da loja", e, () => config.mutate(v));
    },
    onSuccess: () => ok("Ajustes salvos. Publique para ir ao site."),
    onSettled: atualizar,
  });

  return { produto, apagar, categoria, apagarCat, depoimento, apagarDep, config };
}
