import { Search } from "lucide-react";

import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { rotuloSituacao, type SituacaoSite } from "@/lib/site";

export type FiltroSituacao = SituacaoSite | "todas";

const situacoes: { id: FiltroSituacao; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  ...(["publicado", "rascunho", "arquivado"] as const).map((s) => ({
    id: s,
    rotulo: rotuloSituacao[s],
  })),
];

/** Busca por texto, situação (pílulas) e categoria (lista nativa, boa no celular). */
export function ArtigosFiltros({
  texto,
  aoTexto,
  situacao,
  aoSituacao,
  categoria,
  aoCategoria,
  categorias,
}: {
  texto: string;
  aoTexto: (v: string) => void;
  situacao: FiltroSituacao;
  aoSituacao: (s: FiltroSituacao) => void;
  categoria: string | undefined;
  aoCategoria: (c: string | undefined) => void;
  categorias: string[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar artigos</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-hub-suave"
            aria-hidden="true"
          />
          <input
            type="search"
            value={texto}
            onChange={(e) => aoTexto(e.target.value)}
            placeholder="Buscar por título ou endereço"
            enterKeyHint="search"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-[#DADAD3] bg-white pl-11 pr-3 text-base outline-none focus:border-hub-tinta"
          />
        </label>
        <label className="sm:w-60">
          <span className="sr-only">Categoria</span>
          <select
            value={categoria ?? ""}
            onChange={(e) => aoCategoria(e.target.value || undefined)}
            className="h-12 w-full rounded-xl border border-[#DADAD3] bg-white px-3 text-base outline-none focus:border-hub-tinta"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <FiltrosChip rotulo="Situação" opcoes={situacoes} ativo={situacao} aoEscolher={aoSituacao} />
    </div>
  );
}
