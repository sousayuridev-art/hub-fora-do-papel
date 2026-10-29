import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { enviarMaterial, mensagemDoMaterial, tipoDoArquivo } from "@/lib/materiais";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  adicionarVersao,
  agendarVersao,
  aprovarPeca,
  chavesMarketing,
  criarPeca,
  editarPeca,
  editarVersao,
  mensagemDoMarketing,
  moverPeca,
  pecaComCampos,
  pecaNaEtapa,
  pedirAjuste,
  publicarVersao,
  ligarArquivo,
  ordenarArquivos,
  papelDoArquivo,
  registrarResultados,
  removerArquivo,
  removerCampanha,
  removerPeca,
  removerVersao,
  rotuloEtapa,
  salvarCampanha,
  type CamposCampanha,
  type CamposPeca,
  type CamposVersao,
  type Etapa,
  type Formato,
  type PapelMidia,
  type ListaPecas,
  type NovaPeca,
  type Peca,
  type PecaDetalhe,
  type Resultados,
  type Versao,
} from "@/lib/marketing";

type Foto = [QueryKey, unknown][];

const falhou = (e: unknown) => mensagemDoMarketing(e) ?? mensagemDeErro(e);

function fotografar(qc: QueryClient): Foto {
  return [
    ...qc.getQueriesData({ queryKey: chavesMarketing.listas }),
    ...qc.getQueriesData({ queryKey: chavesMarketing.detalhes }),
  ];
}
function restaurar(qc: QueryClient, foto: Foto) {
  for (const [chave, dados] of foto) qc.setQueryData(chave, dados);
}
async function pararLeituras(qc: QueryClient) {
  await qc.cancelQueries({ queryKey: chavesMarketing.tudo });
}

/** Muda a mesma peça em todas as listas e no detalhe em cache. */
function mudarPeca(qc: QueryClient, id: string, fn: <T extends Peca>(p: T) => T) {
  qc.setQueriesData<ListaPecas>({ queryKey: chavesMarketing.listas }, (l) =>
    l && l.itens.some((p) => p.id === id)
      ? { ...l, itens: l.itens.map((p) => (p.id === id ? fn(p) : p)) }
      : l,
  );
  qc.setQueryData<PecaDetalhe>(chavesMarketing.detalhe(id), (d) => (d ? fn(d) : d));
}

/** Grava a peça que o banco devolveu (fonte da verdade) nas listas e no detalhe. */
function gravarPeca(qc: QueryClient, p: Peca) {
  mudarPeca(qc, p.id, (atual) => ({ ...atual, ...p }));
}

/** Contagens, calendário e campanhas são recalculados no banco depois de cada ação. */
function recarregar(qc: QueryClient, id?: string) {
  void qc.invalidateQueries({ queryKey: chavesMarketing.listas });
  void qc.invalidateQueries({ queryKey: chavesMarketing.resumo });
  void qc.invalidateQueries({ queryKey: chavesMarketing.calendarios });
  void qc.invalidateQueries({ queryKey: chavesMarketing.campanhas });
  if (id) void qc.invalidateQueries({ queryKey: chavesMarketing.detalhe(id) });
}

/**
 * Ação sobre uma versão: muda na hora (prévia opcional), volta se o banco recusar, oferece
 * "Tentar de novo" e depois grava o que o banco devolveu (etapa e avisos são dele).
 */
function useAcaoVersao<A extends { pecaId: string }>(
  fn: (a: A) => Promise<Peca>,
  mensagem: (p: Peca) => string,
  previa?: (p: Peca, a: A) => Peca,
) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: fn,
    onMutate: async (a: A) => {
      if (!previa) return { foto: null };
      await pararLeituras(qc);
      const foto = fotografar(qc);
      mudarPeca(qc, a.pecaId, (p) => ({ ...p, ...previa(p, a) }));
      return { foto };
    },
    onSuccess: (p) => {
      gravarPeca(qc, p);
      ok(mensagem(p));
    },
    onError: (e, a, ctx) => {
      if (ctx?.foto) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => m.mutate(a) });
    },
    onSettled: (_d, _e, a) => recarregar(qc, a.pecaId),
  });
  return m;
}

/** Troca uma versão da peça (prévia otimista). */
const naVersao = (p: Peca, id: string, fn: (v: Versao) => Versao | null): Peca => ({
  ...p,
  versoes: p.versoes.flatMap((v) => {
    if (v.id !== id) return [v];
    const n = fn(v);
    return n ? [n] : [];
  }),
});

/**
 * Ações da Central de conteúdo. O que a pessoa faz muda na hora, volta se o banco recusar
 * (com o motivo e "Tentar de novo") e depois recarrega do banco, que decide avisos e contagens.
 */
export function useMutacoesMarketing() {
  const qc = useQueryClient();

  const criar = useMutation({
    mutationFn: (v: NovaPeca) => criarPeca(v),
    onSuccess: (p) => ok(`Peça “${p.title}” criada em Ideia.`),
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => criar.mutate(v) }),
    onSettled: () => recarregar(qc),
  });

  const editar = useMutation({
    mutationFn: (v: { id: string; campos: CamposPeca }) => editarPeca(v.id, v.campos),
    onMutate: async (v) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      mudarPeca(qc, v.id, (p) => pecaComCampos(p, v.campos));
      return { foto };
    },
    onSuccess: (p) => gravarPeca(qc, p),
    onError: (e, v, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => editar.mutate(v) });
    },
    onSettled: (_d, _e, v) => recarregar(qc, v.id),
  });

  const mover = useMutation({
    mutationFn: (v: { id: string; etapa: Etapa }) => moverPeca(v.id, v.etapa),
    onMutate: async (v) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      mudarPeca(qc, v.id, (p) => pecaNaEtapa(p, v.etapa));
      return { foto };
    },
    onSuccess: (p) => {
      gravarPeca(qc, p);
      ok(`Peça em ${rotuloEtapa[p.stage]}.`);
    },
    onError: (e, v, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => mover.mutate(v) });
    },
    onSettled: (_d, _e, v) => recarregar(qc, v.id),
  });

  const aprovar = useMutation({
    mutationFn: (v: { id: string; nota: string | null }) => aprovarPeca(v.id, v.nota),
    onMutate: async (v) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      mudarPeca(qc, v.id, (p) => pecaNaEtapa(p, "pronto"));
      return { foto };
    },
    onSuccess: (p) => {
      gravarPeca(qc, p);
      ok("Peça aprovada. Agora é agendar e publicar.");
    },
    onError: (e, v, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => aprovar.mutate(v) });
    },
    onSettled: (_d, _e, v) => recarregar(qc, v.id),
  });

  const ajuste = useMutation({
    mutationFn: (v: { id: string; nota: string }) => pedirAjuste(v.id, v.nota),
    onMutate: async (v) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      mudarPeca(qc, v.id, (p) => pecaNaEtapa(p, "refinamento"));
      return { foto };
    },
    onSuccess: (p) => {
      gravarPeca(qc, p);
      ok("Ajuste pedido. A peça voltou para Refinamento.");
    },
    onError: (e, v, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => ajuste.mutate(v) });
    },
    onSettled: (_d, _e, v) => recarregar(qc, v.id),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerPeca(id),
    onMutate: async (id) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      qc.setQueriesData<ListaPecas>({ queryKey: chavesMarketing.listas }, (l) =>
        l ? { ...l, itens: l.itens.filter((p) => p.id !== id) } : l,
      );
      return { foto };
    },
    onSuccess: (r) => ok(`Peça “${r.titulo}” removida.`),
    onError: (e, id, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => remover.mutate(id) });
    },
    onSettled: () => recarregar(qc),
  });

  const editarVersaoM = useMutation({
    mutationFn: (v: { pecaId: string; id: string; campos: CamposVersao }) =>
      editarVersao(v.id, v.campos),
    onMutate: async (v) => {
      await pararLeituras(qc);
      const foto = fotografar(qc);
      mudarPeca(qc, v.pecaId, (p) => ({
        ...p,
        versoes: p.versoes.map((x) =>
          x.id !== v.id
            ? x
            : {
                ...x,
                ...(v.campos.formato !== undefined && { format: v.campos.formato }),
                ...(v.campos.gancho !== undefined && { hook: v.campos.gancho }),
                ...(v.campos.texto !== undefined && { body: v.campos.texto }),
                ...(v.campos.roteiro !== undefined && { script: v.campos.roteiro }),
                ...(v.campos.slides !== undefined && { slides: v.campos.slides }),
                ...(v.campos.chamada !== undefined && { cta: v.campos.chamada }),
                ...(v.campos.hashtags !== undefined && { hashtags: v.campos.hashtags }),
              },
        ),
      }));
      return { foto };
    },
    onSuccess: (p, v) => {
      const antes = qc.getQueryData<PecaDetalhe>(chavesMarketing.detalhe(v.pecaId));
      gravarPeca(qc, p);
      if (antes?.stage === "pronto" && p.stage === "aprovacao")
        ok(
          antes.versoes.some((v) => v.scheduled_at)
            ? "Texto alterado: a peça voltou para Aprovação e as datas agendadas saíram."
            : "Texto alterado: a peça voltou para Aprovação.",
        );
    },
    onError: (e, v, ctx) => {
      if (ctx) restaurar(qc, ctx.foto);
      erro(falhou(e), { tentarDeNovo: () => editarVersaoM.mutate(v) });
    },
    onSettled: (_d, _e, v) => recarregar(qc, v.pecaId),
  });

  const adicionar = useAcaoVersao(
    (a: { pecaId: string; canal: string; formato: Formato; copiarDe: string | null }) =>
      adicionarVersao(a.pecaId, a.canal, a.formato, a.copiarDe),
    () => "Versão adicionada.",
  );
  const removerVersaoM = useAcaoVersao(
    (a: { pecaId: string; id: string }) => removerVersao(a.id),
    () => "Versão removida.",
    (p, a) => naVersao(p, a.id, () => null),
  );
  const agendar = useAcaoVersao(
    (a: { pecaId: string; id: string; quando: string | null }) => agendarVersao(a.id, a.quando),
    () => "Agenda atualizada.",
    (p, a) => naVersao(p, a.id, (v) => ({ ...v, scheduled_at: a.quando })),
  );
  const publicar = useAcaoVersao(
    (a: { pecaId: string; id: string; link: string; quando: string | null }) =>
      publicarVersao(a.id, a.link, a.quando),
    (p) =>
      p.stage === "publicado"
        ? "Todas as versões publicadas: a peça foi para Publicado."
        : "Versão marcada como publicada.",
    (p, a) =>
      naVersao(p, a.id, (v) => ({
        ...v,
        published_at: a.quando ?? new Date().toISOString(),
        published_url: a.link,
      })),
  );
  const resultados = useAcaoVersao(
    (a: { pecaId: string; id: string; r: Resultados }) => registrarResultados(a.id, a.r),
    (p) =>
      p.stage === "analisado" ? "Resultados completos: peça analisada." : "Resultados salvos.",
    (p, a) => naVersao(p, a.id, (v) => ({ ...v, results: a.r })),
  );

  // MK-2: arquivos da versão
  const ligar = useAcaoVersao(
    (a: { pecaId: string; versao: string; material: string; papel: PapelMidia }) =>
      ligarArquivo(a.versao, a.material, a.papel),
    () => "Arquivo ligado à versão.",
  );
  const removerArquivoM = useAcaoVersao(
    (a: { pecaId: string; versao: string; id: string }) => removerArquivo(a.id),
    () => "Arquivo tirado da versão. Ele continua em Materiais.",
    (p, a) =>
      naVersao(p, a.versao, (v) => ({ ...v, midias: v.midias.filter((x) => x.id !== a.id) })),
  );
  const ordenar = useAcaoVersao(
    (a: { pecaId: string; versao: string; ids: string[] }) => ordenarArquivos(a.versao, a.ids),
    () => "Ordem salva.",
    (p, a) =>
      naVersao(p, a.versao, (v) => ({
        ...v,
        midias: a.ids.flatMap((id, n) => {
          const x = v.midias.find((y) => y.id === id);
          return x ? [{ ...x, posicao: n }] : [];
        }),
      })),
  );
  /** Envia do computador para Materiais (categoria "redes") e liga à versão, um arquivo por vez. */
  const enviar = useMutation({
    mutationFn: async (a: {
      pecaId: string;
      versao: string;
      formato: Formato;
      arquivos: File[];
    }) => {
      let ultima: Peca | null = null;
      for (const f of a.arquivos) {
        const papel = papelDoArquivo(a.formato, tipoDoArquivo(f));
        if (!papel) throw new Error(`tipo_do_arquivo:${f.name}`);
        const m = await enviarMaterial({
          arquivo: f,
          categoria: "redes",
          titulo: f.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Arquivo da peça",
          descricao: "",
          clienteId: null,
          projetoId: null,
          compartilhado: false,
        });
        ultima = await ligarArquivo(a.versao, m.id, papel);
      }
      return ultima;
    },
    onSuccess: (p, a) => {
      if (p) gravarPeca(qc, p);
      ok(
        a.arquivos.length === 1
          ? "Arquivo enviado e ligado."
          : `${a.arquivos.length} arquivos enviados e ligados.`,
      );
    },
    onError: (e, a) =>
      erro(mensagemDoMaterial(e) ?? falhou(e), { tentarDeNovo: () => enviar.mutate(a) }),
    onSettled: (_d, _e, a) => {
      recarregar(qc, a.pecaId);
      void qc.invalidateQueries({ queryKey: chavesMarketing.materiais });
    },
  });

  const campanha = useMutation({
    mutationFn: (v: { id: string | null; campos: CamposCampanha }) =>
      salvarCampanha(v.id, v.campos),
    onSuccess: (c, v) => ok(v.id ? "Campanha salva." : `Campanha “${c.name}” criada.`),
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => campanha.mutate(v) }),
    onSettled: () => recarregar(qc),
  });
  const removerCampanhaM = useMutation({
    mutationFn: (id: string) => removerCampanha(id),
    onSuccess: (c) => ok(`Campanha “${c.name}” removida. As peças ficaram, sem campanha.`),
    onError: (e, id) => erro(falhou(e), { tentarDeNovo: () => removerCampanhaM.mutate(id) }),
    onSettled: () => recarregar(qc),
  });

  return {
    criar,
    editar,
    mover,
    aprovar,
    ajuste,
    remover,
    editarVersao: editarVersaoM,
    adicionar,
    removerVersao: removerVersaoM,
    agendar,
    publicar,
    resultados,
    ligar,
    removerArquivo: removerArquivoM,
    ordenar,
    enviar,
    campanha,
    removerCampanha: removerCampanhaM,
  };
}
