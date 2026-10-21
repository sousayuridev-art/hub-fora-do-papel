import { supabase } from "@/lib/supabase";

/** Reuniões do Google Meet no Hub (card RE-1). */

export type SituacaoReuniao = "aguardando_transcricao" | "transcrita" | "sem_transcricao";
export type FiltroReunioes = "todas" | "sem_cliente" | "sem_transcricao";

export type Reuniao = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  situacao: SituacaoReuniao;
  codigo: string | null;
  convidados: number;
  vinculo: "email" | "manual" | null;
  cliente: { id: string; nome: string } | null;
  deal_id: string | null;
  projeto: { id: string; nome: string } | null;
};

export type Fala = { quem: string; seg: number; texto: string };

export type ReuniaoAberta = Reuniao & {
  lista_convidados: { email: string; nome?: string }[];
  falas: Fala[];
  idioma: string | null;
};

export type ListaReunioes = { itens: Reuniao[]; sem_cliente: number; sem_transcricao: number };

export type SituacaoGoogle = {
  ligada: boolean;
  email: string | null;
  situacao: "ligada" | "religar" | null;
  ultima_busca: string | null;
  erro: string | null;
};

export const rotuloSituacao: Record<SituacaoReuniao, string> = {
  aguardando_transcricao: "Aguardando transcrição",
  transcrita: "Transcrita",
  sem_transcricao: "Sem transcrição",
};

export const chavesReunioes = {
  tudo: ["reunioes"] as const,
  lista: (filtro: FiltroReunioes, cliente: string | null) =>
    ["reunioes", "lista", filtro, cliente] as const,
  uma: (id: string) => ["reunioes", "uma", id] as const,
  google: ["reunioes", "google"] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export function listarReunioes(filtro: FiltroReunioes, cliente: string | null = null) {
  return rpc<ListaReunioes>("reunioes_listar", { p_filtro: filtro, p_cliente: cliente });
}

export function abrirReuniao(id: string) {
  return rpc<ReuniaoAberta>("reuniao_abrir", { p_id: id });
}

export function vincularReuniao(
  id: string,
  cliente: string | null,
  deal: string | null,
  projeto: string | null,
) {
  return rpc<Reuniao>("reuniao_vincular", {
    p_id: id,
    p_cliente: cliente,
    p_deal: deal,
    p_projeto: projeto,
  });
}

export function situacaoGoogle() {
  return rpc<SituacaoGoogle>("google_situacao");
}

/** Segunda etapa da ligação: só quem pediu confirma, com o próprio login. */
export function confirmarGoogle(codigo: string) {
  return rpc<{ email: string }>("google_confirmar", { p_codigo: codigo });
}

/** Chama a função de servidor `reunioes-google` com o login de quem está no Hub. */
async function funcao<T>(rota: "conectar" | "buscar" | "desligar"): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`reunioes-google/${rota}`, {
    method: "POST",
    body: {},
  });
  if (error) {
    const corpo: unknown = await (error as { context?: Response }).context
      ?.json?.()
      .catch(() => null);
    const msg =
      corpo && typeof corpo === "object" && "erro" in corpo ? String(corpo.erro) : error.message;
    throw new Error(msg);
  }
  return data as T;
}

/** Abre a tela de permissão do Google (volta para Configurações). */
export async function ligarGoogle(): Promise<void> {
  const { url } = await funcao<{ url: string }>("conectar");
  if (!url.startsWith("https://accounts.google.com/"))
    throw new Error("Endereço do Google inesperado.");
  window.location.assign(url);
}

export function buscarAgora() {
  return funcao<{ reunioes?: number; aguarde?: boolean }>("buscar");
}

export function desligarGoogle() {
  return funcao<{ ok: true }>("desligar");
}

/** Mensagens da volta do Google (?google=...). */
export const voltaDoGoogle: Record<string, { ok: boolean; texto: string }> = {
  ligado: { ok: true, texto: "Google ligado. As reuniões começam a entrar na próxima busca." },
  recusado: {
    ok: false,
    texto: "A permissão não foi dada no Google. Tente de novo quando quiser.",
  },
  sem_permissao: {
    ok: false,
    texto:
      "Faltou marcar o acesso ao Meet e à Agenda na tela do Google. Ligue de novo e marque os dois.",
  },
  expirado: {
    ok: false,
    texto: "O pedido de ligação venceu. Clique em “Ligar ao Google” de novo.",
  },
  erro: { ok: false, texto: "Não foi possível ligar o Google. Tente de novo em instantes." },
};

/** 52 min, 1h05 */
export function duracao(inicio: string, fim: string | null): string | null {
  if (!fim) return null;
  const min = Math.round((Date.parse(fim) - Date.parse(inicio)) / 60000);
  if (!Number.isFinite(min) || min <= 0) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** 4 → "0:04"; 3725 → "1:02:05" */
export function minuto(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = String(seg % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
