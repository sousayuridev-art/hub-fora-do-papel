import { z } from "zod";

import { dataLocal, diaMes, isoDoDia } from "@/lib/formatar";
import { supabase } from "@/lib/supabase";
import type {
  DetalheProjeto,
  PrioridadeTarefa,
  SituacaoProjeto,
  SituacaoTarefa,
  Tarefa,
  TipoTarefa,
} from "@/lib/projetos";

/**
 * Central de Tarefas (cards TA-2, TA-3 e TA-4). A Central é outra forma de ver a MESMA tabela
 * do quadro do projeto: as chaves de cache das duas telas são atualizadas juntas.
 */

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

/** Tarefa como a Central mostra: com projeto, cliente, pedido de origem e "atrasada" (do banco). */
export type TarefaVista = Tarefa & {
  atrasada: boolean;
  projeto: { id: string; nome: string; situacao: SituacaoProjeto } | null;
  cliente: { id: string; empresa: string } | null;
  pedido: { id: string; codigo: string; titulo: string } | null;
};

export type ListaTarefas = { hoje: string; itens: TarefaVista[] };

export type ResumoTarefas = {
  hoje: string;
  abertas: number;
  cliente: number;
  interna: number;
  hub: number;
  atrasadas: number;
  para_hoje: number;
  semana: number;
  fazendo: number;
  prontas_semana: number;
};

export type PrazoFiltro = "atrasadas" | "hoje" | "semana";

/** Filtros aceitos por `tarefas_listar` (só as chaves presentes valem). */
export type FiltrosTarefas = {
  tipo?: TipoTarefa;
  cliente?: string;
  projeto?: string;
  prioridade?: PrioridadeTarefa;
  situacao?: SituacaoTarefa;
  prazo?: PrazoFiltro;
  /** Uma tarefa só (ignora os cortes de pronta antiga e projeto encerrado). */
  id?: string;
};

/** Filtros aceitos por `tarefas_resumo` (contagens das abas e dos atalhos). */
export type FiltrosResumo = Pick<FiltrosTarefas, "tipo" | "cliente" | "projeto" | "prioridade">;

export const rotuloTipo: Record<TipoTarefa, string> = {
  cliente: "Cliente",
  interna: "Interna",
  hub: "Hub",
};

export const rotuloPrioridade: Record<PrioridadeTarefa, string> = {
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

export const rotuloSituacao: Record<SituacaoTarefa, string> = {
  a_fazer: "A fazer",
  fazendo: "Fazendo",
  para_aprovar: "Para aprovar",
  pronto: "Pronto",
};

export const opcoesPrioridade = (["alta", "normal", "baixa"] as PrioridadeTarefa[]).map((p) => ({
  id: p,
  rotulo: rotuloPrioridade[p],
}));
export const opcoesSituacao = (
  ["a_fazer", "fazendo", "para_aprovar", "pronto"] as SituacaoTarefa[]
).map((s) => ({ id: s, rotulo: rotuloSituacao[s] }));

// ----------------------------------------------------------------------------
// Endereço (/app/tarefas?vista=…&tipo=…): filtros e vista ficam na URL
// ----------------------------------------------------------------------------

const uuid = z.string().uuid().optional().catch(undefined);

export const buscaTarefas = z.object({
  vista: z.enum(["lista", "kanban"]).optional().catch(undefined),
  tipo: z.enum(["cliente", "interna", "hub"]).optional().catch(undefined),
  prazo: z.enum(["atrasadas", "hoje", "semana"]).optional().catch(undefined),
  cliente: uuid,
  projeto: uuid,
  prioridade: z.enum(["alta", "normal", "baixa"]).optional().catch(undefined),
  situacao: z.enum(["a_fazer", "fazendo", "para_aprovar", "pronto"]).optional().catch(undefined),
  /** Tarefa aberta no painel. */
  tarefa: uuid,
});
export type BuscaTarefas = z.infer<typeof buscaTarefas>;

/** Lê o endereço e devolve só os filtros presentes (chave de cache estável). */
export function filtrosDaBusca(b: BuscaTarefas): FiltrosTarefas {
  const f: FiltrosTarefas = {};
  if (b.tipo) f.tipo = b.tipo;
  if (b.cliente) f.cliente = b.cliente;
  if (b.projeto) f.projeto = b.projeto;
  if (b.prioridade) f.prioridade = b.prioridade;
  if (b.situacao) f.situacao = b.situacao;
  if (b.prazo) f.prazo = b.prazo;
  return f;
}

/** Filtros das contagens: sem prazo e sem situação (os atalhos contam por prazo). */
export function filtrosDoResumo(b: BuscaTarefas, comTipo: boolean): FiltrosResumo {
  const f: FiltrosResumo = {};
  if (comTipo && b.tipo) f.tipo = b.tipo;
  if (b.cliente) f.cliente = b.cliente;
  if (b.projeto) f.projeto = b.projeto;
  if (b.prioridade) f.prioridade = b.prioridade;
  return f;
}

/** Quantos filtros de menu (cliente, projeto, prioridade, situação) estão ativos. */
export function filtrosAtivos(b: BuscaTarefas): number {
  return [b.cliente, b.projeto, b.prioridade, b.situacao].filter(Boolean).length;
}

// ----------------------------------------------------------------------------
// Datas e prazos (o "hoje" vem sempre do banco, no fuso da agência)
// ----------------------------------------------------------------------------

/** "2026-10-22" + 6 → "2026-10-28". */
export function somarDias(iso: string, dias: number): string {
  const d = dataLocal(iso);
  d.setDate(d.getDate() + dias);
  return isoDoDia(d);
}

/** Dias inteiros de `de` até `ate` (negativo se `ate` vem antes). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((dataLocal(ate).getTime() - dataLocal(de).getTime()) / 86_400_000);
}

/** Atrasada = prazo antes de hoje e não está pronta (mesma regra do banco). */
export function estaAtrasada(t: Pick<Tarefa, "due_date" | "status">, hoje: string): boolean {
  return t.due_date !== null && t.due_date < hoje && t.status !== "pronto";
}

const semanaCurta = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

export type TextoPrazo = { texto: string; tom: "risco" | "atencao" | "neutro" | "ok" | "vazio" };

/** Prazo curto para listas e cartões: "venceu 20/10", "hoje", "amanhã", "sex 24/10", "feito 21/10". */
export function textoPrazo(
  t: Pick<Tarefa, "due_date" | "status" | "done_at">,
  hoje: string,
): TextoPrazo {
  if (t.status === "pronto") {
    return t.done_at
      ? { texto: `feito ${diaMes(t.done_at)}`, tom: "ok" }
      : { texto: "feito", tom: "ok" };
  }
  if (!t.due_date) return { texto: "sem prazo", tom: "vazio" };
  const diff = diasEntre(hoje, t.due_date);
  const dia = dataLocal(t.due_date);
  if (diff < 0) return { texto: `venceu ${diaMes(dia)}`, tom: "risco" };
  if (diff === 0) return { texto: "hoje", tom: "atencao" };
  if (diff === 1) return { texto: "amanhã", tom: "neutro" };
  if (diff <= 6) {
    return { texto: `${semanaCurta.format(dia).replace(".", "")} ${diaMes(dia)}`, tom: "neutro" };
  }
  return { texto: diaMes(dia), tom: "neutro" };
}

/** Frase do painel: "Atrasada há 2 dias", "Vence hoje", "Vence amanhã", "Faltam 5 dias". */
export function avisoDoPrazo(t: Pick<Tarefa, "due_date" | "status">, hoje: string): string | null {
  if (!t.due_date || t.status === "pronto") return null;
  const diff = diasEntre(hoje, t.due_date);
  if (diff < 0) return `Atrasada há ${-diff} ${diff === -1 ? "dia" : "dias"}`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `Faltam ${diff} dias`;
}

// ----------------------------------------------------------------------------
// Agrupamento da lista por prazo
// ----------------------------------------------------------------------------

export type GrupoPrazo = "atrasadas" | "hoje" | "semana" | "depois" | "sem_prazo" | "concluidas";

export const rotuloGrupo: Record<GrupoPrazo, string> = {
  atrasadas: "Atrasadas",
  hoje: "Hoje",
  semana: "Esta semana",
  depois: "Depois",
  sem_prazo: "Sem prazo",
  concluidas: "Concluídas nos últimos 7 dias",
};

const ordemGrupos: GrupoPrazo[] = [
  "atrasadas",
  "hoje",
  "semana",
  "depois",
  "sem_prazo",
  "concluidas",
];

export function grupoDoPrazo(
  t: Pick<Tarefa, "due_date" | "status"> & { atrasada?: boolean },
  hoje: string,
): GrupoPrazo {
  if (t.status === "pronto") return "concluidas";
  if (t.atrasada ?? estaAtrasada(t, hoje)) return "atrasadas";
  if (!t.due_date) return "sem_prazo";
  if (t.due_date === hoje) return "hoje";
  if (t.due_date <= somarDias(hoje, 6)) return "semana";
  return "depois";
}

export type Grupo<T> = { id: GrupoPrazo; rotulo: string; itens: T[] };

/** Grupos na ordem da tela, sem os vazios. A ordem dentro do grupo é a que veio do banco. */
export function agruparPorPrazo<
  T extends Pick<Tarefa, "due_date" | "status"> & { atrasada?: boolean },
>(itens: T[], hoje: string): Grupo<T>[] {
  const mapa = new Map<GrupoPrazo, T[]>();
  for (const t of itens) {
    const g = grupoDoPrazo(t, hoje);
    const lista = mapa.get(g);
    if (lista) lista.push(t);
    else mapa.set(g, [t]);
  }
  return ordemGrupos
    .filter((g) => mapa.has(g))
    .map((g) => ({ id: g, rotulo: rotuloGrupo[g], itens: mapa.get(g) ?? [] }));
}

export type LinhaLista<T> =
  | { tipo: "grupo"; id: GrupoPrazo; rotulo: string; total: number }
  | { tipo: "tarefa"; grupo: GrupoPrazo; t: T }
  | { tipo: "concluidas"; total: number; aberto: boolean };

/** Linhas planas para a lista virtualizada. "Concluídas" vira um botão e fica recolhida. */
export function linhasDaLista<T>(grupos: Grupo<T>[], concluidasAbertas: boolean): LinhaLista<T>[] {
  const linhas: LinhaLista<T>[] = [];
  for (const g of grupos) {
    if (g.id === "concluidas") {
      linhas.push({ tipo: "concluidas", total: g.itens.length, aberto: concluidasAbertas });
      if (!concluidasAbertas) continue;
    } else {
      linhas.push({ tipo: "grupo", id: g.id, rotulo: g.rotulo, total: g.itens.length });
    }
    for (const t of g.itens) linhas.push({ tipo: "tarefa", grupo: g.id, t });
  }
  return linhas;
}

/** "Rede Patas › Sistema" · "Interna" · "Hub · card TA-0" */
export function origemDaTarefa(t: TarefaVista): string {
  if (t.projeto) return `${t.cliente?.empresa ?? "Cliente"} › ${t.projeto.nome}`;
  if (t.kind === "hub") return t.card_ref ? `Hub · card ${t.card_ref}` : "Hub";
  return t.area ? `Interna · ${t.area}` : "Interna";
}

// ----------------------------------------------------------------------------
// Atualização local (otimista) das duas telas
// ----------------------------------------------------------------------------

/** Campos que `tarefa_editar` aceita (só os presentes mudam). */
export type CamposTarefa = {
  titulo?: string;
  descricao?: string | null;
  area?: string | null;
  prazo?: string | null;
  prioridade?: PrioridadeTarefa;
  card?: string | null;
  tipo?: Exclude<TipoTarefa, "cliente">;
};

type ComAtrasada = { atrasada?: boolean };

function recalcular<T extends Tarefa>(t: T, hoje: string | null): T {
  if (hoje === null || !("atrasada" in t)) return t;
  return { ...t, atrasada: estaAtrasada(t, hoje) } as T & ComAtrasada;
}

/** Aplica os campos editados numa tarefa (vale para a Central e para o projeto). */
export function ajustarTarefa<T extends Tarefa>(t: T, c: CamposTarefa, hoje: string | null): T {
  const n: T = { ...t };
  if (c.titulo !== undefined) n.title = c.titulo;
  if (c.descricao !== undefined) n.description = c.descricao || null;
  if (c.area !== undefined) n.area = c.area || null;
  if (c.prazo !== undefined) n.due_date = c.prazo || null;
  if (c.prioridade !== undefined) n.priority = c.prioridade;
  if (c.card !== undefined) n.card_ref = c.card || null;
  if (c.tipo !== undefined) n.kind = c.tipo;
  n.updated_at = new Date().toISOString();
  return recalcular(n, hoje);
}

/** Muda a situação: Pronto grava a conclusão, sair de Pronto apaga. */
export function moverLocal<T extends Tarefa>(t: T, s: SituacaoTarefa, hoje: string | null): T {
  const agora = new Date().toISOString();
  const n: T = {
    ...t,
    status: s,
    position: Date.now() / 1000,
    done_at: s === "pronto" ? (t.status === "pronto" ? t.done_at : agora) : null,
    updated_at: agora,
  };
  return recalcular(n, hoje);
}

/** A tarefa entra na lista com estes filtros? (para mostrar uma tarefa nova sem esperar o banco) */
export function combinaComFiltros(t: TarefaVista, f: FiltrosTarefas, hoje: string): boolean {
  if (f.tipo && t.kind !== f.tipo) return false;
  if (f.projeto && t.project_id !== f.projeto) return false;
  if (f.cliente && t.cliente?.id !== f.cliente) return false;
  if (f.prioridade && t.priority !== f.prioridade) return false;
  if (f.situacao && t.status !== f.situacao) return false;
  if (f.prazo === "atrasadas" && !estaAtrasada(t, hoje)) return false;
  if (f.prazo === "hoje" && t.due_date !== hoje) return false;
  if (
    f.prazo === "semana" &&
    !(t.due_date && t.due_date >= hoje && t.due_date <= somarDias(hoje, 6))
  )
    return false;
  return true;
}

/** Tarefa do projeto no formato da Central (para abrir o mesmo painel). */
export function daTarefaDoProjeto(t: Tarefa, d: DetalheProjeto): TarefaVista {
  const pedido = t.request_id ? d.pedidos.find((p) => p.id === t.request_id) : undefined;
  return {
    ...t,
    atrasada: estaAtrasada(t, d.hoje),
    projeto: { id: d.projeto.id, nome: d.projeto.name, situacao: d.projeto.status },
    cliente: { id: d.cliente.id, empresa: d.cliente.empresa },
    pedido: pedido ? { id: pedido.id, codigo: pedido.code, titulo: pedido.title } : null,
  };
}

// ----------------------------------------------------------------------------
// Cache e chamadas
// ----------------------------------------------------------------------------

export const chavesTarefas = {
  tudo: ["tarefas"] as const,
  /** Uma tarefa pelo id (painel aberto mesmo fora do filtro da lista). */
  uma: (id: string) => ["tarefas", "uma", id] as const,
  listas: ["tarefas", "lista"] as const,
  lista: (f: FiltrosTarefas) => ["tarefas", "lista", f] as const,
  resumos: ["tarefas", "resumo"] as const,
  resumo: (f: FiltrosResumo = {}) => ["tarefas", "resumo", f] as const,
};

/** Todos os detalhes de projeto em cache (o quadro do projeto lê daqui). */
export const chaveDetalhesProjeto = ["projetos", "detalhe"] as const;

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const listarTarefas = (f: FiltrosTarefas, limite = 500) =>
  rpc<ListaTarefas>("tarefas_listar", { p_filtros: f, p_limite: limite });

/** Busca uma tarefa pelo id, sem os cortes da lista (pronta antiga, projeto encerrado). */
export async function buscarTarefa(id: string): Promise<TarefaVista | null> {
  const r = await rpc<ListaTarefas>("tarefas_listar", { p_filtros: { id }, p_limite: 1 });
  return r.itens[0] ?? null;
}

export const resumoTarefas = (f: FiltrosResumo = {}) =>
  rpc<ResumoTarefas>("tarefas_resumo", { p_filtros: f });

export type NovaTarefa = {
  titulo: string;
  projetoId?: string | null;
  tipo?: TipoTarefa | null;
  prazo?: string | null;
  prioridade?: PrioridadeTarefa;
  card?: string | null;
  area?: string | null;
  descricao?: string | null;
  ciclo?: number;
};

/** Projeto escolhido ao criar uma tarefa (para o nome aparecer antes da resposta do banco). */
export type ProjetoOpcao = { id: string; nome: string; clienteId: string; empresa: string };

type Opcao = { id: string; rotulo: string };

/**
 * Opções dos filtros Cliente e Projeto: projetos ativos mais os que aparecem na lista
 * (para um filtro vindo de outra tela continuar com nome). Projeto respeita o cliente escolhido.
 */
export function opcoesDosFiltros(
  projetos: ProjetoOpcao[],
  itens: TarefaVista[],
  b: Pick<BuscaTarefas, "cliente" | "projeto">,
): { clientes: Opcao[]; projetos: Opcao[] } {
  const todos = new Map<string, ProjetoOpcao>();
  for (const p of projetos) todos.set(p.id, p);
  for (const t of itens) {
    if (t.projeto && t.cliente && !todos.has(t.projeto.id)) {
      todos.set(t.projeto.id, {
        id: t.projeto.id,
        nome: t.projeto.nome,
        clienteId: t.cliente.id,
        empresa: t.cliente.empresa,
      });
    }
  }
  const clientes = new Map<string, string>();
  for (const p of todos.values()) clientes.set(p.clienteId, p.empresa);
  if (b.cliente && !clientes.has(b.cliente)) clientes.set(b.cliente, "Cliente escolhido");
  const lista = [...todos.values()].filter((p) => !b.cliente || p.clienteId === b.cliente);
  const projetosOp = lista.map((p) => ({
    id: p.id,
    rotulo: b.cliente ? p.nome : `${p.empresa} › ${p.nome}`,
  }));
  if (b.projeto && !todos.has(b.projeto))
    projetosOp.push({ id: b.projeto, rotulo: "Projeto escolhido" });
  const ordem = (a: Opcao, c: Opcao) => a.rotulo.localeCompare(c.rotulo, "pt-BR");
  return {
    clientes: [...clientes].map(([id, rotulo]) => ({ id, rotulo })).sort(ordem),
    projetos: projetosOp.sort(ordem),
  };
}

/** Tarefa provisória (aparece na hora; o banco devolve a definitiva). */
export function tarefaProvisoria(
  v: NovaTarefa,
  p: ProjetoOpcao | null,
  hoje: string,
): Omit<TarefaVista, "id"> {
  const agora = new Date().toISOString();
  const base: Omit<TarefaVista, "id"> = {
    project_id: p?.id ?? null,
    request_id: null,
    cycle: v.ciclo ?? 1,
    area: v.area || null,
    title: v.titulo,
    description: v.descricao || null,
    status: "a_fazer",
    position: Date.now() / 1000,
    kind: p ? "cliente" : v.tipo === "hub" ? "hub" : "interna",
    priority: v.prioridade ?? "normal",
    due_date: v.prazo || null,
    assignee_id: null,
    done_at: null,
    card_ref: v.card || null,
    created_at: agora,
    updated_at: agora,
    atrasada: false,
    projeto: p ? { id: p.id, nome: p.nome, situacao: "andamento" } : null,
    cliente: p ? { id: p.clienteId, empresa: p.empresa } : null,
    pedido: null,
  };
  return { ...base, atrasada: estaAtrasada(base, hoje) };
}

export const criarTarefaCentral = (v: NovaTarefa) =>
  rpc<TarefaVista>("tarefa_criar", {
    p_titulo: v.titulo,
    p_projeto: v.projetoId ?? null,
    p_area: v.area || null,
    p_descricao: v.descricao || null,
    // Sem ciclo informado, o banco usa o ciclo atual do projeto (o maior).
    p_ciclo: v.ciclo,
    p_tipo: v.projetoId ? null : (v.tipo ?? null),
    p_prazo: v.prazo || null,
    p_prioridade: v.prioridade ?? "normal",
    p_card: v.card || null,
  });

export const editarTarefa = (id: string, campos: CamposTarefa) =>
  rpc<TarefaVista>("tarefa_editar", { p_id: id, p_campos: campos });

export const moverTarefaCentral = (id: string, s: SituacaoTarefa) =>
  rpc<TarefaVista>("tarefa_mover", { p_id: id, p_situacao: s });

export const removerTarefaCentral = (id: string) => rpc<Tarefa>("tarefa_remover", { p_id: id });

export function mensagemDaTarefa(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    titulo_obrigatorio: "Dê um título à tarefa (pelo menos 2 letras).",
    tarefa_inexistente: "Essa tarefa não existe mais. Recarregue a página.",
    tipo_invalido: "Tarefa com projeto é sempre de cliente; sem projeto, é interna ou do Hub.",
    prioridade_invalida: "Escolha Alta, Normal ou Baixa.",
    campos_invalidos: "Confira os dados: a data do prazo parece inválida.",
    filtros_invalidos: "Esses filtros não valem mais. Limpe os filtros e tente de novo.",
    projeto_inexistente: "Esse projeto não existe mais. Recarregue a página.",
    pedido_inexistente: "Esse pedido de ajuste não existe mais.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
