import { supabase } from "@/lib/supabase";
import type { Diagnostico, Etapa } from "@/lib/funil";

/** Tipos, chaves e acesso a dados das propostas (card S2). A conta vem sempre do banco. */

export type SituacaoProposta = "rascunho" | "enviada" | "aceita" | "recusada";
export type AbaPropostas = SituacaoProposta;

export const abasPropostas: { id: AbaPropostas; rotulo: string }[] = [
  { id: "rascunho", rotulo: "Rascunho" },
  { id: "enviada", rotulo: "Enviadas" },
  { id: "aceita", rotulo: "Aceitas" },
  { id: "recusada", rotulo: "Recusadas" },
];

export type ItemEntrega = { nome: string; descricao: string; horas: number; destaque: boolean };
export type ItemFora = { item: string; motivo: string };
export type Fase = { nome: string; quando: string };

/** Linha de v_propostas */
export type PropostaLinha = {
  id: string;
  client_id: string;
  deal_id: string;
  version: number;
  project_type: string | null;
  title: string | null;
  total_cents: number | null;
  hours_total: number | null;
  sent_at: string | null;
  expires_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  refused_at: string | null;
  refused_reason: string | null;
  created_at: string;
  updated_at: string;
  token: string | null;
  situacao: SituacaoProposta | "vencida";
  status: SituacaoProposta;
  company_name: string;
  contact_name: string;
  whatsapp: string | null;
  email: string | null;
  next_step: string | null;
  next_step_at: string | null;
};

export type Pendencia = { chave: string; acao: string };

export type Calculo = {
  horas: number;
  hora_cents: number;
  base_cents: number;
  complexidade: number;
  complexidade_cents: number;
  contingencia_pct: number;
  contingencia_cents: number;
  arredondamento_cents: number;
  projeto_cents: number;
  diagnostico: { tipo: Diagnostico; cents: number; pago_em: string } | null;
  desconto_cents: number;
  total_cents: number;
  valor_hora_cents: number;
  piso_cents: number;
  alvo_cents: number;
  abaixo_do_piso: boolean;
  parcelas: { pct: number; quando: string; cents: number }[];
  plano: {
    id: string;
    nome: string;
    cents: number;
    horas_mes: number;
    minimo_meses: number;
  } | null;
  pendencias: Pendencia[];
  pronto: boolean;
};

export type Conferencias = { escopo: boolean; prazo: boolean; contato: boolean };

export type Proposta = {
  id: string;
  client_id: string;
  deal_id: string;
  status: SituacaoProposta;
  version: number;
  project_type: string | null;
  title: string | null;
  intro: string | null;
  heard: string[];
  heard_summary: string | null;
  items: ItemEntrega[];
  exclusions: ItemFora[];
  phases: Fase[];
  launch_date: string | null;
  complexity: number;
  contingency_pct: number;
  discount_cents: number;
  discount_reason: string | null;
  plan_id: string | null;
  infra_cents: number | null;
  checks: Partial<Conferencias>;
  total_cents: number | null;
  token: string | null;
  sent_at: string | null;
  expires_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  refused_at: string | null;
  refused_reason: string | null;
  updated_at: string;
  aceite: { nome: string; razao_social: string; documento_tipo: "cpf" | "cnpj" } | null;
};

export type Plano = {
  id: string;
  nome: string;
  cents: number;
  horas_mes: number;
  minimo_meses: number;
};

export type DetalheProposta = {
  proposta: Proposta;
  calculo: Calculo;
  cliente: {
    id: string;
    empresa: string;
    contato: string;
    whatsapp: string | null;
    email: string | null;
  };
  oportunidade: {
    id: string;
    etapa: Etapa;
    proximo_passo: string | null;
    proximo_passo_em: string | null;
  };
  planos: Plano[];
  validade_dias: number;
};

/** Campos aceitos por proposta_salvar (só as chaves enviadas mudam). */
export type DocProposta = Partial<{
  tipo: string;
  titulo: string;
  apresentacao: string;
  ouvimos: string[];
  ouvimos_conclusao: string;
  itens: ItemEntrega[];
  fora: ItemFora[];
  fases: Fase[];
  lancamento: string | null;
  complexidade: number;
  contingencia: number;
  desconto_cents: number;
  desconto_motivo: string;
  plano_id: string | null;
  infra_cents: number | null;
  conferencias: Conferencias;
}>;

export type ResumoPropostas = {
  rascunho: number;
  enviada: number;
  aceita: number;
  recusada: number;
  vencidas: number;
  em_negociacao_cents: number;
  aceitas_no_ano: number;
  oportunidades_sem_proposta: number;
};

export const chavesPropostas = {
  tudo: ["propostas"] as const,
  lista: ["propostas", "lista"] as const,
  resumo: ["propostas", "resumo"] as const,
  detalhe: (id: string) => ["propostas", "detalhe", id] as const,
  publica: (token: string) => ["proposta-publica", token] as const,
};

function falhar(error: unknown): never {
  throw error;
}

export async function listarPropostas(): Promise<PropostaLinha[]> {
  const { data, error } = await supabase
    .from("v_propostas")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(2000);
  if (error) falhar(error);
  return (data ?? []) as PropostaLinha[];
}

export async function resumoPropostas(): Promise<ResumoPropostas> {
  const { data, error } = await supabase.rpc("proposta_resumo");
  if (error) falhar(error);
  return data as ResumoPropostas;
}

export async function detalheProposta(id: string): Promise<DetalheProposta> {
  const { data, error } = await supabase.rpc("proposta_detalhe", { p_id: id });
  if (error) falhar(error);
  return data as DetalheProposta;
}

export async function criarProposta(
  dealId: string,
): Promise<{ id: string; reaproveitada: boolean }> {
  const { data, error } = await supabase.rpc("proposta_criar", { p_deal: dealId });
  if (error) falhar(error);
  return data as { id: string; reaproveitada: boolean };
}

export async function salvarProposta(
  id: string,
  versao: string,
  doc: DocProposta,
): Promise<{ versao: string; calculo: Calculo }> {
  const { data, error } = await supabase.rpc("proposta_salvar", {
    p_id: id,
    p_versao: versao,
    p_doc: doc,
  });
  if (error) falhar(error);
  return data as { versao: string; calculo: Calculo };
}

export async function enviarProposta(
  id: string,
  versao: string,
): Promise<{ token: string; vence_em: string; total_cents: number }> {
  const { data, error } = await supabase.rpc("proposta_enviar", { p_id: id, p_versao: versao });
  if (error) falhar(error);
  return data as { token: string; vence_em: string; total_cents: number };
}

export async function reabrirProposta(id: string) {
  const { error } = await supabase.rpc("proposta_reabrir", { p_id: id });
  if (error) falhar(error);
}

export async function marcarRecusada(id: string, motivo: string) {
  const { error } = await supabase.rpc("proposta_marcar_recusada", {
    p_id: id,
    p_motivo: motivo,
  });
  if (error) falhar(error);
}

// ---------------- Link do cliente ----------------

export type DocumentoPublico = {
  agencia: string;
  empresa: string;
  contato: string;
  cargo: string | null;
  responsavel: string;
  versao: number;
  tipo: string;
  titulo: string;
  apresentacao: string | null;
  ouvimos: string[];
  ouvimos_conclusao: string | null;
  itens: { nome: string; descricao: string; destaque: boolean }[];
  fora: ItemFora[];
  fases: Fase[];
  lancamento: string | null;
  investimento: {
    projeto_cents: number;
    diagnostico: { tipo: Diagnostico; cents: number; pago_em: string } | null;
    total_cents: number;
    parcelas: { pct: number; quando: string; cents: number }[];
  };
  mensalidade: {
    nome: string;
    cents: number;
    horas_mes: number;
    minimo_meses: number;
    infra_cents: number | null;
    infra_pelo_custo: boolean;
    /** O que o nível inclui, uma linha por item (propostas a partir do S9). */
    inclui?: string | null;
    /** Meses que as horas não usadas continuam valendo (S9). */
    acumula_meses?: number;
  } | null;
  condicoes: {
    pix: boolean;
    boleto: boolean;
    cartao: boolean;
    multa_pct: number;
    juros_pct: number;
    reajuste: string;
    /** Garantia depois da entrega; presente nas propostas feitas com a política de 19/10 (S9). */
    garantia_dias?: number;
  };
  enviada_em: string;
  vence_em: string;
};

export type PropostaPublica =
  | { estado: "invalido" }
  | { estado: "atualizando" | "vencida"; empresa: string | null; responsavel: string | null }
  | {
      estado: "enviada" | "aceita" | "recusada";
      documento: DocumentoPublico;
      aceite: {
        nome: string;
        razao_social: string;
        documento_tipo: "cpf" | "cnpj";
        aceita_em: string;
      } | null;
      recusada_em: string | null;
    };

export async function abrirPropostaPublica(token: string): Promise<PropostaPublica> {
  const { data, error } = await supabase.rpc("proposta_publica", { p_token: token });
  if (error) falhar(error);
  return data as PropostaPublica;
}

export type DadosAceite = {
  nome: string;
  email: string;
  documento: string;
  razaoSocial: string;
  endereco: string;
  emailCobranca: string;
  responsavel: string;
  concordo: boolean;
};

export async function aceitarProposta(token: string, versao: number, d: DadosAceite) {
  const { data, error } = await supabase.rpc("proposta_aceitar", {
    p_token: token,
    p_versao: versao,
    p_nome: d.nome,
    p_email: d.email,
    p_documento: d.documento,
    p_razao_social: d.razaoSocial,
    p_endereco: d.endereco,
    p_email_cobranca: d.emailCobranca || null,
    p_responsavel: d.responsavel || null,
    p_concordo: d.concordo,
  });
  if (error) falhar(error);
  return data as { aceita_em: string; nome: string; repetido: boolean };
}

export async function recusarProposta(token: string, motivo: string) {
  const { error } = await supabase.rpc("proposta_recusar", { p_token: token, p_motivo: motivo });
  if (error) falhar(error);
}

/** Link completo da proposta para o cliente. */
export function linkDaProposta(token: string): string {
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  return `${origem}/proposta/${token}`;
}

/** Mensagens das regras do banco, em português. */
export function mensagemDaProposta(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    versao_desatualizada: "A proposta mudou em outra aba. Recarregue para continuar.",
    proposta_nao_e_rascunho: 'A proposta já foi enviada. Use "Editar e reenviar" para mudar.',
    proposta_com_pendencias: 'Ainda há itens em "Antes de enviar".',
    oportunidade_encerrada: "A oportunidade está fechada ou arquivada.",
    proposta_nao_pode_reabrir: "Esta proposta não pode ser reaberta.",
    ja_existe_proposta_aberta: "Já existe outra proposta em andamento para este cliente.",
    proposta_nao_enviada: "Só uma proposta enviada pode ser marcada como recusada.",
    itens_demais: "Lista longa demais. Junte itens parecidos.",
    uma_forma_de_pagamento: "Deixe pelo menos uma forma de pagamento marcada.",
    pricing_piso_abaixo_da_hora: "O piso não pode ser maior que a hora de referência.",
    proposta_vencida: "O prazo desta proposta acabou. Fale com o responsável para renovar.",
    proposta_indisponivel: "Esta proposta não está mais disponível para aceite.",
    concordo_obrigatorio: 'Marque "Li e concordo" para aceitar.',
    nome_invalido: "Confira o seu nome completo.",
    email_invalido: "Confira o e-mail digitado.",
    documento_invalido: "Confira o CPF ou CNPJ: os números não conferem.",
    razao_social_invalida: "Informe a razão social ou o nome completo.",
    endereco_invalido: "Informe o endereço completo, com número e cidade.",
    link_invalido: "Este link não é válido. Peça um novo ao responsável.",
    proposta_mudou:
      "A proposta foi atualizada enquanto você lia. Mostramos a versão nova: confira os valores e aceite de novo.",
    sem_permissao: "Você não tem permissão para essa ação.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
