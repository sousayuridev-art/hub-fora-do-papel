import { supabase } from "@/lib/supabase";

/** Materiais (card S8): cadastro único de arquivos, textos prontos e links. */

export type CategoriaMaterial =
  "modelos" | "guias" | "textos" | "marca" | "anuncios" | "redes" | "entregas" | "cliente";
export type TipoMaterial = "arquivo" | "texto" | "link";

export const categoriasMaterial: { id: CategoriaMaterial; rotulo: string }[] = [
  { id: "modelos", rotulo: "Modelos e documentos" },
  { id: "guias", rotulo: "Guias para clientes" },
  { id: "textos", rotulo: "Textos prontos" },
  { id: "marca", rotulo: "Marca e apresentação" },
  { id: "anuncios", rotulo: "Anúncios" },
  // MK-2: arquivos das peças da Central de conteúdo
  { id: "redes", rotulo: "Conteúdo das redes" },
  { id: "entregas", rotulo: "Entregas de projetos" },
  { id: "cliente", rotulo: "Enviados pelos clientes" },
];
export const rotuloCategoria = Object.fromEntries(
  categoriasMaterial.map((c) => [c.id, c.rotulo]),
) as Record<CategoriaMaterial, string>;

export type Material = {
  id: string;
  categoria: CategoriaMaterial;
  tipo: TipoMaterial;
  origem: "nosso" | "cliente";
  titulo: string;
  descricao: string | null;
  texto: string | null;
  url: string | null;
  caminho: string | null;
  arquivo: string | null;
  mime: string | null;
  tamanho: number | null;
  compartilhado: boolean;
  client_id: string | null;
  project_id: string | null;
  empresa: string | null;
  projeto: string | null;
  atualizado_em: string;
  excluido_em: string | null;
};

export type ListaMateriais = {
  contagem: Record<CategoriaMaterial | "todos" | "lixeira" | "compartilhados", number>;
  itens: Material[];
};

export type ArquivosPortal = {
  da_agencia: Material[];
  enviados: Material[];
  falta_enviar: {
    id: string;
    titulo: string;
    detalhe: string | null;
    prazo: string | null;
    atrasada: boolean | null;
  }[];
};

export const chavesMateriais = {
  tudo: ["materiais"] as const,
  lista: ["materiais", "lista"] as const,
  portal: ["portal", "arquivos"] as const,
};

/** Tipos aceitos (mesma lista do banco e do bucket; SVG saiu no card REV-5) e tamanho máximo. */
export const tiposAceitos = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "video/mp4",
  "audio/mpeg",
];
export const tamanhoMaximo = 25 * 1024 * 1024;

/** O navegador às vezes não informa o tipo (ex.: HEIC); deduz pela extensão. */
export function tipoDoArquivo(f: File): string {
  if (f.type) return f.type;
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  const mapa: Record<string, string> = {
    heic: "image/heic",
    heif: "image/heif",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    csv: "text/csv",
    txt: "text/plain",
    zip: "application/zip",
  };
  return mapa[ext] ?? "application/octet-stream";
}

/** Confere tipo e tamanho antes de enviar; devolve a mensagem de erro ou null. */
export function problemaDoArquivo(f: File): string | null {
  if (f.size > tamanhoMaximo) return `${f.name}: passa de 25 MB.`;
  if (!tiposAceitos.includes(tipoDoArquivo(f)))
    return `${f.name}: tipo não aceito. Use PDF, imagem, Office, texto, zip, MP4 ou MP3.`;
  return null;
}

export function tamanhoLegivel(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function tipoLegivel(m: Pick<Material, "tipo" | "mime">): string {
  if (m.tipo === "texto") return "Texto pronto";
  if (m.tipo === "link") return "Link";
  const mime = m.mime ?? "";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "Imagem";
  if (mime.includes("word")) return "Documento Word";
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv") return "Planilha";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "Apresentação";
  if (mime.startsWith("video/")) return "Vídeo";
  if (mime.startsWith("audio/")) return "Áudio";
  if (mime === "application/zip") return "Arquivo compactado";
  return "Arquivo";
}

async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw error;
  return data as T;
}

export const listarMateriais = () => rpc<ListaMateriais>("materiais_lista");
export const arquivosDoPortal = () => rpc<ArquivosPortal>("portal_arquivos");

/** Envio em 3 passos: reserva o caminho, manda ao Storage e confirma no banco. */
async function enviar(
  preparar: () => Promise<{ id: string; caminho: string }>,
  arquivo: File,
): Promise<Material> {
  const { id, caminho } = await preparar();
  const { error } = await supabase.storage
    .from("materiais")
    .upload(caminho, arquivo, { contentType: tipoDoArquivo(arquivo), upsert: false });
  if (error) throw error;
  return rpc<Material>("material_confirmar", { p_id: id });
}

export const enviarMaterial = (v: {
  arquivo: File;
  categoria: CategoriaMaterial;
  titulo: string;
  descricao: string;
  clienteId: string | null;
  projetoId: string | null;
  compartilhado: boolean;
}) =>
  enviar(
    () =>
      rpc("material_preparar", {
        p_categoria: v.categoria,
        p_titulo: v.titulo,
        p_descricao: v.descricao || null,
        p_cliente: v.clienteId,
        p_projeto: v.projetoId,
        p_compartilhado: v.compartilhado,
        p_nome_arquivo: v.arquivo.name,
        p_mime: tipoDoArquivo(v.arquivo),
        p_tamanho: v.arquivo.size,
      }),
    v.arquivo,
  );

export const enviarDoPortal = (v: { arquivo: File; titulo: string; pendenciaId: string | null }) =>
  enviar(
    () =>
      rpc("portal_arquivo_preparar", {
        p_titulo: v.titulo || null,
        p_nome_arquivo: v.arquivo.name,
        p_mime: tipoDoArquivo(v.arquivo),
        p_tamanho: v.arquivo.size,
        p_pendencia: v.pendenciaId,
      }),
    v.arquivo,
  );

export const salvarMaterial = (v: {
  id: string | null;
  tipo: TipoMaterial;
  categoria: CategoriaMaterial;
  titulo: string;
  descricao: string;
  conteudo: string;
  clienteId: string | null;
  projetoId: string | null;
  compartilhado: boolean;
}) =>
  rpc<Material>("material_salvar", {
    p_id: v.id,
    p_tipo: v.tipo,
    p_categoria: v.categoria,
    p_titulo: v.titulo,
    p_descricao: v.descricao || null,
    p_conteudo: v.conteudo,
    p_cliente: v.clienteId,
    p_projeto: v.projetoId,
    p_compartilhado: v.compartilhado,
  });

export const moverParaLixeira = (id: string, excluir: boolean) =>
  rpc("material_lixeira", { p_id: id, p_excluir: excluir });

/** Exclui de vez: apaga o arquivo do Storage e depois o registro. */
export async function excluirDeVez(m: Material) {
  if (m.caminho) {
    const { error } = await supabase.storage.from("materiais").remove([m.caminho]);
    if (error) throw error;
  }
  await rpc("material_excluir", { p_id: m.id });
}

/** Abre ou baixa um arquivo com link temporário (5 minutos). */
export async function abrirArquivo(
  m: Pick<Material, "caminho" | "arquivo" | "mime">,
  baixar: boolean,
) {
  if (!m.caminho) return;
  // SVG e texto podem conter script ou HTML: sempre baixar, nunca abrir no navegador
  if (m.mime === "image/svg+xml" || m.mime?.startsWith("text/")) baixar = true;
  const { data, error } = await supabase.storage
    .from("materiais")
    .createSignedUrl(m.caminho, 300, baixar ? { download: m.arquivo ?? true } : undefined);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener");
}

export function mensagemDoMaterial(e: unknown): string | null {
  const texto =
    e instanceof Error ? e.message : ((e as { message?: string } | null)?.message ?? "");
  const mapa: Record<string, string> = {
    tipo_nao_aceito: "Tipo de arquivo não aceito. Use PDF, imagem, Office, texto, zip, MP4 ou MP3.",
    arquivo_grande: "O arquivo passa de 25 MB.",
    arquivo_invalido: "Nome de arquivo inválido. Renomeie e tente de novo.",
    arquivo_nao_chegou: "O arquivo não chegou. Confira a internet e tente de novo.",
    titulo_obrigatorio: "Dê um nome (pelo menos 2 letras).",
    texto_obrigatorio: "Escreva o texto.",
    link_invalido: "O link precisa começar com https://.",
    compartilhar_sem_cliente: "Para compartilhar, escolha o cliente.",
    material_do_cliente: "Arquivo enviado pelo cliente: ele já vê no portal.",
    muitas_tentativas: "Muitos envios hoje. Fale com o seu responsável pelo WhatsApp.",
    material_inexistente: "Esse material não existe mais. Recarregue a página.",
    pendencia_inexistente: "Essa pendência não está mais aberta.",
    arquivo_nao_apagado: "Não foi possível apagar o arquivo. Tente de novo em instantes.",
    material_em_uso:
      "Esse arquivo está numa peça da Central de conteúdo. Tire-o da peça antes de excluir de vez.",
  };
  const chave = Object.keys(mapa).find((k) => texto.includes(k));
  return chave ? (mapa[chave] ?? null) : null;
}
