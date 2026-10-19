import { useMutation, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesMateriais,
  enviarMaterial,
  excluirDeVez,
  mensagemDoMaterial,
  moverParaLixeira,
  salvarMaterial,
  type ListaMateriais,
  type Material,
} from "@/lib/materiais";

/** Ações de Materiais: a lista muda na hora e volta se o banco recusar. Contagens vêm do banco. */
export function useMutacoesMateriais() {
  const qc = useQueryClient();
  const falhou = (e: unknown) => mensagemDoMaterial(e) ?? mensagemDeErro(e);
  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: chavesMateriais.tudo });
    void qc.invalidateQueries({ queryKey: ["painel"] });
  };

  async function guardar(mudar?: (d: ListaMateriais) => ListaMateriais) {
    await qc.cancelQueries({ queryKey: chavesMateriais.lista });
    const antes = qc.getQueryData<ListaMateriais>(chavesMateriais.lista);
    if (antes && mudar) qc.setQueryData(chavesMateriais.lista, mudar(antes));
    return { antes };
  }
  const voltar = (ctx: { antes: ListaMateriais | undefined } | undefined) => {
    if (ctx?.antes) qc.setQueryData(chavesMateriais.lista, ctx.antes);
  };
  const trocar = (d: ListaMateriais, id: string, f: (m: Material) => Material | null) => ({
    ...d,
    itens: d.itens.flatMap((m) => {
      if (m.id !== id) return [m];
      const novo = f(m);
      return novo ? [novo] : [];
    }),
  });

  const lixeira = useMutation({
    mutationFn: (v: { m: Material; excluir: boolean }) => moverParaLixeira(v.m.id, v.excluir),
    onMutate: (v) =>
      guardar((d) =>
        trocar(d, v.m.id, (m) => ({
          ...m,
          excluido_em: v.excluir ? new Date().toISOString() : null,
        })),
      ),
    onSuccess: (_r, v) =>
      ok(
        v.excluir ? "Material na lixeira." : "Material restaurado.",
        v.excluir ? { desfazer: () => lixeira.mutate({ m: v.m, excluir: false }) } : {},
      ),
    onError: (e, v, ctx) => {
      voltar(ctx);
      erro(falhou(e), { tentarDeNovo: () => lixeira.mutate(v) });
    },
    onSettled: recarregar,
  });

  const excluir = useMutation({
    mutationFn: excluirDeVez,
    onMutate: (m) => guardar((d) => trocar(d, m.id, () => null)),
    onSuccess: () => ok("Material excluído de vez."),
    onError: (e, m, ctx) => {
      voltar(ctx);
      erro(falhou(e), { tentarDeNovo: () => excluir.mutate(m) });
    },
    onSettled: recarregar,
  });

  const salvar = useMutation({
    mutationFn: salvarMaterial,
    onMutate: (v) =>
      v.id
        ? guardar((d) =>
            trocar(d, v.id ?? "", (m) => ({
              ...m,
              titulo: v.titulo,
              categoria: v.categoria,
              descricao: v.descricao || null,
              compartilhado: v.compartilhado,
              client_id: v.clienteId,
              project_id: v.projetoId,
            })),
          )
        : guardar(),
    onSuccess: (_r, v) => ok(v.id ? "Material atualizado." : "Material salvo."),
    onError: (e, v, ctx) => {
      voltar(ctx);
      erro(falhou(e), { tentarDeNovo: () => salvar.mutate(v) });
    },
    onSettled: recarregar,
  });

  /** Envio de arquivos: um por vez, sem otimista (o item só existe depois que chega ao Storage). */
  const enviar = useMutation({
    mutationFn: enviarMaterial,
    onSuccess: (m) => ok(`"${m.titulo}" enviado.`),
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => enviar.mutate(v) }),
    onSettled: recarregar,
  });

  return { lixeira, excluir, salvar, enviar };
}
