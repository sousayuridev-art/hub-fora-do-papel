import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { diaMes, moeda } from "@/lib/formatar";
import {
  chavesTrafego,
  lancamentosTrafego,
  rotuloPlataforma,
  type CampanhaPainel,
  type Lancamento,
  type Periodo,
} from "@/lib/trafego";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Lançamentos (aba do RD-6): investimentos do período, 20 por página, com filtro por campanha.
 * A página vem pronta do banco (trafego_lancamentos), com total e soma.
 */
export function TrafegoLancamentos({
  periodo,
  campanhas,
  aoRemover,
}: {
  periodo: Periodo;
  campanhas: CampanhaPainel[];
  aoRemover: (l: Lancamento) => void;
}) {
  const [campanha, setCampanha] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  useEffect(() => setPagina(0), [periodo, campanha]);

  const q = useQuery({
    queryKey: chavesTrafego.lancamentos(periodo, campanha, pagina),
    queryFn: () => lancamentosTrafego(periodo, campanha, pagina),
    placeholderData: keepPreviousData,
  });
  const d = q.data;
  const paginas = d ? Math.max(1, Math.ceil(d.total / d.por_pagina)) : 1;
  // Apagou o último item da página: volta uma
  useEffect(() => {
    if (d && pagina > 0 && pagina >= paginas) setPagina(paginas - 1);
  }, [d, pagina, paginas]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-0 items-center gap-2 text-[13.5px] text-hub-suave max-sm:w-full">
          Campanha
          <select
            value={campanha ?? ""}
            onChange={(e) => setCampanha(e.target.value || null)}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#DADAD3] bg-white px-3 text-[16px] text-hub-tinta sm:w-64 sm:flex-none sm:text-[14.5px]"
          >
            <option value="">Todas</option>
            {campanhas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        {d && (
          <p className="m-0 text-[13.5px] text-hub-suave" aria-live="polite">
            {plural(d.total, "lançamento", "lançamentos")} ·{" "}
            <b className="font-semibold text-hub-tinta">{moeda(d.total_cents)}</b>
          </p>
        )}
      </div>

      {q.isPending ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os lançamentos"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : q.data.itens.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-4 text-[14.5px] text-hub-suave">
          {campanha
            ? "Nenhum investimento desta campanha no período."
            : 'Nenhum investimento no período. Use "Registrar investimento" a cada cobrança da Meta ou do Google.'}
        </p>
      ) : (
        <div className="rounded-2xl border border-hub-borda bg-white">
          <ul className="m-0 list-none p-0" aria-busy={q.isPlaceholderData}>
            {q.data.itens.map((v) => (
              <li
                key={v.id}
                className="grid grid-cols-[48px_minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-[#F0F0EA] py-1.5 pl-4 pr-1 last:border-b-0 md:gap-3 md:pl-5 md:pr-2"
              >
                <span className="text-[13px] font-semibold tabular-nums text-hub-suave">
                  {diaMes(`${v.data}T12:00:00`)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] font-medium">{v.campanha}</span>
                  <span className="truncate text-[12.5px] text-hub-suave">
                    {rotuloPlataforma[v.plataforma]}
                    {v.cliques != null ? ` · ${plural(v.cliques, "clique", "cliques")}` : ""}
                    {v.nota ? ` · ${v.nota}` : ""}
                  </span>
                </span>
                <span className="text-[14px] font-semibold tabular-nums">
                  {moeda(v.valor_cents)}
                </span>
                <button
                  type="button"
                  aria-label={`Apagar ${moeda(v.valor_cents)} de ${v.campanha}`}
                  disabled={v.id.startsWith("temp-")}
                  onClick={() => aoRemover(v)}
                  className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-sit-risco hover:text-sit-risco-t disabled:opacity-40"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {paginas > 1 && (
            <nav
              aria-label="Páginas dos lançamentos"
              className="flex items-center justify-between gap-2 border-t border-hub-borda px-2 py-1"
            >
              <button
                type="button"
                disabled={pagina === 0}
                onClick={() => setPagina((n) => Math.max(0, n - 1))}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-[14px] font-medium text-[#1E3FA8] hover:bg-sit-info disabled:text-hub-suave disabled:hover:bg-transparent"
              >
                <ChevronLeft className="size-4" aria-hidden="true" /> Mais novos
              </button>
              <span className="text-[13px] tabular-nums text-hub-suave">
                Página {pagina + 1} de {paginas}
              </span>
              <button
                type="button"
                disabled={pagina + 1 >= paginas}
                onClick={() => setPagina((n) => n + 1)}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-[14px] font-medium text-[#1E3FA8] hover:bg-sit-info disabled:text-hub-suave disabled:hover:bg-transparent"
              >
                Mais antigos <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
