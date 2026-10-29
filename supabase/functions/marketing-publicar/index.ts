/**
 * Função de servidor `marketing-publicar` (card MK-5). Chamada pelo pg_cron (sem login): só trabalha
 * a fila do banco e não devolve dados, como a busca de reuniões.
 *
 *   POST /publicar  (a cada 5 min) → versões na hora: pacote → Upload-Post → enviada/publicada/falhou
 *   POST /conferir  (a cada 5 min) → enviadas esperando confirmação → publicada/falhou
 *   POST /medir     (1 vez por dia) → números dos posts dos últimos 30 dias → Resultados
 *
 * Segredos (só aqui): UPLOAD_POST_API_KEY, UPLOAD_POST_USER (perfil), LINKEDIN_PAGE_ID (opcional) e
 * SUPABASE_SERVICE_ROLE_KEY. Os arquivos saem por link assinado de 1 hora; nada fica público.
 * Nunca escreva chave, texto da peça ou link assinado em log.
 */
import {
  achar,
  acharPost,
  enderecoUploadPost,
  ErroPedido,
  esperouDemais,
  lerNumeros,
  lerSituacao,
  montarPedido,
  type Pacote,
} from "./logica.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

function env(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`falta_${nome.toLowerCase()}`);
  return v;
}
const SUPA = env("SUPABASE_URL");
const SERVICO = env("SUPABASE_SERVICE_ROLE_KEY");
const CHAVE = Deno.env.get("UPLOAD_POST_API_KEY") ?? "";
const PERFIL = Deno.env.get("UPLOAD_POST_USER") ?? "";
const PAGINA_LINKEDIN = Deno.env.get("LINKEDIN_PAGE_ID") ?? null;
const TEMPO_LIMITE_MS = 60_000;
// Só no teste local (servidor falso); em produção vale sempre o endereço do Upload-Post.
const API = enderecoUploadPost(SUPA, Deno.env.get("UPLOAD_POST_API_URL"));

async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: {
      apikey: SERVICO,
      Authorization: `Bearer ${SERVICO}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const corpo = await res.text();
  if (!res.ok) throw new Error(`banco_${res.status}`);
  return (corpo ? JSON.parse(corpo) : null) as T;
}

/** Link temporário (1 hora) de um arquivo do bucket de Materiais. */
async function assinar(caminho: string): Promise<string> {
  const res = await fetch(
    `${SUPA}/storage/v1/object/sign/materiais/${caminho.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: SERVICO,
        Authorization: `Bearer ${SERVICO}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    },
  );
  if (!res.ok) throw new ErroPedido("Não conseguimos pegar um arquivo da versão em Materiais.");
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${SUPA}/storage/v1${signedURL}`;
}

async function uploadPost(caminho: string, init: RequestInit): Promise<unknown> {
  const ctl = new AbortController();
  const relogio = setTimeout(() => ctl.abort(), TEMPO_LIMITE_MS);
  try {
    const res = await fetch(`${API}${caminho}`, {
      ...init,
      signal: ctl.signal,
      headers: { ...(init.headers ?? {}), Authorization: `Apikey ${CHAVE}` },
    });
    const corpo: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = achar(corpo, ["error", "message", "detail"]);
      throw new ErroPedido(
        typeof msg === "string" ? msg.slice(0, 280) : `O Upload-Post recusou (HTTP ${res.status}).`,
      );
    }
    return corpo;
  } finally {
    clearTimeout(relogio);
  }
}

const registrar = (
  versao: string,
  situacao: string,
  extra: { link?: string; id?: string | null; erro?: string } = {},
) =>
  rpc("mkt_publicacao_registrar", {
    p_versao: versao,
    p_situacao: situacao,
    p_link: extra.link ?? null,
    p_id_externo: extra.id ?? null,
    p_erro: extra.erro ?? null,
  });

async function publicarUma(versao: string): Promise<void> {
  const pacote = await rpc<Pacote | null>("mkt_publicacao_iniciar", { p_versao: versao });
  if (!pacote) return; // desligada, editada ou já enviada: não sai
  try {
    const pedido = montarPedido(pacote, { perfil: PERFIL, paginaLinkedin: PAGINA_LINKEDIN });
    const form = new FormData();
    for (const [k, v] of pedido.campos) form.append(k, v);
    for (const l of pedido.links) form.append(l.campo, await assinar(l.caminho));
    for (const a of pedido.anexos) {
      const res = await fetch(await assinar(a.caminho));
      if (!res.ok) throw new ErroPedido("Não conseguimos baixar uma imagem da versão.");
      form.append(a.campo, new Blob([await res.arrayBuffer()], { type: a.mime }), a.nome);
    }
    const s = lerSituacao(await uploadPost(pedido.caminho, { method: "POST", body: form }));
    if (s.tipo === "publicada") await registrar(versao, "publicada", { link: s.link, id: s.id });
    else if (s.tipo === "enviada") await registrar(versao, "enviada", { id: s.id });
    else if (s.tipo === "falhou") await registrar(versao, "falhou", { erro: s.erro });
    // "aguardando" sem id: fica enviada; a conferência dá falha depois de 24 h.
  } catch (e) {
    const erro =
      e instanceof ErroPedido
        ? e.message
        : e instanceof DOMException && e.name === "AbortError"
          ? "O Upload-Post demorou demais para responder."
          : "Falha ao falar com o Upload-Post.";
    await registrar(versao, "falhou", { erro }).catch(() => undefined);
    console.error("marketing-publicar: falha ao publicar uma versão");
  }
}

async function publicar(): Promise<void> {
  const ids = await rpc<string[]>("mkt_publicacoes_devidas", { p_limite: 10 });
  for (const id of ids) await publicarUma(id);
}

/** Sem a conta do Upload-Post: o que estiver na hora volta para a pessoa, com o motivo. */
async function semConfiguracao(): Promise<void> {
  const ids = await rpc<string[]>("mkt_publicacoes_devidas", { p_limite: 10 });
  for (const id of ids) {
    const pacote = await rpc<Pacote | null>("mkt_publicacao_iniciar", { p_versao: id });
    if (pacote)
      await registrar(id, "falhou", {
        erro: "A publicação automática ainda não está ligada (falta a conta do Upload-Post). Publique à mão.",
      });
  }
}

async function conferir(): Promise<void> {
  const enviadas = await rpc<
    { versao_id: string; id_externo: string | null; enviada_em: string }[]
  >("mkt_publicacoes_enviadas", {});
  for (const e of enviadas) {
    try {
      if (!e.id_externo) {
        // Saiu para a rede sem resposta (a função caiu no meio): depois de 30 min, a pessoa decide.
        if (Date.now() - new Date(e.enviada_em).getTime() > 30 * 60 * 1000)
          await registrar(e.versao_id, "falhou", {
            erro: "Não tivemos resposta do Upload-Post. Confira o perfil antes de tentar de novo.",
          });
        continue;
      }
      const r = await uploadPost(
        `/uploadposts/status?request_id=${encodeURIComponent(e.id_externo)}`,
        { method: "GET" },
      );
      const s = lerSituacao(r);
      if (s.tipo === "publicada")
        await registrar(e.versao_id, "publicada", { link: s.link, id: s.id });
      else if (s.tipo === "falhou") await registrar(e.versao_id, "falhou", { erro: s.erro });
      else if (esperouDemais(e.enviada_em))
        await registrar(e.versao_id, "falhou", {
          erro: "A rede não confirmou a publicação em 24 horas. Confira o perfil.",
        });
    } catch {
      console.error("marketing-publicar: falha ao conferir uma versão");
    }
  }
}

async function medir(): Promise<void> {
  const versoes = await rpc<
    {
      versao_id: string;
      canal: string;
      id_externo: string;
      link: string | null;
      publicada_em: string;
    }[]
  >("mkt_versoes_para_medir", {});
  const porCanal = new Map<string, typeof versoes>();
  for (const v of versoes) porCanal.set(v.canal, [...(porCanal.get(v.canal) ?? []), v]);
  for (const [canal, lista] of porCanal) {
    try {
      const desde = lista
        .reduce((m, v) => (v.publicada_em < m ? v.publicada_em : m), lista[0]!.publicada_em)
        .slice(0, 10);
      const r = (await uploadPost(
        `/uploadposts/post-analytics/cached?user=${encodeURIComponent(PERFIL)}&platform=${encodeURIComponent(canal)}&since=${desde}&limit=200`,
        { method: "GET" },
      )) as { posts?: { post_url?: unknown; post_id?: unknown; metrics?: unknown }[] } | null;
      const posts = Array.isArray(r?.posts) ? r.posts : [];
      for (const v of lista) {
        const post = acharPost(posts, v.link, v.id_externo);
        const numeros = post ? lerNumeros(post.metrics) : {};
        if (Object.keys(numeros).length > 0)
          await rpc("mkt_resultados_automaticos", {
            p_versao: v.versao_id,
            p_numeros: numeros,
          }).catch(() => undefined);
      }
    } catch {
      console.error("marketing-publicar: falha ao medir um canal");
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const rota = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const configurada = !!CHAVE && !!PERFIL;
  const trabalho = !configurada
    ? rota === "publicar"
      ? semConfiguracao()
      : Promise.resolve()
    : rota === "publicar"
      ? publicar().then(conferir)
      : rota === "conferir"
        ? conferir()
        : rota === "medir"
          ? medir()
          : null;
  if (!trabalho) return new Response(null, { status: 404 });
  // Responde já e trabalha em segundo plano (o pg_cron não espera).
  const seguro = trabalho.catch(() => console.error(`marketing-publicar: ${rota} falhou`));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(seguro);
  else await seguro;
  return new Response(JSON.stringify({ ok: true }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
});
