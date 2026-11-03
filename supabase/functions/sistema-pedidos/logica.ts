/**
 * Lógica pura da função `sistema-pedidos` (card SIS-2): sem rede, sem Deno.
 * Testada pelo Vitest em src/test/sis-2.test.ts.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Rota =
  | { tipo: "listar" }
  | { tipo: "detalhe"; pedido: string }
  | { tipo: "criar" }
  | { tipo: "mensagem"; pedido: string }
  | { tipo: "print"; pedido: string };

/** "/functions/v1/sistema-pedidos/pedidos/<id>/mensagens" → rota. Qualquer outra coisa: null. */
export function lerRota(metodo: string, caminho: string): Rota | null {
  const i = caminho.indexOf("/pedidos");
  if (i < 0) return null;
  const partes = caminho
    .slice(i)
    .split("/")
    .filter((p) => p !== "");
  if (partes[0] !== "pedidos") return null;
  const [, id, extra] = partes;
  if (partes.length === 1) {
    if (metodo === "GET") return { tipo: "listar" };
    if (metodo === "POST") return { tipo: "criar" };
    return null;
  }
  if (!id || !UUID.test(id)) return null;
  if (partes.length === 2 && metodo === "GET") return { tipo: "detalhe", pedido: id };
  if (partes.length === 3 && metodo === "POST" && extra === "mensagens")
    return { tipo: "mensagem", pedido: id };
  if (partes.length === 3 && metodo === "POST" && extra === "prints")
    return { tipo: "print", pedido: id };
  return null;
}

/** A chave vem só no cabeçalho x-hub-chave (nunca na URL, que fica em log). */
export function lerChave(cabecalho: string | null): string | null {
  const k = (cabecalho ?? "").trim();
  return /^fdp_[0-9a-f]{64}$/.test(k) ? k : null;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export type NovoPedido = {
  titulo: string;
  descricao: string | null;
  tipo: "erro" | "melhoria" | null;
  prioridade: "urgente" | "alta" | "media" | "baixa";
  solicitante: { nome: string; id: string | null };
  externo_id: string | null;
  situacao: "recebido" | "em_analise" | "fazendo" | null;
  criado_em: string | null;
};

/** Confere e limpa o corpo do pedido novo. Devolve o motivo quando não serve. */
export function lerNovoPedido(c: unknown): NovoPedido | { erro: string } {
  if (!c || typeof c !== "object") return { erro: "corpo_invalido" };
  const o = c as Record<string, unknown>;
  const titulo = texto(o["titulo"], 120);
  if (titulo.length < 2) return { erro: "titulo_obrigatorio" };
  const s = (o["solicitante"] ?? {}) as Record<string, unknown>;
  const nome = texto(s["nome"], 80);
  if (!nome) return { erro: "solicitante_obrigatorio" };
  const tipo = o["tipo"] === "erro" || o["tipo"] === "melhoria" ? o["tipo"] : null;
  const prioridades = ["urgente", "alta", "media", "baixa"] as const;
  const prioridade = prioridades.find((p) => p === o["prioridade"]) ?? "media";
  const situacoes = ["recebido", "em_analise", "fazendo"] as const;
  const situacao = situacoes.find((p) => p === o["situacao"]) ?? null;
  const externo = texto(o["externo_id"], 80) || null;
  const criado =
    typeof o["criado_em"] === "string" && !Number.isNaN(Date.parse(o["criado_em"]))
      ? o["criado_em"]
      : null;
  return {
    titulo,
    descricao: texto(o["descricao"], 2000) || null,
    tipo,
    prioridade,
    solicitante: { nome, id: texto(s["id"], 64) || null },
    externo_id: externo,
    situacao: externo ? situacao : null,
    criado_em: externo ? criado : null,
  };
}

export function lerMensagem(
  c: unknown,
): { autor_nome: string; texto: string; criado_em: string | null } | { erro: string } {
  if (!c || typeof c !== "object") return { erro: "corpo_invalido" };
  const o = c as Record<string, unknown>;
  const autor = texto(o["autor_nome"], 80);
  const t = texto(o["texto"], 2000);
  if (!autor) return { erro: "solicitante_obrigatorio" };
  if (!t) return { erro: "texto_obrigatorio" };
  const criado =
    typeof o["criado_em"] === "string" && !Number.isNaN(Date.parse(o["criado_em"]))
      ? o["criado_em"]
      : null;
  return { autor_nome: autor, texto: t, criado_em: criado };
}

export const TAMANHO_MAXIMO_PRINT = 2 * 1024 * 1024;

/** Confere o tipo pelos primeiros bytes (não pelo cabeçalho que o chamador manda). */
export function tipoDaImagem(b: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return "image/webp";
  return null;
}

export const extensao: Record<"image/png" | "image/jpeg" | "image/webp", string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Erros que o sistema do cliente pode ver (o resto vira "falha"). */
const PUBLICOS = [
  "pedido_inexistente",
  "titulo_obrigatorio",
  "solicitante_obrigatorio",
  "texto_obrigatorio",
  "tipo_invalido",
  "prioridade_invalida",
  "situacao_invalida",
  "muitos_pedidos",
  "muitas_mensagens",
  "prints_demais",
  "caminho_invalido",
] as const;
export type ErroPublico = (typeof PUBLICOS)[number] | "falha";

export function erroPublico(mensagem: string): ErroPublico {
  return PUBLICOS.find((p) => mensagem.includes(p)) ?? "falha";
}

export function statusDoErro(e: ErroPublico): number {
  if (e === "pedido_inexistente") return 404;
  if (e === "muitos_pedidos" || e === "muitas_mensagens" || e === "prints_demais") return 429;
  if (e === "falha") return 500;
  return 400;
}
