import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

import { Selo, Sigla } from "@/components/hub/Selo";
import { dataLocal, diaMes, moeda, sigla } from "@/lib/formatar";
import { rotuloRelacao, textoAgora, type AgoraCliente } from "@/lib/clientes";
import type { ClienteLinha } from "@/lib/funil";
import { cn } from "@/lib/utils";

// Classes literais (o Tailwind só gera o que encontra escrito por inteiro)
const colunasLg =
  "lg:grid-cols-[minmax(220px,2.2fr)_minmax(150px,1.2fr)_minmax(180px,1.6fr)_minmax(110px,0.9fr)_minmax(120px,1fr)_minmax(100px,0.8fr)]";

function Cobranca({ a }: { a: AgoraCliente | undefined }) {
  if (a?.atrasada_desde)
    return (
      <span className="font-medium text-sit-risco-t">
        Venceu {diaMes(dataLocal(a.atrasada_desde))}
      </span>
    );
  if (a?.proxima_cobranca) return <span>{diaMes(dataLocal(a.proxima_cobranca))}</span>;
  return <span className="text-hub-suave">—</span>;
}

/**
 * Clientes ativos e ex-clientes (RD2-5): relação, o que acontece agora, mensalidade e cobrança.
 * Lista virtualizada; no celular vira cartões.
 */
export function ClientesAtivosTabela({
  itens,
  agora,
  logos,
}: {
  itens: ClienteLinha[];
  agora: Record<string, AgoraCliente>;
  logos: Record<string, string>;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const [margem, setMargem] = useState(0);
  useLayoutEffect(() => {
    setMargem(lista.current ? lista.current.getBoundingClientRect().top + window.scrollY : 0);
  }, []);
  const v = useWindowVirtualizer({
    count: itens.length,
    estimateSize: () => 76,
    overscan: 8,
    scrollMargin: margem,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white">
      <div
        role="row"
        className={cn(
          "hidden gap-4 border-b border-[#EEF1F5] px-5 py-3 text-[13px] font-medium text-hub-suave lg:grid",
          colunasLg,
        )}
      >
        <span role="columnheader">Empresa</span>
        <span role="columnheader">Relação</span>
        <span role="columnheader">Agora</span>
        <span role="columnheader">Mensalidade</span>
        <span role="columnheader">Próxima cobrança</span>
        <span role="columnheader">Última atividade</span>
      </div>
      <div ref={lista} role="rowgroup" style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((linha) => {
          const c = itens[linha.index];
          if (!c) return null;
          const a = agora[c.id];
          const ag = textoAgora(a);
          const logo = c.logo_path ? logos[c.logo_path] : undefined;
          return (
            <div
              key={c.id}
              role="row"
              data-index={linha.index}
              ref={v.measureElement}
              className="absolute left-0 top-0 w-full border-b border-[#EEF1F5] last:border-b-0"
              style={{ transform: `translateY(${linha.start - v.options.scrollMargin}px)` }}
            >
              <Link
                to="/app/clientes/$id"
                params={{ id: c.id }}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 text-[14px] hover:bg-[#F9FAFC] focus-visible:bg-[#F9FAFC] focus-visible:outline-none",
                  colunasLg,
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Sigla texto={sigla(c.company_name)} logo={logo} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{c.company_name}</span>
                    <span className="truncate text-[13px] text-hub-suave">
                      {[c.contact_name, c.city].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="justify-self-end lg:justify-self-start">
                  {a?.relacao ? (
                    <span className="inline-flex whitespace-nowrap rounded-full bg-[#F1F4F8] px-2.5 py-0.5 text-[12.5px] font-medium text-[#2A2D33]">
                      {rotuloRelacao[a.relacao]}
                    </span>
                  ) : (
                    <span className="text-hub-suave">—</span>
                  )}
                </span>
                <span className="col-span-2 lg:col-span-1">
                  {ag.tom ? (
                    <Selo tom={ag.tom}>{ag.texto}</Selo>
                  ) : (
                    <span className="text-[13.5px] text-hub-suave">{ag.texto}</span>
                  )}
                </span>
                <span className="whitespace-nowrap tabular-nums max-lg:text-[13px] max-lg:text-hub-suave">
                  <span className="lg:hidden">Mensalidade </span>
                  {a && a.mensalidade_cents > 0 ? moeda(a.mensalidade_cents) : "—"}
                </span>
                <span className="whitespace-nowrap tabular-nums max-lg:justify-self-end max-lg:text-[13px]">
                  {!a?.atrasada_desde && (
                    <span className="text-hub-suave lg:hidden">Cobrança </span>
                  )}
                  <Cobranca a={a} />
                </span>
                <span className="text-[13px] text-hub-suave max-lg:hidden">
                  {diaMes(c.last_activity_at)}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
