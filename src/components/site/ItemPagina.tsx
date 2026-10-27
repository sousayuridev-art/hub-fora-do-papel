import { useId, type ReactNode } from "react";

import { BotoesMover } from "@/components/site/BotoesMover";

/** Cartão de um item repetido nas páginas (frente, pergunta, projeto), com mover e remover. */
export function ItemPagina({
  titulo,
  nome,
  indice,
  total,
  aoMover,
  aoRemover,
  children,
}: {
  titulo: string;
  /** Para leitores de tela: "pergunta 2". */
  nome: string;
  indice: number;
  total: number;
  /** Sem estas funções, o item é fixo (ex.: as 4 frentes). */
  aoMover?: (direcao: -1 | 1) => void;
  aoRemover?: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-hub-borda p-4"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p id={id} className="min-w-0 truncate font-titulo text-[15.5px] font-semibold">
          {titulo}
        </p>
        {aoMover && aoRemover && (
          <BotoesMover
            nome={nome}
            indice={indice}
            total={total}
            aoMover={aoMover}
            aoRemover={aoRemover}
          />
        )}
      </div>
      {children}
    </div>
  );
}
