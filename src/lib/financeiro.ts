import { dataLocal, moeda } from "@/lib/formatar";
import { supabase } from "@/lib/supabase";

/** Financeiro (card S4): tipos, chaves e chamadas. Todas as contas vêm do banco. */

export type TipoCobranca = "parcela" | "diagnostico" | "adicional" | "mensalidade" | "avulsa";
export type SituacaoCobranca = "aberta" | "paga" | "cancelada";
export type Forma = "pix" | "boleto" | "cartao" | "transferencia" | "dinheiro" | "outro";
export type CategoriaDespesa =
  "ferramentas" | "hospedagem" | "impostos" | "marketing" | "pessoal" | "outros";

export const rotuloTipoCobranca: Record<TipoCobranca, string> = {
  parcela: "Parcela do projeto",
  diagnostico: "Diagnóstico",
  adicional: "Serviço adicional",
  mensalidade: "Mensalidade",
  avulsa: "Avulsa",
};

export const rotuloForma: Record<Forma, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  outro: "Outra forma",
};

export const rotuloCategoria: Record<CategoriaDespesa, string> = {
  ferramentas: "Ferramentas",
  hospedagem: "Hospedagem e domínios",
  impostos: "Impostos e taxas",
  marketing: "Marketing",
  pessoal: "Pessoal",
  outros: "Outros",
};

export type Cobranca = {
  id: string;
  client_id: string;
  project_id: string | null;
  request_id: string | null;
  subscription_id: string | null;
  tipo: TipoCobranca;
  descricao: string;
  valor_cents: number;
  vencimento: string | null;
  quando: string | null;
  parte: number | null;
  partes: number | null;
  mes: string | null;
  situacao: SituacaoCobranca;
  pago_em: string | null;
  pago_cents: number | null;
  forma: Forma | null;
  recibo: number | null;
  nota: string | null;
  cliente_avisou_em: string | null;
  dias_atraso: number;
  multa_cents: number;
  juros_cents: number;
};

export type CobrancaLinha = Cobranca & {
  empresa: string;
  contato: string | null;
  whatsapp: string | null;
  projeto: string | null;
};

export type Mensalidade = {
  id: string;
  client_id: string;
  empresa: string;
  projeto: string | null;
  plano: string;
  valor_cents: number;
  inicio: string;
  dia: number;
  minimo_meses: number;
  situacao: "ativa" | "pausada" | "encerrada";
  fim: string | null;
  meses_pagos: number;
  em_aberto_cents: number;
};

export type Despesa = {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor_cents: number;
  tipo: "fixa" | "avulsa";
  data: string | null;
  inicio: string | null;
  fim: string | null;
  nota: string | null;
  ativa: boolean;
};

export type PainelFinanceiro = {
  hoje: string;
  regras: { multa_pct: number; juros_pct: number };
  numeros: {
    a_receber_30_cents: number;
    em_atraso_cents: number;
    em_atraso: number;
    sem_data_cents: number;
    recebido_mes_cents: number;
    recebidos_mes: number;
    mrr_cents: number;
    mensalidades_ativas: number;
    despesas_mes_cents: number;
    avisos_cliente: number;
  };
  cobrancas: CobrancaLinha[];
  mensalidades: Mensalidade[];
  despesas: Despesa[];
  anuncios_mes_cents: number;
};

export type MesFluxo = {
  mes: string;
  tipo: "passado" | "atual" | "futuro";
  recebido_cents: number;
  a_receber_cents: number;
  em_atraso_cents: number;
  despesas_fixas_cents: number;
  despesas_avulsas_cents: number;
  anuncios_cents: number;
  entradas_cents: number;
  saidas_cents: number;
  saldo_cents: number;
};

/** Gráficos do financeiro (card RD-3): 6 meses até o atual, contas do banco. */
export type MesGrafico = {
  mes: string;
  atual: boolean;
  entradas_cents: number;
  saidas_cents: number;
  resultado_cents: number;
  mensalidades_cents: number;
};

export type GraficosFinanceiro = {
  hoje: string;
  resultado_mes: { recebido_cents: number; despesas_cents: number; resultado_cents: number };
  meses: MesGrafico[];
  planos: { plano: string; quantidade: number }[];
};

export type ConfigRecebimento = {
  pix_chave: string | null;
  pix_nome: string | null;
  pix_cidade: string | null;
  dia_vencimento: number;
};

export type Recibo = {
  numero: number;
  agencia: string;
  cliente: string;
  documento: string | null;
  descricao: string;
  valor_cents: number;
  pago_em: string;
  forma: Forma;
  responsavel: string | null;
};

export const chavesFinanceiro = {
  tudo: ["financeiro"] as const,
  painel: ["financeiro", "painel"] as const,
  fluxo: ["financeiro", "fluxo"] as const,
  graficos: ["financeiro", "graficos"] as const,
  config: ["financeiro", "config"] as const,
  cliente: (id: string) => ["financeiro", "cliente", id] as const,
  projeto: (id: string) => ["financeiro", "projeto", id] as const,
  recibo: (id: string) => ["financeiro", "recibo", id] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const painelFinanceiro = () => rpc<PainelFinanceiro>("financeiro_painel");
export const fluxoDeCaixa = () => rpc<{ hoje: string; meses: MesFluxo[] }>("financeiro_fluxo");
export const graficosFinanceiro = () => rpc<GraficosFinanceiro>("financeiro_graficos");
export const lerRecebimento = () => rpc<ConfigRecebimento>("financeiro_config_ler");
export const salvarRecebimento = (v: {
  chave: string;
  nome: string;
  cidade: string;
  dia: number;
}) =>
  rpc<ConfigRecebimento>("financeiro_config_salvar", {
    p_chave: v.chave,
    p_nome: v.nome,
    p_cidade: v.cidade,
    p_dia: v.dia,
  });
export const financeiroDoCliente = (id: string) =>
  rpc<{
    pago_cents: number;
    a_receber_cents: number;
    em_atraso_cents: number;
    proxima: { descricao: string; valor_cents: number; vencimento: string } | null;
    mensalidade_cents: number;
  }>("financeiro_cliente", { p_cliente: id });
export const financeiroDoProjeto = (id: string) =>
  rpc<{
    total_cents: number;
    pago_cents: number;
    proxima: { descricao: string; valor_cents: number; vencimento: string | null } | null;
  }>("financeiro_projeto", { p_projeto: id });
export const lerRecibo = (id: string) => rpc<Recibo>("recibo", { p_id: id });

export const criarCobranca = (v: {
  clienteId: string;
  descricao: string;
  valorCents: number;
  vencimento: string | null;
}) =>
  rpc<{ id: string }>("cobranca_criar", {
    p_cliente: v.clienteId,
    p_descricao: v.descricao,
    p_valor_cents: v.valorCents,
    p_vencimento: v.vencimento,
  });
export const atualizarCobranca = (id: string, campos: Record<string, unknown>) =>
  rpc<Cobranca>("cobranca_atualizar", { p_id: id, p_campos: campos });
export const pagarCobranca = (v: {
  id: string;
  data: string;
  valorCents: number;
  forma: Forma;
  nota: string;
  restante: boolean;
}) =>
  rpc<Cobranca>("cobranca_pagar", {
    p_id: v.id,
    p_data: v.data,
    p_valor_cents: v.valorCents,
    p_forma: v.forma,
    p_nota: v.nota || null,
    p_restante: v.restante,
  });
export const desfazerPagamento = (id: string) => rpc("cobranca_desfazer", { p_id: id });
export const cancelarCobranca = (id: string, motivo: string) =>
  rpc("cobranca_cancelar", { p_id: id, p_motivo: motivo });
export const criarMensalidade = (v: {
  clienteId: string;
  plano: string;
  valorCents: number;
  inicio: string;
  dia: number;
  minimo: number;
}) =>
  rpc<{ id: string }>("mensalidade_criar", {
    p_cliente: v.clienteId,
    p_plano: v.plano,
    p_valor_cents: v.valorCents,
    p_inicio: v.inicio,
    p_dia: v.dia,
    p_minimo: v.minimo,
  });
export const mudarMensalidade = (id: string, situacao: Mensalidade["situacao"]) =>
  rpc("mensalidade_situacao", { p_id: id, p_situacao: situacao });
export const salvarDespesa = (v: {
  id: string | null;
  descricao: string;
  categoria: CategoriaDespesa;
  valorCents: number;
  tipo: "fixa" | "avulsa";
  data: string;
  fim: string | null;
  nota: string;
}) =>
  rpc<{ id: string }>("despesa_salvar", {
    p_id: v.id,
    p_descricao: v.descricao,
    p_categoria: v.categoria,
    p_valor_cents: v.valorCents,
    p_tipo: v.tipo,
    p_data: v.data,
    p_fim: v.fim,
    p_nota: v.nota || null,
  });
export const removerDespesa = (id: string) => rpc("despesa_remover", { p_id: id });

/** "2026-07-01" → "jul 26" (sem o "de" que o navegador põe entre mês e ano). */
export function mesCurto(iso: string, comAno = true): string {
  const d = dataLocal(iso);
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return comAno ? `${mes} ${String(d.getFullYear()).slice(2)}` : mes;
}

/** Valor curto para eixos e rótulos de gráfico: "R$ 950", "4,1 mil", "12 mil". */
export function valorCurto(cents: number): string {
  const reais = cents / 100;
  if (Math.abs(reais) < 1000) return moeda(Math.round(reais) * 100);
  return `${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
}

/** Grupo de urgência da cobrança em aberto (card RD-3). */
export type GrupoCobranca = "atrasadas" | "semana" | "trinta" | "depois" | "sem_data";

export function grupoDaCobranca(c: Pick<Cobranca, "vencimento">, hoje: string): GrupoCobranca {
  if (!c.vencimento) return "sem_data";
  const dias = diasEntre(hoje, c.vencimento);
  if (dias < 0) return "atrasadas";
  if (dias <= 6) return "semana";
  if (dias <= 30) return "trinta";
  return "depois";
}

/** Dias de `de` até `ate` (datas "AAAA-MM-DD"). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((dataLocal(ate).getTime() - dataLocal(de).getTime()) / 86_400_000);
}

/** Selo da cobrança, com as regras do card (vence hoje, atrasada, trabalho pode ser pausado no 10º dia). */
export function situacaoDaCobranca(
  c: Pick<Cobranca, "situacao" | "vencimento" | "dias_atraso">,
  hoje: string,
): { texto: string; tom: "neutro" | "info" | "atencao" | "risco" | "ok" } {
  if (c.situacao === "paga") return { texto: "Paga", tom: "ok" };
  if (c.situacao === "cancelada") return { texto: "Cancelada", tom: "neutro" };
  if (!c.vencimento) return { texto: "Sem data", tom: "neutro" };
  if (c.dias_atraso >= 10) return { texto: `Atrasada há ${c.dias_atraso} dias`, tom: "risco" };
  if (c.dias_atraso > 0)
    return {
      texto: `Atrasada há ${c.dias_atraso} ${c.dias_atraso === 1 ? "dia" : "dias"}`,
      tom: "risco",
    };
  if (c.vencimento === hoje) return { texto: "Vence hoje", tom: "atencao" };
  const [a, m, d] = hoje.split("-").map(Number);
  const [a2, m2, d2] = c.vencimento.split("-").map(Number);
  const dias = Math.round(
    (new Date(a2 ?? 0, (m2 ?? 1) - 1, d2 ?? 1).getTime() -
      new Date(a ?? 0, (m ?? 1) - 1, d ?? 1).getTime()) /
      86_400_000,
  );
  return { texto: `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`, tom: "info" };
}

export function mensagemDoFinanceiro(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    cobranca_fechada: "Essa cobrança já foi paga ou cancelada.",
    cobranca_nao_paga: "Essa cobrança não está paga.",
    valor_combinado:
      "Esse valor foi combinado com o cliente (proposta, pedido ou diagnóstico). Mude por lá.",
    valor_invalido: "Informe um valor maior que zero.",
    data_invalida: "Confira a data: não pode ser no futuro nem há mais de um ano.",
    forma_obrigatoria: "Escolha a forma de pagamento.",
    motivo_obrigatorio: "Explique o motivo (pelo menos 5 letras).",
    descricao_obrigatoria: "Descreva a cobrança (pelo menos 2 letras).",
    plano_obrigatorio: "Dê um nome ao plano.",
    pix_chave_invalida: "Confira a chave Pix.",
    pix_incompleto: "Com a chave Pix, informe também o nome de quem recebe e a cidade.",
    fim_antes_do_inicio: "O fim não pode ser antes do início.",
    mensalidade_encerrada: "Essa mensalidade já foi encerrada.",
    cobranca_inexistente: "Essa cobrança não existe mais. Recarregue a página.",
    cliente_inexistente: "Escolha um cliente.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
