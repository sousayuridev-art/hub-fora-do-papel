import { supabase } from "@/lib/supabase";

/** Pedidos de ajuste (card S3). Valor do serviço adicional é calculado no banco. */

export type SituacaoPedido =
  "recebido" | "em_analise" | "aguardando_cliente" | "fazendo" | "pronto" | "recusado";
export type Classificacao = "escopo" | "mensalidade" | "adicional";
export type Origem = "portal" | "whatsapp" | "reuniao" | "hub";

export type Pedido = {
  id: string;
  client_id: string;
  project_id: string | null;
  code: string;
  title: string;
  description: string | null;
  origin: Origem;
  status: SituacaoPedido;
  classification: Classificacao | null;
  hours_estimated: number | null;
  value_cents: number | null;
  owner_note: string | null;
  client_decision: "aprovado" | "recusado" | null;
  decided_at: string | null;
  decision_note?: string | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PedidoLinha = Pedido & {
  company_name: string;
  contact_name: string | null;
  project_name: string | null;
};

export type ResumoPedidos = {
  todos: number;
  recebido: number;
  andamento: number;
  aguardando_cliente: number;
  concluidos: number;
  adicional_aprovado_cents: number;
};

export type AbaPedidos = "todos" | "recebido" | "andamento" | "aguardando_cliente" | "concluidos";

export const abasPedidos: { id: AbaPedidos; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "recebido", rotulo: "Novos" },
  { id: "andamento", rotulo: "Em andamento" },
  { id: "aguardando_cliente", rotulo: "Aguardando o cliente" },
  { id: "concluidos", rotulo: "Concluídos" },
];

export const situacoesDaAba: Record<AbaPedidos, SituacaoPedido[] | null> = {
  todos: null,
  recebido: ["recebido"],
  andamento: ["em_analise", "fazendo"],
  aguardando_cliente: ["aguardando_cliente"],
  concluidos: ["pronto", "recusado"],
};

export const rotuloSituacaoPedido: Record<SituacaoPedido, string> = {
  recebido: "Novo",
  em_analise: "Em análise",
  aguardando_cliente: "Aguardando o cliente",
  fazendo: "Fazendo",
  pronto: "Pronto",
  recusado: "Recusado",
};

export const rotuloClassificacao: Record<Classificacao, string> = {
  escopo: "Dentro do combinado",
  mensalidade: "Horas da mensalidade",
  adicional: "Serviço adicional",
};

export const rotuloOrigem: Record<Origem, string> = {
  portal: "Portal",
  whatsapp: "WhatsApp",
  reuniao: "Reunião",
  hub: "Hub",
};

export const tomSituacaoPedido: Record<
  SituacaoPedido,
  "neutro" | "info" | "atencao" | "risco" | "ok"
> = {
  recebido: "atencao",
  em_analise: "neutro",
  aguardando_cliente: "info",
  fazendo: "info",
  pronto: "ok",
  recusado: "risco",
};

/** O que o Yuri faz em seguida com o pedido. */
export function proximoPasso(p: Pedido): string {
  if (p.status === "recebido") return "Classificar";
  if (p.status === "em_analise") {
    if (p.classification === "adicional")
      return p.client_decision === "aprovado" ? "Iniciar" : "Enviar ao cliente";
    return "Iniciar";
  }
  if (p.status === "aguardando_cliente") return "Esperar a decisão";
  if (p.status === "fazendo") return "Concluir";
  return "—";
}

export const chavesPedidos = {
  tudo: ["pedidos"] as const,
  lista: ["pedidos", "lista"] as const,
  resumo: ["pedidos", "resumo"] as const,
};

export async function listarPedidos(): Promise<PedidoLinha[]> {
  const { data, error } = await supabase
    .from("v_pedidos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as PedidoLinha[];
}

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const resumoPedidos = () => rpc<ResumoPedidos>("pedidos_resumo");

export const registrarPedido = (v: {
  clienteId: string;
  titulo: string;
  descricao: string;
  origem: Exclude<Origem, "portal">;
  projetoId: string | null;
}) =>
  rpc<{ id: string; codigo: string }>("pedido_registrar", {
    p_cliente: v.clienteId,
    p_titulo: v.titulo,
    p_descricao: v.descricao || null,
    p_origem: v.origem,
    p_projeto: v.projetoId,
  });

export const classificarPedido = (v: {
  id: string;
  classificacao: Classificacao;
  horas: number;
  nota: string;
}) =>
  rpc<Pedido>("pedido_classificar", {
    p_id: v.id,
    p_classificacao: v.classificacao,
    p_horas: v.horas,
    p_nota: v.nota || null,
  });
export const enviarAoCliente = (id: string) => rpc<Pedido>("pedido_enviar_cliente", { p_id: id });
export const iniciarPedido = (id: string) => rpc<Pedido>("pedido_iniciar", { p_id: id });
export const concluirPedido = (id: string) => rpc<Pedido>("pedido_concluir", { p_id: id });
export const recusarPedido = (id: string, motivo: string) =>
  rpc<Pedido>("pedido_recusar", { p_id: id, p_motivo: motivo });

export function mensagemDoPedido(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    adicional_sem_aprovacao: "O serviço adicional só começa depois que o cliente aprovar.",
    pedido_ja_andando: "Esse pedido já está andando; não dá para reclassificar.",
    horas_obrigatorias: "Informe as horas do serviço adicional.",
    classifique_antes: "Classifique o pedido antes de iniciar.",
    pedido_nao_e_adicional: "Só serviço adicional vai para o cliente decidir.",
    pedido_nao_esta_fazendo: "Inicie o pedido antes de concluir.",
    motivo_obrigatorio: "Explique o motivo (pelo menos 5 letras).",
    pedido_encerrado: "Esse pedido já foi encerrado.",
    titulo_obrigatorio: "Dê um título ao pedido (pelo menos 2 letras).",
    pedido_inexistente: "Esse pedido não existe mais. Recarregue a página.",
    cliente_inexistente: "Escolha um cliente.",
    requests_adicional_aprovado: "O serviço adicional só começa depois que o cliente aprovar.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
