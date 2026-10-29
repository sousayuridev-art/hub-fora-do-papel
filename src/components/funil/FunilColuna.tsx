import { useState } from "react";

import { FunilCartao, type AcaoCartao } from "@/components/funil/FunilCartao";
import { moeda } from "@/lib/formatar";
import type { Etapa, Oportunidade } from "@/lib/funil";
import { cn } from "@/lib/utils";
import { classeAcaoTexto } from "@/lib/estilos";

const LIMITE = 50;

/** Coluna do funil: barra de cor, título, quantidade, descrição e soma; recebe cartões arrastados. */
export function FunilColuna({
  etapa,
  rotulo,
  itens,
  quantidade,
  somaCents,
  aoSoltar,
  aoAgir,
  arrastavel,
  descricao,
  cor,
  primeira = false,
}: {
  etapa: Etapa;
  rotulo: string;
  itens: Oportunidade[];
  quantidade: number;
  somaCents: number;
  aoSoltar: (idOportunidade: string, etapa: Etapa) => void;
  aoAgir: (acao: AcaoCartao, o: Oportunidade) => void;
  arrastavel: boolean;
  /** Descrição curta da etapa (formato dos quadros, RD-0). */
  descricao: string;
  /** Cor da barra do topo. */
  cor: string;
  primeira?: boolean;
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
        // Mesmo formato dos outros quadros (RD-0): fio entre colunas, barra de cor no topo.
        "flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col gap-2.5 rounded-xl px-3 pb-2 transition-colors md:w-[280px] md:max-w-none xl:w-auto xl:px-4",
        !primeira && "border-l border-hub-borda",
        sobre && "bg-[#EEF2FC] outline-2 outline-dashed outline-[#1E3FA8]",
      )}
    >
      <span aria-hidden="true" className="h-[3px] rounded-full" style={{ background: cor }} />
      <header className="flex flex-col gap-0.5 px-0.5 pb-1 pt-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15.5px] font-semibold">{rotulo}</h2>
          <span className="text-[14px] font-semibold tabular-nums text-[#4A4D54]">
            {quantidade}
          </span>
        </div>
        <span className="text-[12.5px] text-hub-suave">
          {descricao}
          {somaCents > 0 && (
            <>
              {" · "}
              <b className="font-semibold whitespace-nowrap text-hub-tinta tabular-nums">
                {moeda(somaCents)}
              </b>
            </>
          )}
        </span>
      </header>
      {visiveis.map((o) => (
        <FunilCartao key={o.id} o={o} aoAgir={aoAgir} arrastavel={arrastavel} />
      ))}
      {itens.length === 0 && (
        <p className="flex min-h-16 items-center justify-center rounded-2xl border border-dashed border-[#D6D6CF] px-3 text-center text-[14px] text-hub-suave">
          Nada por aqui
        </p>
      )}
      {!todos && itens.length > LIMITE && (
        <button type="button" onClick={() => setTodos(true)} className={`${classeAcaoTexto}`}>
          Ver todos ({itens.length})
        </button>
      )}
    </section>
  );
}
