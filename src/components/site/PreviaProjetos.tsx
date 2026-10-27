import { Fragment } from "react";
import { ArrowUpRight } from "lucide-react";

import type { BlocoProjeto } from "@/lib/paginasSite";

/** Projetos reais: a linha no pé do topo e a lista na abertura das demonstrações. */
export function PreviaProjetos({ valor }: { valor: BlocoProjeto[] }) {
  return (
    <section className="flex flex-col">
      <p className="break-words bg-[#0b0e14] px-5 py-4 text-[14px] text-[#9aa8d6] sm:px-8">
        Projetos reais:{" "}
        {valor.map((p, i) => (
          <Fragment key={i}>
            {i > 0 && " · "}
            <b className="font-semibold text-[#e7ecff]">{p.nome || "Nome"}</b>, {p.linha}
          </Fragment>
        ))}
      </p>
      <ul className="flex flex-col gap-2.5 p-5 sm:p-8">
        {valor.map((p, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[#2a2d33]">
            {p.imagem && (
              <img
                src={p.imagem}
                alt=""
                className="size-12 shrink-0 rounded-[10px] border border-[#e2e2dc] object-cover"
              />
            )}
            <span className="min-w-0 flex-[1_1_220px] break-words">
              <b className="font-semibold text-[#0b0e14]">{p.nome || "Nome"}</b>, {p.linha}
            </span>
            {p.link && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#2448c9] underline underline-offset-4">
                Ver o projeto <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            )}
          </li>
        ))}
        <li className="text-[#2a2d33]">Os nomes de clientes nas telas são de exemplo.</li>
      </ul>
    </section>
  );
}
