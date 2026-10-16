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

export type ResumoClientes = Record<FiltroClientes, number> & {
  em_negociacao_cents: number;
  fechado_cents: number;
};

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
