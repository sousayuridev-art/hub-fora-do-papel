import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { FunilColuna, type VisualEtapa } from "@/components/funil/FunilColuna";
import { FunilCartao, type AcaoCartao } from "@/components/funil/FunilCartao";
import { useIsMobile } from "@/hooks/use-mobile";
import { etapas, type Etapa, type Oportunidade, type ResumoFunil } from "@/lib/funil";
import { cn } from "@/lib/utils";

/** Cor de cada etapa (RD2-2): a mesma em todas as telas que mostram a etapa. */
export const visualEtapa: Record<Etapa, VisualEtapa> = {
  contato: {
    fundo: "var(--color-tipo-vendas)",
    cor: "var(--color-tipo-vendas-p)",
    texto: "var(--color-tipo-vendas-t)",
    descricao: "Primeira conversa",
  },
  diagnostico: {
    fundo: "var(--color-tipo-pedidos)",
    cor: "var(--color-tipo-pedidos-p)",
    texto: "var(--color-tipo-pedidos-t)",
    descricao: "Entendendo o problema",
  },
  mapeamento: {
    fundo: "var(--color-tipo-entrega)",
    cor: "var(--color-tipo-entrega-p)",
    texto: "var(--color-tipo-entrega-t)",
    descricao: "Desenhando a solução",
  },
  proposta: {
    fundo: "var(--color-tipo-dinheiro)",
    cor: "var(--color-tipo-dinheiro-p)",
    texto: "var(--color-tipo-dinheiro-t)",
    descricao: "Esperando resposta",
  },
  fechado: {
    fundo: "var(--color-sit-ok)",
    cor: "var(--color-sit-ok-t)",
    texto: "var(--color-sit-ok-t)",
    descricao: "Viraram cliente",
  },
};

/**
 * Quadro de Vendas (RD2-2). Só o que está em negociação: Contato, Diagnóstico, Mapeamento
 * e Proposta. Fechado sai do quadro e aparece só no filtro "Fechados" (uma coluna).
 * Computador largo: 4 colunas de altura cheia, arrastar entre elas.
 * Telas menores: as colunas rolam de lado com encaixe; no celular, "Mover para" no menu do cartão.
 */
export function FunilQuadro({
  itens,
  resumo,
  aoSoltar,
  aoAgir,
  arquivados,
  fechados = false,
}: {
  itens: Oportunidade[];
  resumo: ResumoFunil | undefined;
  aoSoltar: (o: Oportunidade, etapa: Etapa) => void;
  aoAgir: (acao: AcaoCartao, o: Oportunidade) => void;
  arquivados: boolean;
  fechados?: boolean;
}) {
  const celular = useIsMobile();
  const colunas = fechados
    ? etapas.filter((e) => e.id === "fechado")
    : etapas.filter((e) => e.id !== "fechado");
  const porEtapa = useMemo(() => {
    const mapa = new Map<Etapa, Oportunidade[]>(etapas.map((e) => [e.id, []]));
    for (const o of itens) mapa.get(o.stage)?.push(o);
    return mapa;
  }, [itens]);
  const total = colunas.reduce((s, e) => s + (resumo?.etapas[e.id]?.soma_cents ?? 0), 0);

  const arrastavel = !celular && !arquivados && !fechados;
  // Arrastar só começa depois de 6 px: um clique simples continua abrindo o cliente e o menu
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [ativoId, setAtivoId] = useState<string | null>(null);
  const ativo = ativoId ? (itens.find((x) => x.id === ativoId) ?? null) : null;

  const aoComecar = (e: DragStartEvent) => setAtivoId(String(e.active.id));
  const aoTerminar = (e: DragEndEvent) => {
    setAtivoId(null);
    const etapa = e.over?.id as Etapa | undefined;
    const o = itens.find((x) => x.id === e.active.id);
    if (!o || !etapa || o.stage === etapa) return;
    // Retorno ao toque em aparelhos que vibram (sem efeito no computador)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    aoSoltar(o, etapa);
  };

  return (
    <DndContext
      sensors={sensores}
      onDragStart={aoComecar}
      onDragEnd={aoTerminar}
      onDragCancel={() => setAtivoId(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Para mover, aperte espaço, use as setas para escolher a coluna e aperte espaço de novo. Esc cancela.",
        },
      }}
    >
      <div
        className={cn(
          "-mx-4 flex snap-x snap-mandatory scroll-px-4 items-stretch gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:scroll-px-8 md:px-8 xl:mx-0 xl:grid xl:min-h-[calc(100dvh-340px)] xl:overflow-visible xl:px-0",
          fechados ? "xl:grid-cols-[minmax(0,420px)]" : "xl:grid-cols-4",
        )}
      >
        {colunas.map((e) => {
          const soma = resumo?.etapas[e.id]?.soma_cents ?? 0;
          return (
            <FunilColuna
              key={e.id}
              etapa={e.id}
              rotulo={e.rotulo}
              visual={visualEtapa[e.id]}
              itens={porEtapa.get(e.id) ?? []}
              quantidade={resumo?.etapas[e.id]?.quantidade ?? porEtapa.get(e.id)?.length ?? 0}
              somaCents={soma}
              pesoPct={total > 0 ? (soma / total) * 100 : 0}
              aoAgir={aoAgir}
              arrastavel={arrastavel}
            />
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
        {ativo ? <FunilCartao o={ativo} aoAgir={aoAgir} arrastavel flutuando /> : null}
      </DragOverlay>
    </DndContext>
  );
}
