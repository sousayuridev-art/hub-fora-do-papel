import { useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { BellRing } from "lucide-react";

import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { diasEntre, type CobrancaLinha } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

export type GrupoLista = {
  id: string;
  titulo: string;
  /** Cor do título e do texto de vencimento. */
  tom: "risco" | "atencao" | "neutro" | "ok";
  itens: CobrancaLinha[];
};

type Linha =
  { tipo: "grupo"; grupo: GrupoLista } | { tipo: "cobranca"; c: CobrancaLinha; grupo: GrupoLista };

const corTitulo: Record<GrupoLista["tom"], string> = {
  risco: "text-sit-risco-t bg-[#FFFBFA]",
  atencao: "text-sit-atencao-t bg-[#FFFCF5]",
  neutro: "text-[#4A4D54] bg-[#FAFAF7]",
  ok: "text-sit-ok-t bg-[#F7FBF8]",
};
const corVence: Record<GrupoLista["tom"], string> = {
  risco: "text-sit-risco-t",
  atencao: "text-sit-atencao-t",
  neutro: "text-[#2A2D33]",
  ok: "text-sit-ok-t",
};

const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

function textoVencimento(c: CobrancaLinha, hoje: string): string {
  if (c.situacao === "paga")
    return `Paga em ${c.pago_em ? diaMes(dataLocal(c.pago_em)) : "—"} · recibo ${c.recibo ?? "—"}`;
  if (!c.vencimento) return c.quando ? `Sem data · ${c.quando}` : "Sem data";
  const d = dataLocal(c.vencimento);
  const dias = diasEntre(hoje, c.vencimento);
  if (dias < 0) return `Venceu ${diaMes(d)} · há ${-dias} ${dias === -1 ? "dia" : "dias"}`;
  if (dias === 0) return "Vence hoje";
  if (dias <= 6) return `Vence ${semana.format(d).replace(".", "")} ${diaMes(d)}`;
  return `Vence ${diaMes(d)}`;
}

/**
 * Cobranças agrupadas por urgência (card RD-3), virtualizadas com a rolagem da página.
 * Tocar na linha abre o painel da cobrança; "Recebi" abre o mesmo painel já no registro do
 * pagamento (valor, data e forma) — nada é gravado sem confirmar.
 */
export function CobrancasLista({
  grupos,
  hoje,
  aoAbrir,
  aoReceber,
}: {
  grupos: GrupoLista[];
  hoje: string;
  aoAbrir: (c: CobrancaLinha) => void;
  aoReceber: (c: CobrancaLinha) => void;
}) {
  const linhas: Linha[] = grupos.flatMap((g) => [
    { tipo: "grupo" as const, grupo: g },
    ...g.itens.map((c) => ({ tipo: "cobranca" as const, c, grupo: g })),
  ]);
  const caixa = useRef<HTMLDivElement>(null);
  const [margem, setMargem] = useState(0);
  useLayoutEffect(() => {
    const medir = () =>
      setMargem((caixa.current?.getBoundingClientRect().top ?? 0) + window.scrollY);
    medir();
    // O que fica acima da lista (gráficos, avisos) pode mudar de altura depois de carregar
    const obs = new ResizeObserver(medir);
    obs.observe(document.body);
    return () => obs.disconnect();
  }, []);

  const v = useWindowVirtualizer({
    count: linhas.length,
    estimateSize: (i) => (linhas[i]?.tipo === "grupo" ? 40 : 76),
    overscan: 8,
    scrollMargin: margem,
  });

  return (
    <div
      ref={caixa}
      className="overflow-hidden rounded-2xl border border-hub-borda bg-white max-md:border-0 max-md:bg-transparent"
    >
      <ul className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((item) => {
          const l = linhas[item.index];
          if (!l) return null;
          const estilo = { transform: `translateY(${item.start - v.options.scrollMargin}px)` };
          if (l.tipo === "grupo")
            return (
              <li
                key={`g-${l.grupo.id}`}
                ref={v.measureElement}
                data-index={item.index}
                className="absolute inset-x-0"
                style={estilo}
              >
                <h3
                  className={cn(
                    "border-b border-[#F0F0EA] px-5 pb-2 pt-3 text-[12.5px] font-semibold md:px-[22px]",
                    "max-md:border-0 max-md:bg-transparent max-md:px-0.5",
                    corTitulo[l.grupo.tom],
                  )}
                >
                  {l.grupo.titulo} · {l.grupo.itens.length}
                </h3>
              </li>
            );
          const c = l.c;
          const valor = c.situacao === "paga" ? (c.pago_cents ?? c.valor_cents) : c.valor_cents;
          return (
            <li
              key={c.id}
              ref={v.measureElement}
              data-index={item.index}
              className="absolute inset-x-0 max-md:pb-2"
              style={estilo}
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0EA] pr-3 hover:bg-hub-fundo max-md:rounded-[14px] max-md:border max-md:border-hub-borda max-md:bg-white md:pr-[22px]">
                <button
                  type="button"
                  onClick={() => aoAbrir(c)}
                  aria-label={`Abrir cobrança: ${c.empresa}, ${c.descricao}, ${moeda(valor)}`}
                  className="grid min-h-[60px] min-w-0 flex-1 gap-0.5 py-3 pl-3.5 text-left md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)_minmax(90px,1fr)] md:items-center md:gap-3 md:pl-[22px]"
                >
                  <span className="flex min-w-0 items-baseline justify-between gap-2 md:flex-col md:items-start md:justify-start md:gap-0">
                    <b className="truncate text-[15px] font-semibold md:text-[14.5px]">
                      {c.empresa}
                    </b>
                    <span className="hidden truncate text-[12.5px] text-hub-suave md:block">
                      {c.projeto ?? "Sem projeto"}
                    </span>
                    <b className="shrink-0 text-[14.5px] font-semibold tabular-nums md:hidden">
                      {moeda(valor)}
                    </b>
                  </span>
                  <span className="truncate text-[13px] text-[#2A2D33] md:text-[14px]">
                    {c.descricao}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-[12.5px] md:text-[14px]",
                        c.situacao === "paga" ? "text-hub-suave" : corVence[l.grupo.tom],
                      )}
                    >
                      {textoVencimento(c, hoje)}
                    </span>
                    {c.cliente_avisou_em && c.situacao === "aberta" && (
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#1E3FA8]">
                        <BellRing className="size-3.5" aria-hidden="true" /> Cliente avisou que
                        pagou
                      </span>
                    )}
                  </span>
                  <b className="hidden text-right text-[14.5px] font-semibold tabular-nums md:block">
                    {moeda(valor)}
                  </b>
                </button>
                {c.situacao === "aberta" && (
                  <button
                    type="button"
                    onClick={() => aoReceber(c)}
                    aria-label={`Recebi: ${c.empresa}, ${c.descricao}`}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[#DADAD3] bg-white px-3 text-[13.5px] font-medium text-hub-tinta hover:bg-hub-selecao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta"
                  >
                    Recebi
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
