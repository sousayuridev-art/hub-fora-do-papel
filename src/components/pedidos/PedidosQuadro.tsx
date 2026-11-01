import { useMemo } from "react";

import { Sigla } from "@/components/hub/Selo";
import { diaMes, moeda, sigla } from "@/lib/formatar";
import {
  colunasPedidos,
  idadeEmDias,
  origemDoPedido,
  rotuloClassificacao,
  type PedidoLinha,
} from "@/lib/pedidos";
import { classeAcaoTexto } from "@/lib/estilos";
import { cn } from "@/lib/utils";

const PRONTOS_VISIVEIS = 5;

/** Idade do pedido: 1 dia em âmbar, 3 dias ou mais em vermelho (só nas colunas abertas). */
function Idade({ dias }: { dias: number }) {
  const texto = dias === 0 ? "hoje" : dias === 1 ? "1 dia" : `${dias} dias`;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12.5px] tabular-nums",
        dias >= 3
          ? "font-semibold text-sit-risco-t"
          : dias >= 1
            ? "font-medium text-sit-atencao-t"
            : "text-hub-suave",
      )}
    >
      {dias >= 1 && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {texto}
    </span>
  );
}

function Cartao({ p, aoAbrir, aberto }: { p: PedidoLinha; aoAbrir: () => void; aberto: boolean }) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="flex w-full flex-col overflow-hidden rounded-xl border border-[rgba(14,16,19,0.07)] bg-white text-left shadow-[0_1px_2px_rgba(14,16,19,0.05)] transition-shadow hover:shadow-[0_8px_20px_-10px_rgba(14,16,19,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta"
    >
      {p.urgente && (
        <span className="bg-sit-risco px-3.5 py-1 text-[12.5px] font-semibold text-sit-risco-t">
          Urgente
        </span>
      )}
      <span className="flex items-center gap-2 px-3.5 pt-3 text-[12.5px] text-hub-suave">
        <Sigla texto={sigla(p.company_name)} />
        <span className="min-w-0 truncate">
          <b className="font-medium text-hub-tinta">{p.company_name}</b> · {p.code}
        </span>
      </span>
      <span className="px-3.5 pt-2 text-[14.5px] font-medium leading-snug">{p.title}</span>
      <span className="truncate px-3.5 pb-3 pt-1 text-[12.5px] text-hub-suave">
        {p.project_name ?? p.site_nome ?? origemDoPedido(p)}
        {p.anexos.length > 0
          ? ` · ${p.anexos.length} ${p.anexos.length === 1 ? "anexo" : "anexos"}`
          : ""}
      </span>
      <span className="flex items-center justify-between gap-2 border-t border-[rgba(14,16,19,0.06)] bg-[#F7F9FB] px-3.5 py-2">
        <span className="min-w-0 truncate text-[12.5px] text-[#2A2D33]">
          {p.classification ? rotuloClassificacao[p.classification] : aberto ? "A classificar" : ""}
          {p.value_cents ? ` · ${moeda(p.value_cents)}` : ""}
          {!p.value_cents && p.hours_estimated
            ? ` · ${p.hours_estimated.toLocaleString("pt-BR")} h`
            : ""}
        </span>
        {aberto ? (
          <Idade dias={idadeEmDias(p.created_at)} />
        ) : (
          <span className="shrink-0 whitespace-nowrap text-[12.5px] text-hub-suave">
            {p.status === "recusado" ? "Recusado" : `Entregue ${diaMes(p.done_at ?? p.updated_at)}`}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Quadro de pedidos (RD2-4): Novos, Em análise, Aguardando o cliente, Fazendo e Prontos.
 * Colunas brancas; urgentes no topo; a idade do pedido muda de cor (1 dia âmbar, 3 dias vermelho).
 * No celular, as colunas rolam de lado, uma por vez.
 */
export function PedidosQuadro({
  itens,
  aoAbrir,
  aoVerProntos,
}: {
  itens: PedidoLinha[];
  aoAbrir: (p: PedidoLinha) => void;
  aoVerProntos: () => void;
}) {
  const colunas = useMemo(
    () =>
      colunasPedidos.map((c) => {
        const daColuna = itens
          .filter((p) => c.situacoes.includes(p.status))
          .sort((a, b) =>
            c.id === "prontos"
              ? (b.done_at ?? b.updated_at).localeCompare(a.done_at ?? a.updated_at)
              : Number(b.urgente ?? false) - Number(a.urgente ?? false) ||
                a.created_at.localeCompare(b.created_at),
          );
        return { ...c, itens: daColuna };
      }),
    [itens],
  );

  return (
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 items-stretch gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:scroll-px-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0">
      {colunas.map((c) => {
        const prontos = c.id === "prontos";
        const visiveis = prontos ? c.itens.slice(0, PRONTOS_VISIVEIS) : c.itens;
        const maisAntigo =
          !prontos && c.itens.length ? idadeEmDias(c.itens[c.itens.length - 1]!.created_at) : null;
        return (
          <section
            key={c.id}
            aria-label={`${c.rotulo}: ${c.itens.length}`}
            className="flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#E3E7ED] border-t-4 border-t-[#C9D0DA] bg-white md:w-[280px] md:max-w-none xl:w-auto"
          >
            <header className="flex flex-col gap-1 px-4 pb-3 pt-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold">{c.rotulo}</h2>
                <span className="inline-grid h-[22px] min-w-6 place-items-center rounded-full bg-[#F1F4F8] px-2 text-[12.5px] font-semibold tabular-nums">
                  {c.itens.length}
                </span>
              </div>
              <span className="text-[13px] text-[#4A4D54]">
                {c.descricao}
                {maisAntigo !== null && maisAntigo > 0
                  ? ` · o mais antigo: ${maisAntigo} ${maisAntigo === 1 ? "dia" : "dias"}`
                  : ""}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-3">
              {visiveis.map((p) => (
                <Cartao key={p.id} p={p} aberto={!prontos} aoAbrir={() => aoAbrir(p)} />
              ))}
              {c.itens.length === 0 && (
                <p className="px-2 py-3 text-center text-[13.5px] text-[#4A4D54]">Nenhum pedido.</p>
              )}
              {prontos && c.itens.length > PRONTOS_VISIVEIS && (
                <button
                  type="button"
                  className={`${classeAcaoTexto} self-start`}
                  onClick={aoVerProntos}
                >
                  Ver todos ({c.itens.length}) ›
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
