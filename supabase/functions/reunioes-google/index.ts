/**
 * Função de servidor `reunioes-google` (card RE-1).
 *
 *   POST /conectar  (dono, com o login do Hub)  → endereço do Google para dar permissão
 *   GET  /retorno   (o Google chama)             → guarda a permissão cifrada e volta ao Hub
 *   POST /buscar    (pg_cron a cada 15 min, ou o dono em "Buscar agora")
 *   POST /desligar  (dono)                       → revoga no Google e apaga a conexão
 *
 * Segredos (só aqui): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPABASE_SERVICE_ROLE_KEY.
 * Nunca escreva token, código ou segredo em log ou em resposta.
 */
import {
  type Convidado,
  type EventoAgenda,
  type FalaMeet,
  type ParticipanteMeet,
  acharEvento,
  chaveDoSegredo,
  cifrar,
  convidadosDoEvento,
  decifrar,
  emailDoIdToken,
  escoposConcedidos,
  inicioDaJanela,
  LIMITE_FALAS,
  montarFalas,
  nomeDoParticipante,
  ORIGEM_PADRAO,
  origemPermitida,
  situacaoSemFalas,
  urlDeAutorizacao,
} from "./logica.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

function env(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`falta_${nome.toLowerCase()}`);
  return v;
}

const SUPA = env("SUPABASE_URL");
const ANON = env("SUPABASE_ANON_KEY");
const SERVICO = env("SUPABASE_SERVICE_ROLE_KEY");
const RETORNO = `${SUPA}/functions/v1/reunioes-google/retorno`;
const LIMITE_POR_BUSCA = 15;

// ---------------------------------------------------------------------
// Banco (PostgREST)
// ---------------------------------------------------------------------
class ErroBanco extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/** Chama uma RPC como servidor (usuario nulo) ou com o login de quem pediu. */
async function rpc<T>(
  nome: string,
  args: Record<string, unknown>,
  usuario: string | null,
): Promise<T> {
  const res = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: {
      apikey: usuario ? ANON : SERVICO,
      Authorization: `Bearer ${usuario ?? SERVICO}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const corpo = await res.text();
  if (!res.ok) {
    let msg = "erro_banco";
    try {
      msg = (JSON.parse(corpo) as { message?: string }).message ?? msg;
    } catch {
      /* corpo não é JSON */
    }
    throw new ErroBanco(res.status, msg);
  }
  return (corpo ? JSON.parse(corpo) : null) as T;
}

type Situacao = { tenant_id: string };

/** Confere que quem chamou é dono de uma agência (a RPC recusa os outros). */
async function donoDaAgencia(req: Request): Promise<{ tenant: string; jwt: string }> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || jwt === ANON) throw new ErroBanco(401, "sem_login");
  const s = await rpc<Situacao>("google_situacao", {}, jwt);
  return { tenant: s.tenant_id, jwt };
}

// ---------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------
class ErroGoogle extends Error {
  constructor(
    public codigo: "religar" | "falha",
    mensagem: string,
  ) {
    super(mensagem);
  }
}

async function tokenDeAcesso(refresh: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (j.error === "invalid_grant" || j.error === "unauthorized_client") {
    throw new ErroGoogle("religar", "A permissão do Google venceu ou foi retirada. Ligue de novo.");
  }
  if (!res.ok || !j.access_token)
    throw new ErroGoogle("falha", `Google recusou a renovação (${res.status}).`);
  return j.access_token;
}

async function gGet<T>(url: string, acesso: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${acesso}` } });
  if (res.status === 401 || res.status === 403) {
    throw new ErroGoogle("religar", "O Google negou o acesso às reuniões. Ligue de novo.");
  }
  if (!res.ok) throw new ErroGoogle("falha", `Google respondeu ${res.status}.`);
  return (await res.json()) as T;
}

const MEET = "https://meet.googleapis.com/v2";

type Registro = { name: string; startTime: string; endTime?: string; space?: string };
type Transcricao = { name: string; state?: string };

async function todasAsPaginas<I>(
  base: string,
  chave: string,
  acesso: string,
  maxPaginas: number,
): Promise<I[]> {
  const itens: I[] = [];
  let pagina: string | undefined;
  for (let i = 0; i < maxPaginas; i++) {
    const sep = base.includes("?") ? "&" : "?";
    const url = pagina ? `${base}${sep}pageToken=${encodeURIComponent(pagina)}` : base;
    const j = await gGet<Record<string, unknown>>(url, acesso);
    itens.push(...((j[chave] as I[] | undefined) ?? []));
    pagina = j["nextPageToken"] as string | undefined;
    if (!pagina) break;
  }
  return itens;
}

/** Uma reunião do Meet → objeto que a RPC reuniao_gravar espera. */
async function lerReuniao(
  r: Registro,
  eventos: EventoAgenda[],
  acesso: string,
): Promise<Record<string, unknown>> {
  let codigo: string | undefined;
  if (r.space) {
    const sala = await gGet<{ meetingCode?: string }>(`${MEET}/${r.space}`, acesso).catch(() => ({
      meetingCode: undefined,
    }));
    codigo = sala.meetingCode;
  }
  const evento = acharEvento(eventos, codigo);
  const convidados: Convidado[] = convidadosDoEvento(evento);

  const transcricoes = await todasAsPaginas<Transcricao>(
    `${MEET}/${r.name}/transcripts?pageSize=10`,
    "transcripts",
    acesso,
    2,
  );
  const pronta =
    transcricoes.find((t) => t.state === "FILE_GENERATED") ??
    transcricoes.find((t) => t.state === "ENDED");

  const dados: Record<string, unknown> = {
    registro: r.name,
    codigo,
    evento_id: evento?.id,
    titulo: evento?.summary,
    inicio: r.startTime,
    fim: r.endTime,
    convidados,
    situacao:
      transcricoes.length > 0 ? "aguardando_transcricao" : situacaoSemFalas(r.endTime, Date.now()),
  };
  if (!pronta) return dados;

  const participantes = await todasAsPaginas<ParticipanteMeet>(
    `${MEET}/${r.name}/participants?pageSize=100`,
    "participants",
    acesso,
    5,
  );
  const nomes = new Map(participantes.map((p) => [p.name, nomeDoParticipante(p)]));
  const entradas = await todasAsPaginas<FalaMeet>(
    `${MEET}/${pronta.name}/entries?pageSize=100`,
    "transcriptEntries",
    acesso,
    LIMITE_FALAS / 100,
  );
  const falas = montarFalas(entradas, nomes, r.startTime);
  if (falas.length > 0) {
    dados["falas"] = falas;
    dados["transcricao_nome"] = pronta.name;
    dados["idioma"] = (entradas[0] as { languageCode?: string } | undefined)?.languageCode;
  } else if (pronta.state === "FILE_GENERATED") {
    dados["situacao"] = situacaoSemFalas(r.endTime, Date.now());
  }
  return dados;
}

type Conexao = {
  tenant_id: string;
  google_email: string;
  token_cipher: string;
  last_sync_at: string | null;
};

/** Busca as reuniões de uma agência. Sempre libera a trava no fim. */
async function sincronizar(c: Conexao): Promise<number> {
  let gravadas = 0;
  try {
    const chave = await chaveDoSegredo(env("GOOGLE_CLIENT_SECRET"));
    const refresh = await decifrar(c.token_cipher, chave, c.tenant_id).catch(() => {
      throw new ErroGoogle("religar", "Não foi possível ler a permissão guardada. Ligue de novo.");
    });
    const acesso = await tokenDeAcesso(refresh);
    const desde = inicioDaJanela(c.last_sync_at, Date.now());

    const filtro = encodeURIComponent(`end_time>="${desde}"`);
    const registros = (
      await todasAsPaginas<Registro>(
        `${MEET}/conferenceRecords?pageSize=25&filter=${filtro}`,
        "conferenceRecords",
        acesso,
        8,
      )
    ).filter((r) => r.endTime);
    if (registros.length === 0) {
      await rpc("google_busca_concluir", { p_tenant: c.tenant_id, p_ok: true }, null);
      return 0;
    }

    const prontas = new Set(
      await rpc<string[]>(
        "reunioes_transcritas",
        { p_tenant: c.tenant_id, p_registros: registros.map((r) => r.name) },
        null,
      ),
    );
    // No máximo LIMITE_POR_BUSCA reuniões por vez (cabe no tempo da função); o resto fica para a próxima.
    const todas = registros.filter((r) => !prontas.has(r.name));
    const pendentes = todas.slice(0, LIMITE_POR_BUSCA);

    const q = new URLSearchParams({
      timeMin: new Date(Date.parse(desde) - 24 * 3600 * 1000).toISOString(),
      timeMax: new Date().toISOString(),
      singleEvents: "true",
      maxResults: "250",
    });
    const eventos = pendentes.length
      ? await todasAsPaginas<EventoAgenda>(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?${q.toString()}`,
          "items",
          acesso,
          4,
        )
      : [];

    let falhas = 0;
    for (const r of pendentes) {
      try {
        await rpc(
          "reuniao_gravar",
          { p_tenant: c.tenant_id, p: await lerReuniao(r, eventos, acesso) },
          null,
        );
        gravadas++;
      } catch (e) {
        if (e instanceof ErroGoogle && e.codigo === "religar") throw e;
        falhas++;
        console.error(
          "reunioes-google: falha ao gravar reunião",
          e instanceof Error ? e.message : "erro",
        );
      }
    }
    await rpc(
      "google_busca_concluir",
      {
        p_tenant: c.tenant_id,
        p_ok: falhas === 0,
        p_avancar: todas.length <= LIMITE_POR_BUSCA,
        p_erro: falhas
          ? `${falhas} reunião(ões) não entraram nesta busca; tentaremos de novo.`
          : null,
      },
      null,
    );
  } catch (e) {
    const religar = e instanceof ErroGoogle && e.codigo === "religar";
    const msg =
      e instanceof ErroGoogle ? e.message : "Falha inesperada na busca. Tentaremos de novo.";
    console.error("reunioes-google: busca falhou", religar ? "religar" : "falha");
    await rpc(
      "google_busca_concluir",
      { p_tenant: c.tenant_id, p_ok: false, p_erro: msg, p_religar: religar },
      null,
    ).catch(() => console.error("reunioes-google: não liberou a trava"));
    throw e;
  }
  return gravadas;
}

// ---------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------
function cors(req: Request): Record<string, string> {
  const origem = req.headers.get("Origin");
  return origemPermitida(origem)
    ? {
        "Access-Control-Allow-Origin": origem,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      }
    : {};
}

function json(req: Request, corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

function voltar(origem: string, resultado: string): Response {
  return Response.redirect(
    `${origem}/app/configuracoes?google=${encodeURIComponent(resultado)}`,
    302,
  );
}

async function conectar(req: Request): Promise<Response> {
  const { jwt } = await donoDaAgencia(req);
  const origem = req.headers.get("Origin");
  const volta = origemPermitida(origem) ? origem : ORIGEM_PADRAO;
  const state = await rpc<string>("google_estado_criar", { p_volta: volta }, jwt);
  return json(req, { url: urlDeAutorizacao(env("GOOGLE_CLIENT_ID"), RETORNO, state) });
}

async function retorno(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const state = q.get("state") ?? "";
  if (!/^[a-f0-9]{64}$/.test(state)) return voltar(ORIGEM_PADRAO, "expirado");
  const estado = await rpc<{ tenant_id: string; volta: string } | null>(
    "google_estado_ler",
    { p_state: state },
    null,
  );
  if (!estado) return voltar(ORIGEM_PADRAO, "expirado");
  const volta = origemPermitida(estado.volta) ? estado.volta : ORIGEM_PADRAO;

  const codigo = q.get("code");
  if (q.get("error") || !codigo) return voltar(volta, "recusado");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: RETORNO,
      grant_type: "authorization_code",
    }),
  });
  const t = (await res.json().catch(() => ({}))) as {
    refresh_token?: string;
    id_token?: string;
    scope?: string;
  };
  if (!res.ok || !t.refresh_token) return voltar(volta, "erro");
  if (!escoposConcedidos(t.scope)) return voltar(volta, "sem_permissao");
  const email = emailDoIdToken(t.id_token);
  if (!email) return voltar(volta, "erro");

  const cifra = await cifrar(
    t.refresh_token,
    await chaveDoSegredo(env("GOOGLE_CLIENT_SECRET")),
    estado.tenant_id,
  );
  // Etapa 1: guarda no pedido. A conexão só nasce quando quem pediu confirma no Hub (google_confirmar).
  const confirmar = await rpc<string | null>(
    "google_estado_guardar",
    { p_state: state, p_email: email, p_cifra: cifra },
    null,
  );
  if (!confirmar) return voltar(volta, "expirado");
  return Response.redirect(
    `${volta}/app/configuracoes?google=confirmar&c=${encodeURIComponent(confirmar)}`,
    302,
  );
}

async function buscar(req: Request): Promise<Response> {
  const temLogin = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (temLogin && temLogin !== ANON) {
    // "Buscar agora" pelo dono: espera o resultado para mostrar na tela.
    const { tenant } = await donoDaAgencia(req);
    const reservadas = await rpc<Conexao[]>("google_conexoes_reservar", { p_tenant: tenant }, null);
    if (reservadas.length === 0) return json(req, { reunioes: 0, aguarde: true });
    try {
      const n = await sincronizar(reservadas[0] as Conexao);
      return json(req, { reunioes: n });
    } catch (e) {
      return json(req, { erro: e instanceof Error ? e.message : "falha" }, 409);
    }
  }
  // Busca automática: responde já e trabalha em segundo plano.
  const trabalho = (async () => {
    const reservadas = await rpc<Conexao[]>("google_conexoes_reservar", {}, null);
    for (const c of reservadas) await sincronizar(c).catch(() => undefined);
  })().catch(() => console.error("reunioes-google: busca automática falhou"));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(trabalho);
  else await trabalho;
  return json(req, { ok: true }, 202);
}

async function desligar(req: Request): Promise<Response> {
  const { tenant } = await donoDaAgencia(req);
  const cifra = await rpc<string | null>("google_conexao_remover", { p_tenant: tenant }, null);
  if (cifra) {
    try {
      const token = await decifrar(
        cifra,
        await chaveDoSegredo(env("GOOGLE_CLIENT_SECRET")),
        tenant,
      );
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      });
    } catch {
      console.error("reunioes-google: não revogou no Google (a conexão já foi apagada)");
    }
  }
  return json(req, { ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  const rota = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  try {
    if (rota === "retorno" && req.method === "GET") return await retorno(req);
    if (req.method !== "POST") return json(req, { erro: "metodo" }, 405);
    if (rota === "conectar") return await conectar(req);
    if (rota === "buscar") return await buscar(req);
    if (rota === "desligar") return await desligar(req);
    return json(req, { erro: "rota" }, 404);
  } catch (e) {
    if (e instanceof ErroBanco) {
      const status = e.status === 401 || e.message === "sem_permissao" ? 403 : 400;
      return rota === "retorno"
        ? voltar(ORIGEM_PADRAO, "erro")
        : json(req, { erro: e.message }, status);
    }
    console.error("reunioes-google: erro inesperado na rota", rota);
    return rota === "retorno" ? voltar(ORIGEM_PADRAO, "erro") : json(req, { erro: "falha" }, 500);
  }
});
