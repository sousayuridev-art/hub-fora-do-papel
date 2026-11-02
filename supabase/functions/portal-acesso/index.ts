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

/** Chama uma RPC com o login de quem pediu (jwt) ou como servidor (null). */
async function rpc<T>(nome: string, args: Record<string, unknown>, jwt: string | null): Promise<T> {
  const res = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: {
      apikey: jwt ? ANON : SERVICO,
      Authorization: `Bearer ${jwt ?? SERVICO}`,
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

type Preparo = {
  erro?: string;
  email?: string;
  existe?: boolean;
  tenant_id?: string;
  usuario?: string | null;
  agora?: string;
};

/** Valor aleatório de 48 bytes: ninguém o conhece; só derruba credencial posta por terceiros. */
function valorAleatorio(): string {
  const b = new Uint8Array(48);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b));
}

async function gerar(req: Request): Promise<Response> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || jwt === ANON) return json(req, { erro: "sem_permissao" }, 401);
  const pedido = lerPedido(await req.json().catch(() => null));
  if (!pedido) return json(req, { erro: "email_invalido" }, 400);

  // 1. O banco decide (com o login do dono) e registra o pedido, atendido ou recusado
  const p = await rpc<Preparo>(
    "portal_primeiro_acesso",
    { p_cliente: pedido.cliente, p_email: pedido.email },
    jwt,
  );
  if (p.erro) return json(req, { erro: erroPublico(p.erro) }, 400);
  if (typeof p.email !== "string" || typeof p.tenant_id !== "string")
    return json(req, { erro: "falha" }, 502);

  // 2. Conta que já existe (e em que a pessoa nunca criou senha): troca a senha por uma aleatória.
  //    Fecha o caso de alguém ter criado a conta pelo cadastro público com uma senha que conhece.
  if (p.existe === true) {
    if (typeof p.usuario !== "string") return json(req, { erro: "falha" }, 502);
    const troca = await fetch(`${SUPA}/auth/v1/admin/users/${p.usuario}`, {
      method: "PUT",
      headers: {
        apikey: SERVICO,
        Authorization: `Bearer ${SERVICO}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: valorAleatorio() }),
    });
    if (!troca.ok) {
      console.error("portal-acesso: troca", troca.status);
      return json(req, { erro: "falha" }, 502);
    }
  }

  // 3. O Auth gera o link sem mandar e-mail
  const res = await fetch(`${SUPA}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: SERVICO,
      Authorization: `Bearer ${SERVICO}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: tipoDoLink(p.existe === true), email: p.email }),
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

  if (p.existe === true && link.usuario !== p.usuario) {
    console.error("portal-acesso: conta diferente da conferida");
    return json(req, { erro: "falha" }, 502);
  }

  // 4. A conta fica presa a este tenant (convites de outro tenant não são aceitos por ela).
  //    Se a conta já for de outro tenant, o link não sai daqui.
  await rpc<null>(
    "portal_conta_origem_gravar",
    {
      p_usuario: link.usuario,
      p_tenant: p.tenant_id,
      p_desde: p.existe === true ? (p.agora ?? null) : null,
    },
    null,
  );
  return json(req, { token_hash: link.token_hash, tipo: link.tipo });
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
        erro === "muitas_tentativas"
          ? 429
          : e.status === 401 || erro === "sem_permissao" || erro === "precisa_codigo"
            ? 403
            : 400;
      return json(req, { erro }, status);
    }
    console.error("portal-acesso: erro inesperado");
    return json(req, { erro: "falha" }, 500);
  }
});
