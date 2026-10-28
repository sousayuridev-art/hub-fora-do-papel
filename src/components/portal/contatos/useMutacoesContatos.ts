import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chavesPortal } from "@/lib/portal";
import {
  chavesContatos,
  marcarRespondido,
  mensagemDoContato,
  type ListaContatos,
} from "@/lib/contatosSite";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/** "Já respondi": sai da aba "Esperando resposta" na hora; se o banco recusar, volta e avisa. */
export function useMutacoesContatos(siteId: string) {
  const qc = useQueryClient();
  const chaveEsperando = chavesContatos.lista(siteId, "esperando");
  const chaveTodos = chavesContatos.lista(siteId, "todos");

  const respondido = useMutation({
    mutationFn: (v: { id: string; respondido: boolean }) => marcarRespondido(v.id, v.respondido),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chavesContatos.tudo });
      const esperando = qc.getQueryData<ListaContatos>(chaveEsperando);
      const todos = qc.getQueryData<ListaContatos>(chaveTodos);
      const delta = v.respondido ? -1 : 1;
      const ajustar = (l: ListaContatos | undefined, tirar: boolean) =>
        l && {
          contagem: { ...l.contagem, esperando: Math.max(0, l.contagem.esperando + delta) },
          itens: tirar
            ? l.itens.filter((c) => c.id !== v.id)
            : l.itens.map((c) => (c.id === v.id ? { ...c, respondido: v.respondido } : c)),
        };
      if (esperando) qc.setQueryData(chaveEsperando, ajustar(esperando, v.respondido));
      if (todos) qc.setQueryData(chaveTodos, ajustar(todos, false));
      return { esperando, todos };
    },
    onSuccess: (_r, v) =>
      ok(v.respondido ? "Marcado como respondido." : "Voltou para Esperando resposta.", {
        desfazer: () => respondido.mutate({ id: v.id, respondido: !v.respondido }),
      }),
    onError: (e, v, ctx) => {
      if (ctx?.esperando) qc.setQueryData(chaveEsperando, ctx.esperando);
      if (ctx?.todos) qc.setQueryData(chaveTodos, ctx.todos);
      erro(mensagemDoContato(e) ?? mensagemDeErro(e), { tentarDeNovo: () => respondido.mutate(v) });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chavesContatos.tudo });
      void qc.invalidateQueries({ queryKey: chavesPortal.pendencias });
    },
  });
  return { respondido };
}
