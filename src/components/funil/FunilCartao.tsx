import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Selo } from "@/components/hub/Selo";
import { diaComHora, moeda, prazoRelativo } from "@/lib/formatar";
import {
  rotuloDiagnostico,
  rotuloEtapa,
  rotuloMotivo,
  rotuloOrigem,
  type Oportunidade,
} from "@/lib/funil";
import { cn } from "@/lib/utils";

export type AcaoCartao = "mover" | "passo" | "arquivar" | "desarquivar";

/** Cartão do funil (proposta 2): empresa, pessoa · origem, valor, selos e próximo passo. */
export function FunilCartao({
  o,
  aoAgir,
  arrastavel,
}: {
  o: Oportunidade;
  aoAgir: (acao: AcaoCartao, o: Oportunidade) => void;
  arrastavel: boolean;
}) {
  const prazo =
    o.next_step_date && o.stage !== "fechado" && !o.archived_at
      ? prazoRelativo(o.next_step_date, o.hoje, o.next_step_has_time ? o.next_step_at : null)
      : null;
  const vencidoEmProposta = o.vencido && o.stage === "proposta";

  return (
    <article
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", o.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border border-hub-borda bg-white p-3.5 shadow-[0_1px_2px_rgba(14,16,19,0.04)] transition-shadow hover:shadow-[0_6px_18px_-8px_rgba(14,16,19,0.18)]",
        arrastavel && "cursor-grab active:cursor-grabbing",
        vencidoEmProposta && "border-l-[3px] border-l-sit-risco-t",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to="/app/clientes/$id"
          params={{ id: o.client_id }}
          className="min-w-0 text-[15px] font-semibold leading-snug text-hub-tinta after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-[#1E3FA8]"
        >
          {o.company_name}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative z-10 -mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-selecao hover:text-hub-tinta"
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

      <p className="text-[13.5px] leading-snug text-hub-suave">
        {o.contact_name} · {rotuloOrigem[o.origin]}
      </p>

      <p
        className={cn(
          "text-[15px] font-semibold",
          o.value_cents == null && "font-normal text-hub-suave",
        )}
      >
        {o.value_cents == null ? "Sem valor ainda" : moeda(o.value_cents)}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {o.diagnostic_tier && (
          <Selo tom={o.diagnostic_paid ? "ok" : "atencao"}>
            {rotuloDiagnostico[o.diagnostic_tier]} · {o.diagnostic_paid ? "pago" : "a pagar"}
          </Selo>
        )}
        {o.stage === "fechado" && o.closed_at && <Selo tom="ok">Fechado</Selo>}
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

      {o.next_step && !o.archived_at && (
        <div className="flex flex-col gap-1.5 border-t border-hub-borda pt-2">
          <p className="flex gap-1.5 text-[13.5px] leading-snug text-hub-tinta">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-hub-suave" aria-hidden="true" />
            {o.next_step}
          </p>
          {prazo && (
            <span className="self-start">
              <Selo tom={prazo.tom}>{prazo.texto}</Selo>
            </span>
          )}
        </div>
      )}
      {o.archived_at && (
        <p className="text-[13px] text-hub-suave">Estava em {rotuloEtapa[o.stage]}</p>
      )}
    </article>
  );
}
