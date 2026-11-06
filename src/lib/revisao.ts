import { enviarDoPortal } from "@/lib/materiais";
import { supabase } from "@/lib/supabase";

/**
 * Revisão do site pelo portal (cards RS-1 a RS-3). O cliente marca ajustes (rascunho), envia todos
 * de uma vez (revisão 1, 2…), confere cada um e o responsável aprova o site. Regras no banco.
 */

export type TipoAjuste = "texto" | "foto" | "tirar" | "mover" | "incluir" | "outro";
export type SituacaoAjuste =
  "enviado" | "fazendo" | "para_ver" | "aprovado" | "orcamento" | "recusado";
export type Posicao = { x: number; y: number };

/** Ajuste ainda na lista (rascunho). */
export type AjusteRascunho = {
  id: string;
  tipo: TipoAjuste;
  pagina_id: string | null;
  pagina: string;
  secao_id: string | null;
  secao: string | null;
  posicao: Posicao | null;
  antes: string | null;
  depois: string | null;
  observacao: string | null;
  foto_id: string | null;
  foto: string | null;
  audio_id: string | null;
  audio: string | null;
  meu: boolean;
  autor: string | null;
};

/** Ajuste já enviado (é um pedido de ajuste no Hub). */
export type AjusteEnviado = {
  id: string;
  codigo: string;
  ordem: number;
  tipo: TipoAjuste | null;
  pagina: string | null;
  secao: string | null;
  posicao: Posicao | null;
  antes: string | null;
  depois: string | null;
  descricao: string | null;
  situacao: SituacaoAjuste;
  nota: string | null;
  refeito_vezes: number;
  validado_em: string | null;
  pronto_em: string | null;
  foto: string | null;
  conversa: { autor: "equipe" | "cliente"; nome: string; texto: string; em: string }[];
};

export type Revisao = {
  site: { id: string; nome: string; dominio: string; modulos: string[] };
  /** Revisões incluídas na proposta (2). */
  incluidas: number;
  /** Número da próxima revisão a enviar. */
  proxima: number;
  aprovado_em: string | null;
  aprovado_por: string | null;
  /** Só o responsável pelo contrato que pode aprovar (CX-0). */
  pode_aprovar: boolean;
  responsavel: string;
  para_ver: number;
  rascunho: { id: string; numero: number; itens: AjusteRascunho[] } | null;
  rodadas: { id: string; numero: number; enviada_em: string; ajustes: AjusteEnviado[] }[];
};

/** O que vai para o banco ao salvar um ajuste. */
export type NovoAjuste = {
  id?: string;
  tipo: TipoAjuste;
  pagina_id?: string | null;
  pagina: string;
  secao_id?: string | null;
  secao?: string | null;
  posicao?: Posicao | null;
  antes?: string | null;
  depois?: string | null;
  observacao?: string | null;
  foto_id?: string | null;
  audio_id?: string | null;
};

export const chavesRevisao = {
  site: (siteId: string) => ["revisao", siteId] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const lerRevisao = (siteId: string) => rpc<Revisao>("portal_revisao", { p_site: siteId });

export const salvarAjuste = (siteId: string, a: NovoAjuste) =>
  rpc<{ id: string; rodada_id: string; numero: number }>("portal_revisao_salvar", {
    p_site: siteId,
    p_ajuste: a,
  });

export const tirarAjuste = (id: string) => rpc<null>("portal_revisao_tirar", { p_ajuste: id });

export const enviarRevisao = (rodadaId: string) =>
  rpc<{ numero: number; ajustes: number }>("portal_revisao_enviar", { p_rodada: rodadaId });

export const ficouBom = (pedidoId: string) =>
  rpc<{ repetido: boolean }>("portal_revisao_ficou_bom", { p_pedido: pedidoId });

export const outraMudanca = (pedidoId: string, texto: string) =>
  rpc<{ vez: number }>("portal_revisao_outra_mudanca", { p_pedido: pedidoId, p_texto: texto });

export const aprovarSite = (siteId: string, confirmacoes: boolean[]) =>
  rpc<{ repetido: boolean }>("portal_revisao_aprovar", {
    p_site: siteId,
    p_confirmacoes: confirmacoes,
  });

/** Os 6 tipos de ajuste, com a frase curta que aparece no cartão. */
export const tiposDeAjuste: { id: TipoAjuste; nome: string; ajuda: string }[] = [
  { id: "texto", nome: "Trocar texto", ajuda: "Escrever outra frase" },
  { id: "foto", nome: "Trocar foto", ajuda: "Enviar uma imagem nova" },
  { id: "tirar", nome: "Tirar", ajuda: "Remover esta parte" },
  { id: "mover", nome: "Mudar de lugar", ajuda: "Levar para outro ponto" },
  { id: "incluir", nome: "Incluir algo", ajuda: "Algo que ainda não tem" },
  { id: "outro", nome: "Outra coisa", ajuda: "Explicar do seu jeito" },
];

export const nomeDoTipo = (t: TipoAjuste | null): string =>
  tiposDeAjuste.find((x) => x.id === t)?.nome ?? "Ajuste";

/** Situação em frase normal (sem caixa alta), com o tom das cores de situação do Hub. */
export const situacaoDoAjuste: Record<
  SituacaoAjuste,
  { rotulo: string; tom: "neutro" | "info" | "atencao" | "ok" | "risco" }
> = {
  enviado: { rotulo: "Enviado", tom: "neutro" },
  fazendo: { rotulo: "Fazendo", tom: "neutro" },
  para_ver: { rotulo: "Para você ver", tom: "info" },
  aprovado: { rotulo: "Ficou bom", tom: "ok" },
  orcamento: { rotulo: "Orçamento para aprovar", tom: "atencao" },
  recusado: { rotulo: "Não vamos fazer", tom: "risco" },
};

/** Ajuste fechado: conferido pelo cliente ou recusado. O site só é aprovado com todos fechados. */
export const ajusteFechado = (a: Pick<AjusteEnviado, "situacao">) =>
  a.situacao === "aprovado" || a.situacao === "recusado";

/** Pronto para a aprovação final: nada em aberto em nenhuma revisão enviada. */
export function prontoParaAprovar(r: Pick<Revisao, "rodadas" | "aprovado_em">): boolean {
  if (r.aprovado_em) return false;
  return r.rodadas.every((d) => d.ajustes.every(ajusteFechado));
}

/** O que falta para aprovar, em frase curta ("2 ajustes para você ver · 1 orçamento"). */
export function oQueFalta(r: Pick<Revisao, "rodadas">): string | null {
  const todos = r.rodadas.flatMap((d) => d.ajustes);
  const ver = todos.filter((a) => a.situacao === "para_ver").length;
  const orc = todos.filter((a) => a.situacao === "orcamento").length;
  const fazendo = todos.filter((a) => a.situacao === "enviado" || a.situacao === "fazendo").length;
  const partes = [
    ver && `${ver} ${ver === 1 ? "ajuste para você ver" : "ajustes para você ver"}`,
    orc && `${orc} ${orc === 1 ? "orçamento para aprovar" : "orçamentos para aprovar"}`,
    fazendo && `${fazendo} ${fazendo === 1 ? "ajuste sendo feito" : "ajustes sendo feitos"}`,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

/** Posição do toque dentro da seção, de 0 a 1 (vale no celular e no computador). */
export function posicaoNaSecao(
  toque: { x: number; y: number },
  caixa: { left: number; top: number; width: number; height: number },
): Posicao {
  const p = (v: number) => Math.round(Math.min(Math.max(v, 0), 1) * 10000) / 10000;
  return {
    x: p(caixa.width ? (toque.x - caixa.left) / caixa.width : 0),
    y: p(caixa.height ? (toque.y - caixa.top) / caixa.height : 0),
  };
}

/** Texto que estava onde a pessoa tocou, limpo e curto (vira o "Hoje está assim"). */
export function textoDoToque(bruto: string | null | undefined): string | null {
  const t = (bruto ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > 300 ? `${t.slice(0, 297)}…` : t;
}

export const fotosAceitas = ["image/jpeg", "image/png", "image/webp"];
export const LIMITE_ARQUIVO = 5 * 1024 * 1024;

/** Confere a foto antes de enviar; devolve o motivo da recusa ou null. */
export function problemaDaFoto(f: File): string | null {
  if (!fotosAceitas.includes(f.type)) return "Use uma foto em JPG, PNG ou WebP.";
  if (f.size > LIMITE_ARQUIVO) return "A foto passa de 5 MB. Escolha uma menor.";
  return null;
}

/** Tipo do áudio gravado, sem os detalhes do codec ("audio/webm;codecs=opus" → "audio/webm"). */
export function tipoDoAudio(mime: string): "audio/webm" | "audio/mp4" | "audio/ogg" | null {
  const base = mime.split(";")[0]?.trim().toLowerCase();
  return base === "audio/webm" || base === "audio/mp4" || base === "audio/ogg" ? base : null;
}

/** Envia a foto nova ou o áudio pela mesma rota de Arquivos (S8) e devolve o id do arquivo. */
export async function enviarArquivoDoAjuste(arquivo: File, titulo: string): Promise<string> {
  const r = await enviarDoPortal({ arquivo, titulo, pendenciaId: null });
  return r.id;
}

/** Mensagem em português para os erros da revisão; null para os genéricos. */
export function mensagemDaRevisao(e: unknown): string | null {
  const t =
    typeof e === "object" && e !== null && "message" in e
      ? String((e as { message: unknown }).message)
      : String(e ?? "");
  const mapa: [RegExp, string][] = [
    [
      /revisao_encerrada/,
      "O site já foi aprovado. Para mudar algo agora, faça um pedido de ajuste.",
    ],
    [/revisao_ja_enviada/, "Esta revisão já foi enviada."],
    [/revisao_vazia/, "A lista está vazia. Marque pelo menos um ajuste."],
    [
      /muitos_ajustes/,
      "Uma revisão aceita até 30 ajustes. Envie esta e marque o resto na próxima.",
    ],
    [
      /ajuste_de_outra_pessoa/,
      "Só quem marcou este ajuste, ou o responsável pelo contrato, pode mudar.",
    ],
    [/anexo_invalido/, "Não conseguimos usar esse arquivo. Envie a foto ou o áudio de novo."],
    [/ajuste_invalido|pagina_obrigatoria/, "Diga o que deve mudar antes de pôr na lista."],
    [
      /limite_refacao/,
      "Este ajuste já foi refeito duas vezes. Para mudar de novo, marque um ajuste novo.",
    ],
    [/ajuste_ja_aprovado/, "Você já disse que este ajuste ficou bom."],
    [/ajuste_ainda_nao_pronto/, "Este ajuste ainda está sendo feito."],
    [/so_responsavel/, "Só o responsável pelo contrato aprova o site."],
    [/confirmacoes_obrigatorias/, "Marque as três confirmações para aprovar."],
    [/ajustes_em_aberto/, "Ainda há ajustes em aberto. Confira todos antes de aprovar."],
    [/texto_obrigatorio/, "Conte o que ainda precisa mudar."],
  ];
  return mapa.find(([re]) => re.test(t))?.[1] ?? null;
}
