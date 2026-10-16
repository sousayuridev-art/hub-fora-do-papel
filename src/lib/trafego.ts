import { supabase } from "@/lib/supabase";

/** Tráfego pago (card S5): tipos, chaves e acesso. Todas as contas vêm de trafego_painel. */

export type Plataforma = "google" | "meta";
export type Periodo = "mes" | "3meses" | "ano";

export const rotuloPlataforma: Record<Plataforma, string> = {
  google: "Google (busca)",
  meta: "Instagram e Facebook",
};

export const periodos: { id: Periodo; rotulo: string }[] = [
  { id: "mes", rotulo: "Este mês" },
  { id: "3meses", rotulo: "3 meses" },
  { id: "ano", rotulo: "Ano" },
];

export type CampanhaPainel = {
  id: string;
  nome: string;
  plataforma: Plataforma;
  ativa: boolean;
  investido_cents: number;
  contatos: number;
  diagnosticos: number;
  fechados: number;
  custo_contato_cents: number | null;
  pct_diagnostico: number | null;
};

export type PainelTrafego = {
  periodo: { id: Periodo; inicio: string; fim: string };
  orcamento: {
    mensal_cents: number;
    google_cents: number;
    meta_cents: number;
    gasto_cents: number;
    gasto_google_cents: number;
    gasto_meta_cents: number;
    dia: number;
    dias_no_mes: number;
    mes: string;
  };
  indicadores: {
    investido_cents: number;
    cliques: number | null;
    contatos: number;
    diagnosticos: number;
    propostas: number;
    fechados: number;
    valor_fechado_cents: number;
    receita_diagnosticos_cents: number;
    custo_contato_cents: number | null;
    custo_diagnostico_cents: number | null;
    retorno: number | null;
  };
  por_plataforma: {
    plataforma: Plataforma;
    investido_cents: number;
    contatos: number;
    diagnosticos: number;
    custo_contato_cents: number | null;
    custo_diagnostico_cents: number | null;
  }[];
  campanhas: CampanhaPainel[];
  sem_campanha: { contatos: number; diagnosticos: number; fechados: number };
  retorno: {
    mes: string;
    investido_cents: number;
    contatos: number;
    fechados: number;
    valor_fechado_cents: number;
    retorno: number | null;
  }[];
  investimentos: {
    id: string;
    data: string;
    plataforma: Plataforma;
    campanha_id: string;
    campanha: string;
    valor_cents: number;
    cliques: number | null;
    nota: string | null;
  }[];
};

export const chavesTrafego = {
  tudo: ["trafego"] as const,
  painel: (p: Periodo) => ["trafego", "painel", p] as const,
  campanhas: ["trafego", "campanhas"] as const,
};

export async function painelTrafego(periodo: Periodo): Promise<PainelTrafego> {
  const { data, error } = await supabase.rpc("trafego_painel", { p_periodo: periodo });
  if (error) throw error;
  return data as PainelTrafego;
}

/** Nomes das campanhas (para sugerir em "Qual anúncio"). */
export async function nomesDeCampanhas(): Promise<{ name: string; platform: Plataforma }[]> {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("name, platform")
    .order("name");
  if (error) throw error;
  return (data ?? []) as { name: string; platform: Plataforma }[];
}

export async function registrarInvestimento(v: {
  campanha: string;
  data: string;
  valorCents: number;
  cliques: number | null;
  nota: string;
}) {
  const { error } = await supabase.rpc("trafego_registrar", {
    p_campanha: v.campanha,
    p_data: v.data,
    p_valor_cents: v.valorCents,
    p_cliques: v.cliques,
    p_nota: v.nota || null,
  });
  if (error) throw error;
}

export async function removerInvestimento(id: string) {
  const { error } = await supabase.rpc("trafego_remover", { p_id: id });
  if (error) throw error;
}

export async function salvarCampanha(v: {
  id: string | null;
  nome: string;
  plataforma: Plataforma;
  ativa: boolean;
}) {
  const { error } = await supabase.rpc("trafego_campanha_salvar", {
    p_id: v.id,
    p_nome: v.nome,
    p_plataforma: v.plataforma,
    p_ativa: v.ativa,
  });
  if (error) throw error;
}

export async function salvarOrcamento(googleCents: number, metaCents: number) {
  const { error } = await supabase.rpc("trafego_orcamento_salvar", {
    p_google_cents: googleCents,
    p_meta_cents: metaCents,
  });
  if (error) throw error;
}

export function mensagemDoTrafego(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    campanha_repetida: "Já existe uma campanha com esse nome.",
    nome_da_campanha: "Dê um nome à campanha (pelo menos 2 letras).",
    valor_invalido: "Informe um valor maior que zero.",
    data_invalida: "Confira a data: não pode ser no futuro.",
    campanha_inexistente: "Essa campanha não existe mais. Recarregue a página.",
    investimento_inexistente: "Esse investimento já foi removido.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
