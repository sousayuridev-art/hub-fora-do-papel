import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Bloco da tela de tráfego (RD-6): título curto, apoio de uma linha e ação à direita. */
export function Cartao({
  id,
  titulo,
  apoio,
  acao,
  className,
  children,
}: {
  id: string;
  titulo: ReactNode;
  apoio?: ReactNode;
  acao?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-t`}
      className={cn(
        "flex min-w-0 flex-col gap-3.5 rounded-2xl border border-hub-borda bg-white p-4 md:px-6 md:py-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${id}-t`} className="flex items-center gap-1 text-[16px] font-semibold">
            {titulo}
          </h2>
          {apoio && <div className="text-[13px] text-hub-suave">{apoio}</div>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}
