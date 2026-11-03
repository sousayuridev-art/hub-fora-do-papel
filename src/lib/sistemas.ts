import { comprimirFoto } from "@/lib/fotosSite";
import { supabase } from "@/lib/supabase";

/**
 * Sistemas sob medida (card SIS-1): o que entregamos e está rodando para o cliente.
 * Números e avisos vêm prontos do banco (sistemas_resumo); a escrita é só por RPC.
 * A imagem da tela principal fica no bucket privado das logos (pasta do cliente).
 */

export type SituacaoSistema = "construcao" | "teste" | "no_ar" | "pausado";

export const rotuloSituacaoSistema: Record<SituacaoSistema, string> = {
  construcao: "Em construção",
  teste: "Em teste",
  no_ar: "No ar",
  pausado: "Pausado",
};

export type AvisoSistema =
  | { tipo: "cobranca_atrasada"; desde: string }
  | { tipo: "servico_vence"; em: string }
  | { tipo: "sem_endereco" }
  | { tipo: "pedidos_abertos"; n: number; desde: string };

export type SistemaResumo = {
  id: string;
  nome: string;
  descricao: string | null;
  situacao: SituacaoSistema;
  client_id: string;
  empresa: string;
  logo_path: string | null;
  project_id: string | null;
  projeto: {
    id: string;
    nome: string;
    status: string;
    fase_posicao: number | null;
    fase_nome: string | null;
    fases_total: number;
  } | null;
  url_producao: string | null;
  url_teste: string | null;
  capa_path: string | null;
  no_ar_desde: string | null;
  atualizado_em: string;
  pedidos_abertos: number;
  servicos: number;
  custo_nosso_cents: number;
  custo_cliente_cents: number;
  mensalidade_cents: number;
  avisos: AvisoSistema[];
};

export type ResumoSistemas = {
  itens: SistemaResumo[];
  resumo: {
    total: number;
    no_ar: number;
    construcao: number;
    atencao: number;
    pedidos_abertos: number;
    custo_nosso_cents: number;
    mensalidades_cents: number;
  };
};

export type ServicoSistema = {
  id: string;
  nome: string;
  para_que: string | null;
  custo_cents: number | null;
  quem_paga: "nos" | "cliente";
  vence_em: string | null;
  painel_url: string | null;
  ordem: number;
};

export type DadosSistema = {
  id?: string | undefined;
  client_id: string;
  project_id: string | null;
  nome: string;
  descricao: string;
  situacao: SituacaoSistema;
  url_producao: string;
  url_teste: string;
};

export type DadosServico = Omit<ServicoSistema, "id" | "ordem"> & { id?: string | undefined };

export const chavesSistemas = {
  resumo: ["sistemas", "resumo"] as const,
  servicos: (id: string) => ["sistemas", id, "servicos"] as const,
  clientes: ["sistemas", "clientes"] as const,
  projetos: (cliente: string) => ["sistemas", "projetos", cliente] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const sistemasResumo = () => rpc<ResumoSistemas>("sistemas_resumo");

export async function servicosDoSistema(id: string): Promise<ServicoSistema[]> {
  const { data, error } = await supabase
    .from("sistema_servicos")
    .select("id, nome, para_que, custo_cents, quem_paga, vence_em, painel_url, ordem")
    .eq("sistema_id", id)
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as ServicoSistema[];
}

/** Clientes e projetos para o formulário (leitura simples; a RLS limita ao dono). */
export async function clientesParaSistema(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, company_name")
    .order("company_name");
  if (error) throw error;
  return (data ?? []).map((c: { id: string; company_name: string }) => ({
    id: c.id,
    nome: c.company_name,
  }));
}

export async function projetosDoCliente(cliente: string): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", cliente)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: { id: string; name: string }) => ({ id: p.id, nome: p.name }));
}

/** "plamev.com.br/app" vira "https://plamev.com.br/app"; vazio continua vazio. */
export function normalizarEndereco(v: string): string {
  const t = v.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t.replace(/^http:\/\//i, "https://") : `https://${t}`;
}

export function enderecoValido(v: string): boolean {
  return v === "" || /^https:\/\/[^\s.]+\.[^\s]+$/.test(v);
}

export const salvarSistema = (d: DadosSistema) =>
  rpc<SistemaResumo>("sistema_salvar", {
    p_dados: {
      ...d,
      url_producao: normalizarEndereco(d.url_producao),
      url_teste: normalizarEndereco(d.url_teste),
    },
  });

export const salvarServico = (sistema: string, d: DadosServico) =>
  rpc<ServicoSistema>("sistema_servico_salvar", {
    p_sistema: sistema,
    p_dados: { ...d, painel_url: d.painel_url ? normalizarEndereco(d.painel_url) : null },
  });

export const apagarServico = (id: string) => rpc<void>("sistema_servico_apagar", { p_id: id });

const BUCKET = "logos-clientes";
const LIMITE = 1024 * 1024;

/** Envia a imagem da tela principal (até 1 MB depois de comprimida) e apaga a anterior. */
export async function enviarCapa(s: { id: string; client_id: string }, f: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
  const pronta = await comprimirFoto(f, 1280);
  if (pronta.size > LIMITE) throw new Error("A imagem passa de 1 MB. Use um print menor.");
  const ext = pronta.type === "image/webp" ? "webp" : pronta.type === "image/png" ? "png" : "jpg";
  const caminho = `${s.client_id}/sistema-${s.id.slice(0, 8)}-${Date.now()}.${ext}`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(caminho, pronta, { contentType: pronta.type, upsert: false });
  if (up.error) throw up.error;
  try {
    const r = await rpc<{ anterior: string | null }>("sistema_capa", {
      p_sistema: s.id,
      p_caminho: caminho,
    });
    if (r.anterior) await supabase.storage.from(BUCKET).remove([r.anterior]);
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw e;
  }
  return caminho;
}

export async function tirarCapa(id: string): Promise<void> {
  const r = await rpc<{ anterior: string | null }>("sistema_capa", {
    p_sistema: id,
    p_caminho: null,
  });
  if (r.anterior) await supabase.storage.from(BUCKET).remove([r.anterior]);
}

const dias = (d: string, hoje = new Date()) =>
  Math.round((new Date(d).getTime() - new Date(hoje.toDateString()).getTime()) / 86_400_000);

/** Texto do aviso principal do cartão (o banco já manda em ordem de importância). */
export function textoDoAvisoSistema(
  s: Pick<SistemaResumo, "avisos">,
  hoje = new Date(),
): { texto: string; tom: "risco" | "atencao" } | null {
  const a = s.avisos[0];
  if (!a) return null;
  switch (a.tipo) {
    case "cobranca_atrasada":
      return { texto: "Cobrança do cliente em atraso.", tom: "risco" };
    case "servico_vence": {
      const n = dias(`${a.em}T00:00:00`, hoje);
      return {
        texto:
          n < 0
            ? "Um serviço do sistema venceu. Confira a infraestrutura."
            : n === 0
              ? "Um serviço do sistema vence hoje."
              : `Um serviço do sistema vence em ${n} ${n === 1 ? "dia" : "dias"}.`,
        tom: n <= 7 ? "risco" : "atencao",
      };
    }
    case "sem_endereco":
      return { texto: "Está no ar, mas sem o endereço cadastrado.", tom: "atencao" };
    case "pedidos_abertos":
      return {
        texto: `${a.n} ${a.n === 1 ? "pedido de ajuste aberto" : "pedidos de ajuste abertos"}.`,
        tom: "atencao",
      };
  }
}

export function mensagemDoSistema(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : String((e as { message?: unknown } | null)?.message ?? "");
  if (/^(Use uma imagem|A imagem passa)/.test(texto)) return texto;
  const mapa: Record<string, string> = {
    projeto_ja_tem_sistema: "Esse projeto já tem um sistema ligado.",
    projeto_de_outro_cliente: "Esse projeto é de outro cliente.",
    cliente_inexistente: "Escolha o cliente de novo.",
    sistema_inexistente: "Esse sistema não existe mais. Recarregue a página.",
    servico_inexistente: "Esse serviço não existe mais. Recarregue a página.",
    servicos_demais: "No máximo 40 serviços por sistema.",
    caminho_invalido: "Não foi possível guardar a imagem. Envie de novo.",
    sistemas_url_producao_check: "Confira o endereço de produção (precisa começar com https://).",
    sistemas_url_teste_check: "Confira o endereço de teste (precisa começar com https://).",
    sistema_servicos_painel_url_check:
      "Confira o endereço do painel (precisa começar com https://).",
    sistemas_nome_check: "Dê um nome com pelo menos 2 letras.",
    sistema_servicos_nome_check: "Dê um nome com pelo menos 2 letras.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
