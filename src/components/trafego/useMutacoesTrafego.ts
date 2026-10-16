import { useMutation, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesTrafego,
  mensagemDoTrafego,
  registrarInvestimento,
  removerInvestimento,
  salvarCampanha,
  salvarOrcamento,
  type PainelTrafego,
  type Periodo,
  type Plataforma,
} from "@/lib/trafego";

type Investimento = PainelTrafego["investimentos"][number];

/** Mutações do tráfego: tela muda na hora, volta se o banco recusar, e recarrega as contas do banco. */
export function useMutacoesTrafego(periodo: Periodo) {
  const qc = useQueryClient();
  const chave = chavesTrafego.painel(periodo);
  const falhou = (e: unknown) => mensagemDoTrafego(e) ?? mensagemDeErro(e);

  async function antes() {
    await qc.cancelQueries({ queryKey: chavesTrafego.tudo });
    return qc.getQueryData<PainelTrafego>(chave);
  }
  const voltar = (a: PainelTrafego | undefined) => a && qc.setQueryData(chave, a);
  const recarregar = () => void qc.invalidateQueries({ queryKey: chavesTrafego.tudo });

  const registrar = useMutation({
    mutationFn: registrarInvestimento,
    onMutate: async (v) => {
      const a = await antes();
      if (a) {
        const campanha = a.campanhas.find((c) => c.id === v.campanha);
        const novo: Investimento = {
          id: `temp-${Date.now()}`,
          data: v.data,
          plataforma: campanha?.plataforma ?? "meta",
          campanha_id: v.campanha,
          campanha: campanha?.nome ?? "",
          valor_cents: v.valorCents,
          cliques: v.cliques,
          nota: v.nota || null,
        };
        qc.setQueryData<PainelTrafego>(chave, { ...a, investimentos: [novo, ...a.investimentos] });
      }
      return { a };
    },
    onSuccess: () => ok("Investimento registrado."),
    onError: (e, v, ctx) => {
      voltar(ctx?.a);
      erro(falhou(e), { tentarDeNovo: () => registrar.mutate(v) });
    },
    onSettled: recarregar,
  });

  const remover = useMutation({
    mutationFn: (v: Investimento) => removerInvestimento(v.id),
    onMutate: async (v) => {
      const a = await antes();
      if (a)
        qc.setQueryData<PainelTrafego>(chave, {
          ...a,
          investimentos: a.investimentos.filter((x) => x.id !== v.id),
        });
      return { a };
    },
    onSuccess: (_r, v) =>
      ok("Investimento removido.", {
        desfazer: () =>
          registrar.mutate({
            campanha: v.campanha_id,
            data: v.data,
            valorCents: v.valor_cents,
            cliques: v.cliques,
            nota: v.nota ?? "",
          }),
      }),
    onError: (e, v, ctx) => {
      voltar(ctx?.a);
      erro(falhou(e), { tentarDeNovo: () => remover.mutate(v) });
    },
    onSettled: recarregar,
  });

  const campanha = useMutation({
    mutationFn: salvarCampanha,
    onMutate: async (v) => {
      const a = await antes();
      if (a && v.id)
        qc.setQueryData<PainelTrafego>(chave, {
          ...a,
          campanhas: a.campanhas.map((c) =>
            c.id === v.id ? { ...c, nome: v.nome, plataforma: v.plataforma, ativa: v.ativa } : c,
          ),
        });
      return { a };
    },
    onSuccess: (_r, v) => ok(v.id ? "Campanha atualizada." : "Campanha criada."),
    onError: (e, v, ctx) => {
      voltar(ctx?.a);
      erro(falhou(e), { tentarDeNovo: () => campanha.mutate(v) });
    },
    onSettled: recarregar,
  });

  const orcamento = useMutation({
    mutationFn: (v: { google: number; meta: number }) => salvarOrcamento(v.google, v.meta),
    onMutate: async (v) => {
      const a = await antes();
      if (a)
        qc.setQueryData<PainelTrafego>(chave, {
          ...a,
          orcamento: {
            ...a.orcamento,
            google_cents: v.google,
            meta_cents: v.meta,
            mensal_cents: v.google + v.meta,
          },
        });
      return { a };
    },
    onSuccess: () => ok("Orçamento salvo."),
    onError: (e, v, ctx) => {
      voltar(ctx?.a);
      erro(falhou(e), { tentarDeNovo: () => orcamento.mutate(v) });
    },
    onSettled: recarregar,
  });

  return { registrar, remover, campanha, orcamento };
}

export type { Plataforma };
