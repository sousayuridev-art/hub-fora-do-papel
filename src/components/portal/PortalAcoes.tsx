import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import type { AcaoPortal } from "@/lib/portal";

/** "Precisa da sua ação": entregas e serviços adicionais (vão para Aprovações) e pendências (marca aqui). */
export function PortalAcoes({
  acoes,
  enviando,
  aoMarcarFeita,
}: {
  acoes: AcaoPortal[];
  enviando: boolean;
  aoMarcarFeita: (id: string) => void;
}) {
  return (
    <section id="precisa" aria-labelledby="precisa-t" className="flex scroll-mt-20 flex-col gap-3">
      <h2 id="precisa-t" className="font-titulo text-[20px] font-bold md:text-2xl">
        Precisa da sua ação
      </h2>
      {acoes.length === 0 ? (
        <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
          Tudo em dia. Quando houver algo para você ver ou fazer, aparece aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {acoes.map((a) => (
            <li
              key={`${a.tipo}-${a.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-4 md:flex-row md:items-center md:p-5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="self-start">
                  {a.tipo === "aprovacao" ? (
                    <Selo tom="atencao">Para aprovar</Selo>
                  ) : a.tipo === "adicional" ? (
                    <Selo tom="info">Serviço adicional</Selo>
                  ) : a.atrasada ? (
                    <Selo tom="risco">Atrasada</Selo>
                  ) : (
                    <Selo tom="neutro">Com você</Selo>
                  )}
                </span>
                <span className="text-[16px] font-semibold">{a.titulo}</span>
                <span className="text-[14px] text-hub-suave">
                  {a.tipo === "aprovacao"
                    ? `Enviado em ${diaMes(a.quando)}`
                    : a.tipo === "adicional"
                      ? `${moeda(a.valor_cents)} · só começa com o seu sim`
                      : [a.prazo ? `Prazo ${diaMes(dataLocal(a.prazo))}` : null, a.detalhe]
                          .filter(Boolean)
                          .join(" · ") || "Sem prazo"}
                </span>
              </div>
              {a.tipo === "pendencia" ? (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => aoMarcarFeita(a.id)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-5 text-[15px] font-semibold max-md:w-full"
                >
                  <Check className="size-4" aria-hidden="true" /> Já fiz
                </button>
              ) : (
                <Link
                  to="/portal/aprovacoes"
                  hash={a.id}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white max-md:w-full"
                >
                  Ver e decidir <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
