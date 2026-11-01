import { supabase } from "@/lib/supabase";
import type { BlocoTopo } from "@/lib/paginasSite";
import type { ModuloSite } from "@/lib/sitesCliente";
import type { CorDoSite } from "@/secoes/tema";

/** Central de Sites no Hub (card RD2-8): todos os sites que entregamos, o nosso e os dos clientes. */

export type SituacaoDoSite = "no_ar" | "construcao" | "fora";
export type AvisoDoSite = "contato_parado" | "cliente_sumido" | "rascunho_parado";

/** Primeira seção publicada da página inicial, ou o topo do site da Fora do Papel. */
export type CapaDoSite =
  | {
      tipo: "secao";
      secao: { type: string; props: Record<string, unknown> } | null;
      cor: CorDoSite | null;
    }
  | { tipo: "topo"; topo: Partial<BlocoTopo> }
  /** Catálogo de loja (HUB-CG): a foto de capa publicada. */
  | { tipo: "foto"; caminho: string };

export type SiteResumo = {
  id: string;
  nome: string;
  dominio: string;
  client_id: string | null;
  empresa: string | null;
  logo_path: string | null;
  no_ar: boolean;
  modulos: ModuloSite[];
  situacao: SituacaoDoSite;
  projeto: {
    id: string;
    vai_ao_ar: string | null;
    fase_posicao: number | null;
    fase_nome: string | null;
    fases_total: number;
  } | null;
  capa: CapaDoSite | null;
  artigos: number;
  contatos_mes: number;
  sem_resposta: number;
  sem_resposta_desde: string | null;
  publicacoes_cliente_30d: number;
  ultima_publicacao: string | null;
  pedidos_abertos: number;
  pessoas: number;
  ultimo_acesso: string | null;
  avisos: AvisoDoSite[];
};

export type SitesResumo = {
  itens: SiteResumo[];
  resumo: {
    total: number;
    no_ar: number;
    construcao: number;
    atencao: number;
    sem_resposta: number;
    sem_resposta_desde: string | null;
    publicacoes_cliente_30d: number;
    pedidos_abertos: number;
  };
};

export type AtividadeSite = {
  itens: {
    evento: string;
    quando: string;
    quem: "dono" | "cliente" | null;
    nome: string | null;
    titulo: string | null;
    caminho: string | null;
  }[];
  pessoas: {
    nome: string | null;
    perfil: "responsavel" | "equipe";
    ultimo_acesso: string | null;
  }[];
  contatos: { mes: number; formulario: number; whatsapp: number; sem_resposta: number };
  fotos_sem_descricao: number;
  rascunhos: number;
};

export const chavesSitesHub = {
  tudo: ["sites-hub"] as const,
  resumo: ["sites-hub", "resumo"] as const,
  atividade: (id: string) => ["sites-hub", "atividade", id] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const sitesResumo = () => rpc<SitesResumo>("sites_resumo");
export const atividadeDoSite = (id: string) =>
  rpc<AtividadeSite>("site_atividade", { p_site: id, p_dias: 30 });

export const rotuloSituacaoSite: Record<SituacaoDoSite, string> = {
  no_ar: "No ar",
  construcao: "Em construção",
  fora: "Fora do ar",
};

/** Dias inteiros desde uma data (0 = hoje). */
export function diasDesde(iso: string | null, agora: Date = new Date()): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 86_400_000));
}

/** O aviso mais importante do cartão, em uma frase. */
export function textoDoAviso(
  s: SiteResumo,
  agora: Date = new Date(),
): { texto: string; tom: "risco" | "atencao" } | null {
  if (s.avisos.includes("contato_parado")) {
    const d = diasDesde(s.sem_resposta_desde, agora) ?? 0;
    return {
      texto: `${s.sem_resposta} ${s.sem_resposta === 1 ? "contato sem resposta" : "contatos sem resposta"} há ${d} ${d === 1 ? "dia" : "dias"}`,
      tom: "risco",
    };
  }
  if (s.avisos.includes("cliente_sumido")) {
    const d = diasDesde(s.ultimo_acesso, agora);
    return {
      texto:
        d === null
          ? "Ninguém da empresa entrou no painel ainda. Vale um lembrete no WhatsApp."
          : `Cliente não entra no painel há ${d} dias. Vale um lembrete no WhatsApp.`,
      tom: "atencao",
    };
  }
  if (s.avisos.includes("rascunho_parado"))
    return { texto: "Artigo em rascunho parado há mais de 7 dias", tom: "atencao" };
  return null;
}

/** "Hoje", "Ontem", "há 5 dias" ou "—". */
export function haQuanto(iso: string | null, agora: Date = new Date()): string {
  const d = diasDesde(iso, agora);
  if (d === null) return "—";
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  return `há ${d} dias`;
}

const eventos: Record<string, string> = {
  "site.artigo_publicado": "publicou o artigo",
  "site.artigo_arquivado": "arquivou o artigo",
  "site.pagina_publicada": "publicou a página",
  "site.pagina_criada": "criou a página",
  "site.bloco_publicado": "publicou um texto da página inicial",
  "site.midia_enviada": "enviou uma foto",
  "site.midia_descrita": "descreveu uma foto",
  "site.negocio_atualizado": "mudou os dados do negócio",
  "site.contato_respondido": "respondeu um contato",
  "site.secoes_definidas": "mudou as seções permitidas",
  "site.cliente_definido": "mudou o que o cliente pode editar",
  "site.catalogo_publicado": "publicou o catálogo",
  "site.catalogo_produto_salvo": "salvou o produto",
  "site.catalogo_produto_apagado": "apagou o produto",
  "site.catalogo_categoria_salva": "salvou a categoria",
  "site.catalogo_categoria_apagada": "apagou a categoria",
  "site.catalogo_depoimento_salvo": "salvou o depoimento de",
  "site.catalogo_depoimento_apagado": "apagou o depoimento de",
  "site.catalogo_config_salva": "mudou os ajustes da loja",
  "site.catalogo_importado": "importou o catálogo",
};

/** "Marta publicou a página Início". */
export function fraseDaAtividade(i: AtividadeSite["itens"][number]): string {
  const quem = i.quem === "dono" ? "Você" : (i.nome ?? "O cliente");
  const acao = eventos[i.evento] ?? "mexeu no site";
  const alvo = i.titulo
    ? ` “${i.titulo}”`
    : i.caminho && i.evento.includes("pagina")
      ? ` ${i.caminho}`
      : "";
  return `${quem} ${acao}${alvo}`;
}
