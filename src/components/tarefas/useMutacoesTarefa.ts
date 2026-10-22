import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import type { DetalheProjeto, SituacaoTarefa, Tarefa } from "@/lib/projetos";
import {
  ajustarTarefa,
  chaveDetalhesProjeto,
  chavesTarefas,
  combinaComFiltros,
  criarTarefaCentral,
  editarTarefa,
  mensagemDaTarefa,
  moverLocal,
  moverTarefaCentral,
  removerTarefaCentral,
  type CamposTarefa,
  type FiltrosTarefas,
  type ListaTarefas,
  type NovaTarefa,
  type TarefaVista,
} from "@/lib/tarefas";

type Foto = [QueryKey, unknown][];

/** Guarda o estado das listas da Central e dos projetos (para desfazer no erro). */
function fotografar(qc: QueryClient): Foto {
  return [
    ...qc.getQueriesData({ queryKey: chavesTarefas.listas }),
    ...qc.getQueriesData({ queryKey: chaveDetalhesProjeto }),
  ];
}
function restaurar(qc: QueryClient, foto: Foto) {
  for (const [chave, dados] of foto) qc.setQueryData(chave, dados);
}

/** Muda a mesma tarefa na Central (todas as listas em cache) e no projeto. */
function mudarEmTodaParte(
  qc: QueryClient,
  id: string,
  fn: <T extends Tarefa>(t: T, hoje: string | null) => T | null,
) {
  qc.setQueriesData<ListaTarefas>({ queryKey: chavesTarefas.listas }, (l) => {
    if (!l || !l.itens.some((t) => t.id === id)) return l;
    const itens: TarefaVista[] = [];
    for (const t of l.itens) {
      if (t.id !== id) itens.push(t);
      else {
        const n = fn(t, l.hoje);
        if (n) itens.push(n);
      }
    }
    return { ...l, itens };
  });
  qc.setQueriesData<DetalheProjeto>({ queryKey: chaveDetalhesProjeto }, (d) => {
    if (!d || !Array.isArray(d.tarefas) || !d.tarefas.some((t) => t.id === id)) return d;
    const tarefas: Tarefa[] = [];
    for (const t of d.tarefas) {
      if (t.id !== id) tarefas.push(t);
      else {
        const n = fn(t, null);
        if (n) tarefas.push(n);
      }
    }
    return { ...d, tarefas };
  });
}

async function pararLeituras(qc: QueryClient) {
  await Promise.all([
    qc.cancelQueries({ queryKey: chavesTarefas.tudo }),
    qc.cancelQueries({ queryKey: chaveDetalhesProjeto }),
  ]);
}

function recarregar(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: chavesTarefas.tudo });
  void qc.invalidateQueries({ queryKey: chaveDetalhesProjeto });
}

const falhou = (e: unknown) => mensagemDaTarefa(e) ?? mensagemDeErro(e);

/** Remoções esperando o "Desfazer" (5 s). Fora do componente: fechar o painel não cancela. */
const remocoesPendentes = new Map<string, ReturnType<typeof setTimeout>>();

/** Esconde a tarefa que está nos 5 s do "Desfazer" (se o banco for relido nesse meio-tempo). */
export const naoRemovida = (t: { id: string }) => !remocoesPendentes.has(t.id);

/**
 * Ações sobre tarefas, usadas pela Central e pelo projeto. Tudo muda na hora nas duas telas,
 * volta se o banco recusar, e depois recarrega do banco (que decide "atrasada" e os números).
 */
export function useMutacoesTarefa() {
  const qc = useQueryClient();

  const editar = useMutation({
    mutationFn: (v: { id: string; campos: CamposTarefa }) => editarTarefa(v.id, v.campos),
    onMutate: async (v) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      mudarEmTodaParte(qc, v.id, (t, hoje) => ajustarTarefa(t, v.campos, hoje));
      return { foto };
    },
    onError: (e, v, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => editar.mutate(v) });
    },
    onSettled: () => recarregar(qc),
  });

  const mover = useMutation({
    mutationFn: (v: { id: string; situacao: SituacaoTarefa }) =>
      moverTarefaCentral(v.id, v.situacao),
    onMutate: async (v) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      mudarEmTodaParte(qc, v.id, (t, hoje) => moverLocal(t, v.situacao, hoje));
      return { foto };
    },
    onError: (e, v, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => mover.mutate(v) });
    },
    onSettled: () => recarregar(qc),
  });

  const criar = useMutation({
    mutationFn: (v: NovaTarefa & { vista?: Omit<TarefaVista, "id"> }) => criarTarefaCentral(v),
    onMutate: async (v) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      if (v.vista) {
        const nova: TarefaVista = { ...v.vista, id: `temp-${Date.now()}` };
        for (const [chave, l] of qc.getQueriesData<ListaTarefas>({
          queryKey: chavesTarefas.listas,
        })) {
          const f = (chave[2] ?? {}) as FiltrosTarefas;
          if (l && combinaComFiltros(nova, f, l.hoje)) {
            qc.setQueryData<ListaTarefas>(chave, { ...l, itens: [nova, ...l.itens] });
          }
        }
        if (nova.project_id) {
          qc.setQueriesData<DetalheProjeto>({ queryKey: chaveDetalhesProjeto }, (d) =>
            d && d.projeto.id === nova.project_id ? { ...d, tarefas: [nova, ...d.tarefas] } : d,
          );
        }
      }
      return { foto };
    },
    onSuccess: (r) =>
      ok(
        r.kind === "cliente"
          ? "Tarefa criada."
          : `Tarefa criada (${r.kind === "hub" ? "Hub" : "interna"}).`,
      ),
    onError: (e, v, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => criar.mutate(v) });
    },
    onSettled: () => recarregar(qc),
  });

  const apagar = useMutation({
    mutationFn: (id: string) => removerTarefaCentral(id),
    onError: (e, id) => {
      recarregar(qc);
      erro(falhou(e), { tentarDeNovo: () => apagar.mutate(id) });
    },
    onSettled: () => recarregar(qc),
  });

  /** Some na hora; o banco só apaga quando o aviso fecha sem "Desfazer". */
  function remover(t: Pick<Tarefa, "id" | "title">) {
    if (t.id.startsWith("temp-")) return;
    void pararLeituras(qc);
    const foto = fotografar(qc);
    mudarEmTodaParte(qc, t.id, () => null);
    // Apaga quando o aviso fecha sem "Desfazer" (o aviso pausa com o mouse em cima ou a aba em
    // segundo plano, então o relógio é o dele). A trava de 60 s cobre um aviso que nunca fecha.
    const efetivar = () => {
      const r = remocoesPendentes.get(t.id);
      if (r === undefined) return;
      clearTimeout(r);
      remocoesPendentes.delete(t.id);
      apagar.mutate(t.id);
    };
    remocoesPendentes.set(t.id, setTimeout(efetivar, 60_000));
    toast.success(`Tarefa removida: ${t.title}`, {
      duration: 5000,
      onAutoClose: efetivar,
      onDismiss: efetivar,
      action: {
        label: "Desfazer",
        onClick: () => {
          const r = remocoesPendentes.get(t.id);
          if (r) clearTimeout(r);
          remocoesPendentes.delete(t.id);
          restaurar(qc, foto);
          recarregar(qc);
        },
      },
    });
  }

  /** Círculo da lista: conclui em um clique (com "Desfazer") ou reabre. */
  function alternarPronta(t: Pick<Tarefa, "id" | "status">) {
    const antes = t.status;
    if (antes === "pronto") {
      mover.mutate({ id: t.id, situacao: "a_fazer" });
      return;
    }
    mover.mutate(
      { id: t.id, situacao: "pronto" },
      {
        onSuccess: () =>
          ok("Tarefa pronta.", { desfazer: () => mover.mutate({ id: t.id, situacao: antes }) }),
      },
    );
  }

  return { editar, mover, criar, remover, alternarPronta };
}
