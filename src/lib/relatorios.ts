import { moeda } from "@/lib/formatar";
import { supabase } from "@/lib/supabase";

/** Relatórios (card S7). Tudo calculado no banco pela RPC `relatorios`. */

export type PeriodoRelatorio = "mes" | "3meses" | "ano";

export const periodosRelatorio: { id: PeriodoRelatorio; rotulo: string }[] = [
  { id: "mes", rotulo: "Este mês" },
  { id: "3meses", rotulo: "3 meses" },
  { id: "ano", rotulo: "Ano" },
];

export type Relatorio = {
  periodo: { id: PeriodoRelatorio; inicio: string; fim: string };
  vendas: {
    funil: { etapa: string; chegaram: number; hoje: number; passaram_pct: number | null }[];
    maior_perda: string | null;
    contatos: number;
    por_origem: {
      origem: string;
      contatos: number;
      diagnosticos: number;
      fechados: number;
      conversao_pct: number | null;
      receita_cents: number;
    }[];
    perdas: { motivo: string; quantidade: number }[];
    dias_ate_aceite: number | null;
    anuncios_cents: number;
    diagnosticos_por_anuncio: number;
  };
  receita: {
    fechado_cents: number;
    fechados: number;
    diagnosticos_cents: number;
    diagnosticos: number;
    recebido_cents: number;
    mrr_cents: number;
    mensalidades_ativas: number;
    mensalidades_novas: number;
    mensalidades_encerradas: number;
    churn_pct: number | null;
    a_receber_30_cents: number;
    em_atraso_cents: number;
    proximas: {
      empresa: string;
      descricao: string;
      valor_cents: number;
      vencimento: string;
      tipo: string;
    }[];
  };
  margem: {
    piso_cents: number;
    alvo_cents: number;
    projetos: {
      id: string;
      nome: string;
      empresa: string;
      valor_cents: number;
      horas_estimadas: number;
      horas_usadas: number;
      vh_estimado_cents: number | null;
      vh_real_cents: number | null;
      folga_horas: number | null;
    }[];
  };
  entrega: {
    aprovacao_media_dias: number | null;
    aprovacoes_decididas: number;
    ajustes_pct: number | null;
    aprovacoes_abertas: { titulo: string; empresa: string; project_id: string; dias: number }[];
    pedidos: {
      total: number;
      escopo: number;
      mensalidade: number;
      adicional: number;
      sem_classificacao: number;
    };
    adicionais_aprovados: { quantidade: number; valor_cents: number };
    mensalidade_horas: {
      empresa: string;
      plano: string;
      horas_plano: number | null;
      horas_usadas: number;
    }[];
  };
};

/** Variação contra o período anterior, calculada no banco (pct nulo quando o anterior é zero). */
export type Variacao = { atual: number; anterior: number; diferenca: number; pct: number | null };

/** Resumo do topo e receita mês a mês (card RD-8), pela RPC `relatorios_resumo`. */
export type ResumoRelatorio = {
  periodo: {
    id: PeriodoRelatorio;
    inicio: string;
    fim: string;
    anterior_inicio: string;
    anterior_fim: string;
  };
  vendido: Variacao & { propostas: number };
  recebido: Variacao;
  contatos: Variacao;
  valor_hora: {
    media_cents: number | null;
    projetos: number;
    abaixo_do_piso: number;
    piso_cents: number;
    alvo_cents: number;
  };
  lancamentos: { total: number; no_prazo: number; maior_atraso_dias: number; sem_data: number };
  receita_meses: { mes: string; tipo: "passado" | "atual" | "previsto"; valor_cents: number }[];
};

export const chavesRelatorios = {
  tudo: ["relatorios"] as const,
  periodo: (p: PeriodoRelatorio) => ["relatorios", p] as const,
  resumo: (p: PeriodoRelatorio) => ["relatorios", p, "resumo"] as const,
};

export async function lerResumoRelatorio(p: PeriodoRelatorio): Promise<ResumoRelatorio> {
  const { data, error } = await supabase.rpc("relatorios_resumo", { p_periodo: p });
  if (error) throw error;
  return data as ResumoRelatorio;
}

/** Nome do período anterior, para a variação: "o mês passado", "os 3 meses antes", "o ano passado". */
export const rotuloAnterior: Record<PeriodoRelatorio, string> = {
  mes: "mês passado",
  "3meses": "3 meses antes",
  ano: "ano passado",
};

/** Plural simples: plural(1, "aprovação", "aprovações") → "1 aprovação". */
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export async function lerRelatorio(p: PeriodoRelatorio): Promise<Relatorio> {
  const { data, error } = await supabase.rpc("relatorios", { p_periodo: p });
  if (error) throw error;
  return data as Relatorio;
}

export const rotuloEtapaRelatorio: Record<string, string> = {
  contato: "Contato",
  diagnostico: "Diagnóstico",
  mapeamento: "Mapeamento",
  proposta: "Proposta",
  fechado: "Fechado",
};

// Mesmos nomes do funil, para não divergir
export { rotuloMotivo as rotuloPerda, rotuloOrigem as rotuloOrigemRelatorio } from "@/lib/funil";

/** Valor por hora sem centavos: 24286 → "R$ 243/h". */
export const porHora = (cents: number) => `${moeda(Math.round(cents / 100) * 100)}/h`;
