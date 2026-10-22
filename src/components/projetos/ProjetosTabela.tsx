import { Fragment } from "react";

import { ProjetoLinha } from "@/components/projetos/ProjetoLinha";
import { gradeProjetos } from "@/lib/estilos";
import type { ProjetoResumo } from "@/lib/projetos";
import { cn } from "@/lib/utils";

/**
 * Projetos em linhas compactas (RD-2), agrupados por saúde da entrega (calculada no banco):
 * "Pede atenção" primeiro, depois "No ritmo". No celular, cada projeto vira um cartão.
 */
export function ProjetosTabela({ projetos }: { projetos: ProjetoResumo[] }) {
  const grupos = [
    {
      id: "atencao",
      rotulo: "Pede atenção",
      cor: "text-sit-risco-t",
      itens: projetos.filter((p) => p.saude.nivel !== "ok"),
    },
    {
      id: "ritmo",
      rotulo: "No ritmo",
      cor: "text-sit-ok-t",
      itens: projetos.filter((p) => p.saude.nivel === "ok"),
    },
  ].filter((g) => g.itens.length > 0);

  return (
    <div className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-hub-borda lg:bg-white">
      <div
        aria-hidden="true"
        className={cn(
          "hidden gap-x-4 border-b border-hub-borda px-5 py-3 text-[13.5px] font-medium text-hub-suave lg:grid",
          gradeProjetos,
        )}
      >
        <span>Projeto</span>
        <span>Agora</span>
        <span>Lançamento</span>
        <span>Horas</span>
        <span>Com o cliente</span>
        <span className="text-right">Valor</span>
      </div>
      {grupos.map((g) => (
        <Fragment key={g.id}>
          <h2
            className={cn(
              "px-1 pt-2 text-[14px] font-semibold lg:border-t lg:border-hub-borda lg:px-5 lg:pb-1 lg:pt-4 lg:first-of-type:border-t-0",
              g.cor,
              g.id === "atencao" && "lg:bg-[#FFFBFA]",
            )}
          >
            {g.rotulo} · {g.itens.length}
          </h2>
          <ul
            className={cn(
              "flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-[#F0F0EA]",
              g.id === "atencao" && "lg:bg-[#FFFBFA]",
            )}
          >
            {g.itens.map((p) => (
              <li key={p.id}>
                <ProjetoLinha p={p} />
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
    </div>
  );
}
