import type { HTMLAttributes } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Link } from "@tanstack/react-router";
import { CalendarClock, MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Selo, SeloTipo, Sigla } from "@/components/hub/Selo";
import { diaComHora, diaMes, moeda, prazoRelativo, sigla } from "@/lib/formatar";
import {
  rotuloDiagnostico,
  rotuloEtapa,
  rotuloMotivo,
  rotuloOrigem,
  situacaoProposta,
  type Oportunidade,
} from "@/lib/funil";
import { cn } from "@/lib/utils";

export type AcaoCartao = "mover" | "passo" | "arquivar" | "desarquivar";

/** Fundo do rodapé conforme o prazo do próximo passo. */
const fundoPrazo = {
  risco: "bg-sit-risco",
  atencao: "bg-[#FFF6E2]",
  neutro: "bg-[#F7F7F4]",
} as const;
const textoPrazo = {
  risco: "font-semibold text-sit-risco-t",
  atencao: "font-semibold text-sit-atencao-t",
  neutro: "text-[#4A4D54]",
} as const;

/**
 * Cartão de Vendas (RD2-2): sigla com cor fixa, empresa, valor, selos (tipo, origem,
 * diagnóstico, proposta) e o próximo passo no rodapé, colorido pelo prazo.
 */
export function FunilCartao({
  o,
  aoAgir,
  arrastavel,
  flutuando = false,
  fantasma = false,
  refArrastar,
  propsArrastar,
}: {
  o: Oportunidade;
  aoAgir: (acao: AcaoCartao, o: Oportunidade) => void;
  arrastavel: boolean;
  /** Cópia que segue o cursor enquanto arrasta (levemente inclinada, com sombra). */
  flutuando?: boolean;
  /** Lugar de origem enquanto o cartão está sendo arrastado. */
  fantasma?: boolean;
  refArrastar?: ((el: HTMLElement | null) => void) | undefined;
  propsArrastar?: HTMLAttributes<HTMLElement> | undefined;
}) {
  const prazo =
    o.next_step_date && o.stage !== "fechado" && !o.archived_at
      ? prazoRelativo(o.next_step_date, o.hoje, o.next_step_has_time ? o.next_step_at : null)
      : null;
  const proposta = situacaoProposta(o);

  return (
    <article
      ref={refArrastar}
      {...propsArrastar}
      className={cn(
        "group relative flex touch-manipulation flex-col overflow-hidden rounded-xl border border-[rgba(14,16,19,0.07)] bg-white shadow-[0_1px_2px_rgba(14,16,19,0.05)] transition-[box-shadow,opacity] hover:shadow-[0_8px_20px_-10px_rgba(14,16,19,0.25)]",
        arrastavel && "cursor-grab active:cursor-grabbing",
        fantasma && "opacity-35 shadow-none",
        flutuando &&
          "rotate-[2deg] scale-[1.03] cursor-grabbing shadow-[0_18px_40px_-12px_rgba(14,16,19,0.45)]",
      )}
    >
      <div className="flex items-center gap-2.5 py-2 pl-3.5 pr-1.5">
        <Sigla texto={sigla(o.company_name)} semente={o.company_name} />
        <span className="flex min-w-0 flex-1 flex-col">
          <Link
            to="/app/clientes/$id"
            params={{ id: o.client_id }}
            draggable={false}
            className="truncate text-[14.5px] font-semibold leading-snug text-hub-tinta after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-hub-tinta"
          >
            {o.company_name}
          </Link>
          <span className="truncate text-[12.5px] text-hub-suave">{o.contact_name}</span>
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-selecao hover:text-hub-tinta"
            aria-label={`Ações de ${o.company_name}`}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {o.archived_at ? (
              <DropdownMenuItem onSelect={() => aoAgir("desarquivar", o)}>
                Desarquivar
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => aoAgir("mover", o)}>Mover para…</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => aoAgir("passo", o)}>
                  Editar próximo passo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => aoAgir("arquivar", o)}
                  className="text-sit-risco-t"
                >
                  Arquivar contato
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {o.value_cents != null && (
        <p className="px-3.5 text-[15px] font-semibold tabular-nums">{moeda(o.value_cents)}</p>
      )}

      <div className="flex flex-wrap gap-1.5 px-3.5 pb-3 pt-2">
        {o.adicional && <SeloTipo tipo="pedidos">Serviço adicional</SeloTipo>}
        <Selo tom="neutro" ponto={false}>
          {rotuloOrigem[o.origin]}
        </Selo>
        {o.diagnostic_tier && (
          <Selo tom={o.diagnostic_paid ? "ok" : "atencao"}>
            Diagnóstico {rotuloDiagnostico[o.diagnostic_tier].toLowerCase()} ·{" "}
            {o.diagnostic_paid ? "pago" : "a pagar"}
          </Selo>
        )}
        {proposta && <Selo tom={proposta.tom}>{proposta.texto}</Selo>}
        {proposta && o.proposta_versao && o.proposta_versao > 1 && (
          <Selo tom="neutro" ponto={false}>
            Versão {o.proposta_versao}
          </Selo>
        )}
        {o.archived_at && (
          <Selo tom="neutro">
            Arquivado{o.lost_reason ? ` · ${rotuloMotivo[o.lost_reason]}` : ""}
          </Selo>
        )}
        {o.requested_slot_at && !o.archived_at && o.stage === "contato" && (
          <Selo tom="info" ponto={false}>
            <CalendarClock className="mr-0.5 inline size-3.5 align-[-2px]" aria-hidden="true" />
            Horário pedido: {diaComHora(o.requested_slot_at)}
          </Selo>
        )}
        {!o.whatsapp && !o.archived_at && <Selo tom="atencao">Sem WhatsApp</Selo>}
      </div>

      {o.next_step && !o.archived_at && o.stage !== "fechado" && (
        <div
          className={cn(
            "flex items-start justify-between gap-2 border-t border-[rgba(14,16,19,0.06)] px-3.5 py-2.5 text-[13px]",
            fundoPrazo[prazo?.tom ?? "neutro"],
          )}
        >
          <span className="min-w-0 leading-snug">{o.next_step}</span>
          {prazo && (
            <span className={cn("shrink-0 text-right", textoPrazo[prazo.tom])}>{prazo.texto}</span>
          )}
        </div>
      )}
      {o.archived_at && (
        <p className="border-t border-[rgba(14,16,19,0.06)] bg-[#F7F7F4] px-3.5 py-2.5 text-[13px] text-hub-suave">
          Estava em {rotuloEtapa[o.stage]}
        </p>
      )}
      {o.stage === "fechado" && o.closed_at && !o.archived_at && (
        <p className="border-t border-[rgba(14,16,19,0.06)] bg-sit-ok px-3.5 py-2.5 text-[13px] font-medium text-sit-ok-t">
          Fechado em {diaMes(o.closed_at)}
        </p>
      )}
    </article>
  );
}

/** Cartão que pode ser arrastado entre colunas (o cartão acompanha o cursor). */
export function FunilCartaoArrastavel({
  o,
  aoAgir,
  arrastavel,
}: {
  o: Oportunidade;
  aoAgir: (acao: AcaoCartao, o: Oportunidade) => void;
  arrastavel: boolean;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: o.id,
    disabled: !arrastavel,
  });
  return (
    <FunilCartao
      o={o}
      aoAgir={aoAgir}
      arrastavel={arrastavel}
      fantasma={isDragging}
      refArrastar={setNodeRef}
      propsArrastar={arrastavel ? { ...attributes, ...listeners } : undefined}
    />
  );
}
