import { supabase } from "@/lib/supabase";
import { diaMes } from "@/lib/formatar";
import { rotuloDiagnostico, rotuloEtapa, type ClienteLinha, type Situacao } from "@/lib/funil";
import type { Tom } from "@/components/hub/Selo";

/** Regras de exibição da lista e da ficha de clientes (card S1). */

export type FiltroClientes = "todos" | "contato" | "negociacao" | "cliente" | "arquivado";

export const filtrosClientes: { id: FiltroClientes; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "contato", rotulo: "Contatos" },
  { id: "negociacao", rotulo: "Em negociação" },
  { id: "cliente", rotulo: "Clientes" },
  { id: "arquivado", rotulo: "Arquivados" },
];

/** Filtros da lista: as pílulas e os números da faixa (Para hoje, Vencidos). */
export type FiltroLista = FiltroClientes | "hoje" | "vencidos";

export type ResumoClientes = Record<FiltroClientes, number> & {
  em_negociacao_cents: number;
  fechado_cents: number;
  /** RD-1: passos de oportunidades abertas, no fuso da agência. */
  para_hoje: number;
  para_hoje_com_hora: number;
  vencidos: number;
  vencido_ha_dias: number;
  mensalidades_cents: number;
};

/** Ordem da lista (card RD-1). "atividade" é a ordem que vem do banco. */
export type OrdemClientes = "atividade" | "prazo" | "valor";
export const ordensClientes: { id: OrdemClientes; rotulo: string }[] = [
  { id: "atividade", rotulo: "última atividade" },
  { id: "prazo", rotulo: "prazo do próximo passo" },
  { id: "valor", rotulo: "valor" },
];

/** Oportunidade aberta com próximo passo (mesma regra do banco em clientes_resumo). */
export function passoAberto(c: Pick<ClienteLinha, "archived_at" | "stage" | "next_step">) {
  return Boolean(c.next_step) && !c.archived_at && c.stage !== null && c.stage !== "fechado";
}

export async function resumoClientes(): Promise<ResumoClientes> {
  const { data, error } = await supabase.rpc("clientes_resumo");
  if (error) throw error;
  return data as ResumoClientes;
}

export function situacaoDe(c: Pick<ClienteLinha, "situacao" | "stage">): {
  texto: string;
  tom: Tom;
} {
  const mapa: Record<Situacao, { texto: string; tom: Tom }> = {
    contato: { texto: "Contato", tom: "neutro" },
    negociacao: { texto: c.stage ? rotuloEtapa[c.stage] : "Em negociação", tom: "neutro" },
    cliente: { texto: "Cliente", tom: "info" },
    arquivado: { texto: "Arquivado", tom: "neutro" },
    sem_oportunidade: { texto: "Sem oportunidade", tom: "neutro" },
  };
  return mapa[c.situacao];
}

export function pacoteDe(c: ClienteLinha): { titulo: string; detalhe: string | null } {
  if (c.situacao === "arquivado") return { titulo: "—", detalhe: null };
  if (c.situacao === "cliente")
    return { titulo: "Projeto fechado", detalhe: "Detalhes chegam com os projetos" };
  if (c.diagnostic_tier) {
    return {
      titulo: `Diagnóstico ${rotuloDiagnostico[c.diagnostic_tier].toLowerCase()}`,
      detalhe: c.diagnostic_tier === "essencial" ? "Cerca de 7 h" : "Cerca de 15 h",
    };
  }
  if (c.stage === "proposta") return { titulo: "Proposta de projeto", detalhe: null };
  return { titulo: "Ainda sem pacote", detalhe: null };
}

export function valorDe(c: ClienteLinha): { valor: number | null; detalhe: string | null } {
  if (c.situacao === "arquivado") return { valor: null, detalhe: null };
  if (c.situacao === "cliente") return { valor: c.fechado_cents, detalhe: "Fechado" };
  if (c.diagnostic_tier)
    return { valor: c.value_cents, detalhe: c.diagnostic_paid ? "Pago" : "A pagar" };
  return { valor: c.value_cents, detalhe: null };
}

const atividades: Record<string, string> = {
  contato_criado: "Contato criado",
  contato_repetido: "Voltou a procurar",
  etapa_alterada: "Mudou de etapa",
  oportunidade_atualizada: "Oportunidade atualizada",
  arquivada: "Arquivado",
  desarquivada: "Voltou ao funil",
  cliente_atualizado: "Ficha atualizada",
  pedido_do_site: "Pedido pelo site",
  proposta_criada: "Proposta criada",
  proposta_enviada: "Proposta enviada",
  proposta_vista: "Cliente abriu a proposta",
  proposta_aceita: "Proposta aceita",
  proposta_recusada: "Proposta recusada",
  proposta_reaberta: "Proposta reaberta",
};

export function ultimaAtividade(c: ClienteLinha): { texto: string; quando: string } {
  return {
    texto: (c.ultima_atividade && atividades[c.ultima_atividade]) || "Ficha criada",
    quando: diaMes(c.last_activity_at),
  };
}

export function rotuloAtividade(kind: string | null): string {
  return (kind && atividades[kind]) || "Atividade";
}

// ---------------------------------------------------------------------
// RD2-5 · grupos, "agora" e logo
// ---------------------------------------------------------------------

export type GrupoCliente = "ativo" | "contato" | "ex" | "arquivado";
export type RelacaoCliente = "projeto_mensalidade" | "projeto" | "mensalidade" | "diagnostico";
export type NivelSaude = "ok" | "atencao" | "risco";

export type AgoraCliente = {
  grupo: GrupoCliente;
  relacao: RelacaoCliente | null;
  mensalidade_cents: number;
  projeto: {
    id: string;
    nome: string;
    fase_posicao: number | null;
    fase_nome: string | null;
    fases_total: number;
    saude: { nivel: NivelSaude; motivos: { chave: string; texto: string }[] };
  } | null;
  projetos_andamento: number;
  pedidos_abertos: number;
  proxima_cobranca: string | null;
  atrasada_desde: string | null;
  em_atraso_cents: number;
  recebido_ano_cents: number;
};

export type ClientesAgora = {
  itens: Record<string, AgoraCliente>;
  resumo: Record<GrupoCliente, number> & {
    mensalidades_cents: number;
    projetos_andamento: number;
    clientes_em_atraso: number;
  };
};

export const chavesAgora = ["clientes", "lista", "agora"] as const;

export async function clientesAgora(): Promise<ClientesAgora> {
  const { data, error } = await supabase.rpc("clientes_agora");
  if (error) throw error;
  return data as ClientesAgora;
}

export const gruposClientes: { id: GrupoCliente; rotulo: string }[] = [
  { id: "ativo", rotulo: "Clientes ativos" },
  { id: "contato", rotulo: "Contatos" },
  { id: "ex", rotulo: "Ex-clientes" },
  { id: "arquivado", rotulo: "Arquivados" },
];

export const rotuloRelacao: Record<RelacaoCliente, string> = {
  projeto_mensalidade: "Projeto + mensalidade",
  projeto: "Projeto",
  mensalidade: "Mensalidade",
  diagnostico: "Diagnóstico",
};

/** O que está acontecendo agora com o cliente, numa linha (a mais urgente primeiro). */
export function textoAgora(a: AgoraCliente | undefined): { texto: string; tom: Tom | null } {
  if (!a) return { texto: "—", tom: null };
  if (a.atrasada_desde) return { texto: "Cobrança atrasada", tom: "risco" };
  const p = a.projeto;
  if (p) {
    const fase =
      p.fase_posicao && p.fases_total ? `Fase ${p.fase_posicao} de ${p.fases_total}` : p.nome;
    if (p.saude.nivel === "risco") return { texto: `${fase} · em risco`, tom: "risco" };
    if (p.saude.nivel === "atencao") return { texto: `${fase} · pede atenção`, tom: "atencao" };
    return { texto: `${fase} · no ritmo`, tom: null };
  }
  if (a.pedidos_abertos > 0)
    return {
      texto: a.pedidos_abertos === 1 ? "1 pedido aberto" : `${a.pedidos_abertos} pedidos abertos`,
      tom: null,
    };
  return { texto: "Tudo em dia", tom: null };
}

const BUCKET_LOGOS = "logos-clientes";
const TIPOS_LOGO: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Confere o arquivo antes de enviar (o bucket também recusa). */
export function problemaNaLogo(arquivo: File): string | null {
  if (!TIPOS_LOGO[arquivo.type]) return "Use uma imagem PNG, JPG ou WEBP.";
  if (arquivo.size > 1024 * 1024) return "A imagem passa de 1 MB. Reduza e tente de novo.";
  return null;
}

/** Envia a logo, grava na ficha e apaga a anterior. Falha no banco apaga o arquivo novo. */
export async function enviarLogo(clienteId: string, arquivo: File): Promise<string> {
  const problema = problemaNaLogo(arquivo);
  if (problema) throw new Error(problema);
  const caminho = `${clienteId}/logo-${Date.now()}.${TIPOS_LOGO[arquivo.type]}`;
  const up = await supabase.storage
    .from(BUCKET_LOGOS)
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase.rpc("cliente_logo", {
    p_cliente: clienteId,
    p_caminho: caminho,
  });
  if (error) {
    await supabase.storage.from(BUCKET_LOGOS).remove([caminho]);
    throw error;
  }
  const anterior = (data as { anterior: string | null }).anterior;
  if (anterior) await supabase.storage.from(BUCKET_LOGOS).remove([anterior]);
  return caminho;
}

export async function tirarLogo(clienteId: string): Promise<void> {
  const { data, error } = await supabase.rpc("cliente_logo", {
    p_cliente: clienteId,
    p_caminho: null,
  });
  if (error) throw error;
  const anterior = (data as { anterior: string | null }).anterior;
  if (anterior) await supabase.storage.from(BUCKET_LOGOS).remove([anterior]);
}

/** Endereços temporários (1 hora) das logos, de uma vez só. */
export async function enderecosDasLogos(caminhos: string[]): Promise<Record<string, string>> {
  const unicos = [...new Set(caminhos)].filter(Boolean);
  if (unicos.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET_LOGOS).createSignedUrls(unicos, 3600);
  if (error) throw error;
  const mapa: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl;
  return mapa;
}
