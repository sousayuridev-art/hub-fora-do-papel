import { Link } from "@tanstack/react-router";

import { BlocoRelatorio } from "@/components/relatorios/BlocoRelatorio";
import { moeda } from "@/lib/formatar";
import { plural, porHora, type Relatorio } from "@/lib/relatorios";
import { cn } from "@/lib/utils";

const corPiso = "#9A1C12";
const corAlvo = "#0E1013";

/**
 * Margem por projeto (card RD-8): quanto vale cada hora de trabalho, com o piso e o alvo
 * marcados na própria barra e explicados na legenda ao lado do título.
 */
export function RelatorioMargem({ m }: { m: Relatorio["margem"] }) {
  const escala = Math.max(
    m.alvo_cents * 1.3,
    ...m.projetos.map((p) => p.vh_real_cents ?? p.vh_estimado_cents ?? 0),
  );
  const pct = (v: number) => Math.min(100, (v / escala) * 100);
  const abaixo = m.projetos.filter(
    (p) => (p.vh_real_cents ?? p.vh_estimado_cents ?? Infinity) < m.piso_cents,
  );

  return (
    <BlocoRelatorio
      id="margem"
      titulo="Margem por projeto"
      resumo={`Valor do projeto dividido pelas horas (de Configurações: piso ${moeda(m.piso_cents)} e alvo ${moeda(m.alvo_cents)} por hora). O valor real aparece depois de 25% das horas lançadas.${
        m.projetos.length === 0
          ? ""
          : abaixo.length === 0
            ? " Nenhum projeto abaixo do piso."
            : ` ${plural(abaixo.length, "projeto está", "projetos estão")} abaixo do piso: ${abaixo.map((p) => p.empresa).join(", ")}.`
      }`}
      extra={
        <span className="flex gap-3.5 text-[12.5px] text-[#2A2D33]">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3.5 w-0.5" style={{ background: corPiso }} />
            piso {porHora(m.piso_cents)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3.5 w-0.5" style={{ background: corAlvo }} />
            alvo {porHora(m.alvo_cents)}
          </span>
        </span>
      }
    >
      {m.projetos.length === 0 ? (
        <p className="text-[14px] text-hub-suave">Nenhum projeto em andamento.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {m.projetos.map((p) => {
            const vh = p.vh_real_cents ?? p.vh_estimado_cents;
            const baixo = vh !== null && vh < m.piso_cents;
            return (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-[14px] md:grid-cols-[180px_minmax(0,1fr)_96px]"
              >
                <Link
                  to="/app/projetos/$id"
                  params={{ id: p.id }}
                  className="group flex min-h-11 min-w-0 flex-col justify-center"
                >
                  <span className="truncate font-semibold group-hover:underline">{p.nome}</span>
                  <span className="truncate text-[12.5px] text-hub-suave">{p.empresa}</span>
                </Link>
                <span
                  aria-hidden="true"
                  className="relative col-span-2 row-start-2 h-3.5 rounded-[4px] bg-[#EDEDE7] md:col-span-1 md:row-start-auto"
                >
                  {vh !== null && (
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-[4px]",
                        baixo ? "bg-[#9A1C12]" : "bg-serie-1",
                      )}
                      style={{ width: `${pct(vh)}%` }}
                    />
                  )}
                  <span
                    className="absolute -inset-y-1 w-0.5"
                    style={{ left: `${pct(m.piso_cents)}%`, background: corPiso }}
                  />
                  <span
                    className="absolute -inset-y-1 w-0.5"
                    style={{ left: `${pct(m.alvo_cents)}%`, background: corAlvo }}
                  />
                </span>
                <span className="flex flex-col items-end text-right md:row-start-auto">
                  <b className={cn("font-semibold tabular-nums", baixo && "text-sit-risco-t")}>
                    {vh === null ? "—" : porHora(vh)}
                  </b>
                  <span className="text-[12.5px] text-hub-suave">
                    {vh === null ? "sem horas" : p.vh_real_cents !== null ? "real" : "estimado"}
                  </span>
                </span>
                <p className="col-span-2 text-[12.5px] text-hub-suave md:col-span-3">
                  {moeda(p.valor_cents)} · {p.horas_usadas.toLocaleString("pt-BR")} h usadas de{" "}
                  {p.horas_estimadas.toLocaleString("pt-BR")} h estimadas
                  {p.folga_horas !== null
                    ? p.folga_horas >= 0
                      ? ` · ${p.folga_horas.toLocaleString("pt-BR")} h de folga até o piso`
                      : ` · já passou ${Math.abs(p.folga_horas).toLocaleString("pt-BR")} h do piso`
                    : ""}
                  {vh !== null &&
                    (baixo
                      ? " · abaixo do piso"
                      : vh < m.alvo_cents
                        ? " · entre o piso e o alvo"
                        : " · no alvo")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </BlocoRelatorio>
  );
}
