import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useMutacoesTarefa } from "@/components/tarefas/useMutacoesTarefa";
import { chavesPedidos } from "@/lib/pedidos";
import { chavesTarefas } from "@/lib/tarefas";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  atualizarProjeto,
  cancelarAprovacao,
  chavesProjetos,
  concluirFase,
  criarItemEncerramento,
  criarModulo,
  definirTipoProjeto,
  editarModulo,
  moverModulo,
  pedirAprovacaoModulo,
  publicarModulo,
  rotuloModulo,
  criarPendencia,
  criarTarefa,
  lancarHoras,
  lancarProjeto,
  marcarEncerramento,
  marcarPendencia,
  mensagemDoProjeto,
  pedirAprovacao,
  removerHoras,
  removerPendencia,
  type DetalheProjeto,
  type Modulo,
  type SituacaoModulo,
  type TipoProjeto,
  type Tarefa,
} from "@/lib/projetos";

type Otimista<V> = (d: DetalheProjeto, v: V) => DetalheProjeto;

/**
 * Ações da tela do projeto. Tela muda na hora quando há atualização otimista,
 * volta se o banco recusar, e depois recarrega do banco (que faz as contas).
 */
export function useMutacoesProjeto(projetoId: string) {
  const qc = useQueryClient();
  const chave = chavesProjetos.detalhe(projetoId);
  const falhou = (e: unknown) => mensagemDoProjeto(e) ?? mensagemDeErro(e);

  function useAcao<V, R>(
    fn: (v: V) => Promise<R>,
    opcoes: { otimista?: Otimista<V>; sucesso?: string | ((v: V, r: R) => string | null) } = {},
  ) {
    const m = useMutation({
      mutationFn: fn,
      onMutate: async (v: V) => {
        await qc.cancelQueries({ queryKey: chavesProjetos.tudo });
        const antes = qc.getQueryData<DetalheProjeto>(chave);
        if (antes && opcoes.otimista) qc.setQueryData(chave, opcoes.otimista(antes, v));
        return { antes };
      },
      onSuccess: (r, v) => {
        const texto =
          typeof opcoes.sucesso === "function" ? opcoes.sucesso(v, r) : (opcoes.sucesso ?? null);
        if (texto) ok(texto);
      },
      onError: (e, v, ctx) => {
        if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
        erro(falhou(e), { tentarDeNovo: () => m.mutate(v) });
      },
      onSettled: () => {
        void qc.invalidateQueries({ queryKey: chavesProjetos.tudo });
        void qc.invalidateQueries({ queryKey: chavesPedidos.tudo });
        void qc.invalidateQueries({ queryKey: ["painel"] });
        // Mesma tabela da Central de Tarefas: o que muda aqui muda lá.
        void qc.invalidateQueries({ queryKey: chavesTarefas.tudo });
      },
    });
    return m;
  }

  const fase = useAcao((faseId: string) => concluirFase(faseId), { sucesso: "Fase concluída." });

  const aprovacao = useAcao(pedirAprovacao, {
    sucesso: "Enviado. O cliente vê no portal e decide.",
  });
  const cancelar = useAcao((id: string) => cancelarAprovacao(id), {
    otimista: (d, id) => ({ ...d, aprovacoes: d.aprovacoes.filter((a) => a.id !== id) }),
    sucesso: "Pedido de aprovação cancelado.",
  });

  const pendencia = useAcao(criarPendencia, {
    sucesso: "Pendência criada. O cliente vê no portal.",
  });
  const marcar = useAcao((v: { id: string; feita: boolean }) => marcarPendencia(v.id, v.feita), {
    otimista: (d, v) => ({
      ...d,
      pendencias: d.pendencias.map((p) =>
        p.id === v.id ? { ...p, status: v.feita ? "feita" : "aberta" } : p,
      ),
    }),
  });
  const removerPend = useAcao((id: string) => removerPendencia(id), {
    otimista: (d, id) => ({ ...d, pendencias: d.pendencias.filter((p) => p.id !== id) }),
    sucesso: "Pendência removida.",
  });

  const tarefa = useAcao(criarTarefa, {
    otimista: (d, v) => {
      const agora = new Date().toISOString();
      const nova: Tarefa = {
        id: `temp-${Date.now()}`,
        project_id: v.projetoId,
        request_id: null,
        cycle: v.ciclo,
        area: v.area || null,
        title: v.titulo,
        description: v.descricao || null,
        status: "a_fazer",
        position: Date.now() / 1000,
        kind: "cliente",
        priority: "normal",
        due_date: null,
        assignee_id: null,
        done_at: null,
        card_ref: null,
        created_at: agora,
        updated_at: agora,
      };
      return { ...d, tarefas: [nova, ...d.tarefas] };
    },
    sucesso: "Tarefa criada.",
  });
  // Mover, editar e remover tarefa: as mesmas ações da Central (atualizam o projeto e a Central juntos).
  const tarefas = useMutacoesTarefa();

  const horas = useAcao(lancarHoras, {
    otimista: (d, v) =>
      v.projetoId === d.projeto.id
        ? {
            ...d,
            minutos_usados: d.minutos_usados + v.minutos,
            horas: [
              {
                id: `temp-${Date.now()}`,
                worked_on: v.dia,
                minutes: v.minutos,
                note: v.nota || null,
                created_at: new Date().toISOString(),
              },
              ...d.horas,
            ],
          }
        : d,
    sucesso: "Horas lançadas.",
  });
  const removerH = useAcao((v: { id: string; minutos: number }) => removerHoras(v.id), {
    otimista: (d, v) => ({
      ...d,
      minutos_usados: d.minutos_usados - v.minutos,
      horas: d.horas.filter((h) => h.id !== v.id),
    }),
    sucesso: "Lançamento removido.",
  });

  const encerramento = useAcao(
    (v: { id: string; feito: boolean }) => marcarEncerramento(v.id, v.feito),
    {
      otimista: (d, v) => ({
        ...d,
        checklist: d.checklist.map((i) => (i.id === v.id ? { ...i, done: v.feito } : i)),
      }),
    },
  );
  const itemEncerramento = useAcao((titulo: string) => criarItemEncerramento(projetoId, titulo), {
    sucesso: "Item incluído no encerramento.",
  });
  const lancar = useAcao(() => lancarProjeto(projetoId), {
    sucesso: (_v, r) =>
      r.status === "mensalidade"
        ? "Projeto lançado. Agora ele está em mensalidade."
        : "Projeto lançado e concluído.",
  });
  const atualizar = useAcao(
    (campos: { nome?: string; horas_estimadas?: number; lancamento?: string }) =>
      atualizarProjeto(projetoId, campos),
    {
      otimista: (d, c) => ({
        ...d,
        projeto: {
          ...d.projeto,
          ...(c.nome !== undefined ? { name: c.nome } : {}),
          ...(c.horas_estimadas !== undefined ? { hours_estimated: c.horas_estimadas } : {}),
          ...(c.lancamento !== undefined ? { launch_date: c.lancamento || null } : {}),
        },
      }),
      sucesso: "Projeto atualizado.",
    },
  );

  // ----- Módulos (card SS-1) -----
  const tipo = useAcao((t: TipoProjeto) => definirTipoProjeto(projetoId, t), {
    otimista: (d, t) => ({ ...d, projeto: { ...d.projeto, kind: t } }),
    sucesso: (t) =>
      t === "sob_medida" ? "Projeto agora é por módulos." : "Projeto volta a ser por fases.",
  });
  const novoModulo = useAcao(criarModulo, {
    otimista: (d, v) => {
      const novo: Modulo = {
        id: `temp-${Date.now()}`,
        nome: v.nome,
        ordem: d.modulos.length + 1,
        situacao: "planejado",
        no_ar_desde: null,
        ultima_versao: null,
        link: null,
        versoes: [],
        caminho: v.caminho,
        link_testes: null,
        link_producao: null,
        rodadas: 0,
        aprovacao: null,
        ultimo_ajuste: null,
      };
      return { ...d, modulos: [...d.modulos, novo] };
    },
    sucesso: "Módulo criado.",
  });
  const editarMod = useAcao(editarModulo, {
    otimista: (d, v) => ({
      ...d,
      modulos: d.modulos.map((x) =>
        x.id === v.id ? { ...x, nome: v.nome, caminho: v.caminho } : x,
      ),
    }),
    sucesso: "Módulo atualizado.",
  });
  const moverMod = useAcao(moverModulo, {
    otimista: (d, v) => ({
      ...d,
      modulos: d.modulos.map((x) =>
        x.id === v.id
          ? { ...x, situacao: v.situacao, link_testes: v.linkTestes || x.link_testes }
          : x,
      ),
    }),
    sucesso: (v) => `Módulo: ${rotuloModulo[v.situacao as SituacaoModulo].toLowerCase()}.`,
  });
  const aprovacaoMod = useAcao(pedirAprovacaoModulo, {
    otimista: (d, v) => ({
      ...d,
      modulos: d.modulos.map((x) =>
        x.id === v.id ? { ...x, situacao: "aguardando_aprovacao" as const } : x,
      ),
    }),
    sucesso: "Enviado. O cliente aprova o módulo no portal.",
  });
  const publicarMod = useAcao(publicarModulo, {
    otimista: (d, v) => ({
      ...d,
      modulos: d.modulos.map((x) =>
        x.id === v.id
          ? {
              ...x,
              situacao: "publicado" as const,
              link_producao: v.link || x.link_producao,
              no_ar_desde: x.no_ar_desde ?? new Date().toISOString(),
            }
          : x,
      ),
    }),
    sucesso: (_v, r) =>
      r.mensalidade_iniciada
        ? "Módulo no ar. Primeiro módulo publicado: a mensalidade começa no próximo mês."
        : "Módulo no ar.",
  });

  return {
    tipo,
    novoModulo,
    editarMod,
    moverMod,
    aprovacaoMod,
    publicarMod,
    fase,
    aprovacao,
    cancelar,
    pendencia,
    marcar,
    removerPend,
    tarefa,
    mover: tarefas.mover,
    editarTarefa: tarefas.editar,
    removerTar: tarefas.remover,
    horas,
    removerH,
    encerramento,
    itemEncerramento,
    lancar,
    atualizar,
  };
}
