import { useState } from "react";

import { FunilCartao, type AcaoCartao } from "@/components/funil/FunilCartao";
import { moeda } from "@/lib/formatar";
import type { Etapa, Oportunidade } from "@/lib/funil";
import { cn } from "@/lib/utils";
import { classeAcaoTexto } from "@/lib/estilos";

const LIMITE = 50;

export type VisualEtapa = {
  /** Fundo claro da coluna inteira. */
  fundo: string;
  /** Faixa do topo, ponto e barra de peso. */
  cor: string;
  /** Texto do número de cartões. */
  texto: string;
  descricao: string;
};

/**
 * Coluna de Vendas (RD2-2): fundo na cor da etapa de ponta a ponta, faixa no topo,
 * quantidade, descrição e soma, e a barra com o peso da etapa no valor em negociação.
 * Cartões brancos separados; recebe cartões arrastados.
 */
export function FunilColuna({
  etapa,
  rotulo,
  itens,
  quantidade,
  somaCents,
  pesoPct,
  visual,
  aoSoltar,
  aoAgir,
  arrastavel,
}: {
  etapa: Etapa;
  rotulo: string;
  itens: Oportunidade[];
  quantidade: number;
  somaCents: number;
  /** Parte desta etapa no valor total em negociação (0 a 100). */
  pesoPct: number;
  visual: VisualEtapa;
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
        "flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border-t-4 transition-shadow md:w-[290px] md:max-w-none xl:w-auto",
        sobre && "outline-2 outline-offset-2 outline-dashed outline-hub-tinta",
      )}
      style={{ background: visual.fundo, borderTopColor: visual.cor }}
    >
      <header className="flex flex-col gap-2 px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{rotulo}</h2>
          <span
            className="inline-grid h-[22px] min-w-6 place-items-center rounded-full bg-white px-2 text-[12.5px] font-semibold tabular-nums"
            style={{ color: visual.texto }}
          >
            {quantidade}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[13px] text-[#2A2D33]">
          <span>{visual.descricao}</span>
          {somaCents > 0 && (
            <b className="whitespace-nowrap font-semibold tabular-nums">{moeda(somaCents)}</b>
          )}
        </div>
        <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-white/80">
          <span
            className="block h-1 rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, pesoPct))}%`, background: visual.cor }}
          />
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-3 pt-1">
        {visiveis.map((o) => (
          <FunilCartao key={o.id} o={o} aoAgir={aoAgir} arrastavel={arrastavel} />
        ))}
        {itens.length === 0 && (
          <p className="px-2 py-3 text-center text-[13.5px] text-[#4A4D54]">
            {arrastavel
              ? "Nenhuma oportunidade. Arraste um cartão para cá."
              : "Nenhuma oportunidade."}
          </p>
        )}
        {!todos && itens.length > LIMITE && (
          <button
            type="button"
            onClick={() => setTodos(true)}
            className={`${classeAcaoTexto} self-start bg-white`}
          >
            Ver todas ({itens.length}) ⌄
          </button>
        )}
      </div>
    </section>
  );
}
