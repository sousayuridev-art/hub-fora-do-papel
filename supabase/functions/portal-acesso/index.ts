/**
 * Função de servidor `portal-acesso` (card SEG-2): link de primeiro acesso ao portal.
 *
 *   POST { cliente, email }  (dono, com o login do Hub e o código do app)  → { token_hash, tipo }
 *
 * 1. `portal_primeiro_acesso` (com o login de quem pediu) confere dono com código, convite ou acesso
 *    desta empresa, limite do dia e a regra que protege contas: só conta SEM senha, sem acesso em
 *    outro tenant e que não é dona de nada. E registra o pedido em event_outbox.
 * 2. Com a chave de serviço, o Auth gera o link sem mandar e-mail. O navegador monta o endereço
 *    /auth/callback?token_hash=… e o Yuri envia pelo WhatsApp; a pessoa cria a própria senha.
 *
 * Segredo (só aqui): SUPABASE_SERVICE_ROLE_KEY. Nunca escreva token, e-mail ou chave em log.
 */
import { erroPublico, lerPedido, linkDaResposta, origemPermitida, tipoDoLink } from "./logica.ts";

function env(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`falta_${nome.toLowerCase()}`);
  return v;
}

const SUPA = env("SUPABASE_URL");
const ANON = env("SUPABASE_ANON_KEY");
const SERVICO = env("SUPABASE_SERVICE_ROLE_KEY");

class ErroBanco extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
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
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** RPC com o login de quem pediu: o banco decide se pode. */
async function preparar(jwt: string, cliente: string, email: string) {
  const res = await fetch(`${SUPA}/rest/v1/rpc/portal_primeiro_acesso`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_cliente: cliente, p_email: email }),
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
  return JSON.parse(corpo) as { email: string; existe: boolean };
}

async function gerar(req: Request): Promise<Response> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || jwt === ANON) return json(req, { erro: "sem_permissao" }, 401);
  const pedido = lerPedido(await req.json().catch(() => null));
  if (!pedido) return json(req, { erro: "email_invalido" }, 400);

  const ok = await preparar(jwt, pedido.cliente, pedido.email);

  const res = await fetch(`${SUPA}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: SERVICO,
      Authorization: `Bearer ${SERVICO}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: tipoDoLink(ok.existe), email: ok.email }),
  });
  if (!res.ok) {
    console.error("portal-acesso: generate_link", res.status);
    return json(req, { erro: "falha" }, 502);
  }
  const link = linkDaResposta(await res.json().catch(() => null));
  if (!link) {
    console.error("portal-acesso: resposta sem token");
    return json(req, { erro: "falha" }, 502);
  }
  return json(req, link);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { erro: "metodo" }, 405);
  try {
    return await gerar(req);
  } catch (e) {
    if (e instanceof ErroBanco) {
      if (e.status >= 500) return json(req, { erro: "falha" }, 503);
      const erro = erroPublico(e.message);
      const status =
        e.status === 401 || erro === "sem_permissao" || erro === "precisa_codigo" ? 403 : 400;
      return json(req, { erro }, status);
    }
    console.error("portal-acesso: erro inesperado");
    return json(req, { erro: "falha" }, 500);
  }
});
