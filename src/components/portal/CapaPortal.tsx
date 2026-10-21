import type { ReactNode } from "react";

/**
 * Capa escura do Início do portal (direção A, card CX-5), de ponta a ponta da tela.
 * Sobe por baixo do cabeçalho (que fica transparente no topo), para o brilho começar no alto,
 * e traz o símbolo da marca grande à direita no computador. O conteúdo ocupa a coluna da esquerda.
 */
export function CapaPortal({ children }: { children: ReactNode }) {
  return (
    <section className="capa-escura relative left-1/2 -mt-[76px] w-screen -translate-x-1/2 md:-mt-[120px]">
      <div className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-[84px] md:px-6 md:pb-[84px] md:pt-[120px] lg:px-16">
        <div
          aria-hidden="true"
          className="absolute right-[150px] top-[170px] size-60 max-lg:hidden"
        >
          <span className="absolute bottom-0 left-0 size-[170px] rounded-md border-[3px] border-[#F5F5F2]/[0.12]" />
          <span className="absolute right-0 top-0 size-[120px] rounded-md bg-[#FFB020] opacity-85 shadow-[0_30px_80px_rgba(255,176,32,0.35)]" />
        </div>
        <div className="relative max-w-[796px]">{children}</div>
      </div>
    </section>
  );
}

/** Folha clara com cantos arredondados que sobe por cima da capa. */
export function FolhaPortal({ children }: { children: ReactNode }) {
  return (
    <div className="relative left-1/2 -mt-9 min-h-[50dvh] w-screen -translate-x-1/2 rounded-t-[28px] bg-portal-fundo shadow-[0_-20px_50px_rgba(14,16,19,0.25)] md:rounded-t-[32px]">
      <div className="mx-auto max-w-[1440px] px-4 pt-7 md:px-6 md:pt-10 lg:px-16">{children}</div>
    </div>
  );
}
