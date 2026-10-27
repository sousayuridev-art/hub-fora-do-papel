import { useMutation, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  aprovarEntrega,
  chavesPortal,
  decidirAdicional,
  fazerPedido,
  marcarPendenciaFeita,
  mensagemDoPortal,
  pedirAjuste,
  type AprovacoesPortal,
  type InicioPortal,
  type NovoPedido,
  type PendenciasDoPortal,
} from "@/lib/portal";

/**
 * Ações do cliente no portal. A tela e os selos mudam na hora;
 * se o banco recusar, tudo volta e o aviso explica.
 */
export function useMutacoesPortal() {
  const qc = useQueryClient();
  const falhou = (e: unknown) => mensagemDoPortal(e) ?? mensagemDeErro(e);

  async function guardar() {
    await qc.cancelQueries({ queryKey: chavesPortal.tudo });
    return {
      aprov: qc.getQueryData<AprovacoesPortal>(chavesPortal.aprovacoes),
      inicio: qc.getQueryData<InicioPortal>(chavesPortal.inicio),
      pend: qc.getQueryData<PendenciasDoPortal>(chavesPortal.pendencias),
    };
  }
  type Guardado = Awaited<ReturnType<typeof guardar>>;
  function voltar(g: Guardado | undefined) {
    if (!g) return;
    qc.setQueryData(chavesPortal.aprovacoes, g.aprov);
    qc.setQueryData(chavesPortal.inicio, g.inicio);
    qc.setQueryData(chavesPortal.pendencias, g.pend);
  }
  /** Tira um item de "Precisa de você" e baixa o selo certo. */
  function tirar(id: string, campo: "aprovacoes" | "pendencias") {
    qc.setQueryData<InicioPortal>(chavesPortal.inicio, (d) =>
      d ? { ...d, acoes: d.acoes.filter((a) => a.id !== id) } : d,
    );
    qc.setQueryData<PendenciasDoPortal>(chavesPortal.pendencias, (p) =>
      p ? { ...p, [campo]: Math.max(0, p[campo] - 1), total: Math.max(0, p.total - 1) } : p,
    );
  }
  const recarregar = () => void qc.invalidateQueries({ queryKey: chavesPortal.tudo });

  const aprovar = useMutation({
    mutationFn: (v: { id: string; comentario: string }) => aprovarEntrega(v.id, v.comentario),
    onMutate: async (v) => {
      const g = await guardar();
      qc.setQueryData<AprovacoesPortal>(chavesPortal.aprovacoes, (d) =>
        d
          ? {
              ...d,
              entregas: d.entregas.map((x) =>
                x.id === v.id
                  ? { ...x, status: "aprovada", decidida_em: new Date().toISOString() }
                  : x,
              ),
            }
          : d,
      );
      tirar(v.id, "aprovacoes");
      return g;
    },
    onSuccess: () => ok("Aprovado. Avisamos o seu responsável."),
    onError: (e, v, g) => {
      voltar(g);
      erro(falhou(e), { tentarDeNovo: () => aprovar.mutate(v) });
    },
    onSettled: recarregar,
  });

  const ajuste = useMutation({
    mutationFn: (v: { id: string; comentario: string }) => pedirAjuste(v.id, v.comentario),
    onMutate: async (v) => {
      const g = await guardar();
      qc.setQueryData<AprovacoesPortal>(chavesPortal.aprovacoes, (d) =>
        d
          ? {
              ...d,
              entregas: d.entregas.map((x) =>
                x.id === v.id
                  ? {
                      ...x,
                      status: "ajuste",
                      comentario: v.comentario,
                      decidida_em: new Date().toISOString(),
                    }
                  : x,
              ),
            }
          : d,
      );
      tirar(v.id, "aprovacoes");
      return g;
    },
    onSuccess: () => ok("Pedido de ajuste enviado. Você recebe uma nova versão para aprovar."),
    onError: (e, v, g) => {
      voltar(g);
      erro(falhou(e), { tentarDeNovo: () => ajuste.mutate(v) });
    },
    onSettled: recarregar,
  });

  const adicional = useMutation({
    mutationFn: (v: { id: string; aprova: boolean; comentario: string }) =>
      decidirAdicional(v.id, v.aprova, v.comentario),
    onMutate: async (v) => {
      const g = await guardar();
      qc.setQueryData<AprovacoesPortal>(chavesPortal.aprovacoes, (d) =>
        d
          ? {
              ...d,
              adicionais: d.adicionais.map((x) =>
                x.id === v.id
                  ? {
                      ...x,
                      decisao: v.aprova ? "aprovado" : "recusado",
                      status: v.aprova ? "em_analise" : "recusado",
                      decidido_em: new Date().toISOString(),
                    }
                  : x,
              ),
            }
          : d,
      );
      tirar(v.id, "aprovacoes");
      return g;
    },
    onSuccess: (_r, v) =>
      ok(
        v.aprova
          ? "Serviço adicional aprovado. Vamos começar."
          : "Tudo certo, o serviço adicional não será feito.",
      ),
    onError: (e, v, g) => {
      voltar(g);
      erro(falhou(e), { tentarDeNovo: () => adicional.mutate(v) });
    },
    onSettled: recarregar,
  });

  const pendencia = useMutation({
    mutationFn: (id: string) => marcarPendenciaFeita(id),
    onMutate: async (id) => {
      const g = await guardar();
      tirar(id, "pendencias");
      return g;
    },
    onSuccess: () => ok("Marcado como feito. Obrigado!"),
    onError: (e, v, g) => {
      voltar(g);
      erro(falhou(e), { tentarDeNovo: () => pendencia.mutate(v) });
    },
    onSettled: recarregar,
  });

  const pedido = useMutation({
    mutationFn: (v: NovoPedido) => fazerPedido(v),
    onSuccess: (r) => ok(`Pedido ${r.codigo} recebido. Respondemos em breve.`),
    // O painel continua aberto com o texto; "Tentar de novo" não reenvia anexos que já subiram
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => pedido.mutate(v) }),
    onSettled: recarregar,
  });

  return { aprovar, ajuste, adicional, pendencia, pedido };
}
