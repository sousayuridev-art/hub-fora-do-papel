/**
 * Link de botão que pode ir ao ar: https://, caminho do site (/contato), âncora (#), mailto: e tel:.
 * O banco recusa o resto ao salvar (revisão de segurança, 28/10); aqui é a segunda trava.
 */
export function linkSeguro(link: string | undefined): string {
  const l = (link ?? "").trim();
  return /^(https:\/\/\S+|\/\S*|#\S*|mailto:\S+|tel:[+0-9() -]+)$/.test(l) ? l : "#";
}
