import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import {
  arquivarOportunidade,
  atualizarOportunidade,
  chavesClientes,
  chavesFunil,
  desarquivarOportunidade,
  mensagemDoFunil,
  moverOportunidade,
  type CamposOportunidade,
  type Etapa,
  type MotivoPerda,
  type Oportunidade,
  type ProximoPasso,
} from "@/lib/funil";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

type Instantaneo = [QueryKey, Oportunidade[] | undefined][];

/** Mensagem amigável: regra do funil primeiro, depois erros gerais. */
export function mensagemAmigavel(e: unknown) {
  return mensagemDoFunil(e) ?? mensagemDeErro(e);
}

/**
 * Mutações do funil com atualização otimista e volta no erro (CLAUDE.md).
 * Todas as listas em cache (qualquer filtro) mudam na hora; o banco confirma depois.
 */
export function useMutacoesFunil() {
  const qc = useQueryClient();

  async function aplicarOtimista(id: string, mudar: (o: Oportunidade) => Oportunidade | null) {
    await qc.cancelQueries({ queryKey: chavesFunil.tudo });
    const antes: Instantaneo = qc.getQueriesData<Oportunidade[]>({ queryKey: ["funil", "lista"] });
    for (const [chave, lista] of antes) {
      if (!lista) continue;
      qc.setQueryData<Oportunidade[]>(
        chave,
        lista.flatMap((o) => {
          if (o.id !== id) return [o];
          const novo = mudar(o);
          return novo ? [novo] : [];
        }),
      );
    }
    return { antes };
  }

  function voltar(contexto: { antes: Instantaneo } | undefined) {
    contexto?.antes.forEach(([chave, lista]) => qc.setQueryData(chave, lista));
  }

  function recarregar() {
    void qc.invalidateQueries({ queryKey: chavesFunil.tudo });
    void qc.invalidateQueries({ queryKey: chavesClientes.tudo });
    void qc.invalidateQueries({ queryKey: ["propostas"] });
    void qc.invalidateQueries({ queryKey: ["trafego"] });
    void qc.invalidateQueries({ queryKey: ["painel"] });
  }

  /** Versão nova devolvida pelo banco vai para o cache: a próxima ação já usa a versão certa. */
  function guardarVersao(id: string, r: { updated_at?: string } | null | undefined) {
    if (!r?.updated_at) return;
    for (const [chave, lista] of qc.getQueriesData<Oportunidade[]>({
      queryKey: ["funil", "lista"],
    })) {
      if (lista)
        qc.setQueryData<Oportunidade[]>(
          chave,
          lista.map((o) => (o.id === id ? { ...o, updated_at: r.updated_at ?? o.updated_at } : o)),
        );
    }
  }

  /** "Tentar de novo" usa a versão que está no cache agora, não a da primeira tentativa. */
  function fresco<T extends Pick<Oportunidade, "id" | "updated_at">>(o: T): T {
    for (const [, lista] of qc.getQueriesData<Oportunidade[]>({ queryKey: ["funil", "lista"] })) {
      const achado = lista?.find((x) => x.id === o.id);
      if (achado) return { ...o, updated_at: achado.updated_at };
    }
    return o;
  }

  const mover = useMutation({
    mutationFn: (v: { o: Oportunidade; etapa: Etapa; passo?: ProximoPasso | undefined }) =>
      moverOportunidade(v.o.id, v.etapa, v.o.updated_at, v.passo),
    onMutate: (v) =>
      aplicarOtimista(v.o.id, (o) => ({
        ...o,
        stage: v.etapa,
        next_step: v.passo?.texto ?? o.next_step,
        position: Date.now() / 1000,
      })),
    onError: (e, v, ctx) => {
      voltar(ctx);
      erro(`Não foi possível mover. ${mensagemAmigavel(e)}`, {
        tentarDeNovo: () => mover.mutate({ ...v, o: fresco(v.o) }),
      });
    },
    onSuccess: (r, v) => guardarVersao(v.o.id, r),
    onSettled: recarregar,
  });

  const arquivar = useMutation({
    mutationFn: (v: { o: Oportunidade; motivo: MotivoPerda; nota: string }) =>
      arquivarOportunidade(v.o.id, v.motivo, v.nota, v.o.updated_at),
    onMutate: (v) => aplicarOtimista(v.o.id, () => null),
    onSuccess: (_d, v) =>
      ok("Contato arquivado.", {
        desfazer: () => desarquivar.mutate({ o: v.o, silencioso: true }),
      }),
    onError: (e, v, ctx) => {
      voltar(ctx);
      erro(mensagemAmigavel(e), { tentarDeNovo: () => arquivar.mutate({ ...v, o: fresco(v.o) }) });
    },
    onSettled: recarregar,
  });

  const desarquivar = useMutation({
    mutationFn: (v: { o: Oportunidade; silencioso?: boolean }) => desarquivarOportunidade(v.o.id),
    onMutate: (v) => aplicarOtimista(v.o.id, () => null),
    onSuccess: (_d, v) => {
      if (!v.silencioso) ok("Contato de volta ao funil.");
    },
    onError: (e, v, ctx) => {
      voltar(ctx);
      erro(mensagemAmigavel(e), { tentarDeNovo: () => desarquivar.mutate(v) });
    },
    onSettled: recarregar,
  });

  const atualizar = useMutation({
    mutationFn: (v: { o: Pick<Oportunidade, "id" | "updated_at">; campos: CamposOportunidade }) =>
      atualizarOportunidade(v.o.id, v.o.updated_at, v.campos),
    onMutate: (v) =>
      aplicarOtimista(v.o.id, (o) => ({
        ...o,
        next_step: v.campos.proximo_passo ?? o.next_step,
        value_cents: "valor_cents" in v.campos ? (v.campos.valor_cents ?? null) : o.value_cents,
        diagnostic_tier:
          "diagnostico" in v.campos ? (v.campos.diagnostico ?? null) : o.diagnostic_tier,
        diagnostic_paid: v.campos.diagnostico_pago ?? o.diagnostic_paid,
      })),
    onSuccess: (r, v) => {
      guardarVersao(v.o.id, r);
      ok("Oportunidade atualizada.");
    },
    onError: (e, v, ctx) => {
      voltar(ctx);
      erro(mensagemAmigavel(e), { tentarDeNovo: () => atualizar.mutate({ ...v, o: fresco(v.o) }) });
    },
    onSettled: recarregar,
  });

  return { mover, arquivar, desarquivar, atualizar };
}
