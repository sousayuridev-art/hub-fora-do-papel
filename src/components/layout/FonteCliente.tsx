import { useEffect, type ReactNode } from "react";

/**
 * RD-10 (item 6): páginas do cliente (portal, proposta, entrada do cliente) em Geist, com os
 * títulos principais em Bricolage (font-marca). O Hub interno continua em Poppins.
 * A Geist só é pedida nas rotas do cliente: use `linkGeist` no `head` da rota.
 */
export const linkGeist = {
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap&subset=latin",
} as const;

/**
 * Envolve a página do cliente. A classe também vai para o <html> enquanto a página está
 * aberta, para os painéis laterais e avisos (que abrem fora da página) seguirem a mesma fonte.
 */
export function FonteCliente({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("fonte-cliente");
    return () => html.classList.remove("fonte-cliente");
  }, []);
  return <div className="fonte-cliente contents">{children}</div>;
}
