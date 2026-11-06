import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { chavesPortal } from "@/lib/portal";
import {
  aprovarSite,
  chavesRevisao,
  enviarRevisao,
  ficouBom,
  lerRevisao,
  mensagemDaRevisao,
  outraMudanca,
  salvarAjuste,
  tirarAjuste,
  type AjusteRascunho,
  type NovoAjuste,
  type Revisao,
} from "@/lib/revisao";

const falhou = (e: unknown) => mensagemDaRevisao(e) ?? mensagemDeErro(e);

/** Revisão do site no portal (cards RS-1 a RS-3). */
export function useRevisao(siteId: string | null) {
  return useQuery({
    queryKey: chavesRevisao.site(siteId ?? "sem-site"),
    queryFn: () => lerRevisao(siteId as string),
    enabled: Boolean(siteId),
  });
}

/**
 * Ações da revisão. Pôr, mudar e tirar da lista mudam a tela na hora; se o banco recusar,
 * a lista volta e o aviso explica, com "Tentar de novo".
 */
export function useMutacoesRevisao(siteId: string) {
  const qc = useQueryClient();
  const chave = chavesRevisao.site(siteId);

  async function guardar() {
    await qc.cancelQueries({ queryKey: chave });
    return qc.getQueryData<Revisao>(chave);
  }
  const voltar = (antes: Revisao | undefined) => {
    if (antes) qc.setQueryData(chave, antes);
  };
  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: chave });
    void qc.invalidateQueries({ queryKey: chavesPortal.pendencias });
  };
  const mexerNaLista = (f: (itens: AjusteRascunho[]) => AjusteRascunho[]) =>
    qc.setQueryData<Revisao>(chave, (d) =>
      d
        ? {
            ...d,
            rascunho: {
              id: d.rascunho?.id ?? "novo",
              numero: d.rascunho?.numero ?? d.proxima,
              itens: f(d.rascunho?.itens ?? []),
            },
          }
        : d,
    );

  const salvar = useMutation({
    mutationFn: (a: NovoAjuste) => salvarAjuste(siteId, a),
    onMutate: async (a) => {
      const antes = await guardar();
      const linha: AjusteRascunho = {
        id: a.id ?? `novo-${Date.now()}`,
        tipo: a.tipo,
        pagina_id: a.pagina_id ?? null,
        pagina: a.pagina,
        secao_id: a.secao_id ?? null,
        secao: a.secao ?? null,
        posicao: a.posicao ?? null,
        antes: a.antes ?? null,
        depois: a.depois ?? null,
        observacao: a.observacao ?? null,
        foto_id: a.foto_id ?? null,
        foto: null,
        audio_id: a.audio_id ?? null,
        audio: null,
        meu: true,
        autor: null,
      };
      mexerNaLista((itens) =>
        a.id
          ? itens.map((x) => (x.id === a.id ? { ...x, ...linha, foto: x.foto } : x))
          : [...itens, linha],
      );
      return antes;
    },
    onError: (e, a, antes) => {
      voltar(antes);
      erro(falhou(e), { tentarDeNovo: () => salvar.mutate(a) });
    },
    onSettled: atualizar,
  });

  const tirar = useMutation({
    mutationFn: (a: AjusteRascunho) => tirarAjuste(a.id),
    onMutate: async (a) => {
      const antes = await guardar();
      mexerNaLista((itens) => itens.filter((x) => x.id !== a.id));
      return antes;
    },
    onSuccess: (_r, a) =>
      ok("Ajuste tirado da lista.", {
        desfazer: () =>
          salvar.mutate({
            tipo: a.tipo,
            pagina_id: a.pagina_id,
            pagina: a.pagina,
            secao_id: a.secao_id,
            secao: a.secao,
            posicao: a.posicao,
            antes: a.antes,
            depois: a.depois,
            observacao: a.observacao,
            foto_id: a.foto_id,
            audio_id: a.audio_id,
          }),
      }),
    onError: (e, a, antes) => {
      voltar(antes);
      erro(falhou(e), { tentarDeNovo: () => tirar.mutate(a) });
    },
    onSettled: atualizar,
  });

  const enviar = useMutation({
    mutationFn: (rodadaId: string) => enviarRevisao(rodadaId),
    onSuccess: (r) =>
      ok(
        `Revisão ${r.numero} enviada: ${r.ajustes} ${r.ajustes === 1 ? "ajuste" : "ajustes"}. Avisamos o prazo de cada um.`,
      ),
    onError: (e, id) => erro(falhou(e), { tentarDeNovo: () => enviar.mutate(id) }),
    onSettled: atualizar,
  });

  const bom = useMutation({
    mutationFn: (pedidoId: string) => ficouBom(pedidoId),
    onMutate: async (pedidoId) => {
      const antes = await guardar();
      qc.setQueryData<Revisao>(chave, (d) =>
        d
          ? {
              ...d,
              para_ver: Math.max(d.para_ver - 1, 0),
              rodadas: d.rodadas.map((r) => ({
                ...r,
                ajustes: r.ajustes.map((x) =>
                  x.id === pedidoId
                    ? { ...x, situacao: "aprovado" as const, validado_em: new Date().toISOString() }
                    : x,
                ),
              })),
            }
          : d,
      );
      return antes;
    },
    onError: (e, id, antes) => {
      voltar(antes);
      erro(falhou(e), { tentarDeNovo: () => bom.mutate(id) });
    },
    onSettled: atualizar,
  });

  const outra = useMutation({
    mutationFn: (v: { pedidoId: string; texto: string }) => outraMudanca(v.pedidoId, v.texto),
    onSuccess: () => ok("Pedido enviado. Avisamos quando estiver pronto para você ver de novo."),
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => outra.mutate(v) }),
    onSettled: atualizar,
  });

  const aprovar = useMutation({
    mutationFn: (confirmacoes: boolean[]) => aprovarSite(siteId, confirmacoes),
    onSuccess: () => ok("Site aprovado. Agora vamos colocar no ar e avisamos você."),
    onError: (e, c) => erro(falhou(e), { tentarDeNovo: () => aprovar.mutate(c) }),
    onSettled: atualizar,
  });

  return { salvar, tirar, enviar, bom, outra, aprovar };
}
