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

export type Tipo = "vendas" | "entrega" | "pedidos" | "dinheiro";

const tiposCor: Record<Tipo, string> = {
  vendas: "bg-tipo-vendas text-tipo-vendas-t",
  entrega: "bg-tipo-entrega text-tipo-entrega-t",
  pedidos: "bg-tipo-pedidos text-tipo-pedidos-t",
  dinheiro: "bg-tipo-dinheiro text-tipo-dinheiro-t",
};
const tiposPonto: Record<Tipo, string> = {
  vendas: "bg-tipo-vendas-p",
  entrega: "bg-tipo-entrega-p",
  pedidos: "bg-tipo-pedidos-p",
  dinheiro: "bg-tipo-dinheiro-p",
};

/** Selo de tipo (RD2-1): a mesma cor em todas as telas, sempre com palavra. */
export function SeloTipo({
  tipo,
  children,
  className,
}: {
  tipo: Tipo;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium leading-5",
        tiposCor[tipo],
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", tiposPonto[tipo])} />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

/**
 * Sigla da empresa num quadrado cinza (RD2, 29/10: menos cor; a cor fica para as situações).
 * Com `logo`, mostra a imagem no lugar. `escuro` destaca clientes ativos na lista.
 * `semente` fica para compatibilidade e não muda a cor.
 */
export function Sigla({
  texto,
  logo,
  escuro = false,
}: {
  texto: string;
  semente?: string;
  logo?: string | null;
  escuro?: boolean;
}) {
  if (logo)
    return (
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="size-9 shrink-0 rounded-lg border border-hub-borda bg-white object-contain p-0.5"
      />
    );
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg font-rotulo text-[13px] font-semibold",
        escuro ? "bg-hub-tinta text-white" : "bg-[#EEF1F5] text-[#2A2D33]",
      )}
    >
      {texto}
    </span>
  );
}
