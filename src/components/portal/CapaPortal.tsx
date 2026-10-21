import type { ReactNode } from "react";

/**
 * Capa escura do Início do portal (direção A, card CX-5), de ponta a ponta da tela, colada no
 * cabeçalho escuro. O que vem depois sobe numa folha clara (FolhaPortal).
 */
export function CapaPortal({ children }: { children: ReactNode }) {
  return (
    <section className="capa-escura relative left-1/2 -mt-5 w-screen -translate-x-1/2 md:-mt-12">
      <div className="mx-auto max-w-[1120px] px-4 pb-16 pt-7 md:px-6 md:pb-24 md:pt-14">
        {children}
      </div>
    </section>
  );
}

/** Folha clara com cantos arredondados que sobe por cima da capa. */
export function FolhaPortal({ children }: { children: ReactNode }) {
  return (
    <div className="relative left-1/2 -mt-9 min-h-[50dvh] w-screen -translate-x-1/2 rounded-t-[28px] bg-portal-fundo shadow-[0_-24px_40px_-24px_rgba(14,16,19,0.45)] md:-mt-12 md:rounded-t-[36px]">
      <div className="mx-auto max-w-[1120px] px-4 pt-7 md:px-6 md:pt-12">{children}</div>
    </div>
  );
}
