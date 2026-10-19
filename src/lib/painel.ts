import { supabase } from "@/lib/supabase";

/** Painel: novidades vindas do cliente e do site, e números de fechamento (REV-1). */
export type Novidade = {
  tipo:
    | "proposta_vista"
    | "proposta_aceita"
    | "proposta_recusada"
    | "pedido_do_site"
    | "aprovacao_aprovada"
    | "aprovacao_ajuste"
    | "adicional_aprovado"
    | "adicional_recusado"
    | "pendencia_feita"
    | "pedido_recebido"
    | "pagamento_avisado"
    | "arquivo_enviado";
  quando: string;
  client_id: string;
  project_id?: string | null;
  empresa: string;
  detalhe: Record<string, unknown>;
};

export type NovidadesPainel = {
  novidades: Novidade[];
  fechado_mes_cents: number;
  fechados_mes: number;
  propostas_aguardando: number;
  propostas_aguardando_cents: number;
  propostas_vistas: number;
  falhas_site: number;
  pedidos_novos: number;
};

export type ItemFila = {
  tipo:
    | "pagamento_avisado"
    | "cobranca_atrasada"
    | "adicional_aprovado"
    | "parcela_sem_data"
    | "adicional_pago_recusado";
  id: string;
  empresa: string;
  client_id: string;
  titulo: string;
  valor_cents: number | null;
  quando: string;
  dias?: number;
};
export type FilaPainel = { total: number; itens: ItemFila[] };

export const chavesPainel = {
  novidades: ["painel", "novidades"] as const,
  fila: ["painel", "fila"] as const,
};

/** O que precisa do Yuri fora do funil: dinheiro e serviços adicionais (REV-3). */
export async function filaDoPainel(): Promise<FilaPainel> {
  const { data, error } = await supabase.rpc("painel_fila");
  if (error) throw error;
  return data as FilaPainel;
}

export async function novidadesDoPainel(): Promise<NovidadesPainel> {
  const { data, error } = await supabase.rpc("painel_novidades");
  if (error) throw error;
  return data as NovidadesPainel;
}

export type EntregaAtencao = {
  id: string;
  nome: string;
  empresa: string;
  lancamento: string | null;
  saude: import("@/lib/projetos").Saude;
};

export const chavesEntregas = ["painel", "entregas"] as const;

export async function entregasDoPainel(): Promise<EntregaAtencao[]> {
  const { data, error } = await supabase.rpc("painel_entregas");
  if (error) throw error;
  return (data ?? []) as EntregaAtencao[];
}
