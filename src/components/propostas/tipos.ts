import type {
  Conferencias,
  DocProposta,
  Fase,
  ItemEntrega,
  ItemFora,
  Proposta,
} from "@/lib/propostas";

/** O documento inteiro na tela (todas as chaves de proposta_salvar preenchidas). */
export type Rascunho = {
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
};

export function rascunhoDe(p: Proposta): Rascunho {
  const ouvimos = [...p.heard];
  while (ouvimos.length < 3) ouvimos.push("");
  return {
    tipo: p.project_type ?? "",
    titulo: p.title ?? "",
    apresentacao: p.intro ?? "",
    ouvimos: ouvimos.slice(0, 3),
    ouvimos_conclusao: p.heard_summary ?? "",
    itens: p.items,
    fora: p.exclusions,
    fases: p.phases,
    lancamento: p.launch_date,
    complexidade: Number(p.complexity),
    contingencia: p.contingency_pct,
    desconto_cents: p.discount_cents,
    desconto_motivo: p.discount_reason ?? "",
    plano_id: p.plan_id,
    infra_cents: p.infra_cents,
    conferencias: {
      escopo: p.checks.escopo ?? false,
      prazo: p.checks.prazo ?? false,
      contato: p.checks.contato ?? false,
    },
  };
}

/** Props comuns dos blocos do editor. */
export type PropsBloco = {
  d: Rascunho;
  alterar: (parcial: DocProposta) => void;
  bloqueado: boolean;
};
