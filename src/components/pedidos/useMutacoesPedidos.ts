import { useMutation, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { chavesPainel } from "@/lib/painel";
import {
  chavesPedidos,
  classificarPedido,
  concluirPedido,
  enviarAoCliente,
  iniciarPedido,
  mensagemDoPedido,
  recusarPedido,
  registrarPedido,
  type Classificacao,
  type PedidoLinha,
  type SituacaoPedido,
} from "@/lib/pedidos";
import { chavesProjetos } from "@/lib/projetos";

/** Ações dos pedidos: a situação muda na lista na hora e volta se o banco recusar. */
export function useMutacoesPedidos() {
  const qc = useQueryClient();
  const falhou = (e: unknown) => mensagemDoPedido(e) ?? mensagemDeErro(e);
  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: chavesPedidos.tudo });
    void qc.invalidateQueries({ queryKey: chavesProjetos.tudo });
    void qc.invalidateQueries({ queryKey: chavesPainel.novidades });
  };

  function useMudanca<V extends { p: PedidoLinha }>(
    fn: (v: V) => Promise<unknown>,
    novo: (v: V) => Partial<PedidoLinha> & { status: SituacaoPedido },
    sucesso: (v: V) => string,
  ) {
    const m = useMutation({
      mutationFn: fn,
      onMutate: async (v: V) => {
        await qc.cancelQueries({ queryKey: chavesPedidos.lista });
        const antes = qc.getQueryData<PedidoLinha[]>(chavesPedidos.lista);
        if (antes)
          qc.setQueryData<PedidoLinha[]>(
            chavesPedidos.lista,
            antes.map((x) => (x.id === v.p.id ? { ...x, ...novo(v) } : x)),
          );
        return { antes };
      },
      onSuccess: (_r, v) => ok(sucesso(v)),
      onError: (e, v, ctx) => {
        if (ctx?.antes) qc.setQueryData(chavesPedidos.lista, ctx.antes);
        erro(falhou(e), { tentarDeNovo: () => m.mutate(v) });
      },
      onSettled: recarregar,
    });
    return m;
  }

  const classificar = useMudanca(
    (v: { p: PedidoLinha; c: Classificacao; horas: number; nota: string }) =>
      classificarPedido({ id: v.p.id, classificacao: v.c, horas: v.horas, nota: v.nota }),
    (v) => ({
      classification: v.c,
      hours_estimated: v.horas,
      status: v.c === "adicional" ? "em_analise" : "fazendo",
    }),
    (v) =>
      v.c === "adicional"
        ? `${v.p.code}: estimativa salva. Agora envie ao cliente.`
        : `${v.p.code}: classificado e em andamento.`,
  );
  const enviar = useMudanca(
    (v: { p: PedidoLinha }) => enviarAoCliente(v.p.id),
    () => ({ status: "aguardando_cliente" }),
    (v) => `${v.p.code}: enviado. O cliente decide no portal.`,
  );
  const iniciar = useMudanca(
    (v: { p: PedidoLinha }) => iniciarPedido(v.p.id),
    () => ({ status: "fazendo" }),
    (v) => `${v.p.code} em andamento.`,
  );
  const concluir = useMudanca(
    (v: { p: PedidoLinha }) => concluirPedido(v.p.id),
    () => ({ status: "pronto" }),
    (v) => `${v.p.code} pronto. O cliente vê no portal.`,
  );
  const recusar = useMudanca(
    (v: { p: PedidoLinha; motivo: string }) => recusarPedido(v.p.id, v.motivo),
    (v) => ({ status: "recusado", owner_note: v.motivo }),
    (v) => `${v.p.code} recusado.`,
  );

  const registrar = useMutation({
    mutationFn: registrarPedido,
    onSuccess: (r) => ok(`Pedido ${r.codigo} registrado. Agora classifique.`),
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => registrar.mutate(v) }),
    onSettled: recarregar,
  });

  return { classificar, enviar, iniciar, concluir, recusar, registrar };
}
