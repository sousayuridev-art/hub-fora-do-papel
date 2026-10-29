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

/** Tons da sigla (RD2-1): os fundos claros das situações, escolhidos pelo nome. */
const tonsSigla = [
  "bg-sit-info text-sit-info-t",
  "bg-sit-atencao text-sit-atencao-t",
  "bg-sit-ok text-sit-ok-t",
  "bg-tipo-pedidos text-tipo-pedidos-t",
  "bg-[#E8EEF3] text-[#2A4A63]",
] as const;

/** Mesmo nome, mesma cor, em qualquer tela. */
export function corDaSigla(nome: string): string {
  // FNV-1a: nomes parecidos ("Loja Exemplo", "Loja Modelo") caem em cores diferentes
  let h = 0x811c9dc5;
  for (const c of nome.trim().toLowerCase()) {
    h ^= c.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Mistura final: espalha nomes que só mudam no começo ("Loja Exemplo", "Ótica Exemplo")
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return tonsSigla[h % tonsSigla.length] ?? tonsSigla[0];
}

/**
 * Sigla da empresa num quadrado. A cor sai do nome (`semente`, padrão: o próprio texto);
 * com `logo`, mostra a imagem no lugar. `escuro` destaca clientes ativos na lista.
 */
export function Sigla({
  texto,
  semente,
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
        escuro ? "bg-hub-tinta text-white" : corDaSigla(semente ?? texto),
      )}
    >
      {texto}
    </span>
  );
}
