import { useMutation, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  atualizarCobranca,
  cancelarCobranca,
  chavesFinanceiro,
  criarCobranca,
  criarMensalidade,
  desfazerPagamento,
  mensagemDoFinanceiro,
  mudarMensalidade,
  pagarCobranca,
  removerDespesa,
  salvarDespesa,
  type CobrancaLinha,
  type Despesa,
  type PainelFinanceiro,
} from "@/lib/financeiro";

type Otimista<V> = (d: PainelFinanceiro, v: V) => PainelFinanceiro;

/** Ações do financeiro: a lista muda na hora, volta se o banco recusar e recarrega as contas do banco. */
export function useMutacoesFinanceiro() {
  const qc = useQueryClient();
  const falhou = (e: unknown) => mensagemDoFinanceiro(e) ?? mensagemDeErro(e);

  function useAcao<V, R>(
    fn: (v: V) => Promise<R>,
    opcoes: {
      otimista?: Otimista<V>;
      sucesso?: (v: V, r: R) => string;
      desfazer?: (v: V) => void;
    } = {},
  ) {
    const m = useMutation({
      mutationFn: fn,
      onMutate: async (v: V) => {
        await qc.cancelQueries({ queryKey: chavesFinanceiro.tudo });
        const antes = qc.getQueryData<PainelFinanceiro>(chavesFinanceiro.painel);
        if (antes && opcoes.otimista)
          qc.setQueryData(chavesFinanceiro.painel, opcoes.otimista(antes, v));
        return { antes };
      },
      onSuccess: (r, v) => {
        if (opcoes.sucesso) {
          const desfazer = opcoes.desfazer;
          ok(opcoes.sucesso(v, r), desfazer ? { desfazer: () => desfazer(v) } : {});
        }
      },
      onError: (e, v, ctx) => {
        if (ctx?.antes) qc.setQueryData(chavesFinanceiro.painel, ctx.antes);
        erro(falhou(e), { tentarDeNovo: () => m.mutate(v) });
      },
      onSettled: () => {
        void qc.invalidateQueries({ queryKey: chavesFinanceiro.tudo });
        void qc.invalidateQueries({ queryKey: ["painel"] });
        void qc.invalidateQueries({ queryKey: ["projetos"] });
      },
    });
    return m;
  }

  const mudarCobranca = (
    d: PainelFinanceiro,
    id: string,
    f: (c: CobrancaLinha) => CobrancaLinha,
  ) => ({
    ...d,
    cobrancas: d.cobrancas.map((c) => (c.id === id ? f(c) : c)),
  });

  const desfazer = useAcao((c: CobrancaLinha) => desfazerPagamento(c.id), {
    otimista: (d, c) =>
      mudarCobranca(d, c.id, (x) => ({
        ...x,
        situacao: "aberta",
        pago_em: null,
        pago_cents: null,
        recibo: null,
      })),
    sucesso: () => "Pagamento desfeito. A cobrança voltou a ficar em aberto.",
  });

  const pagar = useAcao(pagarCobranca, {
    otimista: (d, v) =>
      mudarCobranca(d, v.id, (x) => ({
        ...x,
        situacao: "paga",
        pago_em: v.data,
        pago_cents: v.valorCents,
        forma: v.forma,
      })),
    sucesso: (_v, r) => `Pagamento registrado. Recibo nº ${r.recibo ?? ""}.`,
  });

  const atualizar = useAcao(
    (v: {
      id: string;
      campos: { vencimento?: string; valor_cents?: number; descricao?: string };
    }) => atualizarCobranca(v.id, v.campos),
    {
      otimista: (d, v) =>
        mudarCobranca(d, v.id, (x) => ({
          ...x,
          ...(v.campos.vencimento !== undefined ? { vencimento: v.campos.vencimento || null } : {}),
          ...(v.campos.valor_cents !== undefined ? { valor_cents: v.campos.valor_cents } : {}),
          ...(v.campos.descricao !== undefined ? { descricao: v.campos.descricao } : {}),
        })),
      sucesso: () => "Cobrança atualizada.",
    },
  );

  const cancelar = useAcao(
    (v: { id: string; motivo: string }) => cancelarCobranca(v.id, v.motivo),
    {
      otimista: (d, v) => ({ ...d, cobrancas: d.cobrancas.filter((c) => c.id !== v.id) }),
      sucesso: () => "Cobrança cancelada.",
    },
  );

  const nova = useAcao(criarCobranca, {
    sucesso: () => "Cobrança criada. O cliente vê no portal.",
  });

  const mensalidade = useAcao(criarMensalidade, {
    sucesso: () => "Mensalidade criada. As cobranças do mês aparecem sozinhas.",
  });
  const situacaoMensalidade = useAcao(
    (v: { id: string; situacao: "ativa" | "pausada" | "encerrada" }) =>
      mudarMensalidade(v.id, v.situacao),
    {
      otimista: (d, v) => ({
        ...d,
        mensalidades: d.mensalidades.map((x) =>
          x.id === v.id ? { ...x, situacao: v.situacao } : x,
        ),
      }),
      sucesso: (v) =>
        v.situacao === "encerrada"
          ? "Mensalidade encerrada. O mês atual continua cobrado."
          : v.situacao === "pausada"
            ? "Mensalidade pausada."
            : "Mensalidade reativada.",
    },
  );

  const despesa = useAcao(salvarDespesa, {
    sucesso: (v) => (v.id ? "Despesa atualizada." : "Despesa incluída."),
  });
  const removerDesp = useAcao((x: Despesa) => removerDespesa(x.id), {
    otimista: (d, x) => ({ ...d, despesas: d.despesas.filter((y) => y.id !== x.id) }),
    sucesso: () => "Despesa removida.",
  });

  return {
    pagar,
    desfazer,
    atualizar,
    cancelar,
    nova,
    mensalidade,
    situacaoMensalidade,
    despesa,
    removerDesp,
  };
}
