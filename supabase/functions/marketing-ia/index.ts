/**
 * Função de servidor `marketing-ia` (card MK-3).
 *
 *   POST { versao, tipo }  (dono, com o login do Hub)  → sugestão guardada em mkt_ai_suggestions
 *
 * O navegador manda só o id da versão e a ação; o briefing vem do banco (mkt_ia_preparar, que
 * também confere dono, briefing, teto do mês e limite do dia). Toda chamada à API fica em ai_usage.
 *
 * Segredos (só aqui): ANTHROPIC_API_KEY (workspace fdp-hub), SUPABASE_SERVICE_ROLE_KEY.
 * Nunca escreva chave, briefing ou resposta da IA em log.
 */
import {
  baseDaSugestao,
  type Contexto,
  corpoDoPedido,
  entradaDaFerramenta,
  MODELO,
  origemPermitida,
  type Tipo,
  type Uso,
  usoDaResposta,
  validar,
} from "./logica.ts";

function env(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`falta_${nome.toLowerCase()}`);
  return v;
}

const SUPA = env("SUPABASE_URL");
const ANON = env("SUPABASE_ANON_KEY");
const SERVICO = env("SUPABASE_SERVICE_ROLE_KEY");
const TEMPO_LIMITE_MS = 40_000;
// Endereço da API. Só muda no teste local (servidor falso); em produção fica o padrão.
const API_IA = Deno.env.get("MARKETING_IA_API_URL") ?? "https://api.anthropic.com/v1/messages";

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPOS: readonly Tipo[] = ["versao", "ganchos", "revisao"];

type Chamada = { ok: true; resposta: unknown; uso: Uso } | { ok: false; erro: string; uso: Uso };

/** Chama a API de Mensagens com tempo-limite. Nunca devolve nem registra a chave. */
async function chamarIA(c: Contexto): Promise<Chamada> {
  const vazio: Uso = { entrada: 0, saida: 0, cache_escrita: 0, cache_leitura: 0 };
  const ctl = new AbortController();
  const relogio = setTimeout(() => ctl.abort(), TEMPO_LIMITE_MS);
  try {
    const res = await fetch(API_IA, {
      method: "POST",
      signal: ctl.signal,
      headers: {
        "x-api-key": env("ANTHROPIC_API_KEY"),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(corpoDoPedido(c)),
    });
    const corpo: unknown = await res.json().catch(() => null);
    const uso = usoDaResposta(corpo);
    if (!res.ok) {
      const motivo =
        res.status === 429 || res.status === 529 ? "ia_ocupada" : `ia_http_${res.status}`;
      return { ok: false, erro: motivo, uso };
    }
    return { ok: true, resposta: corpo, uso };
  } catch (e) {
    const motivo =
      e instanceof DOMException && e.name === "AbortError" ? "ia_tempo_esgotado" : "ia_sem_rede";
    return { ok: false, erro: motivo, uso: vazio };
  } finally {
    clearTimeout(relogio);
  }
}

async function sugerir(req: Request): Promise<Response> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || jwt === ANON) return json(req, { erro: "sem_login" }, 401);

  const pedido = (await req.json().catch(() => null)) as {
    versao?: unknown;
    tipo?: unknown;
  } | null;
  const versao =
    typeof pedido?.versao === "string" && UUID.test(pedido.versao) ? pedido.versao : null;
  const tipo = TIPOS.find((t) => t === pedido?.tipo) ?? null;
  if (!versao || !tipo) return json(req, { erro: "pedido_invalido" }, 400);

  // Confere dono, briefing, teto e limite do dia com o login de quem pediu.
  const ctx = await rpc<Contexto>("mkt_ia_preparar", { p_versao: versao, p_tipo: tipo }, jwt);

  const registrar = (conteudo: unknown, base: unknown, uso: Uso, erro: string | null) =>
    rpc<{ ok: boolean; custo: number; sugestao?: unknown }>(
      "mkt_ia_registrar",
      {
        p_tenant: ctx.tenant_id,
        p_usuario: ctx.usuario,
        p_versao: ctx.versao_id,
        p_tipo: tipo,
        p_modelo: MODELO,
        p_tokens: uso,
        p_conteudo: conteudo,
        p_base: base,
        p_erro: erro,
      },
      null,
    );

  const r = await chamarIA(ctx);
  if (!r.ok) {
    await registrar(null, null, r.uso, r.erro);
    console.error("marketing-ia: falha na IA", r.erro);
    return json(req, { erro: "ia_indisponivel" }, 502);
  }
  const entrada = entradaDaFerramenta(r.resposta, tipo);
  const validado = entrada ? validar(tipo, entrada, ctx) : null;
  if (!validado) {
    await registrar(null, null, r.uso, "resposta_fora_do_formato");
    console.error("marketing-ia: resposta fora do formato");
    return json(req, { erro: "ia_resposta_invalida" }, 502);
  }
  const gravado = await registrar(
    validado.conteudo,
    baseDaSugestao(ctx, validado.descartados),
    r.uso,
    null,
  );
  return json(req, { sugestao: gravado.sugestao, custo: gravado.custo });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { erro: "metodo" }, 405);
  try {
    return await sugerir(req);
  } catch (e) {
    if (e instanceof ErroBanco) {
      const status = e.status === 401 || e.message === "sem_permissao" ? 403 : 400;
      return json(req, { erro: e.message }, status);
    }
    console.error("marketing-ia: erro inesperado");
    return json(req, { erro: "falha" }, 500);
  }
});
