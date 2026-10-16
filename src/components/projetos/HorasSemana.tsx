import { Link } from "@tanstack/react-router";

import { dataLocal, diaMes } from "@/lib/formatar";
import { horasMin, type ListaProjetos } from "@/lib/projetos";

/** Horas lançadas de segunda a domingo, por projeto (conta do banco). */
export function HorasSemana({ semana }: { semana: ListaProjetos["semana"] }) {
  return (
    <section
      aria-labelledby="horas-semana-t"
      className="rounded-2xl border border-hub-borda bg-white"
    >
      <div className="flex flex-col gap-1 px-5 pt-4 pb-3">
        <h2 id="horas-semana-t" className="font-titulo text-lg font-bold">
          Horas desta semana
        </h2>
        <p className="text-[13.5px] text-hub-suave">
          Segunda {diaMes(dataLocal(semana.inicio))} a domingo {diaMes(dataLocal(semana.fim))}
        </p>
      </div>
      {semana.itens.length === 0 ? (
        <p className="px-5 pb-5 text-[14.5px] text-hub-suave">
          Nenhuma hora lançada nesta semana. Use "Lançar horas" ao terminar um bloco de trabalho.
        </p>
      ) : (
        <ul>
          {semana.itens.map((i) => (
            <li key={i.projeto_id} className="border-t border-hub-borda">
              <Link
                to="/app/projetos/$id"
                params={{ id: i.projeto_id }}
                className="flex min-h-14 items-center justify-between gap-3 px-5 py-2.5 hover:bg-hub-fundo"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14.5px] font-medium">{i.empresa}</span>
                  <span className="truncate text-[13px] text-hub-suave">{i.projeto}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{horasMin(i.minutos)}</span>
              </Link>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-hub-borda bg-hub-fundo/60 px-5 py-3 font-semibold">
            Total <span className="tabular-nums">{horasMin(semana.total_minutos)}</span>
          </li>
        </ul>
      )}
    </section>
  );
}
