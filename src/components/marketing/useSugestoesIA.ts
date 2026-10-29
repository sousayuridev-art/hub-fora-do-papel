import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesMarketing,
  descartarSugestao,
  listarSugestoes,
  mensagemDoMarketing,
  pedirSugestao,
  usarSugestao,
  usoDaIA,
  type CampoSugestao,
  type Sugestao,
  type TipoSugestao,
} from "@/lib/marketing";

const falhou = (e: unknown) => mensagemDoMarketing(e) ?? mensagemDeErro(e);
/** Erros que não melhoram tentando de novo agora. */
const SEM_NOVA_TENTATIVA = [
  "teto_mensal",
  "limite_diario",
  "briefing_incompleto",
  "sem_texto_para_revisar",
];
const vaiDeNovo = (e: unknown) => {
  const m = e instanceof Error ? e.message : "";
  return !SEM_NOVA_TENTATIVA.some((k) => m.includes(k));
};

/** Mesma marca que o banco grava ao usar uma opção ("gancho:2", "revisao:0"). */
export const marcaOpcao = (s: Sugestao, i: number) =>
  `${s.tipo === "ganchos" ? "gancho" : "revisao"}:${i}`;

/** Sugestões da IA de uma versão (MK-3): pedir, usar por campo e descartar. */
export function useSugestoesIA(versao: string, aoUsar: () => void) {
  const qc = useQueryClient();
  const chave = chavesMarketing.sugestoes(versao);

  const uso = useQuery({ queryKey: chavesMarketing.usoIA, queryFn: usoDaIA, staleTime: 30_000 });
  const lista = useQuery({ queryKey: chave, queryFn: () => listarSugestoes(versao) });

  const pedir = useMutation({
    mutationFn: (tipo: TipoSugestao) => pedirSugestao(versao, tipo),
    onSuccess: (s) => {
      qc.setQueryData<Sugestao[]>(chave, (l) => [s, ...(l ?? []).filter((x) => x.id !== s.id)]);
    },
    onError: (e, tipo) =>
      erro(falhou(e), vaiDeNovo(e) ? { tentarDeNovo: () => pedir.mutate(tipo) } : {}),
    // O uso muda até quando a IA falha (toda chamada é registrada).
    onSettled: () => qc.invalidateQueries({ queryKey: chavesMarketing.usoIA }),
  });

  const usar = useMutation({
    mutationFn: (a: { id: string; campos: CampoSugestao[] | null; opcao: number | null }) =>
      usarSugestao(a.id, a.campos, a.opcao),
    onMutate: async (a) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<Sugestao[]>(chave);
      qc.setQueryData<Sugestao[]>(chave, (l) =>
        (l ?? []).map((s) =>
          s.id === a.id
            ? {
                ...s,
                usada_em: new Date().toISOString(),
                campos_usados: [
                  ...(s.campos_usados ?? []),
                  ...(a.campos ?? [marcaOpcao(s, a.opcao ?? 0)]),
                ],
              }
            : s,
        ),
      );
      return { antes };
    },
    onError: (e, a, ctx) => {
      if (ctx) qc.setQueryData(chave, ctx.antes);
      erro(falhou(e), { tentarDeNovo: () => usar.mutate(a) });
    },
    onSuccess: () => {
      aoUsar();
      ok("Sugestão usada. A revisão da marca já conferiu o texto.");
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: chave }),
        qc.invalidateQueries({ queryKey: chavesMarketing.detalhes }),
        qc.invalidateQueries({ queryKey: chavesMarketing.listas }),
        // Usar pode desfazer a aprovação: números do quadro e calendário mudam.
        qc.invalidateQueries({ queryKey: chavesMarketing.resumo }),
        qc.invalidateQueries({ queryKey: chavesMarketing.calendarios }),
      ]),
  });

  const descartar = useMutation({
    mutationFn: (id: string) => descartarSugestao(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<Sugestao[]>(chave);
      qc.setQueryData<Sugestao[]>(chave, (l) => (l ?? []).filter((s) => s.id !== id));
      return { antes };
    },
    onError: (e, id, ctx) => {
      if (ctx) qc.setQueryData(chave, ctx.antes);
      erro(falhou(e), { tentarDeNovo: () => descartar.mutate(id) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  });

  return { uso, lista, pedir, usar, descartar };
}
