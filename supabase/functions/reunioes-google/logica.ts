/**
 * Lógica pura da função `reunioes-google` (card RE-1): sem rede, sem Deno.
 * Testada pelo Vitest em src/test/reunioes-logica.test.ts.
 */

export const ESCOPOS = [
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
] as const;

/** Origens para onde a ligação com o Google pode voltar (igual à regra do banco). */
const ORIGENS = [
  /^https:\/\/spring-board-kit\.lovable\.app$/,
  /^https:\/\/([a-z0-9-]+\.)*foradopapel\.com\.br$/,
  /^http:\/\/(localhost|127\.0\.0\.1):[0-9]{2,5}$/,
];
export const ORIGEM_PADRAO = "https://spring-board-kit.lovable.app";

export function origemPermitida(origem: string | null | undefined): origem is string {
  return typeof origem === "string" && ORIGENS.some((r) => r.test(origem));
}

// ---------------------------------------------------------------------
// Cifra do token de renovação (AES-GCM, chave derivada do segredo do cliente OAuth)
// ---------------------------------------------------------------------
const texto = new TextEncoder();

export async function chaveDoSegredo(segredo: string): Promise<CryptoKey> {
  if (segredo.length < 10) throw new Error("segredo_curto");
  const base = await crypto.subtle.importKey("raw", texto.encode(segredo), "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: texto.encode("fdp-hub/re1"),
      info: texto.encode("google-refresh-token"),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function paraBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function deBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** `agencia` entra como dado associado: a cifra de uma agência não abre em outra. */
export async function cifrar(claro: string, chave: CryptoKey, agencia: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: texto.encode(agencia) },
      chave,
      texto.encode(claro),
    ),
  );
  const tudo = new Uint8Array(iv.length + ct.length);
  tudo.set(iv);
  tudo.set(ct, iv.length);
  return paraBase64(tudo);
}

export async function decifrar(b64: string, chave: CryptoKey, agencia: string): Promise<string> {
  const tudo = deBase64(b64);
  const claro = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: tudo.slice(0, 12), additionalData: texto.encode(agencia) },
    chave,
    tudo.slice(12),
  );
  return new TextDecoder().decode(claro);
}

// ---------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------
export function urlDeAutorizacao(clientId: string, redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ESCOPOS.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

/** E-mail do id_token devolvido pelo próprio endpoint de token do Google (canal TLS direto). */
export function emailDoIdToken(idToken: string | undefined): string | null {
  const parte = idToken?.split(".")[1];
  if (!parte) return null;
  try {
    const json = atob(
      parte
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(parte.length / 4) * 4, "="),
    );
    const dados = JSON.parse(json) as { email?: unknown; email_verified?: unknown };
    return typeof dados.email === "string" && dados.email_verified === true
      ? dados.email.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

export function escoposConcedidos(escopo: string | undefined): boolean {
  const lista = (escopo ?? "").split(/\s+/);
  return (
    lista.includes("https://www.googleapis.com/auth/meetings.space.readonly") &&
    lista.includes("https://www.googleapis.com/auth/calendar.events")
  );
}

// ---------------------------------------------------------------------
// Meet e Agenda
// ---------------------------------------------------------------------
export type Fala = { quem: string; seg: number; texto: string };
export type Convidado = { email: string; nome?: string };

export type ParticipanteMeet = {
  name: string;
  signedinUser?: { displayName?: string };
  anonymousUser?: { displayName?: string };
  phoneUser?: { displayName?: string };
};

export type FalaMeet = { participant?: string; text?: string; startTime?: string };

export type EventoAgenda = {
  id?: string;
  summary?: string;
  hangoutLink?: string;
  conferenceData?: { conferenceId?: string };
  attendees?: { email?: string; displayName?: string; resource?: boolean }[];
};

export function nomeDoParticipante(p: ParticipanteMeet): string {
  const nome =
    p.signedinUser?.displayName ?? p.anonymousUser?.displayName ?? p.phoneUser?.displayName;
  return nome?.trim() || "Participante";
}

export const LIMITE_FALAS = 20000;

/** Falas do Meet → falas do Hub (quem, segundos desde o início, texto). */
export function montarFalas(
  entradas: FalaMeet[],
  nomes: ReadonlyMap<string, string>,
  inicioReuniao: string,
): Fala[] {
  const inicio = Date.parse(inicioReuniao);
  const falas: Fala[] = [];
  for (const e of entradas) {
    const t = (e.text ?? "").trim();
    if (!t) continue;
    const quando = e.startTime ? Date.parse(e.startTime) : NaN;
    const seg =
      Number.isFinite(quando) && Number.isFinite(inicio)
        ? Math.max(0, Math.floor((quando - inicio) / 1000))
        : 0;
    falas.push({
      quem: (e.participant && nomes.get(e.participant)) || "Participante",
      seg,
      texto: t.slice(0, 5000),
    });
    if (falas.length >= LIMITE_FALAS) break;
  }
  return falas;
}

/** Evento da Agenda da reunião, pelo código do Meet (ex.: tuy-wrbo-myq). */
export function acharEvento(
  eventos: EventoAgenda[],
  codigo: string | undefined,
): EventoAgenda | null {
  if (!codigo) return null;
  const c = codigo.toLowerCase();
  return (
    eventos.find(
      (e) =>
        e.conferenceData?.conferenceId?.toLowerCase() === c ||
        (e.hangoutLink ?? "").toLowerCase().endsWith(`/${c}`),
    ) ?? null
  );
}

export function convidadosDoEvento(e: EventoAgenda | null): Convidado[] {
  const vistos = new Set<string>();
  const out: Convidado[] = [];
  for (const a of e?.attendees ?? []) {
    const email = a.email?.trim().toLowerCase();
    if (!email || a.resource || vistos.has(email)) continue;
    vistos.add(email);
    out.push(a.displayName ? { email, nome: a.displayName.slice(0, 120) } : { email });
    if (out.length >= 200) break;
  }
  return out;
}

const DUAS_HORAS = 2 * 60 * 60 * 1000;

/** Sem transcrição pronta: espera 2 horas depois do fim antes de dizer "Sem transcrição". */
export function situacaoSemFalas(
  fim: string | undefined,
  agora: number,
): "aguardando_transcricao" | "sem_transcricao" {
  const f = fim ? Date.parse(fim) : NaN;
  return Number.isFinite(f) && agora - f > DUAS_HORAS
    ? "sem_transcricao"
    : "aguardando_transcricao";
}

/** Primeira busca: últimos 30 dias. Depois: desde a última busca menos 48 horas. */
export function inicioDaJanela(ultimaBusca: string | null, agora: number): string {
  const base = ultimaBusca
    ? Date.parse(ultimaBusca) - 48 * 3600 * 1000
    : agora - 30 * 24 * 3600 * 1000;
  return new Date(base).toISOString();
}

// ---------------------------------------------------------------------
// Agenda da semana e "Marcar reunião" (card RD2-3)
// ---------------------------------------------------------------------

/** Evento da Google Agenda como a lista de eventos devolve (só o que o Hub usa). */
export type EventoLista = Omit<EventoAgenda, "attendees"> & {
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  attendees?: {
    email?: string;
    displayName?: string;
    resource?: boolean;
    self?: boolean;
    responseStatus?: string;
  }[];
};

export type EventoHub = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  dia_inteiro: boolean;
  meet: string | null;
  local: string | null;
  convidados: Convidado[];
};

const OITO_DIAS = 8 * 24 * 60 * 60 * 1000;

/** Janela pedida pela tela: datas válidas, início antes do fim, no máximo 8 dias. */
export function janelaValida(
  inicio: unknown,
  fim: unknown,
): { inicio: string; fim: string } | null {
  if (typeof inicio !== "string" || typeof fim !== "string") return null;
  const i = Date.parse(inicio);
  const f = Date.parse(fim);
  if (!Number.isFinite(i) || !Number.isFinite(f) || f <= i || f - i > OITO_DIAS) return null;
  return { inicio: new Date(i).toISOString(), fim: new Date(f).toISOString() };
}

/** Eventos do Google → eventos da agenda do Hub (sem cancelados; sem a própria pessoa nos convidados). */
export function eventosParaAgenda(itens: EventoLista[]): EventoHub[] {
  const out: EventoHub[] = [];
  for (const e of itens) {
    if (!e.id || e.status === "cancelled") continue;
    const diaInteiro = !e.start?.dateTime && !!e.start?.date;
    const inicio = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00` : null);
    const fim = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00` : inicio);
    if (!inicio || !fim) continue;
    const convidados = convidadosDoEvento({
      attendees: (e.attendees ?? []).filter((a) => !a.self),
    });
    out.push({
      id: e.id.slice(0, 1024),
      titulo: (e.summary ?? "").trim().slice(0, 200) || "Sem título",
      inicio,
      fim,
      dia_inteiro: diaInteiro,
      meet: e.hangoutLink?.startsWith("https://meet.google.com/") ? e.hangoutLink : null,
      local: e.location?.slice(0, 200) ?? null,
      convidados,
    });
    if (out.length >= 200) break;
  }
  return out;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Pedido de "Marcar reunião" → corpo do evento do Google, com Meet. Nulo se algo estiver errado. */
export function eventoParaCriar(
  p: unknown,
  pedidoId: string,
): { corpo: Record<string, unknown> } | { erro: string } {
  if (!p || typeof p !== "object") return { erro: "pedido_invalido" };
  const d = p as Record<string, unknown>;
  const titulo = typeof d["titulo"] === "string" ? d["titulo"].trim().slice(0, 200) : "";
  if (!titulo) return { erro: "titulo_obrigatorio" };
  const janela = janelaValida(d["inicio"], d["fim"]);
  if (!janela || Date.parse(janela.fim) - Date.parse(janela.inicio) > 8 * 3600 * 1000)
    return { erro: "horario_invalido" };
  const lista = Array.isArray(d["convidados"]) ? d["convidados"] : [];
  const emails = [
    ...new Set(
      lista
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().toLowerCase())
        .filter((x) => EMAIL.test(x)),
    ),
  ];
  if (emails.length > 30) return { erro: "convidados_demais" };
  const descricao =
    typeof d["descricao"] === "string" ? d["descricao"].trim().slice(0, 2000) : undefined;
  return {
    corpo: {
      summary: titulo,
      ...(descricao ? { description: descricao } : {}),
      start: { dateTime: janela.inicio },
      end: { dateTime: janela.fim },
      attendees: emails.map((email) => ({ email })),
      conferenceData: {
        createRequest: { requestId: pedidoId, conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
    },
  };
}
