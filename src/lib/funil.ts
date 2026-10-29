import { supabase } from "@/lib/supabase";

/** Tipos, rótulos e acesso a dados do funil e das fichas (card S1). */

export type Etapa = "contato" | "diagnostico" | "mapeamento" | "proposta" | "fechado";
export type Origem =
  "indicacao" | "instagram" | "site" | "anuncio_meta" | "anuncio_google" | "outro";
export type Diagnostico = "essencial" | "ampliado";
/** Frente de serviço da oportunidade (S9): as quatro frentes do site. */
export type Frente = "sistemas" | "ia" | "sites" | "automacoes";
export const frentes: { id: Frente; rotulo: string }[] = [
  { id: "sistemas", rotulo: "Sistemas sob medida e portais" },
  { id: "ia", rotulo: "Inteligência artificial aplicada" },
  { id: "sites", rotulo: "Sites" },
  { id: "automacoes", rotulo: "Automações e integrações" },
];
export const rotuloFrente = Object.fromEntries(frentes.map((f) => [f.id, f.rotulo])) as Record<
  Frente,
  string
>;
export type MotivoPerda =
  "preco" | "prazo" | "escolheu_outro" | "sem_resposta" | "nao_era_o_momento" | "outro";
export type FiltroFunil =
  "todos" | "novos" | "adicionais" | "vencidos" | "este_mes" | "fechados" | "arquivados";
export type Situacao = "contato" | "negociacao" | "cliente" | "arquivado" | "sem_oportunidade";

export const etapas: { id: Etapa; rotulo: string }[] = [
  { id: "contato", rotulo: "Contato" },
  { id: "diagnostico", rotulo: "Diagnóstico" },
  { id: "mapeamento", rotulo: "Mapeamento" },
  { id: "proposta", rotulo: "Proposta" },
  { id: "fechado", rotulo: "Fechado" },
];
export const rotuloEtapa = Object.fromEntries(etapas.map((e) => [e.id, e.rotulo])) as Record<
  Etapa,
  string
>;

export const origens: { id: Origem; rotulo: string }[] = [
  { id: "indicacao", rotulo: "Indicação" },
  { id: "instagram", rotulo: "Instagram" },
  { id: "site", rotulo: "Site" },
  { id: "anuncio_meta", rotulo: "Anúncio (Instagram/Facebook)" },
  { id: "anuncio_google", rotulo: "Anúncio (Google)" },
  { id: "outro", rotulo: "Outro" },
];
export const rotuloOrigem = Object.fromEntries(origens.map((o) => [o.id, o.rotulo])) as Record<
  Origem,
  string
>;

export const motivos: { id: MotivoPerda; rotulo: string }[] = [
  { id: "preco", rotulo: "Preço" },
  { id: "prazo", rotulo: "Prazo" },
  { id: "escolheu_outro", rotulo: "Escolheu outro fornecedor" },
  { id: "sem_resposta", rotulo: "Parou de responder" },
  { id: "nao_era_o_momento", rotulo: "Não era o momento" },
  { id: "outro", rotulo: "Outro" },
];
export const rotuloMotivo = Object.fromEntries(motivos.map((m) => [m.id, m.rotulo])) as Record<
  MotivoPerda,
  string
>;

export const rotuloDiagnostico: Record<Diagnostico, string> = {
  essencial: "Essencial",
  ampliado: "Ampliado",
};

/** Filtros de Vendas (RD2-2). `cor` é o ponto ao lado do nome. */
export const filtrosFunil: { id: FiltroFunil; rotulo: string; cor?: string }[] = [
  { id: "todos", rotulo: "Todas" },
  { id: "novos", rotulo: "Novo cliente", cor: "var(--color-tipo-vendas-p)" },
  { id: "adicionais", rotulo: "Serviço adicional", cor: "var(--color-tipo-pedidos-p)" },
  { id: "vencidos", rotulo: "Passo vencido", cor: "var(--color-sit-risco-t)" },
  { id: "este_mes", rotulo: "Entraram este mês" },
  { id: "fechados", rotulo: "Fechados" },
  { id: "arquivados", rotulo: "Arquivados" },
];

/** Linha de v_funil */
export type Oportunidade = {
  id: string;
  client_id: string;
  stage: Etapa;
  value_cents: number | null;
  diagnostic_tier: Diagnostico | null;
  diagnostic_paid: boolean;
  next_step: string | null;
  next_step_at: string | null;
  next_step_has_time: boolean;
  requested_slot_at: string | null;
  archived_at: string | null;
  lost_reason: MotivoPerda | null;
  lost_note: string | null;
  stage_changed_at: string;
  closed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  company_name: string;
  contact_name: string;
  whatsapp: string | null;
  email: string | null;
  origin: Origem;
  ad_name: string | null;
  next_step_date: string | null;
  hoje: string;
  vencido: boolean;
  para_hoje: boolean;
  deste_mes: boolean;
  frente: Frente | null;
  /** A empresa já fechou outra oportunidade antes (RD2-2). */
  adicional: boolean;
  proposta_status: "rascunho" | "enviada" | "aceita" | "recusada" | null;
  proposta_versao: number | null;
  proposta_enviada_em: string | null;
  proposta_vista_em: string | null;
};

export type ResumoFunil = {
  ativos: number;
  vencidos: number;
  em_negociacao_cents: number;
  abertas: number;
  propostas_sem_resposta: number;
  ganho_mes: { quantidade: number; soma_cents: number };
  perdidos_mes: number;
  /** null quando não houve ganho nem perda em 90 dias. */
  taxa_ganho_90: number | null;
  filtros: Record<FiltroFunil, number>;
  etapas: Record<Etapa, { quantidade: number; soma_cents: number }>;
};

/** Linha de v_clientes */
export type ClienteLinha = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_role: string | null;
  whatsapp: string | null;
  email: string | null;
  origin: Origem;
  segment: string | null;
  city: string | null;
  ad_name: string | null;
  referred_by: string | null;
  current_site: string | null;
  size_range: string | null;
  client_since: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  deal_id: string | null;
  stage: Etapa | null;
  value_cents: number | null;
  diagnostic_tier: Diagnostico | null;
  diagnostic_paid: boolean | null;
  next_step: string | null;
  next_step_at: string | null;
  next_step_has_time: boolean | null;
  archived_at: string | null;
  deal_updated_at: string | null;
  next_step_date: string | null;
  hoje: string;
  situacao: Situacao;
  fechado_cents: number;
  ultima_atividade: string | null;
};

export type ItemLinhaDoTempo = {
  tipo: "evento" | "anotacao";
  quando: string;
  kind: string | null;
  de: Etapa | null;
  para: Etapa | null;
  detalhe: Record<string, unknown>;
  texto: string | null;
  origem: "hub" | "site" | "cliente";
};

export const chavesFunil = {
  tudo: ["funil"] as const,
  lista: (filtro: FiltroFunil) => ["funil", "lista", filtro] as const,
  resumo: (filtro: FiltroFunil) => ["funil", "resumo", filtro] as const,
  painel: ["funil", "painel"] as const,
};
export const chavesClientes = {
  tudo: ["clientes"] as const,
  lista: ["clientes", "lista"] as const,
  ficha: (id: string) => ["clientes", "ficha", id] as const,
  oportunidade: (id: string) => ["clientes", "oportunidade", id] as const,
  linha: (id: string) => ["clientes", "linha", id] as const,
};

function falhar(error: unknown): never {
  throw error;
}

export async function listarFunil(filtro: FiltroFunil): Promise<Oportunidade[]> {
  let consulta = supabase.from("v_funil").select("*");
  if (filtro === "arquivados") consulta = consulta.not("archived_at", "is", null);
  else consulta = consulta.is("archived_at", null);
  // Fechado sai do quadro (RD2-2): só aparece no filtro "Fechados"
  if (filtro === "fechados") consulta = consulta.eq("stage", "fechado");
  else if (filtro !== "arquivados") consulta = consulta.neq("stage", "fechado");
  if (filtro === "vencidos") consulta = consulta.eq("vencido", true);
  if (filtro === "este_mes") consulta = consulta.eq("deste_mes", true);
  if (filtro === "novos") consulta = consulta.eq("adicional", false);
  if (filtro === "adicionais") consulta = consulta.eq("adicional", true);
  const { data, error } = await consulta
    .order("position", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) falhar(error);
  return (data ?? []) as Oportunidade[];
}

export async function resumoFunil(filtro: FiltroFunil): Promise<ResumoFunil> {
  const { data, error } = await supabase.rpc("funil_resumo", { p_filtro: filtro });
  if (error) falhar(error);
  return data as ResumoFunil;
}

export type PainelHoje = {
  itens: {
    deal_id: string;
    client_id: string;
    empresa: string;
    contato: string;
    whatsapp: string | null;
    etapa: Etapa;
    proximo_passo: string;
    quando: string;
    /** Dia do próximo passo e "hoje", já no fuso da agência (AAAA-MM-DD). */
    dia: string;
    hoje: string;
    com_hora: boolean;
    vencido: boolean;
    valor_cents: number | null;
  }[];
  resumo: ResumoFunil;
};

export async function painelHoje(): Promise<PainelHoje> {
  const { data, error } = await supabase.rpc("painel_hoje");
  if (error) falhar(error);
  return data as PainelHoje;
}

export async function buscarOportunidade(id: string): Promise<Oportunidade | null> {
  const { data, error } = await supabase.from("v_funil").select("*").eq("id", id).maybeSingle();
  if (error) falhar(error);
  return data as Oportunidade | null;
}

export async function listarClientes(): Promise<ClienteLinha[]> {
  const { data, error } = await supabase
    .from("v_clientes")
    .select("*")
    .order("last_activity_at", { ascending: false })
    .limit(5000);
  if (error) falhar(error);
  return (data ?? []) as ClienteLinha[];
}

export async function buscarCliente(id: string): Promise<ClienteLinha | null> {
  const { data, error } = await supabase.from("v_clientes").select("*").eq("id", id).maybeSingle();
  if (error) falhar(error);
  return data as ClienteLinha | null;
}

export async function linhaDoTempo(id: string): Promise<ItemLinhaDoTempo[]> {
  const { data, error } = await supabase.rpc("cliente_linha_do_tempo", { p_cliente: id });
  if (error) falhar(error);
  return (data ?? []) as ItemLinhaDoTempo[];
}

// ---------------- Escrita (sempre por RPC) ----------------

export type NovoContato = {
  empresa: string;
  contato: string;
  whatsapp: string;
  email: string;
  origem: Origem;
  proximoPasso: string;
  data: string;
  hora: string;
  segmento: string;
  cidade: string;
  anuncio: string;
  indicadoPor: string;
  siteAtual: string;
  valorCents: number | null;
};

export async function criarContato(c: NovoContato) {
  const { data, error } = await supabase.rpc("funil_criar_contato", {
    p_empresa: c.empresa,
    p_contato: c.contato,
    p_whatsapp: c.whatsapp || null,
    p_email: c.email || null,
    p_origem: c.origem,
    p_proximo_passo: c.proximoPasso,
    p_data: c.data,
    p_hora: c.hora || null,
    p_segmento: c.segmento || null,
    p_cidade: c.cidade || null,
    p_anuncio: c.anuncio || null,
    p_indicado_por: c.indicadoPor || null,
    p_site_atual: c.siteAtual || null,
    p_valor_cents: c.valorCents,
  });
  if (error) falhar(error);
  return data as { client_id: string; deal_id: string; reaproveitado: boolean };
}

export type ProximoPasso = { texto: string; data: string; hora: string };

export async function moverOportunidade(
  id: string,
  etapa: Etapa,
  versao: string,
  passo?: ProximoPasso,
  motivoFechar?: string,
) {
  const { data, error } = await supabase.rpc("funil_mover", {
    p_deal: id,
    p_etapa: etapa,
    p_versao: versao,
    p_proximo_passo: passo?.texto ?? null,
    p_data: passo?.data ?? null,
    p_hora: passo?.hora || null,
    p_motivo_fechar: motivoFechar?.trim() || null,
  });
  if (error) falhar(error);
  return data as { updated_at: string };
}

export type CamposOportunidade = Partial<{
  valor_cents: number | null;
  diagnostico: Diagnostico | null;
  diagnostico_pago: boolean;
  frente: Frente | "";
  proximo_passo: string;
  data: string;
  hora: string | null;
}>;

export async function atualizarOportunidade(
  id: string,
  versao: string,
  campos: CamposOportunidade,
) {
  const { data, error } = await supabase.rpc("funil_atualizar", {
    p_deal: id,
    p_versao: versao,
    p_campos: campos,
  });
  if (error) falhar(error);
  return data as { updated_at: string };
}

export async function arquivarOportunidade(
  id: string,
  motivo: MotivoPerda,
  nota: string,
  versao: string,
) {
  const { data, error } = await supabase.rpc("funil_arquivar", {
    p_deal: id,
    p_motivo: motivo,
    p_nota: nota || null,
    p_versao: versao,
  });
  if (error) falhar(error);
  return data as { updated_at: string };
}

export async function desarquivarOportunidade(id: string) {
  const { data, error } = await supabase.rpc("funil_desarquivar", { p_deal: id, p_versao: null });
  if (error) falhar(error);
  return data as { updated_at: string };
}

export type CamposCliente = Partial<{
  empresa: string;
  contato: string;
  papel: string;
  whatsapp: string;
  email: string;
  segmento: string;
  cidade: string;
  origem: Origem;
  anuncio: string;
  indicado_por: string;
  site_atual: string;
}>;

export async function salvarCliente(id: string, versao: string, campos: CamposCliente) {
  const { data, error } = await supabase.rpc("cliente_salvar", {
    p_cliente: id,
    p_versao: versao,
    p_campos: campos,
  });
  if (error) falhar(error);
  return data as { updated_at: string };
}

export async function anotar(id: string, texto: string) {
  const { error } = await supabase.rpc("cliente_anotar", { p_cliente: id, p_texto: texto });
  if (error) falhar(error);
}

/** Mensagens das regras do banco, em português para o usuário. */
export function mensagemDoFunil(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    versao_desatualizada: "Esta oportunidade mudou em outra tela. Atualize e tente de novo.",
    proximo_passo_obrigatorio: "Defina o próximo passo e a data antes de continuar.",
    fechar_sem_proposta:
      "Sem proposta aceita, escreva por que esta oportunidade está fechada (ex.: contrato assinado fora do Hub).",
    motivo_obrigatorio: "Escolha o motivo para arquivar.",
    nota_obrigatoria: "Escreva o motivo em poucas palavras.",
    whatsapp_ou_email: "Informe o WhatsApp ou o e-mail do contato.",
    whatsapp_invalido: "Confira o WhatsApp: use DDD e número, como (79) 9 0000-0000.",
    email_invalido: "Confira o e-mail digitado.",
    contato_obrigatorio: "Informe o nome do contato.",
    campos_obrigatorios: "Empresa e nome do contato são obrigatórios.",
    oportunidade_arquivada: "Esta oportunidade está arquivada. Desarquive para mover.",
    ja_existe_oportunidade_aberta: "Este cliente já tem uma oportunidade aberta.",
    anotacao_invalida: "Escreva a anotação (até 4.000 caracteres).",
    sem_permissao: "Você não tem permissão para essa ação.",
    oportunidade_fechada_por_aceite:
      "O cliente aceitou a proposta desta oportunidade. Ela fica em Fechado; para um novo trabalho, crie um novo contato.",
    valor_fechado_por_aceite:
      "O valor desta oportunidade é o da proposta aceita e não muda. Para algo a mais, use um serviço adicional.",
    tenant_ambiguo:
      "Seu acesso está em mais de uma empresa. Fale com o suporte para escolher a principal.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}

/**
 * Situação da proposta no cartão de Vendas (RD2-2), em frase curta.
 * "Vista há N dias" conta pelo dia do fuso da empresa (`hoje` vem do banco).
 */
export function situacaoProposta(
  o: Pick<Oportunidade, "proposta_status" | "proposta_vista_em" | "hoje">,
): { texto: string; tom: "neutro" | "info" | "atencao" | "risco" | "ok" } | null {
  switch (o.proposta_status) {
    case null:
      return null;
    case "rascunho":
      return { texto: "Proposta em rascunho", tom: "neutro" };
    case "aceita":
      return { texto: "Proposta aceita", tom: "ok" };
    case "recusada":
      return { texto: "Proposta recusada", tom: "risco" };
    case "enviada": {
      if (!o.proposta_vista_em) return { texto: "Enviada · não aberta", tom: "neutro" };
      const vista = new Date(o.proposta_vista_em.slice(0, 10) + "T12:00:00");
      const hoje = new Date(o.hoje + "T12:00:00");
      const dias = Math.max(0, Math.round((hoje.getTime() - vista.getTime()) / 86_400_000));
      const quando = dias === 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
      return { texto: `Vista ${quando}`, tom: "info" };
    }
  }
}
