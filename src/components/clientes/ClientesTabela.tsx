import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

import { Selo, Sigla } from "@/components/hub/Selo";
import { moeda, prazoRelativo, sigla } from "@/lib/formatar";
import { pacoteDe, passoAberto, situacaoDe, ultimaAtividade, valorDe } from "@/lib/clientes";
import type { ClienteLinha } from "@/lib/funil";
import { cn } from "@/lib/utils";

// Classes literais (o Tailwind só gera o que encontra escrito por inteiro)
const colunas =
  "grid-cols-[minmax(200px,1.4fr)_minmax(130px,0.8fr)_minmax(190px,1.2fr)_minmax(170px,1fr)_110px_minmax(140px,0.8fr)]";
const colunasLg =
  "lg:grid-cols-[minmax(200px,1.4fr)_minmax(130px,0.8fr)_minmax(190px,1.2fr)_minmax(170px,1fr)_110px_minmax(140px,0.8fr)]";

function ProximoPasso({ c }: { c: ClienteLinha }) {
  if (!passoAberto(c)) return <span className="text-hub-suave">—</span>;
  const prazo = c.next_step_date
    ? prazoRelativo(c.next_step_date, c.hoje, c.next_step_has_time ? c.next_step_at : null)
    : null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="leading-snug">{c.next_step}</span>
      {prazo && (
        <Selo tom={prazo.tom} ponto={false}>
          {prazo.texto}
        </Selo>
      )}
    </span>
  );
}

/**
 * Lista de clientes virtualizada (só as linhas visíveis vão para a tela).
 * Computador: tabela. Celular: cartões empilhados.
 */
export function ClientesTabela({ itens }: { itens: ClienteLinha[] }) {
  const lista = useRef<HTMLDivElement>(null);
  const [margem, setMargem] = useState(0);
  useLayoutEffect(() => {
    setMargem(lista.current ? lista.current.getBoundingClientRect().top + window.scrollY : 0);
  }, []);
  const v = useWindowVirtualizer({
    count: itens.length,
    estimateSize: () => 88,
    overscan: 8,
    scrollMargin: margem,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <div
        role="row"
        className={cn(
          "hidden gap-4 border-b border-hub-borda px-5 py-3 text-[13.5px] text-hub-suave lg:grid",
          colunas,
        )}
      >
        <span role="columnheader">Nome</span>
        <span role="columnheader">Situação</span>
        <span role="columnheader">Próximo passo</span>
        <span role="columnheader">Pacote ou mensalidade</span>
        <span role="columnheader" className="text-right">
          Valor
        </span>
        <span role="columnheader">Última atividade</span>
      </div>
      <div ref={lista} role="rowgroup" style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((linha) => {
          const c = itens[linha.index];
          if (!c) return null;
          const sit = situacaoDe(c);
          const pacote = pacoteDe(c);
          const valor = valorDe(c);
          const ativ = ultimaAtividade(c);
          return (
            <div
              key={c.id}
              role="row"
              data-index={linha.index}
              ref={v.measureElement}
              className="absolute left-0 top-0 w-full border-b border-hub-borda last:border-b-0"
              style={{ transform: `translateY(${linha.start - v.options.scrollMargin}px)` }}
            >
              <Link
                to="/app/clientes/$id"
                params={{ id: c.id }}
                className={cn(
                  "grid items-center gap-x-4 gap-y-2 px-5 py-4 text-[14.5px] hover:bg-[#FAFAF7] focus-visible:bg-[#FAFAF7] focus-visible:outline-none",
                  "grid-cols-[auto_1fr_auto]",
                  colunasLg,
                )}
              >
                <span className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
                  <Sigla texto={sigla(c.company_name)} escuro={c.situacao === "cliente"} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{c.company_name}</span>
                    <span className="truncate text-[13.5px] text-hub-suave">{c.contact_name}</span>
                  </span>
                </span>
                <span className="justify-self-end lg:justify-self-start">
                  <Selo tom={sit.tom}>{sit.texto}</Selo>
                </span>
                <span className="col-span-3 lg:col-span-1">
                  <ProximoPasso c={c} />
                </span>
                <span className="col-span-2 flex flex-col lg:col-span-1">
                  <span>{pacote.titulo}</span>
                  {pacote.detalhe && (
                    <span className="text-[13px] text-hub-suave">{pacote.detalhe}</span>
                  )}
                </span>
                <span className="flex flex-col items-end text-right">
                  <span className="font-semibold tabular-nums">
                    {valor.valor ? moeda(valor.valor) : "—"}
                  </span>
                  {valor.detalhe && (
                    <span className="text-[13px] text-hub-suave">{valor.detalhe}</span>
                  )}
                </span>
                <span className="col-span-3 flex gap-1 text-[13.5px] text-hub-suave lg:col-span-1 lg:flex-col lg:gap-0">
                  <span className="text-hub-tinta lg:text-hub-suave">{ativ.texto}</span>
                  <span className="font-rotulo text-[12.5px]">· {ativ.quando}</span>
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
