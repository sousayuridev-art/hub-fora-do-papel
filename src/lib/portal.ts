import { supabase } from "@/lib/supabase";
import type { SituacaoFase, SituacaoProjeto } from "@/lib/projetos";
import type { SituacaoPedido } from "@/lib/pedidos";

/** Portal do cliente (card S3): tudo pelas RPCs portal_*, que só devolvem a empresa de quem entrou. */

export type PendenciasDoPortal = {
  aprovacoes: number;
  pendencias: number;
  total: number;
  pedidos_andamento: number;
};

export type AcaoPortal =
  | { tipo: "aprovacao"; id: string; titulo: string; quando: string }
  | { tipo: "adicional"; id: string; titulo: string; valor_cents: number | null; quando: string }
  | {
      tipo: "pendencia";
      id: string;
      titulo: string;
      detalhe: string | null;
      prazo: string | null;
      atrasada: boolean | null;
    };

export type InicioPortal = {
  empresa: string;
  contato: string | null;
  responsavel: string | null;
  hoje: string;
  pendencias: PendenciasDoPortal;
  projeto: {
    id: string;
    nome: string;
    status: SituacaoProjeto;
    lancamento: string | null;
    plano: string | null;
    mensal_cents: number | null;
    fases: {
      nome: string;
      quando: string | null;
      status: SituacaoFase;
      concluida_em: string | null;
    }[];
  } | null;
  acoes: AcaoPortal[];
};

export type EntregaPortal = {
  id: string;
  titulo: string;
  descricao: string | null;
  itens: string[];
  previa: string | null;
  status: "aguardando" | "aprovada" | "ajuste";
  enviada_em: string;
  decidida_em: string | null;
  comentario: string | null;
  fase: string | null;
  projeto: string | null;
};

export type AdicionalPortal = {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  nota: string | null;
  horas: number | null;
  valor_cents: number | null;
  hora_cents: number;
  status: SituacaoPedido;
  decisao: "aprovado" | "recusado" | null;
  decidido_em: string | null;
};

export type AprovacoesPortal = {
  pode_aprovar: boolean;
  entregas: EntregaPortal[];
  adicionais: AdicionalPortal[];
};

export type PedidoPortal = {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  status: SituacaoPedido;
  classificacao: "escopo" | "mensalidade" | "adicional" | null;
  horas: number | null;
  valor_cents: number | null;
  nota: string | null;
  decisao: "aprovado" | "recusado" | null;
  criado_em: string;
  pronto_em: string | null;
};

export const chavesPortal = {
  tudo: ["portal"] as const,
  pendencias: ["portal", "pendencias"] as const,
  inicio: ["portal", "inicio"] as const,
  aprovacoes: ["portal", "aprovacoes"] as const,
  pedidos: ["portal", "pedidos"] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const pendenciasDoPortal = () => rpc<PendenciasDoPortal>("portal_pendencias");
export const inicioDoPortal = () => rpc<InicioPortal>("portal_inicio");
export const aprovacoesDoPortal = () => rpc<AprovacoesPortal>("portal_aprovacoes");
export const pedidosDoPortal = () => rpc<PedidoPortal[]>("portal_pedidos");

export const aprovarEntrega = (id: string, comentario: string) =>
  rpc<{ repetido: boolean }>("portal_aprovar", { p_id: id, p_comentario: comentario || null });
export const pedirAjuste = (id: string, comentario: string) =>
  rpc("portal_pedir_ajuste", { p_id: id, p_comentario: comentario });
export const decidirAdicional = (id: string, aprova: boolean, comentario: string) =>
  rpc<{ repetido: boolean }>("portal_adicional_decidir", {
    p_id: id,
    p_aprova: aprova,
    p_comentario: comentario || null,
  });
export const marcarPendenciaFeita = (id: string) => rpc("portal_pendencia_feita", { p_id: id });
export const fazerPedido = (titulo: string, descricao: string) =>
  rpc<{ id: string; codigo: string }>("portal_pedido_criar", {
    p_titulo: titulo,
    p_descricao: descricao || null,
  });

/** Etapa atual (0 a 4); -1 quando recusado. Depois do sim, o adicional já conta como "Fazendo". */
export function etapaDoPedido(
  p: Pick<PedidoPortal, "status" | "classificacao" | "decisao">,
): number {
  switch (p.status) {
    case "recebido":
      return 0;
    case "em_analise":
      return p.decisao === "aprovado" ? 3 : 1;
    case "aguardando_cliente":
      return 2;
    case "fazendo":
      return 3;
    case "pronto":
      return 4;
    case "recusado":
      return -1;
  }
}

export function mensagemDoPortal(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    aprovacao_ja_decidida: "Essa entrega já foi respondida.",
    sem_permissao_aprovar: "Seu acesso não permite aprovar. Peça a quem aprova na sua empresa.",
    comentario_obrigatorio: "Conte o que precisa mudar (pelo menos 5 letras).",
    pedido_indisponivel: "Esse pedido não está mais esperando sua decisão.",
    muitas_tentativas: "Você já fez muitos pedidos hoje. Fale com o seu responsável pelo WhatsApp.",
    titulo_obrigatorio: "Escreva o que você precisa (pelo menos 2 letras).",
    aprovacao_inexistente: "Essa entrega não está mais disponível.",
    pendencia_inexistente: "Essa pendência não está mais disponível.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
