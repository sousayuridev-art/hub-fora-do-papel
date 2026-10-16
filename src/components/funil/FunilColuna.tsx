import { useState } from "react";

import { FunilCartao, type AcaoCartao } from "@/components/funil/FunilCartao";
import { moeda } from "@/lib/formatar";
import type { Etapa, Oportunidade } from "@/lib/funil";
import { cn } from "@/lib/utils";

const LIMITE = 50;

/** Coluna do funil: título, quantidade, soma e cartões. Recebe cartões arrastados. */
export function FunilColuna({
  etapa,
  rotulo,
  itens,
  quantidade,
  somaCents,
  aoSoltar,
  aoAgir,
  arrastavel,
}: {
  etapa: Etapa;
  rotulo: string;
  itens: Oportunidade[];
  quantidade: number;
  somaCents: number;
  aoSoltar: (idOportunidade: string, etapa: Etapa) => void;
  aoAgir: (acao: AcaoCartao, o: Oportunidade) => void;
  arrastavel: boolean;
}) {
  const [sobre, setSobre] = useState(false);
  const [todos, setTodos] = useState(false);
  const visiveis = todos ? itens : itens.slice(0, LIMITE);

  return (
    <section
      aria-label={`${rotulo}: ${quantidade}`}
      onDragOver={(e) => {
        if (!arrastavel) return;
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) aoSoltar(id, etapa);
      }}
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-2xl p-2.5 transition-colors",
        etapa === "fechado" ? "bg-[#E8EFE9]" : "bg-coluna",
        sobre && "outline-2 outline-dashed outline-[#1E3FA8]",
      )}
    >
      <header className="flex flex-col gap-0.5 px-1.5 pb-1 pt-1.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{rotulo}</h2>
          <span className="flex size-6 items-center justify-center rounded-full bg-white text-[12.5px] font-semibold tabular-nums">
            {quantidade}
          </span>
        </div>
        <span className="font-rotulo text-[13px] text-hub-suave tabular-nums">
          {somaCents > 0 ? moeda(somaCents) : "Sem valor ainda"}
        </span>
      </header>
      {visiveis.map((o) => (
        <FunilCartao key={o.id} o={o} aoAgir={aoAgir} arrastavel={arrastavel} />
      ))}
      {itens.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#D6D6CF] px-3 py-6 text-center text-[13.5px] text-hub-suave">
          Nenhuma oportunidade aqui.
        </p>
      )}
      {!todos && itens.length > LIMITE && (
        <button
          type="button"
          onClick={() => setTodos(true)}
          className="min-h-11 rounded-xl text-[14px] font-medium text-[#1E3FA8] hover:bg-white"
        >
          Ver todos ({itens.length})
        </button>
      )}
    </section>
  );
}
