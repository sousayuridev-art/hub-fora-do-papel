import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { PropostasLista } from "@/components/propostas/PropostasLista";
import {
  abasPropostas,
  type AbaPropostas,
  type CartaoProposta,
  type ResumoPropostas,
} from "@/lib/propostas";
import { cn } from "@/lib/utils";

const vazio: Record<AbaPropostas, string> = {
  rascunho: "Nenhum rascunho.",
  enviada: "Nenhuma proposta enviada.",
  aceita: "Nenhuma proposta aceita ainda.",
  recusada: "Nenhuma proposta recusada.",
};

const classeIcone =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-hub-suave transition-colors hover:bg-hub-fundo hover:text-hub-tinta focus-visible:outline-2 focus-visible:outline-hub-tinta";

/**
 * Lista de propostas ao lado do editor (card RD-5), no padrão de caixa de entrada.
 * Recolhida, vira uma faixa estreita com os botões de abrir a lista e voltar ao quadro.
 * As 4 situações ficam numa grade 2 × 2: nenhuma se esconde por rolagem lateral (P1).
 */
export function ListaLateral({
  cartoes,
  carregando,
  falhou,
  aoTentarDeNovo,
  r,
  aba,
  aoEscolherAba,
  selecionada,
  recolhida,
  aoAlternar,
}: {
  cartoes: CartaoProposta[];
  carregando: boolean;
  falhou: boolean;
  aoTentarDeNovo: () => void;
  r: ResumoPropostas | undefined;
  aba: AbaPropostas;
  aoEscolherAba: (a: AbaPropostas) => void;
  selecionada: string | undefined;
  recolhida: boolean;
  aoAlternar: () => void;
}) {
  const daAba = useMemo(() => cartoes.filter((p) => p.status === aba), [cartoes, aba]);

  if (recolhida) {
    return (
      <nav
        aria-label="Propostas"
        className="sticky top-6 flex w-14 shrink-0 flex-col items-center gap-1 self-start rounded-2xl border border-hub-borda bg-white py-1.5 max-lg:hidden"
      >
        <button
          type="button"
          className={classeIcone}
          onClick={aoAlternar}
          aria-expanded={false}
          aria-label="Mostrar a lista de propostas"
          title="Mostrar a lista"
        >
          <PanelLeftOpen className="size-5" aria-hidden="true" />
        </button>
        <Link
          to="/app/propostas"
          search={{}}
          className={classeIcone}
          aria-label="Todas as propostas"
          title="Todas as propostas"
        >
          <LayoutGrid className="size-5" aria-hidden="true" />
        </Link>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Propostas"
      className="sticky top-6 flex w-[288px] shrink-0 flex-col gap-3 self-start rounded-2xl border border-hub-borda bg-white p-3 max-lg:hidden"
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/app/propostas"
          search={{}}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-[14px] font-medium text-hub-tinta hover:underline"
        >
          <LayoutGrid className="size-4 text-hub-suave" aria-hidden="true" />
          Todas as propostas
        </Link>
        <button
          type="button"
          className={classeIcone}
          onClick={aoAlternar}
          aria-expanded={true}
          aria-label="Recolher a lista de propostas"
          title="Recolher a lista"
        >
          <PanelLeftClose className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div
        role="group"
        aria-label="Situação das propostas"
        className="grid grid-cols-2 gap-1 rounded-xl bg-coluna p-1"
      >
        {abasPropostas.map((a) => {
          const ativo = a.id === aba;
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => aoEscolherAba(a.id)}
              className={cn(
                "flex min-h-11 items-center justify-between gap-1 rounded-lg px-2.5 text-[14px] transition-colors",
                ativo
                  ? "bg-white font-semibold text-hub-tinta shadow-[0_1px_2px_rgba(14,16,19,0.08)]"
                  : "text-hub-suave hover:text-hub-tinta",
              )}
            >
              {a.rotulo}
              {r && (
                <span
                  className={cn(
                    "rounded-md px-1.5 text-[12.5px] tabular-nums",
                    ativo ? "bg-hub-tinta text-white" : "bg-[#E1E1DA] text-hub-tinta",
                  )}
                >
                  {r[a.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {carregando ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-hub-fundo" />
          ))}
        </div>
      ) : falhou ? (
        <EstadoErro titulo="Não foi possível carregar" aoTentarDeNovo={aoTentarDeNovo} />
      ) : daAba.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14px] text-hub-suave">
          {vazio[aba]}
        </p>
      ) : (
        <PropostasLista itens={daAba} selecionada={selecionada} />
      )}
    </nav>
  );
}
