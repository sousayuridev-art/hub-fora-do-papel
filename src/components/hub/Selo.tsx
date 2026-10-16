import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Tom = "neutro" | "info" | "atencao" | "risco" | "ok";

const tons: Record<Tom, string> = {
  neutro: "bg-sit-neutro text-sit-neutro-t",
  info: "bg-sit-info text-sit-info-t",
  atencao: "bg-sit-atencao text-sit-atencao-t",
  risco: "bg-sit-risco text-sit-risco-t",
  ok: "bg-sit-ok text-sit-ok-t",
};

/** Selo de situação com ponto colorido (cores do CLAUDE.md). */
export function Selo({
  tom = "neutro",
  children,
  className,
  ponto = true,
}: {
  tom?: Tom;
  children: ReactNode;
  className?: string;
  ponto?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-start gap-1.5 rounded-md px-2 py-0.5 text-[13px] font-medium leading-5",
        tons[tom],
        className,
      )}
    >
      {ponto && (
        <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current" />
      )}
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/** Sigla da empresa num quadrado (como na proposta 2). */
export function Sigla({ texto, escuro = false }: { texto: string; escuro?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg font-rotulo text-[13px] font-medium",
        escuro ? "bg-hub-tinta text-white" : "border border-hub-borda bg-[#F1F1EC] text-hub-tinta",
      )}
    >
      {texto}
    </span>
  );
}
