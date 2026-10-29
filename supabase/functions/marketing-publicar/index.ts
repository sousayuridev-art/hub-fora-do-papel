/**
 * Função de servidor `marketing-publicar` (card MK-5). Chamada pelo pg_cron, que manda o segredo do
 * Vault no cabeçalho `x-cron-segredo`; sem ele, responde 401 sem trabalhar. Não devolve dados.
 *
 *   POST /publicar  (a cada 5 min) → versões na hora: pacote → Upload-Post → enviada/publicada/falhou
 *                                    e, em seguida, a conferência das enviadas
 *   POST /conferir                 → enviadas esperando confirmação → publicada/falhou
 *   POST /medir     (1 vez por dia) → números dos posts dos últimos 30 dias → Resultados
 *
 * Cada tenant publica só no próprio perfil do Upload-Post (tabela mkt_publicacao_contas).
 * Segredos (só aqui): a chave da API do Upload-Post e a chave de serviço do Supabase.
 * Nunca escreva chave, texto da peça ou link assinado em log.
 */
import {
  achar,
  acharPost,
  enderecoUploadPost,
  ErroIncerto,
  ErroPedido,
  esperouDemais,
  lerNumeros,
  lerSituacao,
  montarPedido,
  traduzirErro,
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

/**
 * Chama o Upload-Post. Recusa clara (4xx) vira ErroPedido: o post não saiu. Tempo esgotado, 5xx ou
 * rede caída viram ErroIncerto: o post pode ter saído, então a versão fica "enviada" e a conferência
 * decide (sem risco de a pessoa religar e postar duas vezes).
 */
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
    if (res.status >= 500) throw new ErroIncerto(`upload_post_${res.status}`);
    if (!res.ok) {
      const msg = achar(corpo, ["error", "message", "detail"]);
      throw new ErroPedido(
        traduzirErro(typeof msg === "string" ? msg : `HTTP ${res.status}`, res.status),
      );
    }
    return corpo;
  } catch (e) {
    if (e instanceof ErroPedido || e instanceof ErroIncerto) throw e;
    throw new ErroIncerto("upload_post_sem_resposta");
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
  if (!pacote) return; // desligada, editada, sem perfil, atrasada ou já enviada: não sai
  let resposta: unknown;
  try {
    const pedido = montarPedido(pacote);
    const form = new FormData();
    for (const [k, v] of pedido.campos) form.append(k, v);
    for (const l of pedido.links) form.append(l.campo, await assinar(l.caminho));
    for (const a of pedido.anexos) {
      const res = await fetch(await assinar(a.caminho));
      if (!res.ok) throw new ErroPedido("Não conseguimos baixar uma imagem da versão.");
      form.append(a.campo, new Blob([await res.arrayBuffer()], { type: a.mime }), a.nome);
    }
    resposta = await uploadPost(pedido.caminho, { method: "POST", body: form });
  } catch (e) {
    if (e instanceof ErroPedido) {
      // Não saiu (antes do envio ou recusa clara): volta para a pessoa com o motivo.
      await registrar(versao, "falhou", { erro: e.message }).catch(() => undefined);
    }
    // ErroIncerto: fica "enviada"; a conferência decide depois (30 min sem resposta = confira o perfil).
    console.error("marketing-publicar: uma versão não foi enviada");
    return;
  }
  // Daqui em diante o pedido saiu: falha ao gravar não vira "não saiu".
  const s = lerSituacao(resposta);
  try {
    if (s.tipo === "publicada") await registrar(versao, "publicada", { link: s.link, id: s.id });
    else if (s.tipo === "enviada") await registrar(versao, "enviada", { id: s.id });
    else if (s.tipo === "falhou") await registrar(versao, "falhou", { erro: traduzirErro(s.erro) });
  } catch {
    console.error("marketing-publicar: envio feito, registro pendente");
  }
}

async function publicar(): Promise<void> {
  const ids = await rpc<string[]>("mkt_publicacoes_devidas", { p_limite: 10 });
  for (const id of ids) await publicarUma(id);
}

/** Sem a chave do Upload-Post: o que estiver na hora volta para a pessoa, com o motivo. */
async function semConfiguracao(): Promise<void> {
  const ids = await rpc<string[]>("mkt_publicacoes_devidas", { p_limite: 10 });
  for (const id of ids) {
    const pacote = await rpc<Pacote | null>("mkt_publicacao_iniciar", { p_versao: id });
    if (pacote)
      await registrar(id, "falhou", {
        erro: "A publicação automática ainda não está ligada (falta a chave do Upload-Post). Publique à mão.",
      });
  }
}

async function conferir(comChave: boolean): Promise<void> {
  const enviadas = await rpc<
    { versao_id: string; id_externo: string | null; enviada_em: string }[]
  >("mkt_publicacoes_enviadas", {});
  for (const e of enviadas) {
    try {
      if (!e.id_externo || !comChave) {
        // Saiu para a rede sem resposta (a função caiu, tempo esgotado): depois de 30 min, a pessoa decide.
        if (Date.now() - new Date(e.enviada_em).getTime() > 30 * 60 * 1000)
          await registrar(e.versao_id, "falhou", {
            erro: "Não tivemos resposta do Upload-Post. Confira o perfil antes de tentar de novo: o post pode ter saído.",
          });
        continue;
      }
      const r = await uploadPost(
        `/uploadposts/status?request_id=${encodeURIComponent(e.id_externo)}`,
        {
          method: "GET",
        },
      );
      const s = lerSituacao(r);
      if (s.tipo === "publicada")
        await registrar(e.versao_id, "publicada", { link: s.link, id: s.id });
      else if (s.tipo === "falhou")
        await registrar(e.versao_id, "falhou", { erro: traduzirErro(s.erro) });
      else if (esperouDemais(e.enviada_em))
        await registrar(e.versao_id, "falhou", {
          erro: "A rede não confirmou a publicação em 24 horas. Confira o perfil antes de tentar de novo.",
        });
    } catch {
      console.error("marketing-publicar: falha ao conferir uma versão");
    }
  }
}

type ParaMedir = {
  versao_id: string;
  canal: string;
  id_externo: string;
  link: string | null;
  publicada_em: string;
  perfil: string;
};

async function medir(): Promise<void> {
  const versoes = await rpc<ParaMedir[]>("mkt_versoes_para_medir", {});
  const grupos = new Map<string, ParaMedir[]>();
  for (const v of versoes) {
    const k = `${v.perfil}|${v.canal}`;
    grupos.set(k, [...(grupos.get(k) ?? []), v]);
  }
  for (const lista of grupos.values()) {
    const { perfil, canal } = lista[0]!;
    try {
      const desde = lista
        .reduce((m, v) => (v.publicada_em < m ? v.publicada_em : m), lista[0]!.publicada_em)
        .slice(0, 10);
      const r = (await uploadPost(
        `/uploadposts/post-analytics/cached?user=${encodeURIComponent(perfil)}&platform=${encodeURIComponent(canal)}&since=${desde}&limit=200`,
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
  // Só o agendador do próprio banco: o segredo vem do Vault e é conferido lá.
  const segredo = req.headers.get("x-cron-segredo") ?? "";
  const valido =
    segredo.length >= 32 &&
    (await rpc<boolean>("mkt_publicar_segredo_confere", { p_segredo: segredo }).catch(() => false));
  if (!valido) return new Response(null, { status: 401 });

  const rota = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const comChave = !!CHAVE;
  const trabalho =
    rota === "publicar"
      ? (comChave ? publicar() : semConfiguracao()).then(() => conferir(comChave))
      : rota === "conferir"
        ? conferir(comChave)
        : rota === "medir"
          ? comChave
            ? medir()
            : Promise.resolve()
          : null;
  if (!trabalho) return new Response(null, { status: 404 });
  // Responde já e trabalha em segundo plano (o pg_cron não espera).
  const seguro = trabalho.catch(() => console.error(`marketing-publicar: ${rota} falhou`));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(seguro);
  else await seguro;
  return new Response(null, { status: 202 });
});
