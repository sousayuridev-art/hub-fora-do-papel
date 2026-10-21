import { useMutation, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesReunioes,
  vincularReuniao,
  type ListaReunioes,
  type Reuniao,
  type ReuniaoAberta,
} from "@/lib/reunioes";

type Pedido = {
  id: string;
  cliente: { id: string; nome: string } | null;
  deal: string | null;
  projeto: { id: string; nome: string } | null;
};

const mensagens: Record<string, string> = {
  cliente_invalido: "Esse cliente não foi encontrado.",
  oportunidade_invalida: "A oportunidade não é desse cliente.",
  projeto_invalido: "O projeto não é desse cliente.",
  nao_encontrada: "A reunião não foi encontrada.",
};

/** Liga a reunião ao cliente com atualização otimista e volta atrás no erro. */
export function useVincularReuniao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Pedido) =>
      vincularReuniao(p.id, p.cliente?.id ?? null, p.deal, p.projeto?.id ?? null),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: chavesReunioes.tudo });
      const listas = qc.getQueriesData<ListaReunioes>({ queryKey: ["reunioes", "lista"] });
      const uma = qc.getQueryData<ReuniaoAberta>(chavesReunioes.uma(p.id));
      const mudar = <T extends Reuniao>(r: T): T =>
        r.id === p.id
          ? { ...r, cliente: p.cliente, deal_id: p.deal, projeto: p.projeto, vinculo: "manual" }
          : r;
      qc.setQueriesData<ListaReunioes>({ queryKey: ["reunioes", "lista"] }, (l) =>
        l ? { ...l, itens: l.itens.map(mudar) } : l,
      );
      if (uma) qc.setQueryData(chavesReunioes.uma(p.id), mudar(uma));
      return { listas, uma };
    },
    onSuccess: (_r, p) =>
      ok(p.cliente ? `Reunião ligada a ${p.cliente.nome}.` : "Reunião sem cliente."),
    onError: (e, p, ctx) => {
      ctx?.listas.forEach(([chave, dados]) => qc.setQueryData(chave, dados));
      if (ctx?.uma) qc.setQueryData(chavesReunioes.uma(p.id), ctx.uma);
      const codigo =
        e instanceof Error ? e.message : String((e as { message?: unknown }).message ?? "");
      erro(mensagens[codigo] ?? mensagemDeErro(e));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesReunioes.tudo }),
  });
}
