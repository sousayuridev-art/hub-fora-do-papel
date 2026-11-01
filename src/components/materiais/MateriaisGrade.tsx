import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

import { diaMes } from "@/lib/formatar";
import {
  miniaturas,
  siglaDoTipo,
  tamanhoLegivel,
  tipoLegivel,
  type Material,
} from "@/lib/materiais";
import { useMargemDaLista } from "@/lib/useMargemDaLista";

/** Colunas da grade pela largura da área (2 no celular, até 4 no computador). */
function useColunas(el: HTMLElement | null): number {
  const [n, setN] = useState(2);
  useEffect(() => {
    if (!el) return;
    const medir = () => {
      const w = el.getBoundingClientRect().width;
      setN(w >= 960 ? 4 : w >= 640 ? 3 : 2);
    };
    medir();
    const o = new ResizeObserver(medir);
    o.observe(el);
    return () => o.disconnect();
  }, [el]);
  return n;
}

function Miniatura({ m, url }: { m: Material; url: string | undefined }) {
  if (url)
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className="aspect-[4/3] w-full rounded-t-xl bg-[#F5F7FA] object-cover"
      />
    );
  return (
    <span
      aria-hidden="true"
      className="grid aspect-[4/3] w-full place-items-center rounded-t-xl bg-[#F5F7FA] text-[13px] font-semibold tracking-wide text-[#4A4D54]"
    >
      {m.tipo === "texto" ? (
        <span className="line-clamp-4 px-4 text-left text-[12.5px] font-normal tracking-normal text-[#2A2D33]">
          {m.texto}
        </span>
      ) : (
        siglaDoTipo(m)
      )}
    </span>
  );
}

/**
 * Grade de materiais (RD2-7): miniatura real das imagens, sigla do tipo nos demais.
 * Virtualizada por linha da grade, rolando com a página.
 */
export function MateriaisGrade({
  itens,
  aoAbrir,
}: {
  itens: Material[];
  aoAbrir: (m: Material) => void;
}) {
  const { ref, margem } = useMargemDaLista<HTMLDivElement>();
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const colunas = useColunas(el);
  const linhas = Math.ceil(itens.length / colunas);
  const v = useWindowVirtualizer({
    count: linhas,
    estimateSize: () => 240,
    overscan: 3,
    scrollMargin: margem,
  });
  const visiveis = v
    .getVirtualItems()
    .flatMap((l) => itens.slice(l.index * colunas, l.index * colunas + colunas));
  const fotos = useQuery({
    queryKey: ["materiais", "miniaturas", visiveis.map((m) => m.caminho).filter(Boolean)],
    queryFn: () => miniaturas(visiveis),
    staleTime: 8 * 60_000,
    placeholderData: (antes) => antes,
  });

  return (
    <div
      ref={(n) => {
        ref.current = n;
        setEl(n);
      }}
      className="relative"
      style={{ height: v.getTotalSize() }}
    >
      {v.getVirtualItems().map((linha) => (
        <div
          key={linha.key}
          ref={v.measureElement}
          data-index={linha.index}
          className="absolute inset-x-0 top-0 grid gap-3 pb-3"
          style={{
            gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
            transform: `translateY(${linha.start - v.options.scrollMargin}px)`,
          }}
        >
          {itens.slice(linha.index * colunas, linha.index * colunas + colunas).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => aoAbrir(m)}
              className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#E3E7ED] bg-white text-left transition-shadow hover:shadow-[0_8px_20px_-10px_rgba(14,16,19,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta"
            >
              <Miniatura m={m} url={m.caminho ? fotos.data?.[m.caminho] : undefined} />
              <span className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
                <span className="truncate text-[14px] font-medium">{m.titulo}</span>
                <span className="truncate text-[12.5px] text-hub-suave">
                  {[tipoLegivel(m), tamanhoLegivel(m.tamanho), diaMes(m.atualizado_em)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
