import { SlidersHorizontal } from "lucide-react";

import { AtalhoPrazo } from "@/components/tarefas/AtalhoPrazo";
import { MenuFiltro } from "@/components/tarefas/MenuFiltro";
import type { PrioridadeTarefa, SituacaoTarefa } from "@/lib/projetos";
import {
  filtrosAtivos,
  opcoesPrioridade,
  opcoesSituacao,
  type BuscaTarefas,
  type PrazoFiltro,
  type ResumoTarefas,
} from "@/lib/tarefas";
import { classeAcaoTexto } from "@/lib/estilos";

export type Opcao = { id: string; rotulo: string };
export type OpcoesFiltro = { clientes: Opcao[]; projetos: Opcao[] };

/**
 * Atalhos de prazo (Atrasadas, Hoje, Esta semana) e filtros Cliente, Projeto, Prioridade e
 * Situação. Tudo vai para o endereço. No celular, os menus ficam num painel de baixo ("Filtros").
 */
export function FiltrosTarefas({
  busca,
  resumo,
  opcoes,
  aoMudar,
  aoAbrirFiltrosCel,
}: {
  busca: BuscaTarefas;
  resumo: ResumoTarefas | undefined;
  opcoes: OpcoesFiltro;
  aoMudar: (p: Partial<BuscaTarefas>) => void;
  aoAbrirFiltrosCel: () => void;
}) {
  const prazo = (p: PrazoFiltro) => aoMudar({ prazo: busca.prazo === p ? undefined : p });
  const ativos = filtrosAtivos(busca);
  return (
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      <AtalhoPrazo
        rotulo="Atrasadas"
        contagem={resumo?.atrasadas}
        risco
        ativo={busca.prazo === "atrasadas"}
        aoClicar={() => prazo("atrasadas")}
      />
      <AtalhoPrazo
        rotulo="Hoje"
        contagem={resumo?.para_hoje}
        ativo={busca.prazo === "hoje"}
        aoClicar={() => prazo("hoje")}
      />
      <AtalhoPrazo
        rotulo="Esta semana"
        contagem={resumo?.semana}
        ativo={busca.prazo === "semana"}
        aoClicar={() => prazo("semana")}
        // No celular, "Esta semana" fica no painel de filtros (como no quadro aprovado).
        className={busca.prazo === "semana" ? undefined : "max-md:hidden"}
      />
      <button
        type="button"
        onClick={aoAbrirFiltrosCel}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-[#DADAD3] bg-white px-3.5 text-[14px] md:hidden"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filtros
        {ativos > 0 && (
          <span className="rounded-md bg-hub-tinta px-1.5 text-[12.5px] font-semibold text-white">
            {ativos}
          </span>
        )}
      </button>
      <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-hub-borda md:block" />
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <MenuFiltro
          rotulo="Cliente"
          valor={busca.cliente}
          opcoes={opcoes.clientes}
          aoEscolher={(v) => aoMudar({ cliente: v })}
        />
        <MenuFiltro
          rotulo="Projeto"
          valor={busca.projeto}
          opcoes={opcoes.projetos}
          aoEscolher={(v) => aoMudar({ projeto: v })}
        />
        <MenuFiltro
          rotulo="Prioridade"
          valor={busca.prioridade}
          opcoes={opcoesPrioridade}
          aoEscolher={(v) => aoMudar({ prioridade: v as PrioridadeTarefa | undefined })}
        />
        <MenuFiltro
          rotulo="Situação"
          valor={busca.situacao}
          opcoes={opcoesSituacao}
          aoEscolher={(v) => aoMudar({ situacao: v as SituacaoTarefa | undefined })}
        />
        {(ativos > 0 || busca.prazo) && (
          <button
            type="button"
            onClick={() =>
              aoMudar({
                cliente: undefined,
                projeto: undefined,
                prioridade: undefined,
                situacao: undefined,
                prazo: undefined,
              })
            }
            className={`${classeAcaoTexto}`}
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
