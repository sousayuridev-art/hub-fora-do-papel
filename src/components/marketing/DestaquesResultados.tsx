import { ClipboardList, Trophy } from "lucide-react";

import { classeAcaoTexto } from "@/lib/estilos";
import { diaComHora } from "@/lib/formatar";
import type { DestaquesConteudo } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/** Melhores peças e o que falta registrar (MK-4). Clicar abre a peça. */
export function DestaquesResultados({
  d,
  aoAbrir,
}: {
  d: DestaquesConteudo;
  aoAbrir: (pecaId: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section
        aria-labelledby="mk-melhores-contatos"
        className="flex min-w-0 flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-4"
      >
        <h2 id="mk-melhores-contatos" className="flex items-center gap-2 text-[15px] font-semibold">
          <Trophy className="size-4 text-[#D48A00]" aria-hidden="true" /> Mais contatos
        </h2>
        {d.por_contatos.length === 0 ? (
          <p className="text-[14px] text-hub-suave">
            Nenhuma peça do período trouxe contato ainda.
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {d.por_contatos.map((p) => (
              <li key={p.peca_id}>
                <button
                  type="button"
                  onClick={() => aoAbrir(p.peca_id)}
                  className={cn(
                    classeAcaoTexto,
                    "flex w-full min-w-0 justify-between gap-3 bg-transparent text-left",
                  )}
                >
                  <span className="min-w-0 truncate">{p.titulo}</span>
                  <span className="shrink-0 tabular-nums">
                    {p.contatos.toLocaleString("pt-BR")}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        aria-labelledby="mk-melhores-salvamentos"
        className="flex min-w-0 flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-4"
      >
        <h2
          id="mk-melhores-salvamentos"
          className="flex items-center gap-2 text-[15px] font-semibold"
        >
          <Trophy className="size-4 text-[#D48A00]" aria-hidden="true" /> Mais salvas (por mil de
          alcance)
        </h2>
        {d.por_salvamentos.length === 0 ? (
          <p className="text-[14px] text-hub-suave">
            Só entram peças com pelo menos 100 de alcance.
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {d.por_salvamentos.map((p) => (
              <li key={p.peca_id}>
                <button
                  type="button"
                  onClick={() => aoAbrir(p.peca_id)}
                  className={cn(
                    classeAcaoTexto,
                    "flex w-full min-w-0 justify-between gap-3 bg-transparent text-left",
                  )}
                >
                  <span className="min-w-0 truncate">{p.titulo}</span>
                  <span className="shrink-0 tabular-nums">
                    {p.salvamentos_por_mil.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        aria-labelledby="mk-falta-registrar"
        className="flex min-w-0 flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-4"
      >
        <h2 id="mk-falta-registrar" className="flex items-center gap-2 text-[15px] font-semibold">
          <ClipboardList className="size-4 text-hub-suave" aria-hidden="true" /> Falta registrar
          {d.falta_registrar.length > 0 && (
            <span className="rounded-full bg-sit-atencao px-2 text-[12.5px] text-sit-atencao-t tabular-nums">
              {d.falta_registrar.length}
            </span>
          )}
        </h2>
        {d.falta_registrar.length === 0 ? (
          <p className="text-[14px] text-hub-suave">
            Tudo registrado. Os números de cada versão estão em dia.
          </p>
        ) : (
          <>
            <p className="text-[13px] text-hub-suave">Publicadas há mais de 7 dias, sem números.</p>
            <ul className="flex flex-col gap-1">
              {d.falta_registrar.map((v) => (
                <li key={v.versao_id}>
                  <button
                    type="button"
                    onClick={() => aoAbrir(v.peca_id)}
                    className={cn(
                      classeAcaoTexto,
                      "flex w-full min-w-0 flex-col items-start bg-transparent py-1.5 text-left",
                    )}
                  >
                    <span className="w-full truncate">{v.titulo}</span>
                    <span className="text-[12.5px] font-normal text-hub-suave">
                      {v.canal_nome ?? v.canal} · {diaComHora(v.publicada_em)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
