import { Link } from "@tanstack/react-router";

import { Selo } from "@/components/hub/Selo";
import { BlocoRelatorio } from "@/components/relatorios/BlocoRelatorio";
import { moeda } from "@/lib/formatar";
import type { Relatorio } from "@/lib/relatorios";

/** Quanto vale cada hora de trabalho em cada projeto ativo, comparado com o piso e o alvo. */
export function RelatorioMargem({ m }: { m: Relatorio["margem"] }) {
  const escala = Math.max(
    m.alvo_cents * 1.3,
    ...m.projetos.map((p) => p.vh_real_cents ?? p.vh_estimado_cents ?? 0),
  );
  const pos = (v: number) => `${Math.min(100, (v / escala) * 100)}%`;
  return (
    <BlocoRelatorio
      id="margem"
      rotulo="Margem por projeto"
      titulo="Quanto vale cada hora de trabalho"
      resumo={`Valor do projeto dividido pelas horas. Piso ${moeda(m.piso_cents)} por hora, alvo ${moeda(m.alvo_cents)} (de Configurações). O valor real aparece depois de 25% das horas lançadas.`}
    >
      {m.projetos.length === 0 ? (
        <p className="text-[14px] text-hub-suave">Nenhum projeto em andamento.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {m.projetos.map((p) => {
            const vh = p.vh_real_cents ?? p.vh_estimado_cents;
            const tom =
              vh === null
                ? "neutro"
                : vh < m.piso_cents
                  ? "risco"
                  : vh < m.alvo_cents
                    ? "atencao"
                    : "ok";
            return (
              <li key={p.id} className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    to="/app/projetos/$id"
                    params={{ id: p.id }}
                    className="font-semibold hover:underline"
                  >
                    {p.empresa} · {p.nome}
                  </Link>
                  <Selo tom={tom}>
                    {vh === null
                      ? "Sem dados suficientes"
                      : `${moeda(vh)}/h ${p.vh_real_cents !== null ? "real" : "estimado"}${
                          tom === "risco"
                            ? " · abaixo do piso"
                            : tom === "atencao"
                              ? " · entre o piso e o alvo"
                              : " · no alvo"
                        }`}
                  </Selo>
                </div>
                <div aria-hidden="true" className="relative h-2.5 rounded-full bg-[#E6E6E0]">
                  {vh !== null && (
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full ${tom === "risco" ? "bg-[#9A1C12]" : tom === "atencao" ? "bg-[#D48A00]" : "bg-[#145A37]"}`}
                      style={{ width: pos(vh) }}
                    />
                  )}
                  <span
                    className="absolute -top-1 h-4.5 w-0.5 bg-hub-tinta"
                    style={{ left: pos(m.piso_cents) }}
                  />
                  <span
                    className="absolute -top-1 h-4.5 w-0.5 bg-[#145A37]"
                    style={{ left: pos(m.alvo_cents) }}
                  />
                </div>
                <p className="text-[13.5px] text-hub-suave">
                  {moeda(p.valor_cents)} · {p.horas_usadas.toLocaleString("pt-BR")} h usadas de{" "}
                  {p.horas_estimadas.toLocaleString("pt-BR")} h estimadas
                  {p.folga_horas !== null
                    ? p.folga_horas >= 0
                      ? ` · ${p.folga_horas.toLocaleString("pt-BR")} h de folga até o piso`
                      : ` · já passou ${Math.abs(p.folga_horas).toLocaleString("pt-BR")} h do piso`
                    : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </BlocoRelatorio>
  );
}
