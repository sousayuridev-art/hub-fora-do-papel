import { useMemo } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Link2 } from "lucide-react";

import { diaMes, hora } from "@/lib/formatar";
import {
  duracao,
  rotuloSemana,
  rotuloSituacao,
  type Reuniao,
  type SituacaoReuniao,
} from "@/lib/reunioes";
import { useMargemDaLista } from "@/lib/useMargemDaLista";
import { cn } from "@/lib/utils";

const corDaSituacao: Record<SituacaoReuniao, string> = {
  transcrita: "text-sit-ok-t",
  aguardando_transcricao: "text-sit-atencao-t",
  sem_transcricao: "text-hub-suave",
};

const semanaCurta = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

type ItemLista = Reuniao & {
  semana?: string;
  semanas_atras?: number;
  trecho?: string | null;
};

type Linha =
  | { tipo: "semana"; chave: string; rotulo: string; total: number | undefined }
  | { tipo: "reuniao"; chave: string; r: ItemLista };

// Classes literais (o Tailwind só gera o que encontra escrito por inteiro)
const colunasComCliente =
  "md:grid-cols-[104px_minmax(0,2.6fr)_minmax(0,1.6fr)_72px_minmax(0,170px)]";
const colunasSemCliente = "md:grid-cols-[104px_minmax(0,1fr)_72px_minmax(0,170px)]";

/**
 * Lista de reuniões (cards RE-1 e RD-4), virtualizada e rolando com a página.
 * Com `semanas`, agrupa por semana ("Esta semana · 5"). Toque abre o painel da reunião.
 */
export function ReunioesLista({
  itens,
  aoAbrir,
  mostrarCliente = true,
  semanas,
}: {
  itens: ItemLista[];
  aoAbrir: (r: Reuniao) => void;
  mostrarCliente?: boolean;
  /** Totais por semana vindos do banco; sem eles, a lista não agrupa. */
  semanas?: { semana: string; total: number }[];
}) {
  const { ref, margem } = useMargemDaLista<HTMLDivElement>();

  const linhas = useMemo<Linha[]>(() => {
    if (!semanas) return itens.map((r) => ({ tipo: "reuniao", chave: r.id, r }));
    const totais = new Map(semanas.map((s) => [s.semana, s.total]));
    const out: Linha[] = [];
    let atual: string | null = null;
    for (const r of itens) {
      if (r.semana && r.semana !== atual) {
        atual = r.semana;
        out.push({
          tipo: "semana",
          chave: `s-${r.semana}`,
          rotulo: rotuloSemana(r.semana, r.semanas_atras ?? 0),
          total: totais.get(r.semana),
        });
      }
      out.push({ tipo: "reuniao", chave: r.id, r });
    }
    return out;
  }, [itens, semanas]);

  const v = useWindowVirtualizer({
    count: linhas.length,
    estimateSize: (i) => (linhas[i]?.tipo === "semana" ? 40 : 68),
    overscan: 8,
    scrollMargin: margem,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <div ref={ref} className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((item) => {
          const linha = linhas[item.index];
          if (!linha) return null;
          const estilo = { transform: `translateY(${item.start - v.options.scrollMargin}px)` };
          if (linha.tipo === "semana") {
            return (
              <h3
                key={linha.chave}
                ref={v.measureElement}
                data-index={item.index}
                className="absolute inset-x-0 top-0 border-b border-[#F0F0EA] bg-[#FAFAF7] px-4 pb-2 pt-3 text-[13px] font-semibold text-[#2A2D33] md:px-5"
                style={estilo}
              >
                {linha.rotulo}
                {linha.total !== undefined && (
                  <span className="font-normal text-hub-suave"> · {linha.total}</span>
                )}
              </h3>
            );
          }
          const r = linha.r;
          const dur = duracao(r.inicio, r.fim);
          const dia = `${semanaCurta.format(new Date(r.inicio)).replace(".", "")} ${diaMes(r.inicio)}`;
          const apoio = r.trecho ? `“${r.trecho}”` : (r.projeto?.nome ?? "Sem projeto");
          return (
            <div
              key={linha.chave}
              ref={v.measureElement}
              data-index={item.index}
              className="absolute inset-x-0 top-0 border-b border-[#F0F0EA]"
              style={estilo}
            >
              <button
                type="button"
                onClick={() => aoAbrir(r)}
                className={cn(
                  "grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 text-left text-[14px] hover:bg-hub-fundo focus-visible:bg-hub-fundo focus-visible:outline-none md:min-h-[62px] md:gap-x-4 md:px-5",
                  mostrarCliente ? colunasComCliente : colunasSemCliente,
                )}
              >
                {/* Dia e hora: coluna no computador, linha de apoio no celular */}
                <span className="hidden flex-col md:flex">
                  <span className="font-semibold">{dia}</span>
                  <span className="text-[12.5px] text-hub-suave">{hora(r.inicio)}</span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14.5px] font-semibold">{r.titulo}</span>
                  <span className="truncate text-[13px] text-hub-suave">
                    <span className="md:hidden">
                      {dia}, {hora(r.inicio)}
                      {dur ? ` · ${dur}` : ""} ·{" "}
                    </span>
                    {apoio}
                  </span>
                </span>
                {mostrarCliente && (
                  <span className="col-start-1 row-start-2 min-w-0 truncate md:col-start-auto md:row-start-auto">
                    {r.cliente ? (
                      <span className="font-medium">{r.cliente.nome}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-sit-info-t">
                        <Link2 className="size-4" aria-hidden="true" />
                        Ligar a um cliente
                      </span>
                    )}
                  </span>
                )}
                <span className="hidden text-right text-hub-suave md:block">{dur ?? "—"}</span>
                <span
                  className={cn(
                    "col-start-2 row-span-2 row-start-1 inline-flex items-center justify-end gap-1.5 self-center text-[12.5px] md:col-start-auto md:row-span-1 md:row-start-auto",
                    corDaSituacao[r.situacao],
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="size-[7px] shrink-0 rounded-full bg-current"
                  />
                  <span className="max-sm:sr-only">{rotuloSituacao[r.situacao]}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
