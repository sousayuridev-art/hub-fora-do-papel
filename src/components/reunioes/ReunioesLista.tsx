import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Video } from "lucide-react";

import { Selo, type Tom } from "@/components/hub/Selo";
import { diaComHora } from "@/lib/formatar";
import { duracao, rotuloSituacao, type Reuniao, type SituacaoReuniao } from "@/lib/reunioes";

const tomDaSituacao: Record<SituacaoReuniao, Tom> = {
  transcrita: "ok",
  aguardando_transcricao: "info",
  sem_transcricao: "neutro",
};

/** Lista virtualizada de reuniões (card RE-1). Toque abre o painel da reunião. */
export function ReunioesLista({
  itens,
  aoAbrir,
  mostrarCliente = true,
}: {
  itens: Reuniao[];
  aoAbrir: (r: Reuniao) => void;
  mostrarCliente?: boolean;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: itens.length,
    getScrollElement: () => caixa.current,
    estimateSize: () => 76,
    overscan: 8,
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <div ref={caixa} className="max-h-[calc(100dvh-300px)] min-h-32 overflow-y-auto">
        <ul className="relative" style={{ height: v.getTotalSize() }}>
          {v.getVirtualItems().map((linha) => {
            const r = itens[linha.index];
            if (!r) return null;
            const detalhe = [
              diaComHora(r.inicio),
              duracao(r.inicio, r.fim),
              r.projeto?.nome,
            ].filter(Boolean);
            return (
              <li
                key={r.id}
                ref={v.measureElement}
                data-index={linha.index}
                className="absolute inset-x-0 border-b border-hub-borda"
                style={{ transform: `translateY(${linha.start}px)` }}
              >
                <button
                  type="button"
                  onClick={() => aoAbrir(r)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-hub-fundo md:px-5"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F1EC] text-[#2A2D33]"
                  >
                    <Video className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-semibold">{r.titulo}</span>
                    <span className="truncate text-[13.5px] text-hub-suave">
                      {detalhe.join(" · ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {mostrarCliente &&
                      (r.cliente ? (
                        <span className="max-w-40 truncate text-[13.5px] font-medium">
                          {r.cliente.nome}
                        </span>
                      ) : (
                        <Selo tom="atencao">Sem cliente</Selo>
                      ))}
                    <Selo tom={tomDaSituacao[r.situacao]} className="max-sm:hidden">
                      {rotuloSituacao[r.situacao]}
                    </Selo>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
