import { supabase } from "@/lib/supabase";

/** Projetos (card S3): tipos, chaves e chamadas. Contas (horas, semana, pendências) vêm do banco. */

export type SituacaoProjeto = "andamento" | "mensalidade" | "concluido";
export type SituacaoFase = "pendente" | "andamento" | "concluida";
export type SituacaoTarefa = "a_fazer" | "fazendo" | "para_aprovar" | "pronto";
export type SituacaoAprovacao = "aguardando" | "aprovada" | "ajuste" | "cancelada";

export const rotuloSituacaoProjeto: Record<SituacaoProjeto, string> = {
  andamento: "Em andamento",
  mensalidade: "Em mensalidade",
  concluido: "Concluídos",
};

/** Situação de um projeto só (selos). */
export const rotuloProjeto: Record<SituacaoProjeto, string> = {
  andamento: "Em andamento",
  mensalidade: "Em mensalidade",
  concluido: "Concluído",
};

export const colunasTarefa: { id: SituacaoTarefa; rotulo: string; cor: string }[] = [
  { id: "a_fazer", rotulo: "A fazer", cor: "bg-[#9A9DA3]" },
  { id: "fazendo", rotulo: "Fazendo", cor: "bg-[#1E3FA8]" },
  { id: "para_aprovar", rotulo: "Para aprovar", cor: "bg-[#D48A00]" },
  { id: "pronto", rotulo: "Pronto", cor: "bg-[#145A37]" },
];

export type FaseResumo = {
  id: string;
  nome: string;
  quando: string | null;
  status: SituacaoFase;
  concluida_em: string | null;
};

export type ProjetoResumo = {
  id: string;
  nome: string;
  status: SituacaoProjeto;
  client_id: string;
  empresa: string;
  contato: string | null;
  lancamento: string | null;
  dias_para_lancar: number | null;
  horas_estimadas: number;
  minutos_usados: number;
  valor_cents: number;
  plano: string | null;
  mensal_cents: number | null;
  fases: FaseResumo[] | null;
  aguardando_cliente: number;
  pendencias_atrasadas: number;
  checklist: { feitos: number; total: number };
  lancado_em: string | null;
};

export type ListaProjetos = {
  contagem: { andamento: number; mensalidade: number; concluido: number; contratado_cents: number };
  proximo_lancamento: { nome: string; data: string } | null;
  semana: {
    inicio: string;
    fim: string;
    total_minutos: number;
    itens: { projeto_id: string; empresa: string; projeto: string; minutos: number }[];
  };
  projetos: ProjetoResumo[];
};

export type Fase = {
  id: string;
  position: number;
  name: string;
  due_label: string | null;
  status: SituacaoFase;
  started_at: string | null;
  completed_at: string | null;
};

export type Aprovacao = {
  id: string;
  phase_id: string | null;
  title: string;
  description: string | null;
  items: string[];
  preview_url: string | null;
  status: SituacaoAprovacao;
  sent_at: string;
  decided_at: string | null;
  decision_note: string | null;
};

export type PendenciaCliente = {
  id: string;
  title: string;
  detail: string | null;
  due_date: string | null;
  status: "aberta" | "feita";
  done_at: string | null;
};

export type Tarefa = {
  id: string;
  project_id: string;
  request_id: string | null;
  cycle: number;
  area: string | null;
  title: string;
  description: string | null;
  status: SituacaoTarefa;
  position: number;
};

export type LancamentoHoras = {
  id: string;
  worked_on: string;
  minutes: number;
  note: string | null;
  created_at: string;
};

export type ItemEncerramento = { id: string; position: number; title: string; done: boolean };

export type EventoProjeto = {
  tipo: string;
  quando: string;
  detalhe: Record<string, unknown>;
  origem: "hub" | "cliente";
};

export type DetalheProjeto = {
  projeto: {
    id: string;
    client_id: string;
    deal_id: string | null;
    proposal_id: string | null;
    name: string;
    status: SituacaoProjeto;
    launch_date: string | null;
    hours_estimated: number;
    value_cents: number;
    plan_name: string | null;
    monthly_cents: number | null;
    started_at: string;
    launched_at: string | null;
  };
  hoje: string;
  cliente: {
    id: string;
    empresa: string;
    contato: string | null;
    whatsapp: string | null;
    email: string | null;
  };
  proposta: { id: string; aceita_em: string | null } | null;
  minutos_usados: number;
  fases: Fase[];
  aprovacoes: Aprovacao[];
  pendencias: PendenciaCliente[];
  tarefas: Tarefa[];
  pedidos: import("@/lib/pedidos").Pedido[];
  horas: LancamentoHoras[];
  checklist: ItemEncerramento[];
  linha: EventoProjeto[];
};

export const chavesProjetos = {
  tudo: ["projetos"] as const,
  lista: (s: SituacaoProjeto) => ["projetos", "lista", s] as const,
  detalhe: (id: string) => ["projetos", "detalhe", id] as const,
  doCliente: (clienteId: string) => ["projetos", "do-cliente", clienteId] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const listarProjetos = (s: SituacaoProjeto) =>
  rpc<ListaProjetos>("projetos_lista", { p_situacao: s });
export const detalheProjeto = (id: string) => rpc<DetalheProjeto>("projeto_detalhe", { p_id: id });

export async function projetosDoCliente(clienteId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, launch_date, launched_at")
    .eq("client_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    name: string;
    status: SituacaoProjeto;
    launch_date: string | null;
    launched_at: string | null;
  }[];
}

export const criarProjeto = (v: {
  clienteId: string;
  nome: string;
  valorCents: number;
  horas: number;
  lancamento: string | null;
}) =>
  rpc<{ id: string }>("projeto_criar", {
    p_cliente: v.clienteId,
    p_nome: v.nome,
    p_valor_cents: v.valorCents,
    p_horas: v.horas,
    p_lancamento: v.lancamento,
  });

export const atualizarProjeto = (id: string, campos: Record<string, unknown>) =>
  rpc("projeto_atualizar", { p_id: id, p_campos: campos });
export const concluirFase = (faseId: string) => rpc("projeto_fase_concluir", { p_fase: faseId });

export const pedirAprovacao = (v: {
  projetoId: string;
  titulo: string;
  descricao: string;
  itens: string[];
  previa: string;
  faseId: string | null;
}) =>
  rpc<{ id: string }>("aprovacao_pedir", {
    p_projeto: v.projetoId,
    p_titulo: v.titulo,
    p_descricao: v.descricao || null,
    p_itens: v.itens,
    p_previa: v.previa || null,
    p_fase: v.faseId,
  });
export const cancelarAprovacao = (id: string) => rpc("aprovacao_cancelar", { p_id: id });

export const criarPendencia = (v: {
  projetoId: string;
  titulo: string;
  detalhe: string;
  prazo: string | null;
}) =>
  rpc<{ id: string }>("pendencia_criar", {
    p_projeto: v.projetoId,
    p_titulo: v.titulo,
    p_detalhe: v.detalhe || null,
    p_prazo: v.prazo,
  });
export const marcarPendencia = (id: string, feita: boolean) =>
  rpc("pendencia_marcar", { p_id: id, p_feita: feita });
export const removerPendencia = (id: string) => rpc("pendencia_remover", { p_id: id });

export const criarTarefa = (v: {
  projetoId: string;
  titulo: string;
  area: string;
  descricao: string;
  ciclo: number;
}) =>
  rpc<Tarefa>("tarefa_criar", {
    p_projeto: v.projetoId,
    p_titulo: v.titulo,
    p_area: v.area || null,
    p_descricao: v.descricao || null,
    p_ciclo: v.ciclo,
  });
export const moverTarefa = (id: string, situacao: SituacaoTarefa) =>
  rpc<Tarefa>("tarefa_mover", { p_id: id, p_situacao: situacao });
export const removerTarefa = (id: string) => rpc<Tarefa>("tarefa_remover", { p_id: id });

export const lancarHoras = (v: { projetoId: string; dia: string; minutos: number; nota: string }) =>
  rpc<LancamentoHoras>("horas_lancar", {
    p_projeto: v.projetoId,
    p_dia: v.dia,
    p_minutos: v.minutos,
    p_nota: v.nota || null,
  });
export const removerHoras = (id: string) => rpc("horas_remover", { p_id: id });

export const marcarEncerramento = (id: string, feito: boolean) =>
  rpc("encerramento_marcar", { p_item: id, p_feito: feito });
export const criarItemEncerramento = (projetoId: string, titulo: string) =>
  rpc("encerramento_item_criar", { p_projeto: projetoId, p_titulo: titulo });
export const lancarProjeto = (id: string) =>
  rpc<{ status: SituacaoProjeto }>("projeto_lancar", { p_id: id });

/** "90" → "1h30"; "60" → "1h"; "30" → "30 min". */
export function horasMin(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Fase atual (a primeira em andamento) e posição "3 de 6". */
export function faseAtual<T extends { status: SituacaoFase }>(fases: T[]) {
  const i = fases.findIndex((f) => f.status === "andamento");
  return i < 0 ? null : { fase: fases[i] as T, numero: i + 1, total: fases.length };
}

export function mensagemDoProjeto(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    fase_aguardando_cliente:
      "Esta fase espera a aprovação do cliente. Ela conclui sozinha quando ele aprovar.",
    checklist_incompleto: "Marque todos os itens do encerramento antes de lançar.",
    projeto_ja_lancado: "Este projeto já foi lançado.",
    horas_invalidas: "Informe entre 1 minuto e 24 horas.",
    data_invalida: "Confira a data: não pode ser no futuro nem há mais de um ano.",
    previa_invalida: "O link da prévia precisa começar com https://.",
    titulo_obrigatorio: "Dê um título (pelo menos 2 letras).",
    nome_do_projeto: "Dê um nome ao projeto (pelo menos 2 letras).",
    aprovacao_ja_decidida: "O cliente já respondeu esta aprovação.",
    itens_demais: "O encerramento aceita até 20 itens.",
    projeto_inexistente: "Esse projeto não existe mais. Recarregue a página.",
    cliente_inexistente: "Esse cliente não existe mais.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
