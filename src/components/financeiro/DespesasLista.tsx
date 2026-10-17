import { Pencil, Trash2 } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { rotuloCategoria, type Despesa } from "@/lib/financeiro";

const mesAno = (iso: string) =>
  dataLocal(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");

/** Despesas fixas (todo mês) e avulsas (últimos 6 meses). Anúncios vêm do Tráfego pago. */
export function DespesasLista({
  itens,
  anunciosMesCents,
  aoEditar,
  aoRemover,
}: {
  itens: Despesa[];
  anunciosMesCents: number;
  aoEditar: (d: Despesa) => void;
  aoRemover: (d: Despesa) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          Nenhuma despesa ainda. Inclua as fixas (ferramentas, hospedagem, contador) para o fluxo de
          caixa mostrar o saldo real.
        </p>
      ) : (
        <ul className="flex flex-col rounded-2xl border border-hub-borda bg-white">
          {itens.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 border-b border-hub-borda px-5 py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{d.descricao}</span>
                <span className="text-[13.5px] text-hub-suave">
                  {rotuloCategoria[d.categoria]} ·{" "}
                  {d.tipo === "fixa"
                    ? `todo mês desde ${d.inicio ? mesAno(d.inicio) : "—"}${d.fim ? ` até ${mesAno(d.fim)}` : ""}`
                    : `em ${d.data ? diaMes(dataLocal(d.data)) : "—"}`}
                </span>
              </span>
              {d.tipo === "fixa" && !d.ativa && <Selo tom="neutro">Encerrada</Selo>}
              <span className="shrink-0 font-semibold tabular-nums">
                {moeda(d.valor_cents)}
                {d.tipo === "fixa" ? "/mês" : ""}
              </span>
              <button
                type="button"
                onClick={() => aoEditar(d)}
                aria-label={`Editar ${d.descricao}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => aoRemover(d)}
                aria-label={`Remover ${d.descricao}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-sit-risco-t"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13.5px] text-hub-suave">
        Anúncios deste mês: {moeda(anunciosMesCents)}, lançados em Tráfego pago. Eles entram
        sozinhos no fluxo de caixa.
      </p>
    </div>
  );
}
