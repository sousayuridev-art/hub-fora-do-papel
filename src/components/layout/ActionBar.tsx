import type { ReactNode } from "react";

type Props = {
  /** Valor principal, ex.: "R$ 7.200". */
  valor: ReactNode;
  /** Linha de apoio, ex.: "+ R$ 290/mês". */
  apoio?: ReactNode;
  rotulo: string;
  /** Âncora do bloco de aceite/decisão. A barra nunca aceita direto (card P, M2). */
  alvo: string;
};

/** M2 · Barra de ação das telas de decisão, só no celular. Ocupa o lugar das abas. */
export function ActionBar({ valor, apoio, rotulo, alvo }: Props) {
  function irParaAlvo(evento: React.MouseEvent<HTMLAnchorElement>) {
    const destino = document.getElementById(alvo);
    if (!destino) return;
    evento.preventDefault();
    destino.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      role="region"
      aria-label="Valor e decisão"
      className="barra-fixa fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-hub-borda bg-white px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(14,16,19,0.22)] md:hidden"
    >
      <div className="flex min-w-0 flex-col leading-tight">
        <strong className="font-titulo text-xl font-semibold tracking-tight tabular-nums">
          {valor}
        </strong>
        {apoio && <span className="text-[12.5px] text-hub-suave">{apoio}</span>}
      </div>
      <a
        href={`#${alvo}`}
        onClick={irParaAlvo}
        className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white active:bg-[#2A2E35]"
      >
        {rotulo}
      </a>
    </div>
  );
}
