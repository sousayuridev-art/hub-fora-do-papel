import { supabase } from "@/lib/supabase";

/** Preços da agência (Configurações › Preços, card S2). */

export type Precos = {
  hour_cents: number;
  floor_cents: number;
  diag_essencial_cents: number;
  diag_essencial_hours: number;
  diag_ampliado_cents: number;
  diag_ampliado_hours: number;
  diag_credit_days: number;
  split_threshold_cents: number;
  pay_pix: boolean;
  pay_boleto: boolean;
  pay_card: boolean;
  late_fee_pct: number;
  interest_pct: number;
  validity_days: number;
  adjustment_index: "IPCA" | "IGP-M" | "nenhum";
  infra_at_cost: boolean;
  updated_at: string;
  /** Quando o Yuri salvou os preços pela última vez. Vazio = nunca conferidos (propostas não saem). */
  confirmed_at: string | null;
};

export type PlanoPreco = {
  id: string;
  name: string;
  hours_month: number;
  price_cents: number;
  min_months: number;
  position: number;
  active: boolean;
};

export type DadosPrecos = { precos: Precos; planos: PlanoPreco[] };

export const chavesPrecos = { tudo: ["precos"] as const };

export async function lerPrecos(): Promise<DadosPrecos> {
  const { data, error } = await supabase.rpc("precos_ler");
  if (error) throw error;
  return data as DadosPrecos;
}

export async function salvarPrecos(
  precos: Partial<Precos>,
  planos: PlanoPreco[],
): Promise<DadosPrecos> {
  const { data, error } = await supabase.rpc("precos_salvar", {
    p_campos: precos,
    p_planos: planos.map((p) => ({
      id: p.id,
      hours_month: p.hours_month,
      price_cents: p.price_cents,
      min_months: p.min_months,
      active: p.active,
    })),
  });
  if (error) throw error;
  return data as DadosPrecos;
}
