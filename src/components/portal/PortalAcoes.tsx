import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CheckSquare, ListChecks, Sparkles } from "lucide-react";

import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import type { AcaoPortal } from "@/lib/portal";
import { cn } from "@/lib/utils";

const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

/** "vence na sexta, 24/10" / "venceu em 20/10" */
function vencimento(iso: string, atrasada: boolean): string {
  const d = dataLocal(iso);
  return atrasada
    ? `venceu em ${diaMes(d)}`
    : `vence ${semana.format(d).replace("-feira", "")}, ${diaMes(d)}`;
}

/**
 * "Precisa de você" (card CX-5): a primeira decisão em destaque, as outras em linha;
 * conta a pagar em linha discreta (só para o responsável, a 5 dias do vencimento: CX-0).
 * A soma é a mesma do contador dos selos.
 */
export function PortalAcoes({
  acoes,
  enviando,
  aoMarcarFeita,
}: {
  acoes: AcaoPortal[];
  enviando: boolean;
  aoMarcarFeita: (id: string) => void;
}) {
  const decisoes = acoes.filter((a) => a.tipo === "aprovacao" || a.tipo === "adicional");
  const outras = acoes.filter((a) => a.tipo === "pendencia");
  const contas = acoes.filter((a) => a.tipo === "pagamento");
  const [destaque, ...demais] = decisoes;

  return (
    <section id="precisa" aria-labelledby="precisa-t" className="flex scroll-mt-20 flex-col gap-3">
      <h2 id="precisa-t" className="text-[18px] font-semibold md:text-[19px]">
        Precisa de você
      </h2>

      {acoes.length === 0 && (
        <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
          Tudo em dia. Quando houver algo para você ver ou decidir, aparece aqui e avisamos você.
        </p>
      )}

      {destaque && (destaque.tipo === "aprovacao" || destaque.tipo === "adicional") && (
        <Link
          to="/portal/aprovacoes"
          hash={destaque.id}
          className="group grid gap-4 rounded-[22px] bg-white p-4 shadow-[0_1px_0_#E4E4DE,0_18px_40px_-18px_rgba(14,16,19,0.18)] md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-center md:gap-[26px] md:p-3.5 md:pr-[26px]"
        >
          <span
            aria-hidden="true"
            className="capa-escura flex h-24 items-end rounded-[14px] px-3 pt-3 md:h-[124px]"
          >
            {destaque.tipo === "aprovacao" ? (
              <span className="grid flex-1 grid-cols-3 gap-1.5 rounded-t-lg bg-white p-2.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <i
                    key={i}
                    className={cn("h-3.5 rounded", i === 1 ? "bg-hub-tinta" : "bg-[#F1F1EC]")}
                  />
                ))}
              </span>
            ) : (
              <Sparkles className="mb-4 ml-1 size-8 text-[#FFB020]" />
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-1.5">
            <b className="font-marca text-[21px] font-bold leading-tight tracking-[-0.02em] md:text-[24px]">
              {destaque.titulo}
            </b>
            <span className="text-[14.5px] leading-relaxed text-[#2A2D33]">
              {destaque.tipo === "aprovacao"
                ? `${destaque.detalhe ? `${destaque.detalhe.trim().replace(/\.?$/, ".")} ` : "Para você conferir e aprovar. "}Enviada em ${diaMes(destaque.quando)}.`
                : `Serviço adicional de ${moeda(destaque.valor_cents)}. Só começa com o seu sim.`}
            </span>
          </span>
          <span className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#FFB020] px-6 text-[15px] font-semibold text-hub-tinta group-hover:brightness-95">
            Ver e decidir
          </span>
        </Link>
      )}

      {demais.map((a) => (
        <Link
          key={`${a.tipo}-${a.id}`}
          to="/portal/aprovacoes"
          hash={a.id}
          className="flex min-h-14 items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_0_#E4E4DE] hover:bg-[#FBFBF9]"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              a.tipo === "aprovacao"
                ? "bg-sit-atencao text-sit-atencao-t"
                : "bg-sit-info text-sit-info-t",
            )}
          >
            {a.tipo === "aprovacao" ? (
              <CheckSquare className="size-5" />
            ) : (
              <Sparkles className="size-5" />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="truncate text-[15px] font-semibold">{a.titulo}</b>
            <span className="text-[13.5px] text-hub-suave">
              {a.tipo === "aprovacao" ? "Para aprovar" : "Serviço adicional para decidir"}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
        </Link>
      ))}

      {outras.map(
        (a) =>
          a.tipo === "pendencia" && (
            <div
              key={`${a.tipo}-${a.id}`}
              className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_0_#E4E4DE] md:flex-row md:items-center"
            >
              <span className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    a.atrasada ? "bg-sit-risco text-sit-risco-t" : "bg-[#F1F1EC] text-[#2A2D33]",
                  )}
                >
                  <ListChecks className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <b className="text-[15px] font-semibold">{a.titulo}</b>
                  <span className="text-[13.5px] text-hub-suave">
                    {[
                      a.atrasada ? "Atrasada" : null,
                      a.prazo ? `prazo ${diaMes(dataLocal(a.prazo))}` : null,
                      a.detalhe,
                    ]
                      .filter(Boolean)
                      .join(". ") || "Com você"}
                  </span>
                </span>
              </span>
              <button
                type="button"
                disabled={enviando}
                onClick={() => aoMarcarFeita(a.id)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-5 text-[15px] font-semibold disabled:opacity-50 max-md:w-full"
              >
                <Check className="size-4" aria-hidden="true" /> Já fiz
              </button>
            </div>
          ),
      )}

      {contas.map(
        (a) =>
          a.tipo === "pagamento" && (
            <Link
              key={`${a.tipo}-${a.id}`}
              to="/portal/pagamentos"
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#DCDCD5] px-4 py-3 text-[15px] hover:bg-white md:px-6"
            >
              <span className="min-w-0 flex-1">
                <b className="font-semibold">
                  {a.titulo}: {moeda(a.valor_cents)}
                </b>{" "}
                <span className={a.atrasada ? "text-sit-risco-t" : "text-hub-suave"}>
                  {vencimento(a.vencimento, a.atrasada)}
                </span>
              </span>
              <span className="shrink-0 font-semibold underline underline-offset-4">
                Pagar com Pix
              </span>
            </Link>
          ),
      )}
    </section>
  );
}
