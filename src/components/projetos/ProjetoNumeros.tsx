import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { horasMin, type DetalheProjeto } from "@/lib/projetos";
import { cn } from "@/lib/utils";

/** Horas usadas, valor e lançamento. */
export function ProjetoNumeros({ d }: { d: DetalheProjeto }) {
  const p = d.projeto;
  const pct =
    p.hours_estimated > 0 ? Math.round((d.minutos_usados / 60 / p.hours_estimated) * 100) : null;
  const dias = p.launch_date
    ? Math.round((dataLocal(p.launch_date).getTime() - dataLocal(d.hoje).getTime()) / 86_400_000)
    : null;
  const rotulo =
    "font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.08em] text-hub-suave";
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-5">
        <dt className={rotulo}>Horas usadas</dt>
        <dd className="font-titulo text-2xl font-bold tabular-nums">
          {horasMin(d.minutos_usados)}{" "}
          <span className="text-[15px] font-medium text-hub-suave">
            de {p.hours_estimated.toLocaleString("pt-BR")} h
          </span>
        </dd>
        {pct !== null && (
          <>
            <dd aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[#E6E6E0]">
              <span
                className={cn(
                  "block h-full rounded-full",
                  pct >= 100 ? "bg-[#9A1C12]" : pct >= 80 ? "bg-[#D48A00]" : "bg-hub-tinta",
                )}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </dd>
            <dd className={cn("text-[13.5px]", pct >= 100 ? "text-sit-risco-t" : "text-hub-suave")}>
              {pct}% do estimado
            </dd>
          </>
        )}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-5">
        <dt className={rotulo}>Valor do projeto</dt>
        <dd className="font-titulo text-2xl font-bold tabular-nums">{moeda(p.value_cents)}</dd>
        <dd className="text-[13.5px] text-hub-suave">Parcelas e cobranças entram no Financeiro.</dd>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-5">
        <dt className={rotulo}>Lançamento</dt>
        <dd className="font-titulo text-2xl font-bold tabular-nums">
          {p.launched_at
            ? diaMes(p.launched_at)
            : p.launch_date
              ? diaMes(dataLocal(p.launch_date))
              : "Sem data"}
        </dd>
        <dd
          className={cn(
            "text-[13.5px]",
            dias !== null && dias < 0 && !p.launched_at ? "text-sit-risco-t" : "text-hub-suave",
          )}
        >
          {p.launched_at
            ? "Projeto lançado"
            : dias === null
              ? "Defina a data no Encerramento"
              : dias < 0
                ? `${-dias} ${dias === -1 ? "dia" : "dias"} de atraso`
                : dias === 0
                  ? "É hoje"
                  : `Faltam ${dias} ${dias === 1 ? "dia" : "dias"}`}
        </dd>
      </div>
    </dl>
  );
}
