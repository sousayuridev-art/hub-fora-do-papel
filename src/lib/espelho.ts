import { supabase } from "@/lib/supabase";

/**
 * "Ver como o cliente" (card RD2-8): o dono abre o portal de um cliente em modo leitura.
 *
 * Segurança em duas camadas:
 * 1. Banco: só as funções de LEITURA do portal aceitam o dono, e só depois de `portal_espelho_abrir`
 *    (registrado, vale 12 horas, exige a sessão com código). As que gravam continuam só para
 *    pessoas do portal: o dono nunca aprova, responde ou pede como o cliente.
 * 2. Tela: enquanto o espelho está aberto, toda chamada que grava é barrada aqui, antes de sair do
 *    navegador (o dono pode editar sites pelo Hub; no espelho, não).
 *
 * O espelho vive na aba do navegador (sessionStorage) e pertence a quem abriu: fechar a aba,
 * "Voltar ao Hub", sair da conta ou entrar com outra pessoa encerra.
 */

export type PerfilEspelho = "responsavel" | "equipe";
export type Espelho = {
  /** Dono que abriu; com outra pessoa na sessão, o espelho é ignorado e apagado. */
  userId: string;
  clienteId: string;
  siteId: string | null;
  perfil: PerfilEspelho;
  empresa: string;
};

const CHAVE = "hub-espelho";

/** Chamadas que só leem e podem passar no espelho. */
export const LEITURA = new Set([
  "portal_inicio",
  "portal_pendencias",
  "portal_aprovacoes",
  "portal_pedidos",
  "portal_pagamentos",
  "portal_arquivos",
  "portal_sites",
  "portal_minha_empresa",
  "portal_contatos",
  "portal_ajustes",
  "site_midia_lista",
  "recibo",
  // papel de quem está logado (o portal confere antes de abrir)
  "my_access",
  // registra a troca de perfil (só o dono; não mexe em nada do cliente)
  "portal_espelho_abrir",
]);

/** Leituras que precisam saber de qual cliente (o dono não é pessoa do portal). */
export const COM_CLIENTE = new Set([
  "portal_inicio",
  "portal_pendencias",
  "portal_aprovacoes",
  "portal_pedidos",
  "portal_pagamentos",
  "portal_arquivos",
  "portal_sites",
  "portal_minha_empresa",
]);

export const ERRO_LEITURA = "modo_leitura";

export type Decisao =
  { tipo: "passar"; args: Record<string, unknown> | undefined } | { tipo: "barrar" };

/** Regra pura (testada): com espelho, leitura passa (com o cliente) e o resto é barrado. */
export function decidirChamada(
  nome: string,
  args: Record<string, unknown> | undefined,
  espelho: Pick<Espelho, "clienteId" | "perfil"> | null,
): Decisao {
  if (!espelho) return { tipo: "passar", args };
  if (!LEITURA.has(nome)) return { tipo: "barrar" };
  // A equipe não vê valores: no espelho como equipe, o recibo também fica fechado
  if (nome === "recibo" && espelho.perfil === "equipe") return { tipo: "barrar" };
  if (COM_CLIENTE.has(nome))
    return { tipo: "passar", args: { ...(args ?? {}), p_cliente: espelho.clienteId } };
  return { tipo: "passar", args };
}

/** Usuário da sessão atual (atualizado pelo login; null enquanto não se sabe). */
let usuarioAtual: string | null = null;
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((evento, sessao) => {
    usuarioAtual = sessao?.user.id ?? null;
    if (evento === "SIGNED_OUT") guardar(null);
    else {
      const e = lerEspelhoBruto();
      if (e && usuarioAtual && e.userId !== usuarioAtual) guardar(null);
    }
  });
}

function lerEspelhoBruto(): Espelho | null {
  try {
    const v = sessionStorage.getItem(CHAVE);
    if (!v) return null;
    const e = JSON.parse(v) as Partial<Espelho>;
    if (
      typeof e.userId !== "string" ||
      typeof e.clienteId !== "string" ||
      (e.perfil !== "responsavel" && e.perfil !== "equipe")
    )
      return null;
    return {
      userId: e.userId,
      clienteId: e.clienteId,
      siteId: typeof e.siteId === "string" ? e.siteId : null,
      perfil: e.perfil,
      empresa: typeof e.empresa === "string" ? e.empresa : "",
    };
  } catch {
    return null;
  }
}

/**
 * Espelho aberto nesta aba pela pessoa logada. Enquanto a sessão ainda não carregou, vale o
 * guardado (a barreira fica ligada: na dúvida, barra). Outra pessoa na sessão: apaga e ignora.
 */
export function lerEspelho(): Espelho | null {
  const e = lerEspelhoBruto();
  if (!e) return null;
  if (usuarioAtual && e.userId !== usuarioAtual) {
    guardar(null);
    return null;
  }
  return e;
}

/** Confere o espelho com a sessão já carregada (portal, no beforeLoad). */
export function conferirEspelho(userId: string | null, ehDono: boolean): Espelho | null {
  const e = lerEspelhoBruto();
  if (!e) return null;
  if (!userId || !ehDono || e.userId !== userId) {
    guardar(null);
    return null;
  }
  return e;
}

export function clienteDoEspelho(): string | null {
  return lerEspelho()?.clienteId ?? null;
}

function guardar(e: Espelho | null) {
  try {
    if (e) sessionStorage.setItem(CHAVE, JSON.stringify(e));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    // sem sessionStorage (aba privada bloqueada): o espelho não abre, e o portal recusa o dono
  }
}

/** Registra no banco e guarda na aba. Chamado no Hub ("Ver como o cliente") e na troca de perfil. */
export async function abrirEspelho(v: {
  clienteId: string;
  siteId: string | null;
  perfil: PerfilEspelho;
}): Promise<Espelho> {
  const { data, error } = await supabase.rpc("portal_espelho_abrir", {
    p_cliente: v.clienteId,
    p_perfil: v.perfil,
  });
  if (error) throw error;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("sem_sessao");
  const e: Espelho = {
    ...v,
    userId: u.user.id,
    empresa: (data as { empresa?: string } | null)?.empresa ?? "",
  };
  guardar(e);
  instalarBarreira();
  return e;
}

export function fecharEspelho() {
  guardar(null);
}

const barrado = () =>
  Promise.resolve({
    data: null,
    error: { message: ERRO_LEITURA, code: "ESPELHO", details: "", hint: "" },
    count: null,
    status: 403,
    statusText: "Modo leitura",
  });

let instalada = false;

/**
 * Barreira do espelho: troca `supabase.rpc` e o envio ao Storage por versões que consultam o
 * espelho a cada chamada. Sem espelho aberto, tudo passa como sempre. Idempotente.
 */
export function instalarBarreira() {
  if (instalada || typeof window === "undefined") return;
  instalada = true;
  const rpcOriginal = supabase.rpc.bind(supabase);
  (supabase as { rpc: unknown }).rpc = (
    nome: string,
    args?: Record<string, unknown>,
    opcoes?: unknown,
  ) => {
    const d = decidirChamada(nome, args, lerEspelho());
    if (d.tipo === "barrar") return barrado();
    return (rpcOriginal as (n: string, a?: Record<string, unknown>, o?: unknown) => unknown)(
      nome,
      d.args,
      opcoes,
    );
  };
  const fromOriginal = supabase.storage.from.bind(supabase.storage);
  supabase.storage.from = ((bucket: string) => {
    const api = fromOriginal(bucket);
    const grava = [
      "upload",
      "update",
      "remove",
      "move",
      "copy",
      "uploadToSignedUrl",
      "createSignedUploadUrl",
    ] as const;
    for (const m of grava) {
      const original = (api as unknown as Record<string, (...a: unknown[]) => unknown>)[m];
      if (typeof original !== "function") continue;
      (api as unknown as Record<string, unknown>)[m] = (...a: unknown[]) =>
        lerEspelho() ? barrado() : original.apply(api, a);
    }
    return api;
  }) as typeof supabase.storage.from;
}
