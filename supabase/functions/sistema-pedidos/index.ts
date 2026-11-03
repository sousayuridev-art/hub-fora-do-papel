/**
 * Função de servidor `sistema-pedidos` (card SIS-2): os sistemas que entregamos mandam e
 * acompanham pedidos de ajuste no Hub. Chamada SÓ de servidor para servidor (o sistema do cliente
 * guarda a chave no servidor dele); por isso não há CORS e o navegador não consegue chamar.
 *
 *   cabeçalho x-hub-chave: fdp_…            (chave do sistema, gerada no Hub)
 *   GET  /pedidos                           lista os pedidos deste sistema (até 300)
 *   GET  /pedidos/:id                       detalhe, conversa e prints (endereços de 10 min)
 *   POST /pedidos                           cria { titulo, descricao, tipo, prioridade, solicitante }
 *   POST /pedidos/:id/mensagens             { autor_nome, texto }
 *   POST /pedidos/:id/prints                corpo = a imagem (png, jpg ou webp, até 2 MB)
 *
 * Publicada sem verificação de JWT (quem chama não tem login do Hub); a chave é conferida no banco
 * pelo sha256. Segredo (só aqui): SUPABASE_SERVICE_ROLE_KEY. Nunca escreva chave, token, texto do
 * pedido ou nome de pessoa em log.
 */
import {
  erroPublico,
  extensao,
  lerChave,
  lerMensagem,
  lerNovoPedido,
  lerRota,
  statusDoErro,
  TAMANHO_MAXIMO_PRINT,
  tipoDaImagem,
} from "./logica.ts";

function env(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`falta_${nome.toLowerCase()}`);
  return v;
}

const SUPA = env("SUPABASE_URL");
const SERVICO = env("SUPABASE_SERVICE_ROLE_KEY");
const BUCKET = "pedidos-anexos";
const LIMITE_JSON = 20_000;

class ErroBanco extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const cabecalhos = {
  apikey: SERVICO,
  Authorization: `Bearer ${SERVICO}`,
};

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { ...cabecalhos, "Content-Type": "application/json" },
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

type Sistema = { sistema_id: string; tenant_id: string };

async function lerJson(req: Request): Promise<unknown> {
  const t = await req.text();
  if (t.length > LIMITE_JSON) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** Endereços assinados (10 min) para os prints do detalhe. */
async function assinar(prints: { caminho: string }[]): Promise<Record<string, string>> {
  if (prints.length === 0) return {};
  const res = await fetch(`${SUPA}/storage/v1/object/sign/${BUCKET}`, {
    method: "POST",
    headers: { ...cabecalhos, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600, paths: prints.map((p) => p.caminho) }),
  });
  if (!res.ok) return {};
  const lista = (await res.json()) as { path?: string; signedURL?: string | null }[];
  const mapa: Record<string, string> = {};
  for (const x of lista)
    if (x.path && x.signedURL) mapa[x.path] = `${SUPA}/storage/v1${x.signedURL}`;
  return mapa;
}

async function atender(req: Request, s: Sistema): Promise<Response> {
  const url = new URL(req.url);
  const rota = lerRota(req.method, url.pathname);
  if (!rota) return json({ erro: "rota_inexistente" }, 404);

  switch (rota.tipo) {
    case "listar":
      return json({ pedidos: await rpc("_sis_pedidos", { p_sistema: s.sistema_id }) });

    case "detalhe": {
      const p = await rpc<
        { prints: { id: string; caminho: string; tipo: string }[] } & Record<string, unknown>
      >("_sis_pedido", { p_sistema: s.sistema_id, p_pedido: rota.pedido });
      const urls = await assinar(p.prints ?? []);
      // O caminho no bucket não sai daqui: só o id e o endereço temporário
      const prints = (p.prints ?? []).map(({ caminho, ...x }) => ({
        ...x,
        url: urls[caminho] ?? null,
      }));
      return json({ ...p, prints });
    }

    case "criar": {
      const d = lerNovoPedido(await lerJson(req));
      if ("erro" in d) return json({ erro: d.erro }, 400);
      return json(await rpc("_sis_pedido_criar", { p_sistema: s.sistema_id, p_dados: d }), 201);
    }

    case "mensagem": {
      const d = lerMensagem(await lerJson(req));
      if ("erro" in d) return json({ erro: d.erro }, 400);
      return json(
        await rpc("_sis_mensagem", { p_sistema: s.sistema_id, p_pedido: rota.pedido, p_dados: d }),
        201,
      );
    }

    case "print": {
      const tamanho = Number(req.headers.get("content-length") ?? "0");
      if (tamanho > TAMANHO_MAXIMO_PRINT) return json({ erro: "print_grande" }, 413);
      const bytes = new Uint8Array(await req.arrayBuffer());
      if (bytes.length === 0 || bytes.length > TAMANHO_MAXIMO_PRINT)
        return json({ erro: "print_grande" }, 413);
      const tipo = tipoDaImagem(bytes);
      if (!tipo) return json({ erro: "print_invalido" }, 415);
      const caminho = `${s.tenant_id}/${rota.pedido}/${crypto.randomUUID()}.${extensao[tipo]}`;
      // Confere o pedido antes de gravar o arquivo (evita arquivo solto de pedido de outro sistema)
      await rpc("_sis_pedido", { p_sistema: s.sistema_id, p_pedido: rota.pedido });
      const up = await fetch(`${SUPA}/storage/v1/object/${BUCKET}/${caminho}`, {
        method: "POST",
        headers: { ...cabecalhos, "Content-Type": tipo, "x-upsert": "false" },
        body: bytes,
      });
      if (!up.ok) {
        console.error("sistema-pedidos: envio do print", up.status);
        return json({ erro: "falha" }, 502);
      }
      try {
        const a = await rpc<{ id: string; tipo: string }>("_sis_anexo", {
          p_sistema: s.sistema_id,
          p_pedido: rota.pedido,
          p_caminho: caminho,
          p_tipo: tipo,
          p_tamanho: bytes.length,
        });
        return json({ id: a.id, tipo: a.tipo }, 201);
      } catch (e) {
        await fetch(`${SUPA}/storage/v1/object/${BUCKET}`, {
          method: "DELETE",
          headers: { ...cabecalhos, "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: [caminho] }),
        });
        throw e;
      }
    }
  }
}

Deno.serve(async (req) => {
  // Sem CORS de propósito: só servidor chama.
  if (req.method === "OPTIONS") return new Response(null, { status: 405 });
  try {
    const chave = lerChave(req.headers.get("x-hub-chave"));
    if (!chave) return json({ erro: "sem_chave" }, 401);
    const s = await rpc<Sistema | null>("_sis_por_chave", { p_chave: chave });
    if (!s) return json({ erro: "chave_invalida" }, 401);
    return await atender(req, s);
  } catch (e) {
    if (e instanceof ErroBanco) {
      if (e.status >= 500) return json({ erro: "falha" }, 503);
      const erro = erroPublico(e.message);
      return json({ erro }, statusDoErro(erro));
    }
    console.error("sistema-pedidos: erro inesperado");
    return json({ erro: "falha" }, 500);
  }
});
