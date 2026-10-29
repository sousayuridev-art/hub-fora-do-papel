import { z } from "zod";

import { supabase } from "@/lib/supabase";

/**
 * Central de conteúdo (cards MK-0 e MK-1). A peça é a ideia; cada canal ganha a sua versão.
 * Regras da marca, portas entre etapas, contagens e calendário vêm do banco (RPCs mkt_*).
 */

// ----------------------------------------------------------------------------
// Tipos e rótulos
// ----------------------------------------------------------------------------

export type Etapa =
  | "ideia"
  | "briefing"
  | "conceito"
  | "producao"
  | "refinamento"
  | "aprovacao"
  | "pronto"
  | "publicado"
  | "analisado";
export type Coluna = "planejamento" | "criacao" | "aprovacao" | "pronto" | "publicado";
export type Objetivo = "alcance" | "autoridade" | "conversa" | "venda";
export type Funil = "descoberta" | "consideracao" | "decisao";
export type Pilar =
  | "problema"
  | "escolha_honesta"
  | "projetos_reais"
  | "como_trabalhamos"
  | "bastidores"
  | "chamada_direta";
export type Frente = "sistemas" | "ia" | "sites" | "automacoes" | "diagnostico" | "marca";
export type Formato =
  | "carrossel"
  | "post_unico"
  | "reels"
  | "stories"
  | "texto"
  | "documento"
  | "artigo"
  | "video"
  | "video_curto"
  | "carrossel_fotos"
  | "shorts"
  | "video_longo"
  | "anuncio";
export type Chamada =
  | "marcar_conversa"
  | "falar_whatsapp"
  | "quero_algo_assim"
  | "agendar_diagnostico"
  | "receber_artigos";
export type SituacaoCampanha = "planejada" | "ativa" | "encerrada";

export type Aviso = { codigo: string; bloqueia: boolean; texto: string };
export type Cena = { tempo: string; fala: string; na_tela: string };
export type Slide = { titulo: string; texto: string };
export type Resultados = {
  alcance?: number;
  salvamentos?: number;
  cliques?: number;
  mensagens?: number;
  registrado_em?: string;
};

export type Canal = { slug: string; nome: string; ativo: boolean; limite_texto: number };

export type Versao = {
  id: string;
  piece_id: string;
  channel: string;
  canal_nome: string | null;
  limite_texto: number | null;
  format: Formato;
  hook: string | null;
  body: string | null;
  script: Cena[];
  slides: Slide[];
  cta: Chamada | null;
  hashtags: string | null;
  warnings: Aviso[];
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  results: Resultados | null;
  ad_campaign_id: string | null;
  position: number;
  /** Arquivos da versão (MK-2), na ordem; o caminho serve para pedir o link temporário. */
  midias: Midia[];
};

export type PapelMidia = "slide" | "capa" | "imagem" | "video" | "documento";
export type Midia = {
  id: string;
  material_id: string;
  papel: PapelMidia;
  posicao: number;
  titulo: string;
  arquivo: string | null;
  mime: string | null;
  caminho: string | null;
  origem: "nosso" | "cliente";
  na_lixeira: boolean;
};

export type Peca = {
  id: string;
  title: string;
  core_idea: string | null;
  objective: Objetivo | null;
  funnel: Funil | null;
  pillar: Pilar | null;
  front: Frente | null;
  audience: string | null;
  series: string | null;
  art_direction: string | null;
  campaign_id: string | null;
  client_id: string | null;
  client_authorized: boolean;
  due_date: string | null;
  stage: Etapa;
  stage_changed_at: string;
  created_at: string;
  coluna: Coluna;
  campanha: { id: string; nome: string } | null;
  cliente: { id: string; empresa: string } | null;
  versoes: Versao[];
  /** O que falta para a próxima porta (briefing ou aprovação), já em português. */
  falta: string[];
};

export type EventoPeca = {
  id: number;
  tipo:
    | "criada"
    | "etapa"
    | "aprovada"
    | "ajuste_pedido"
    | "reaberta"
    | "versao_adicionada"
    | "versao_removida"
    | "agendada"
    | "publicada"
    | "resultados";
  de: Etapa | null;
  para: Etapa | null;
  nota: string | null;
  versao_id: string | null;
  quando: string;
};

export type PecaDetalhe = Peca & { historico: EventoPeca[] };
export type ListaPecas = { hoje: string; itens: Peca[] };

export type ResumoMarketing = {
  hoje: string;
  planejamento: number;
  criacao: number;
  aprovacao: number;
  pronto: number;
  atrasadas: number;
  publicadas_mes: number;
  agendadas_semana: number;
  sem_resultados: number;
};

export type ItemCalendario = {
  versao_id: string;
  peca_id: string;
  titulo: string;
  canal: string;
  canal_nome: string | null;
  formato: Formato;
  pilar: Pilar | null;
  objetivo: Objetivo | null;
  etapa: Etapa;
  quando: string;
  dia: string;
  publicada: boolean;
  link: string | null;
  avisos: ("pilar_repetido" | "chamada_demais")[];
};
export type Calendario = { hoje: string; inicio: string; fim: string; itens: ItemCalendario[] };

export type Campanha = {
  id: string;
  name: string;
  objective: Objetivo | null;
  funnel: Funil | null;
  front: Frente | null;
  starts_on: string | null;
  ends_on: string | null;
  status: SituacaoCampanha;
  description: string | null;
  ad_campaign_id: string | null;
  anuncio: { id: string; nome: string } | null;
  pecas: {
    total: number;
    planejamento: number;
    criacao: number;
    aprovacao: number;
    pronto: number;
    publicado: number;
  };
};

export const rotuloEtapa: Record<Etapa, string> = {
  ideia: "Ideia",
  briefing: "Briefing",
  conceito: "Conceito",
  producao: "Produção",
  refinamento: "Refinamento",
  aprovacao: "Aprovação",
  pronto: "Pronto",
  publicado: "Publicado",
  analisado: "Analisado",
};

/** As 5 colunas do quadro e as etapas de cada uma (card MK-1). */
export const colunas: { id: Coluna; titulo: string; descricao: string; etapas: Etapa[] }[] = [
  {
    id: "planejamento",
    titulo: "Planejamento",
    descricao: "Ideias e briefing",
    etapas: ["ideia", "briefing"],
  },
  {
    id: "criacao",
    titulo: "Criação",
    descricao: "Conceito, produção e refinamento",
    etapas: ["conceito", "producao", "refinamento"],
  },
  {
    id: "aprovacao",
    titulo: "Aprovação",
    descricao: "Esperando o seu sim",
    etapas: ["aprovacao"],
  },
  { id: "pronto", titulo: "Pronto", descricao: "Aprovadas, para publicar", etapas: ["pronto"] },
  {
    id: "publicado",
    titulo: "Publicado",
    descricao: "Nos últimos 30 dias",
    etapas: ["publicado", "analisado"],
  },
];

/** Etapas para onde a pessoa pode mover a peça direto (as outras vêm por aprovação e publicação). */
export const etapasMoviveis: Etapa[] = [
  "ideia",
  "briefing",
  "conceito",
  "producao",
  "refinamento",
  "aprovacao",
];

export const rotuloObjetivo: Record<Objetivo, string> = {
  alcance: "Alcance",
  autoridade: "Autoridade",
  conversa: "Conversa",
  venda: "Venda",
};
export const ajudaObjetivo: Record<Objetivo, string> = {
  alcance: "Ser visto por quem ainda não conhece",
  autoridade: "Mostrar que sabemos do que falamos",
  conversa: "Fazer a pessoa responder, comentar ou mandar mensagem",
  venda: "Levar para a conversa de 30 minutos",
};
export const rotuloFunil: Record<Funil, string> = {
  descoberta: "Descoberta",
  consideracao: "Consideração",
  decisao: "Decisão",
};
export const rotuloPilar: Record<Pilar, string> = {
  problema: "Problema reconhecível",
  escolha_honesta: "Escolha honesta",
  projetos_reais: "Projetos reais",
  como_trabalhamos: "Como trabalhamos",
  bastidores: "Bastidores",
  chamada_direta: "Chamada direta",
};
export const ajudaPilar: Record<Pilar, string> = {
  problema: "A rotina que trava: WhatsApp de cada um, planilha, orçamento sem retorno.",
  escolha_honesta: "Ferramenta pronta ou sistema; quando não contratar.",
  projetos_reais: "Cliente real, com tela real e autorização confirmada.",
  como_trabalhamos: "Etapas, aprovações, dados do cliente, projeto funcionando.",
  bastidores: "O Hub em uso, uma tela sendo construída, uma decisão explicada.",
  chamada_direta: "Convite para a conversa. No máximo 1 a cada 5 posts.",
};
export const rotuloFrente: Record<Frente, string> = {
  sistemas: "Sistemas sob medida",
  ia: "Inteligência artificial",
  sites: "Sites e lojas",
  automacoes: "Automações",
  diagnostico: "Diagnóstico",
  marca: "Marca (institucional)",
};
export const rotuloFormato: Record<Formato, string> = {
  carrossel: "Carrossel",
  post_unico: "Post único",
  reels: "Reels",
  stories: "Stories",
  texto: "Post de texto",
  documento: "Documento (carrossel em PDF)",
  artigo: "Artigo",
  video: "Vídeo",
  video_curto: "Vídeo curto",
  carrossel_fotos: "Carrossel de fotos",
  shorts: "Shorts",
  video_longo: "Vídeo longo",
  anuncio: "Anúncio",
};
export const rotuloChamada: Record<Chamada, string> = {
  marcar_conversa: "Marcar uma conversa",
  falar_whatsapp: "Falar no WhatsApp",
  quero_algo_assim: "Quero algo assim",
  agendar_diagnostico: "Agendar um diagnóstico",
  receber_artigos: "Receber os próximos artigos",
};
export const rotuloSituacaoCampanha: Record<SituacaoCampanha, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  encerrada: "Encerrada",
};

/** Formatos aceitos em cada canal (o banco confere a mesma regra em _mkt_formato_valido). */
export const formatosDoCanal: Record<string, Formato[]> = {
  instagram: ["carrossel", "post_unico", "reels", "stories", "anuncio"],
  linkedin: ["texto", "documento", "artigo", "video", "anuncio"],
  tiktok: ["video", "carrossel_fotos", "anuncio"],
  youtube: ["shorts", "video_longo", "anuncio"],
};
export const formatosDe = (canal: string): Formato[] =>
  formatosDoCanal[canal] ?? (Object.keys(rotuloFormato) as Formato[]);

/** Formato com roteiro (Tempo · Fala · Na tela). */
export const ehVideo = (f: Formato) =>
  ["reels", "video", "video_curto", "shorts", "video_longo", "stories", "anuncio"].includes(f);
/** Formato com slides. */
export const ehSlides = (f: Formato) => ["carrossel", "documento", "carrossel_fotos"].includes(f);

/**
 * Guia rápido por formato: medida e o que o manual pede. Medidas do Instagram conferidas em
 * 29/10/2026 (guia de tamanhos de 2026: 4:5 no feed, a grade mostra 3:4, 9:16 com área segura).
 */
export const guiaFormato: Partial<Record<Formato, string>> = {
  carrossel:
    "1080 × 1350 (4:5). De 3 a 8 slides: o primeiro com o problema, uma ideia por slide, o último com a chamada. A grade do perfil corta em 3:4: nada importante nas bordas de cima e de baixo.",
  post_unico: "1080 × 1350 (4:5). Uma frase forte e uma imagem; a legenda aprofunda.",
  reels:
    "1080 × 1920 (9:16). Blocos de até 5 s, legenda na tela sempre; problema nos 3 primeiros segundos. Texto longe de 150 px do topo e 250 px do rodapé.",
  stories:
    "1080 × 1920 (9:16). Bastidores e enquetes. Texto longe de 150 px do topo e 250 px do rodapé.",
  texto:
    "A primeira linha aparece antes do “ver mais”: ela precisa segurar. De 4 a 8 linhas curtas, sem emoji, até 3 hashtags e o link do site.",
  documento:
    "Os slides do carrossel exportados em PDF. Termina com a chamada e o link do site (não “link na bio”).",
  artigo: "Texto de autoridade; o mesmo assunto do Instagram, escrito para quem decide.",
  video: "Vídeo nativo; legenda na tela e chamada no final.",
  video_curto: "1080 × 1920 (9:16). Problema em 3 s, legenda na tela, chamada + @somosforadopapel.",
  carrossel_fotos: "Fotos em 9:16 com texto curto em cada uma.",
  shorts: "1080 × 1920 (9:16). Mesmo roteiro do Reels, com título próprio para busca.",
  video_longo:
    "1920 × 1080 (16:9). Roteiro em capítulos; título e descrição pensados para a busca do YouTube.",
  anuncio:
    "Uma promessa por variação; teste uma diferença de cada vez (gancho, imagem ou chamada).",
};

// ----------------------------------------------------------------------------
// Arquivos da versão (MK-2): a mesma regra do banco (_mkt_papel_aceita e _mkt_papel_exigido)
// ----------------------------------------------------------------------------

const imagens = ["image/png", "image/jpeg", "image/webp"];
export const mimesDoPapel: Record<PapelMidia, string[]> = {
  slide: imagens,
  capa: imagens,
  imagem: imagens,
  video: ["video/mp4"],
  documento: ["application/pdf"],
};
export const rotuloPapel: Record<PapelMidia, string> = {
  slide: "Slide",
  capa: "Capa",
  imagem: "Imagem",
  video: "Vídeo",
  documento: "PDF",
};

/** Papel que o formato exige para ir à aprovação (null = não exige arquivo). */
export function papelExigido(f: Formato): PapelMidia | null {
  if (f === "carrossel" || f === "carrossel_fotos") return "slide";
  if (f === "documento") return "documento";
  if (f === "post_unico" || f === "stories") return "imagem";
  if (["reels", "video", "video_curto", "shorts", "video_longo"].includes(f)) return "video";
  return null;
}

/** Papéis que a pessoa pode escolher em cada formato (o primeiro é o padrão). */
export function papeisDoFormato(f: Formato): PapelMidia[] {
  const exigido = papelExigido(f);
  if (exigido === "slide") return ["slide"];
  if (exigido === "documento") return ["documento", "slide"];
  if (exigido === "imagem") return ["imagem"];
  if (exigido === "video") return ["video", "capa"];
  return ["imagem", "video", "documento"];
}

/** Papel de um arquivo enviado, pelo tipo, dentro do que o formato aceita. */
export function papelDoArquivo(f: Formato, mime: string): PapelMidia | null {
  return papeisDoFormato(f).find((p) => mimesDoPapel[p].includes(mime)) ?? null;
}

/** Proporção esperada (largura ÷ altura) da imagem ou vídeo no formato; null = qualquer. */
export function proporcaoDoFormato(f: Formato): { valor: number; rotulo: string } | null {
  if (["carrossel", "post_unico"].includes(f)) return { valor: 4 / 5, rotulo: "4:5" };
  if (f === "video_longo") return { valor: 16 / 9, rotulo: "16:9" };
  if (["reels", "stories", "video", "video_curto", "shorts", "carrossel_fotos"].includes(f))
    return { valor: 9 / 16, rotulo: "9:16" };
  return null;
}
/** Diferença aceita entre a proporção medida e a esperada (o Instagram aceita 3:4 no feed). */
export const proporcaoParecida = (medida: number, esperada: number) =>
  Math.abs(medida - esperada) / esperada <= 0.08;

/** Primeira imagem da peça (para a miniatura do cartão): slide, imagem ou capa. */
export function primeiraImagem(p: Peca): string | null {
  for (const v of p.versoes)
    for (const m of v.midias ?? [])
      if (m.papel !== "video" && m.papel !== "documento" && !m.na_lixeira && m.caminho)
        return m.caminho;
  return null;
}

/** Links temporários do Storage privado (10 minutos), pedidos em lote. */
export async function linksDosArquivos(caminhos: string[]): Promise<Record<string, string>> {
  if (caminhos.length === 0) return {};
  const { data, error } = await supabase.storage.from("materiais").createSignedUrls(caminhos, 600);
  if (error) throw error;
  const r: Record<string, string> = {};
  for (const l of data ?? []) if (l.path && l.signedUrl) r[l.path] = l.signedUrl;
  return r;
}

// ----------------------------------------------------------------------------
// Endereço (filtros e painéis na URL)
// ----------------------------------------------------------------------------

export const buscaMarketing = z.object({
  aba: z.enum(["producao", "calendario", "campanhas"]).optional(),
  peca: z.string().uuid().optional(),
  campanha: z.string().uuid().optional(),
  canal: z.string().max(20).optional(),
  pilar: z
    .enum([
      "problema",
      "escolha_honesta",
      "projetos_reais",
      "como_trabalhamos",
      "bastidores",
      "chamada_direta",
    ])
    .optional(),
  objetivo: z.enum(["alcance", "autoridade", "conversa", "venda"]).optional(),
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
export type BuscaMarketing = z.infer<typeof buscaMarketing>;

export type FiltrosPecas = {
  campanha?: string;
  canal?: string;
  pilar?: Pilar;
  objetivo?: Objetivo;
};

export function filtrosDaBusca(b: BuscaMarketing): FiltrosPecas {
  const f: FiltrosPecas = {};
  if (b.campanha) f.campanha = b.campanha;
  if (b.canal) f.canal = b.canal;
  if (b.pilar) f.pilar = b.pilar;
  if (b.objetivo) f.objetivo = b.objetivo;
  return f;
}

// ----------------------------------------------------------------------------
// Chaves de cache e chamadas ao banco
// ----------------------------------------------------------------------------

export const chavesMarketing = {
  tudo: ["marketing"] as const,
  listas: ["marketing", "lista"] as const,
  lista: (f: FiltrosPecas) => ["marketing", "lista", f] as const,
  detalhes: ["marketing", "detalhe"] as const,
  detalhe: (id: string) => ["marketing", "detalhe", id] as const,
  resumo: ["marketing", "resumo"] as const,
  calendarios: ["marketing", "calendario"] as const,
  calendario: (inicio: string, fim: string) => ["marketing", "calendario", inicio, fim] as const,
  campanhas: ["marketing", "campanhas"] as const,
  canais: ["marketing", "canais"] as const,
  clientes: ["marketing", "clientes"] as const,
  links: (caminhos: string[]) => ["marketing", "links", caminhos] as const,
  materiais: ["marketing", "materiais"] as const,
};

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const listarCanais = () => rpc<Canal[]>("mkt_canais_listar");
export const listarPecas = (f: FiltrosPecas) =>
  rpc<ListaPecas>("mkt_pecas_listar", { p_filtros: f });
export const detalhePeca = (id: string) => rpc<PecaDetalhe>("mkt_peca_detalhe", { p_id: id });
export const resumoMarketing = () => rpc<ResumoMarketing>("mkt_resumo");
export const calendario = (inicio: string, fim: string) =>
  rpc<Calendario>("mkt_calendario", { p_inicio: inicio, p_fim: fim });
export const listarCampanhas = () => rpc<Campanha[]>("mkt_campanhas_listar");

export type ClienteOpcao = { id: string; empresa: string };
/** Clientes para a série "Projetos reais" (leitura pela RLS do dono). */
export async function listarClientesOpcoes(): Promise<ClienteOpcao[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, company_name")
    .order("company_name")
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: String(c.id), empresa: String(c.company_name) }));
}

export type NovaPeca = {
  titulo: string;
  versoes: { canal: string; formato: Formato }[];
  campanha?: string | null;
  prazo?: string | null;
  ideia?: string | null;
};
export const criarPeca = (v: NovaPeca) =>
  rpc<Peca>("mkt_peca_criar", {
    p_titulo: v.titulo,
    p_versoes: v.versoes,
    p_campanha: v.campanha ?? null,
    p_prazo: v.prazo ?? null,
    p_ideia: v.ideia ?? null,
  });

/** Briefing: só as chaves presentes mudam (null limpa). */
export type CamposPeca = Partial<{
  titulo: string;
  ideia: string | null;
  objetivo: Objetivo | null;
  funil: Funil | null;
  pilar: Pilar | null;
  frente: Frente | null;
  publico: string | null;
  serie: string | null;
  direcao_arte: string | null;
  prazo: string | null;
  campanha: string | null;
  cliente: string | null;
  autorizacao: boolean;
}>;
export const editarPeca = (id: string, campos: CamposPeca) =>
  rpc<Peca>("mkt_peca_editar", { p_id: id, p_campos: campos });
export const moverPeca = (id: string, etapa: Etapa) =>
  rpc<Peca>("mkt_peca_mover", { p_id: id, p_etapa: etapa });
export const aprovarPeca = (id: string, nota: string | null) =>
  rpc<Peca>("mkt_peca_aprovar", { p_id: id, p_nota: nota });
export const pedirAjuste = (id: string, nota: string) =>
  rpc<Peca>("mkt_peca_pedir_ajuste", { p_id: id, p_nota: nota });
export const removerPeca = (id: string) =>
  rpc<{ id: string; titulo: string }>("mkt_peca_remover", { p_id: id });

export type CamposVersao = Partial<{
  formato: Formato;
  gancho: string | null;
  texto: string | null;
  roteiro: Cena[];
  slides: Slide[];
  chamada: Chamada | null;
  hashtags: string | null;
}>;
export const adicionarVersao = (
  peca: string,
  canal: string,
  formato: Formato,
  copiarDe: string | null,
) =>
  rpc<Peca>("mkt_versao_adicionar", {
    p_peca: peca,
    p_canal: canal,
    p_formato: formato,
    p_copiar_de: copiarDe,
  });
export const editarVersao = (id: string, campos: CamposVersao) =>
  rpc<Peca>("mkt_versao_editar", { p_id: id, p_campos: campos });
export const removerVersao = (id: string) => rpc<Peca>("mkt_versao_remover", { p_id: id });
export const agendarVersao = (id: string, quando: string | null) =>
  rpc<Peca>("mkt_versao_agendar", { p_id: id, p_quando: quando });
export const publicarVersao = (id: string, link: string, quando: string | null) =>
  rpc<Peca>("mkt_versao_publicar", { p_id: id, p_link: link, p_quando: quando });
export const ligarArquivo = (versao: string, material: string, papel: PapelMidia) =>
  rpc<Peca>("mkt_midia_ligar", { p_versao: versao, p_material: material, p_papel: papel });
export const removerArquivo = (id: string) => rpc<Peca>("mkt_midia_remover", { p_id: id });
export const ordenarArquivos = (versao: string, ids: string[]) =>
  rpc<Peca>("mkt_midia_ordenar", { p_versao: versao, p_ids: ids });

export const registrarResultados = (id: string, r: Resultados) =>
  rpc<Peca>("mkt_versao_resultados", { p_id: id, p_resultados: r });

export type CamposCampanha = Partial<{
  nome: string;
  objetivo: Objetivo | null;
  funil: Funil | null;
  frente: Frente | null;
  inicio: string | null;
  fim: string | null;
  situacao: SituacaoCampanha;
  descricao: string | null;
}>;
export const salvarCampanha = (id: string | null, campos: CamposCampanha) =>
  rpc<Campanha>("mkt_campanha_salvar", { p_id: id, p_campos: campos });
export const removerCampanha = (id: string) => rpc<Campanha>("mkt_campanha_remover", { p_id: id });

// ----------------------------------------------------------------------------
// Ajudantes de tela
// ----------------------------------------------------------------------------

/** Peça com a etapa trocada (prévia otimista; o banco devolve a versão final). */
export function pecaNaEtapa<T extends Peca>(p: T, etapa: Etapa): T {
  const coluna = colunas.find((c) => c.etapas.includes(etapa))?.id ?? p.coluna;
  return { ...p, stage: etapa, coluna, stage_changed_at: new Date().toISOString() };
}

/** Peça com o briefing alterado (prévia otimista). */
export function pecaComCampos<T extends Peca>(p: T, c: CamposPeca): T {
  const n: T = { ...p };
  if (c.titulo !== undefined) n.title = c.titulo;
  if (c.ideia !== undefined) n.core_idea = c.ideia;
  if (c.objetivo !== undefined) n.objective = c.objetivo;
  if (c.funil !== undefined) n.funnel = c.funil;
  if (c.pilar !== undefined) n.pillar = c.pilar;
  if (c.frente !== undefined) n.front = c.frente;
  if (c.publico !== undefined) n.audience = c.publico;
  if (c.serie !== undefined) n.series = c.serie;
  if (c.direcao_arte !== undefined) n.art_direction = c.direcao_arte;
  if (c.prazo !== undefined) n.due_date = c.prazo;
  if (c.campanha !== undefined) n.campaign_id = c.campanha;
  if (c.cliente !== undefined) {
    // Trocou de cliente: a autorização precisa ser marcada de novo (regra do banco).
    if (c.cliente !== n.client_id && c.autorizacao === undefined) n.client_authorized = false;
    n.client_id = c.cliente;
  }
  if (c.autorizacao !== undefined) n.client_authorized = c.autorizacao;
  return n;
}

/** Quantos avisos a peça tem (e quantos bloqueiam a aprovação). */
export function contarAvisos(p: Peca) {
  let total = 0;
  let bloqueiam = 0;
  for (const v of p.versoes)
    for (const a of v.warnings) {
      total++;
      if (a.bloqueia) bloqueiam++;
    }
  return { total, bloqueiam };
}

/** Primeiro e último dia do mês ("2026-10") e os dias da grade (semanas de domingo a sábado). */
export function gradeDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const primeiro = new Date(Date.UTC(a, m - 1, 1));
  const ultimo = new Date(Date.UTC(a, m, 0));
  const inicio = new Date(primeiro);
  inicio.setUTCDate(1 - primeiro.getUTCDay());
  const fim = new Date(ultimo);
  fim.setUTCDate(ultimo.getUTCDate() + (6 - ultimo.getUTCDay()));
  const dias: string[] = [];
  for (const d = new Date(inicio); d <= fim; d.setUTCDate(d.getUTCDate() + 1))
    dias.push(d.toISOString().slice(0, 10));
  return { inicio: dias[0] ?? "", fim: dias[dias.length - 1] ?? "", dias };
}

export function mesVizinho(mes: string, passo: number): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(a, m - 1 + passo, 1));
  return d.toISOString().slice(0, 7);
}

export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const t = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Erros do banco em português (o detalhe diz o que falta nas portas). */
export function mensagemDoMarketing(e: unknown): string | null {
  const obj = (e ?? {}) as { message?: string; details?: string };
  const texto = e instanceof Error ? e.message : (obj.message ?? "");
  const detalhe = obj.details ? ` Falta: ${obj.details}.` : "";
  const mapa: Record<string, string> = {
    briefing_incompleto: "Complete o briefing antes de seguir." + detalhe,
    revisao_pendente: "A peça ainda não pode ir para aprovação." + detalhe,
    titulo_obrigatorio: "Dê um título à peça (pelo menos 2 letras).",
    nome_obrigatorio: "Dê um nome à campanha (pelo menos 2 letras).",
    nota_obrigatoria: "Escreva o que precisa mudar (pelo menos 3 letras).",
    etapa_invalida: "A peça mudou de etapa enquanto isso. Recarregue a página.",
    peca_publicada: "Essa peça já tem versão publicada e não volta para a produção.",
    versao_publicada: "Essa versão já foi publicada; o texto fica como saiu.",
    peca_nao_aprovada: "Agende e publique só depois de aprovar a peça.",
    link_invalido: "Cole o link do post, começando com https://.",
    data_no_futuro: "A data da publicação não pode estar no futuro.",
    data_no_passado: "Escolha uma data a partir de agora.",
    versao_nao_publicada: "Registre os resultados depois de marcar a versão como publicada.",
    resultados_invalidos: "Use números inteiros, de zero para cima.",
    ultima_versao: "A peça precisa de pelo menos uma versão.",
    versoes_demais: "Uma peça tem no máximo 12 versões.",
    formato_invalido: "Esse formato não existe nesse canal.",
    canal_inexistente: "Esse canal não está ativo.",
    peca_inexistente: "Essa peça não existe mais. Recarregue a página.",
    versao_inexistente: "Essa versão não existe mais. Recarregue a página.",
    campanha_inexistente: "Essa campanha não existe mais.",
    cliente_inexistente: "Esse cliente não existe mais.",
    autorizacao_sem_cliente: "Escolha o cliente antes de marcar a autorização.",
    periodo_invalido: "Período do calendário inválido.",
    tipo_do_arquivo: "Esse tipo de arquivo não serve nesse lugar (ex.: PDF não entra como slide).",
    material_inexistente:
      "Esse arquivo não existe mais em Materiais ou ainda não terminou de subir.",
    material_na_lixeira: "Esse arquivo está na lixeira de Materiais. Restaure antes de usar.",
    arquivo_de_outro_cliente:
      "Foto enviada por um cliente só entra na peça ligada a esse cliente (com a autorização marcada).",
    arquivo_repetido: "Esse arquivo já está nesta versão.",
    arquivos_demais: "Uma versão tem no máximo 20 arquivos.",
    midia_inexistente: "Esse arquivo já saiu da versão. Recarregue a página.",
    ordem_invalida: "A lista mudou enquanto isso. Recarregue a página e ordene de novo.",
    campos_invalidos: "Confira os dados: algum campo está fora do formato.",
    filtros_invalidos: "Esses filtros não valem mais. Limpe os filtros e tente de novo.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
