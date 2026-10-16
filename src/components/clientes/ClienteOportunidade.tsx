import { ArrowRight, CalendarClock } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { diaComHora, moeda, prazoRelativo } from "@/lib/formatar";
import {
  etapas,
  rotuloDiagnostico,
  rotuloEtapa,
  rotuloMotivo,
  type Oportunidade,
} from "@/lib/funil";
import { cn } from "@/lib/utils";

export type AcaoOportunidade = "mover" | "passo" | "valor" | "arquivar" | "desarquivar";

/** Cartão "Oportunidade" da ficha: etapa (linha de etapas), valor, diagnóstico e próximo passo. */
export function ClienteOportunidade({
  o,
  aoAgir,
}: {
  o: Oportunidade;
  aoAgir: (acao: AcaoOportunidade) => void;
}) {
  const indice = etapas.findIndex((e) => e.id === o.stage);
  const prazo =
    o.next_step_date && !o.archived_at && o.stage !== "fechado"
      ? prazoRelativo(o.next_step_date, o.hoje, o.next_step_has_time ? o.next_step_at : null)
      : null;
  const botao =
    "inline-flex min-h-11 items-center rounded-lg px-3 text-[14px] font-medium text-[#1E3FA8] hover:bg-sit-info";

  return (
    <section
      aria-labelledby="titulo-oportunidade"
      className="rounded-2xl border border-hub-borda bg-white"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hub-borda px-5 py-4">
        <h2 id="titulo-oportunidade" className="font-titulo text-lg font-bold">
          Oportunidade
        </h2>
        {o.archived_at ? (
          <Selo tom="neutro">
            Arquivada{o.lost_reason ? ` · ${rotuloMotivo[o.lost_reason]}` : ""}
          </Selo>
        ) : (
          <Selo tom={o.stage === "fechado" ? "ok" : "info"}>{rotuloEtapa[o.stage]}</Selo>
        )}
      </header>

      <ol className="flex gap-1 px-5 pt-5" aria-label="Etapas">
        {etapas.map((e, i) => (
          <li key={e.id} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 rounded-full",
                i <= indice && !o.archived_at ? "bg-hub-tinta" : "bg-[#E4E4DF]",
              )}
            />
            <span
              className={cn(
                "truncate text-[12.5px]",
                i === indice ? "font-semibold text-hub-tinta" : "text-hub-suave",
              )}
            >
              {e.rotulo}
              {i === indice && <span className="sr-only"> (etapa atual)</span>}
            </span>
          </li>
        ))}
      </ol>

      <dl className="grid gap-4 px-5 py-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="font-rotulo text-[12.5px] uppercase tracking-[0.08em] text-hub-suave">
            Valor
          </dt>
          <dd className="font-titulo text-2xl font-bold tabular-nums">
            {o.value_cents == null ? (
              <span className="text-base font-normal text-hub-suave">Sem valor ainda</span>
            ) : (
              moeda(o.value_cents)
            )}
          </dd>
          {o.diagnostic_tier && (
            <dd>
              <Selo tom={o.diagnostic_paid ? "ok" : "atencao"}>
                Diagnóstico {rotuloDiagnostico[o.diagnostic_tier].toLowerCase()} ·{" "}
                {o.diagnostic_paid ? "pago" : "a pagar"}
              </Selo>
            </dd>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-rotulo text-[12.5px] uppercase tracking-[0.08em] text-hub-suave">
            Próximo passo
          </dt>
          {o.next_step && !o.archived_at ? (
            <>
              <dd className="flex gap-1.5 text-[15px]">
                <ArrowRight className="mt-1 size-4 shrink-0 text-hub-suave" aria-hidden="true" />
                {o.next_step}
              </dd>
              {prazo && (
                <dd>
                  <Selo tom={prazo.tom}>{prazo.texto}</Selo>
                </dd>
              )}
            </>
          ) : (
            <dd className="text-[15px] text-hub-suave">—</dd>
          )}
          {o.requested_slot_at && o.stage === "contato" && !o.archived_at && (
            <dd className="mt-1">
              <Selo tom="info" ponto={false}>
                <CalendarClock className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
                Horário pedido no site: {diaComHora(o.requested_slot_at)}
              </Selo>
            </dd>
          )}
        </div>
      </dl>

      <footer className="flex flex-wrap gap-1 border-t border-hub-borda px-3 py-2">
        {o.archived_at ? (
          <button type="button" className={botao} onClick={() => aoAgir("desarquivar")}>
            Desarquivar
          </button>
        ) : (
          <>
            <button type="button" className={botao} onClick={() => aoAgir("mover")}>
              Mover de etapa
            </button>
            <button type="button" className={botao} onClick={() => aoAgir("passo")}>
              Editar próximo passo
            </button>
            <button type="button" className={botao} onClick={() => aoAgir("valor")}>
              Valor e diagnóstico
            </button>
            {o.stage !== "fechado" && (
              <button
                type="button"
                className={cn(botao, "ml-auto text-sit-risco-t hover:bg-sit-risco")}
                onClick={() => aoAgir("arquivar")}
              >
                Arquivar
              </button>
            )}
          </>
        )}
      </footer>
    </section>
  );
}
