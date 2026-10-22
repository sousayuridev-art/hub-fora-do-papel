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

/** Números de um trecho de datas (topo da tela). */
export type NumerosTrecho = {
  inicio: string;
  fim: string;
  investido_cents: number;
  contatos: number;
  diagnosticos: number;
  custo_contato_cents: number | null;
  custo_diagnostico_cents: number | null;
};

/** trafego_tendencia (RD-6): período atual, anterior, variação e 8 semanas. */
export type TendenciaTrafego = {
  periodo: { id: Periodo; inicio: string; fim: string };
  atual: NumerosTrecho;
  anterior: NumerosTrecho;
  variacao: {
    contatos: number;
    custo_contato_cents: number | null;
    custo_diagnostico_cents: number | null;
  };
  semanas: {
    inicio: string;
    fim: string;
    google_cents: number;
    meta_cents: number;
    contatos: number;
    custo_contato_cents: number | null;
  }[];
  /** Só existe quando houver um limite configurado; hoje vem sempre vazio. */
  limite_custo_contato_cents: number | null;
};

export type Lancamento = PainelTrafego["investimentos"][number];

/** trafego_lancamentos (RD-6): uma página da lista de investimentos. */
export type PaginaLancamentos = {
  total: number;
  total_cents: number;
  pagina: number;
  por_pagina: number;
  itens: Lancamento[];
};

export const porPaginaLancamentos = 20;

export const chavesTrafego = {
  tudo: ["trafego"] as const,
  painel: (p: Periodo) => ["trafego", "painel", p] as const,
  tendencia: (p: Periodo) => ["trafego", "tendencia", p] as const,
  lancamentosTodos: ["trafego", "lancamentos"] as const,
  lancamentos: (p: Periodo, campanha: string | null, pagina: number) =>
    ["trafego", "lancamentos", p, campanha, pagina] as const,
  campanhas: ["trafego", "campanhas"] as const,
};

export async function painelTrafego(periodo: Periodo): Promise<PainelTrafego> {
  const { data, error } = await supabase.rpc("trafego_painel", { p_periodo: periodo });
  if (error) throw error;
  return data as PainelTrafego;
}

export async function tendenciaTrafego(periodo: Periodo): Promise<TendenciaTrafego> {
  const { data, error } = await supabase.rpc("trafego_tendencia", { p_periodo: periodo });
  if (error) throw error;
  return data as TendenciaTrafego;
}

export async function lancamentosTrafego(
  periodo: Periodo,
  campanha: string | null,
  pagina: number,
): Promise<PaginaLancamentos> {
  const { data, error } = await supabase.rpc("trafego_lancamentos", {
    p_periodo: periodo,
    p_campanha: campanha,
    p_pagina: pagina,
    p_por_pagina: porPaginaLancamentos,
  });
  if (error) throw error;
  return data as PaginaLancamentos;
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

// ---------------------------------------------------------------------
// Textos da tela (RD-6). Só formatação: os números chegam prontos do banco.
// ---------------------------------------------------------------------

const nomeMesFmt = new Intl.DateTimeFormat("pt-BR", { month: "long" });

/** Com o que o período é comparado: "em setembro", "nos 3 meses antes", "em 2025". */
export function comparadoCom(periodo: Periodo, inicioAnterior: string): string {
  const d = new Date(`${inicioAnterior}T12:00:00`);
  if (periodo === "3meses") return "nos 3 meses antes";
  if (periodo === "ano") return `em ${d.getFullYear()}`;
  return `em ${nomeMesFmt.format(d)}`;
}

export type Variacao = { texto: string; tom: "bom" | "ruim" | "neutro" };

/** Mais contatos é bom. */
export function variacaoContatos(diferenca: number, em: string): Variacao {
  if (diferenca === 0) return { texto: `Igual ao que veio ${em}`, tom: "neutro" };
  const n = Math.abs(diferenca);
  return diferenca > 0
    ? { texto: `▲ ${n} a mais que ${em}`, tom: "bom" }
    : { texto: `▼ ${n} a menos que ${em}`, tom: "ruim" };
}

/** Custo menor é bom. Sem número agora ou antes, não compara. */
export function variacaoCusto(
  atual: number | null,
  diferenca: number | null,
  em: string,
  formatar: (cents: number) => string,
): Variacao {
  if (atual == null) return { texto: "Sem contas no período", tom: "neutro" };
  if (diferenca == null) return { texto: `Sem base para comparar ${em}`, tom: "neutro" };
  if (diferenca === 0) return { texto: `Igual ao custo ${em}`, tom: "neutro" };
  const v = formatar(Math.abs(diferenca));
  return diferenca < 0
    ? { texto: `▼ ${v} menor que ${em}`, tom: "bom" }
    : { texto: `▲ ${v} maior que ${em}`, tom: "ruim" };
}

export type Ritmo = {
  /** % do mês que já passou (posição da marca na barra). */
  linha: number;
  pctGasto: number;
  tom: "ok" | "atencao" | "risco" | "neutro";
  texto: string;
  sobraCents: number;
  diasRestantes: number;
  porDiaCents: number;
};

/** Ritmo do orçamento do mês: gasto contra a parte do mês que já passou. */
export function ritmoOrcamento(o: PainelTrafego["orcamento"]): Ritmo {
  const linha = Math.round((o.dia / o.dias_no_mes) * 100);
  const pctGasto = o.mensal_cents > 0 ? Math.round((o.gasto_cents / o.mensal_cents) * 100) : 0;
  const sobraCents = Math.max(0, o.mensal_cents - o.gasto_cents);
  const diasRestantes = Math.max(1, o.dias_no_mes - o.dia + 1);
  const base = {
    linha,
    pctGasto,
    sobraCents,
    diasRestantes,
    porDiaCents: Math.floor(sobraCents / diasRestantes),
  };
  if (o.mensal_cents === 0) return { ...base, tom: "neutro", texto: "Sem orçamento definido" };
  if (pctGasto > linha + 10) return { ...base, tom: "risco", texto: "Acima do ritmo" };
  if (pctGasto < linha - 20) return { ...base, tom: "atencao", texto: "Abaixo do ritmo" };
  return { ...base, tom: "ok", texto: "No ritmo do mês" };
}

export type EtapaFunil = {
  nome: string;
  n: number | null;
  /** % que passou desta etapa para a próxima (null quando não dá para calcular). */
  passou: number | null;
};

/** Etapas do clique ao contrato e a maior perda (entre contato → diagnóstico → proposta → fechado). */
export function funilDoTrafego(i: PainelTrafego["indicadores"]): {
  etapas: EtapaFunil[];
  pior: number | null;
} {
  const brutas = [
    { nome: "Cliques", n: i.cliques },
    { nome: "Contatos", n: i.contatos },
    { nome: "Diagnósticos", n: i.diagnosticos },
    { nome: "Propostas", n: i.propostas },
    { nome: "Fechados", n: i.fechados },
  ];
  const etapas = brutas.map((e, k) => {
    const prox = brutas[k + 1];
    return {
      ...e,
      passou: prox && e.n && e.n > 0 && prox.n != null ? Math.round((prox.n / e.n) * 100) : null,
    };
  });
  let pior: number | null = null;
  etapas.forEach((e, k) => {
    if (k === 0 || k === etapas.length - 1 || e.passou == null) return;
    const atual = pior == null ? null : (etapas[pior]?.passou ?? null);
    if (atual == null || e.passou < atual) pior = k;
  });
  return { etapas, pior };
}
