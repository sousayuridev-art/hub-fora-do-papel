import { supabase } from "@/lib/supabase";

/** Site do cliente ligado ao portal (card PC-1): módulos contratados decidem o menu. */

export type ModuloSite = "paginas" | "artigos" | "portfolio" | "loja" | "contatos";

export const modulosSite: { id: ModuloSite; rotulo: string; ajuda: string }[] = [
  { id: "paginas", rotulo: "Páginas", ajuda: "Editar textos e fotos das páginas" },
  { id: "artigos", rotulo: "Artigos", ajuda: "Blog ou notícias" },
  { id: "portfolio", rotulo: "Portfólio", ajuda: "Trabalhos e casos" },
  { id: "loja", rotulo: "Loja", ajuda: "Produtos, vendas e cupons" },
  { id: "contatos", rotulo: "Contatos", ajuda: "Formulário e WhatsApp do site" },
];

export type SitePortal = {
  id: string;
  nome: string;
  dominio: string;
  modulos: ModuloSite[];
  no_ar: boolean;
};

export type SiteDoHub = SitePortal & { client_id: string | null };

export const chavesSitesCliente = {
  portal: ["portal", "sites"] as const,
  hub: ["sites", "clientes"] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

/** Sites da empresa de quem entrou no portal (lista vazia se não houver). */
export const sitesDoPortal = () => rpc<SitePortal[]>("portal_sites");

/** Hub: todos os sites do tenant (o dono lê pela RLS). */
export async function sitesDoHub(): Promise<SiteDoHub[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("id, nome, dominio, modulos, no_ar, client_id")
    .order("criado_em", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SiteDoHub[];
}

export const definirSiteDoCliente = (v: {
  siteId: string;
  clienteId: string | null;
  modulos: ModuloSite[];
  noAr: boolean;
}) =>
  rpc<SiteDoHub>("site_cliente_definir", {
    p_site: v.siteId,
    p_cliente: v.clienteId,
    p_modulos: v.modulos,
    p_no_ar: v.noAr,
  });

export const criarSiteDoCliente = (v: {
  clienteId: string;
  nome: string;
  dominio: string;
  modulos: ModuloSite[];
  noAr: boolean;
}) =>
  rpc<SiteDoHub>("site_cliente_criar", {
    p_cliente: v.clienteId,
    p_nome: v.nome,
    p_dominio: v.dominio,
    p_modulos: v.modulos,
    p_no_ar: v.noAr,
  });

export function mensagemDoSiteCliente(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    site_inexistente: "Esse site não existe mais. Recarregue a página.",
    cliente_inexistente: "Esse cliente não existe mais. Recarregue a página.",
    modulo_invalido: "Escolha os módulos da lista.",
    nome_obrigatorio: "Dê um nome ao site (pelo menos 2 letras).",
    dominio_invalido: "Domínio inválido. Use só o endereço, como exemplo.com.br.",
    dominio_em_uso: "Esse domínio já está cadastrado em outro site.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
