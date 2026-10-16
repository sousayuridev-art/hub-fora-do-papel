import { Trash2 } from "lucide-react";

import { Cartao } from "@/components/trafego/Cartao";
import { diaMes, moeda } from "@/lib/formatar";
import { rotuloPlataforma, type PainelTrafego } from "@/lib/trafego";

/** Investimentos registrados no período, com remover (para corrigir lançamento errado). */
export function TrafegoInvestimentos({
  p,
  etiqueta,
  aoRemover,
}: {
  p: PainelTrafego;
  etiqueta: string;
  aoRemover: (id: string) => void;
}) {
  return (
    <Cartao
      id="investimentos"
      titulo="Investimentos registrados"
      texto="Cada cobrança das plataformas entra aqui, por campanha."
      etiqueta={etiqueta}
    >
      {p.investimentos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14.5px] text-hub-suave">
          Nenhum investimento no período. Use "Registrar investimento" a cada cobrança da Meta ou do
          Google.
        </p>
      ) : (
        <ul className="flex flex-col">
          {p.investimentos.map((v) => (
            <li
              key={v.id}
              className="grid grid-cols-[52px_1fr_auto_auto] items-center gap-3 border-b border-hub-borda py-3 last:border-b-0"
            >
              <span className="text-[13px] font-semibold tabular-nums text-hub-suave">
                {diaMes(`${v.data}T12:00:00`)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{v.campanha}</span>
                <span className="truncate text-[13px] text-hub-suave">
                  {rotuloPlataforma[v.plataforma]}
                  {v.cliques != null ? ` · ${v.cliques} cliques` : ""}
                  {v.nota ? ` · ${v.nota}` : ""}
                </span>
              </span>
              <span className="font-semibold tabular-nums">{moeda(v.valor_cents)}</span>
              <button
                type="button"
                aria-label={`Remover ${moeda(v.valor_cents)} de ${v.campanha}`}
                onClick={() => aoRemover(v.id)}
                className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-sit-risco hover:text-sit-risco-t"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
