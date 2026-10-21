/**
 * Endereço público do Hub, para links que saem do sistema (prévia do link no WhatsApp: card CX-8).
 * Troque por VITE_ENDERECO_PUBLICO quando houver domínio próprio.
 */
export const enderecoPublico = (
  (import.meta.env["VITE_ENDERECO_PUBLICO"] as string | undefined) ??
  "https://spring-board-kit.lovable.app"
).replace(/\/$/, "");

/** Meta tags da prévia do link (Open Graph). Sem dados do cliente: título, frase e imagem fixos. */
export function previaDoLink(titulo: string, descricao: string, imagem: "proposta" | "portal") {
  return [
    { property: "og:title", content: titulo },
    { property: "og:description", content: descricao },
    { property: "og:site_name", content: "Fora do Papel" },
    { property: "og:image", content: `${enderecoPublico}/og/${imagem}.png` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
