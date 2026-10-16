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
    | "pedido_recebido";
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

export const chavesPainel = { novidades: ["painel", "novidades"] as const };

export async function novidadesDoPainel(): Promise<NovidadesPainel> {
  const { data, error } = await supabase.rpc("painel_novidades");
  if (error) throw error;
  return data as NovidadesPainel;
}
