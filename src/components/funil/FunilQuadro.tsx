import { useMemo } from "react";

import { FunilColuna } from "@/components/funil/FunilColuna";
import type { AcaoCartao } from "@/components/funil/FunilCartao";
import { useIsMobile } from "@/hooks/use-mobile";
import { corColuna } from "@/lib/estilos";
import { etapas, type Etapa, type Oportunidade, type ResumoFunil } from "@/lib/funil";

/** Cor e descrição de cada etapa, no formato dos outros quadros (RD-0). */
const visualEtapa: Record<Etapa, { cor: string; descricao: string }> = {
  contato: { cor: corColuna.neutro, descricao: "Primeira conversa" },
  diagnostico: { cor: corColuna.info, descricao: "Entendendo o problema" },
  mapeamento: { cor: corColuna.info, descricao: "Desenhando a solução" },
  proposta: { cor: corColuna.atencao, descricao: "Esperando resposta" },
  fechado: { cor: corColuna.ok, descricao: "Viraram cliente" },
};

/**
 * Quadro do funil. Computador largo: 5 colunas separadas por fio, arrastar entre elas.
 * Telas menores: as colunas rolam de lado com encaixe (como Propostas e Tarefas);
 * no celular, "Mover para" fica no menu do cartão.
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
  const porEtapa = useMemo(() => {
    const mapa = new Map<Etapa, Oportunidade[]>(etapas.map((e) => [e.id, []]));
    for (const o of itens) mapa.get(o.stage)?.push(o);
    return mapa;
  }, [itens]);

  const soltar = (id: string, etapa: Etapa) => {
    const o = itens.find((x) => x.id === id);
    if (o && o.stage !== etapa) aoSoltar(o, etapa);
  };

  return (
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 items-stretch overflow-x-auto px-4 pb-2 md:-mx-8 md:scroll-px-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0">
      {etapas.map((e, i) => (
        <FunilColuna
          key={e.id}
          etapa={e.id}
          rotulo={e.rotulo}
          descricao={visualEtapa[e.id].descricao}
          cor={visualEtapa[e.id].cor}
          primeira={i === 0}
          itens={porEtapa.get(e.id) ?? []}
          quantidade={resumo?.etapas[e.id]?.quantidade ?? porEtapa.get(e.id)?.length ?? 0}
          somaCents={resumo?.etapas[e.id]?.soma_cents ?? 0}
          aoSoltar={soltar}
          aoAgir={aoAgir}
          arrastavel={!celular && !arquivados}
        />
      ))}
    </div>
  );
}
