import { supabase } from "@/lib/supabase";
import type { SituacaoFase, SituacaoProjeto } from "@/lib/projetos";
import { enviarDoPortal, tipoDoArquivo } from "@/lib/materiais";
import type { SitePortal } from "@/lib/sitesCliente";
import type { ContextoPedido, SituacaoPedido } from "@/lib/pedidos";

/** Portal do cliente (card S3): tudo pelas RPCs portal_*, que só devolvem a empresa de quem entrou. */

export type PendenciasDoPortal = {
  aprovacoes: number;
  pendencias: number;
  /** Contas vencidas ou vencendo em 5 dias que o cliente ainda não avisou que pagou (REV-3, CX-0). Só para o responsável. */
  pagamentos: number;
  total: number;
  pedidos_andamento: number;
  /** Formulários do site sem resposta (PC-5). Fica fora de "total": a tela soma. */
  contatos?: number;
};

export type AcaoPortal =
  | {
      tipo: "aprovacao";
      id: string;
      titulo: string;
      /** O que conferir, escrito ao pedir a aprovação (CX-5). */
      detalhe?: string | null;
      quando: string;
    }
  | { tipo: "adicional"; id: string; titulo: string; valor_cents: number | null; quando: string }
  | {
      /** Conta vencida ou vencendo em 5 dias (só para o responsável pelo contrato: CX-0). */
      tipo: "pagamento";
      id: string;
      titulo: string;
      valor_cents: number;
      vencimento: string;
      atrasada: boolean;
    }
  | {
      tipo: "pendencia";
      id: string;
      titulo: string;
      detalhe: string | null;
      prazo: string | null;
      atrasada: boolean | null;
    };

export type InicioPortal = {
  empresa: string;
  contato: string | null;
  responsavel: string | null;
  /** WhatsApp do responsável da agência, para o botão "Falar no WhatsApp". */
  responsavel_whatsapp: string | null;
  hoje: string;
  /** Quem entrou: responsável pelo contrato ou equipe (CX-0). */
  perfil: "responsavel" | "equipe";
  pendencias: PendenciasDoPortal;
  projeto: {
    id: string;
    nome: string;
    status: SituacaoProjeto;
    lancamento: string | null;
    plano: string | null;
    mensal_cents: number | null;
    fases: {
      nome: string;
      quando: string | null;
      status: SituacaoFase;
      concluida_em: string | null;
    }[];
    /** Projeto por módulos (SS-1): a linha mostra um marco por módulo. */
    tipo?: "padrao" | "sob_medida";
    modulos?: ModuloPortal[];
  } | null;
  acoes: AcaoPortal[];
  /** Primeiro site da empresa (card PC-1); null quando não há site ligado. */
  site?: SitePortal | null;
};

/** Módulo como o cliente vê (sem link de testes nem rodadas). */
export type ModuloPortal = {
  id: string;
  nome: string;
  ordem: number;
  situacao:
    "planejado" | "desenvolvimento" | "testes" | "aguardando_aprovacao" | "aprovado" | "publicado";
  no_ar_desde: string | null;
  ultima_versao: string | null;
  link: string | null;
  versoes: { notas: string; quando: string }[];
};

export type EntregaPortal = {
  id: string;
  titulo: string;
  descricao: string | null;
  itens: string[];
  previa: string | null;
  status: "aguardando" | "aprovada" | "ajuste";
  enviada_em: string;
  decidida_em: string | null;
  comentario: string | null;
  fase: string | null;
  projeto: string | null;
};

export type AdicionalPortal = {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  nota: string | null;
  horas: number | null;
  valor_cents: number | null;
  hora_cents: number;
  status: SituacaoPedido;
  decisao: "aprovado" | "recusado" | null;
  decidido_em: string | null;
};

export type AprovacoesPortal = {
  pode_aprovar: boolean;
  entregas: EntregaPortal[];
  adicionais: AdicionalPortal[];
};

export type PedidoPortal = {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  status: SituacaoPedido;
  classificacao: "escopo" | "mensalidade" | "adicional" | null;
  horas: number | null;
  valor_cents: number | null;
  nota: string | null;
  decisao: "aprovado" | "recusado" | null;
  criado_em: string;
  pronto_em: string | null;
};

export const chavesPortal = {
  tudo: ["portal"] as const,
  pendencias: ["portal", "pendencias"] as const,
  inicio: ["portal", "inicio"] as const,
  aprovacoes: ["portal", "aprovacoes"] as const,
  pedidos: ["portal", "pedidos"] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const pendenciasDoPortal = () => rpc<PendenciasDoPortal>("portal_pendencias");
export const inicioDoPortal = () => rpc<InicioPortal>("portal_inicio");
export const aprovacoesDoPortal = () => rpc<AprovacoesPortal>("portal_aprovacoes");
export const pedidosDoPortal = () => rpc<PedidoPortal[]>("portal_pedidos");

export const aprovarEntrega = (id: string, comentario: string) =>
  rpc<{ repetido: boolean }>("portal_aprovar", { p_id: id, p_comentario: comentario || null });
export const pedirAjuste = (id: string, comentario: string) =>
  rpc("portal_pedir_ajuste", { p_id: id, p_comentario: comentario });
export const decidirAdicional = (id: string, aprova: boolean, comentario: string) =>
  rpc<{ repetido: boolean }>("portal_adicional_decidir", {
    p_id: id,
    p_aprova: aprova,
    p_comentario: comentario || null,
  });
export const marcarPendenciaFeita = (id: string) => rpc("portal_pendencia_feita", { p_id: id });
/** Anexos do pedido (card PC-2): até 3, só print ou PDF, até 5 MB cada. */
export const anexosDoPedido = {
  maximo: 3,
  tamanho: 5 * 1024 * 1024,
  tipos: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  aceitar: ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf",
};

/** Confere o anexo antes de enviar; devolve o motivo da recusa ou null. */
export function problemaDoAnexo(f: File): string | null {
  if (!anexosDoPedido.tipos.includes(tipoDoArquivo(f)))
    return `${f.name}: use foto (JPG, PNG ou WebP) ou PDF.`;
  if (f.size > anexosDoPedido.tamanho) return `${f.name}: passa de 5 MB.`;
  return null;
}

export type NovoPedido = {
  titulo: string;
  descricao: string;
  siteId?: string | null;
  contexto?: ContextoPedido | null;
  arquivos?: File[];
};

// Arquivo já enviado não sobe de novo quando o cliente toca em "Tentar de novo"
const anexosEnviados = new WeakMap<File, string>();

export async function fazerPedido(v: NovoPedido) {
  const anexos: string[] = [];
  for (const arquivo of v.arquivos ?? []) {
    const problema = problemaDoAnexo(arquivo);
    if (problema) throw new Error(problema);
    let id = anexosEnviados.get(arquivo);
    if (!id) {
      id = (await enviarDoPortal({ arquivo, titulo: `Anexo: ${v.titulo}`, pendenciaId: null })).id;
      anexosEnviados.set(arquivo, id);
    }
    anexos.push(id);
  }
  const contexto = v.contexto && Object.values(v.contexto).some(Boolean) ? v.contexto : null;
  return rpc<{ id: string; codigo: string }>("portal_pedido_criar", {
    p_titulo: v.titulo,
    p_descricao: v.descricao || null,
    p_site: v.siteId ?? null,
    p_contexto: contexto,
    p_anexos: anexos.length ? anexos : null,
  });
}

/** Etapa atual (0 a 4); -1 quando recusado. Depois do sim, o adicional já conta como "Fazendo". */
export function etapaDoPedido(
  p: Pick<PedidoPortal, "status" | "classificacao" | "decisao">,
): number {
  switch (p.status) {
    case "recebido":
      return 0;
    case "em_analise":
      return p.decisao === "aprovado" ? 3 : 1;
    case "aguardando_cliente":
      return 2;
    case "fazendo":
      return 3;
    case "pronto":
      return 4;
    case "recusado":
      return -1;
  }
}

/** Quem é da equipe não tem acesso a dinheiro (CX-0); o banco recusa com este código. */
export function semPermissaoFinanceira(e: unknown): boolean {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  return texto.includes("sem_permissao_financeiro");
}

export function mensagemDoPortal(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    aprovacao_ja_decidida: "Essa entrega já foi respondida.",
    sem_permissao_aprovar: "Seu acesso não permite aprovar. Peça a quem aprova na sua empresa.",
    comentario_obrigatorio: "Conte o que precisa mudar (pelo menos 5 letras).",
    pedido_indisponivel: "Esse pedido não está mais esperando sua decisão.",
    muitas_tentativas: "Você já fez muitos pedidos hoje. Fale com o seu responsável pelo WhatsApp.",
    titulo_obrigatorio: "Escreva o que você precisa (pelo menos 2 letras).",
    site_de_outra_empresa: "Esse site não é da sua empresa. Recarregue a página.",
    muitos_anexos: "Anexe no máximo 3 arquivos.",
    anexo_invalido: "Um dos anexos não serve: use foto ou PDF de até 5 MB e tente de novo.",
    arquivo_nao_chegou: "O anexo não chegou. Confira a internet e tente de novo.",
    aprovacao_inexistente: "Essa entrega não está mais disponível.",
    pendencia_inexistente: "Essa pendência não está mais disponível.",
    sem_permissao_financeiro:
      "Valores e serviços adicionais ficam com o responsável pelo contrato na sua empresa.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}

export type PagamentosPortal = {
  hoje: string;
  projeto: {
    nome: string;
    total_cents: number;
    pago_cents: number;
    diagnostico_cents: number;
  } | null;
  mensalidade: {
    plano: string;
    valor_cents: number;
    inicio: string;
    dia: number;
    minimo_meses: number;
    situacao: "ativa" | "pausada";
    horas_mes: number | null;
  } | null;
  mensalidade_prevista: {
    plano: string;
    valor_cents: number | null;
    lancamento: string | null;
  } | null;
  cobrancas: import("@/lib/financeiro").Cobranca[];
  pix: { chave: string; nome: string; cidade: string } | null;
  regras: { multa_pct: number; juros_pct: number };
  responsavel: string | null;
};

export const chavePagamentos = ["portal", "pagamentos"] as const;
export const pagamentosDoPortal = () => rpc<PagamentosPortal>("portal_pagamentos");
export const avisarPagamento = (id: string) =>
  rpc<{ repetido: boolean }>("portal_cobranca_avisar", { p_id: id });

/** Módulos (SS-1) no formato da linha do projeto: no ar = concluído, em andamento = símbolo, planejado = contorno. */
export function marcosDosModulos(modulos: ModuloPortal[]) {
  const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return modulos.map((m) => {
    const noAr = m.situacao === "publicado" || m.no_ar_desde !== null;
    const status: SituacaoFase =
      m.situacao === "publicado"
        ? "concluida"
        : m.situacao === "planejado" && !noAr
          ? "pendente"
          : "andamento";
    const legenda =
      m.situacao === "publicado" && m.no_ar_desde
        ? `No ar desde ${dia.format(new Date(m.no_ar_desde))}`
        : m.situacao === "aguardando_aprovacao"
          ? "Esperando sua aprovação"
          : m.situacao === "planejado"
            ? "Próximo"
            : noAr
              ? "No ar; nova versão em andamento"
              : "Em andamento";
    return { nome: m.nome, quando: null, status, concluida_em: m.no_ar_desde, legenda };
  });
}
