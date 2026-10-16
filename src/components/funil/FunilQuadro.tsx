import { useMemo, useState } from "react";

import { FunilColuna } from "@/components/funil/FunilColuna";
import type { AcaoCartao } from "@/components/funil/FunilCartao";
import { useIsMobile } from "@/hooks/use-mobile";
import { etapas, type Etapa, type Oportunidade, type ResumoFunil } from "@/lib/funil";
import { cn } from "@/lib/utils";

/**
 * Quadro do funil. Computador: 5 colunas, arrastar entre elas.
 * Celular: uma etapa por vez, em abas; "Mover para" fica no menu do cartão.
 */
export function FunilQuadro({
  itens,
  resumo,
  aoSoltar,
  aoAgir,
  arquivados,
}: {
  itens: Oportunidade[];
  resumo: ResumoFunil | undefined;
  aoSoltar: (o: Oportunidade, etapa: Etapa) => void;
  aoAgir: (acao: AcaoCartao, o: Oportunidade) => void;
  arquivados: boolean;
}) {
  const celular = useIsMobile();
  const [aba, setAba] = useState<Etapa>("contato");
  const porEtapa = useMemo(() => {
    const mapa = new Map<Etapa, Oportunidade[]>(etapas.map((e) => [e.id, []]));
    for (const o of itens) mapa.get(o.stage)?.push(o);
    return mapa;
  }, [itens]);

  const soltar = (id: string, etapa: Etapa) => {
    const o = itens.find((x) => x.id === id);
    if (o && o.stage !== etapa) aoSoltar(o, etapa);
  };

  const coluna = (e: (typeof etapas)[number]) => (
    <FunilColuna
      key={e.id}
      etapa={e.id}
      rotulo={e.rotulo}
      itens={porEtapa.get(e.id) ?? []}
      quantidade={resumo?.etapas[e.id]?.quantidade ?? porEtapa.get(e.id)?.length ?? 0}
      somaCents={resumo?.etapas[e.id]?.soma_cents ?? 0}
      aoSoltar={soltar}
      aoAgir={aoAgir}
      arrastavel={!celular && !arquivados}
    />
  );

  if (celular) {
    const atual = etapas.find((e) => e.id === aba) ?? etapas[0];
    return (
      <div className="flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Etapas do funil"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
        >
          {etapas.map((e) => (
            <button
              key={e.id}
              role="tab"
              type="button"
              aria-selected={aba === e.id}
              onClick={() => setAba(e.id)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[14px] font-medium",
                aba === e.id
                  ? "border-hub-tinta bg-hub-tinta text-white"
                  : "border-hub-borda bg-white",
              )}
            >
              {e.rotulo}
              <span className="tabular-nums opacity-70">{porEtapa.get(e.id)?.length ?? 0}</span>
            </button>
          ))}
        </div>
        {atual && coluna(atual)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 items-start gap-3 max-xl:-mx-8 max-xl:grid-cols-[repeat(5,minmax(230px,1fr))] max-xl:overflow-x-auto max-xl:px-8 max-xl:pb-2">
      {etapas.map(coluna)}
    </div>
  );
}
