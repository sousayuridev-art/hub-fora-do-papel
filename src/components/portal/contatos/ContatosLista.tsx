import { useWindowVirtualizer } from "@tanstack/react-virtual";

import { ContatoLinha } from "@/components/portal/contatos/ContatoLinha";
import type { ContatoSite } from "@/lib/contatosSite";
import { useMargemDaLista } from "@/lib/useMargemDaLista";

/** Lista virtualizada de contatos, rolando com a página. */
export function ContatosLista({
  itens,
  aoAbrir,
}: {
  itens: ContatoSite[];
  aoAbrir: (c: ContatoSite) => void;
}) {
  const { ref, margem } = useMargemDaLista<HTMLUListElement>();
  const v = useWindowVirtualizer({
    count: itens.length,
    estimateSize: () => 92,
    overscan: 8,
    scrollMargin: margem,
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <ul ref={ref} className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((linha) => {
          const c = itens[linha.index];
          if (!c) return null;
          return (
            <li
              key={c.id}
              ref={v.measureElement}
              data-index={linha.index}
              className="absolute inset-x-0 top-0 border-b border-[#F0F0EA]"
              style={{ transform: `translateY(${linha.start - v.options.scrollMargin}px)` }}
            >
              <ContatoLinha c={c} aoAbrir={() => aoAbrir(c)} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
