import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { SiglaCanal } from "@/components/marketing/SiglaCanal";
import { hora } from "@/lib/formatar";
import {
  calendario,
  chavesMarketing,
  gradeDoMes,
  mesVizinho,
  nomeDoMes,
  rotuloFormato,
  type ItemCalendario,
} from "@/lib/marketing";
import { cn } from "@/lib/utils";

const semana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const textoAviso = {
  pilar_repetido: "Mesmo pilar do post anterior neste canal",
  chamada_demais: "Chamada direta mais de 1 vez em 5 posts",
} as const;

function Item({ i, aoAbrir }: { i: ItemCalendario; aoAbrir: () => void }) {
  const avisos = i.avisos.map((a) => textoAviso[a]).join(". ");
  return (
    <button
      type="button"
      onClick={aoAbrir}
      title={avisos || undefined}
      className={cn(
        "flex w-full min-h-11 items-start gap-1.5 rounded-lg border px-1.5 py-1 text-left text-[12.5px] leading-snug hover:border-hub-tinta",
        i.publicada ? "border-[#C5E6D2] bg-sit-ok" : "border-hub-borda bg-white",
      )}
    >
      <SiglaCanal canal={i.canal} nome={i.canal_nome} publicada={i.publicada} className="mt-px" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-medium">{i.titulo}</span>
        <span className="block text-hub-suave">
          {hora(i.quando)} · {rotuloFormato[i.formato]}
        </span>
      </span>
      {i.avisos.length > 0 && (
        <TriangleAlert
          className="mt-0.5 size-3.5 shrink-0 text-sit-atencao-t"
          aria-label={avisos}
        />
      )}
    </button>
  );
}

/**
 * Calendário editorial (MK-1): versões agendadas e publicadas no mês, por canal. O banco avisa
 * pilar repetido no mesmo canal e chamada direta demais. Clicar abre a peça.
 */
export function CalendarioConteudo({
  mes,
  hoje,
  aoMudarMes,
  aoAbrir,
}: {
  mes: string;
  hoje: string;
  aoMudarMes: (m: string) => void;
  aoAbrir: (pecaId: string) => void;
}) {
  const grade = useMemo(() => gradeDoMes(mes), [mes]);
  const q = useQuery({
    queryKey: chavesMarketing.calendario(grade.inicio, grade.fim),
    queryFn: () => calendario(grade.inicio, grade.fim),
  });
  const porDia = useMemo(() => {
    const m = new Map<string, ItemCalendario[]>();
    for (const i of q.data?.itens ?? []) m.set(i.dia, [...(m.get(i.dia) ?? []), i]);
    return m;
  }, [q.data]);
  const doMes = (q.data?.itens ?? []).filter((i) => i.dia.startsWith(mes));
  const comAviso = doMes.filter((i) => i.avisos.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => aoMudarMes(mesVizinho(mes, -1))}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-white"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <h2 className="min-w-44 text-center text-[18px] font-semibold">{nomeDoMes(mes)}</h2>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => aoMudarMes(mesVizinho(mes, 1))}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-white"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[14px] text-hub-suave">
          Verde: publicada · Branco: agendada. O banco avisa pilar repetido e chamada demais.
        </p>
      </div>

      {comAviso.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-sit-atencao px-3 py-2.5 text-[14px] text-sit-atencao-t">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {comAviso.length === 1
              ? "Uma data pede atenção"
              : `${comAviso.length} datas pedem atenção`}
            : {[...new Set(comAviso.flatMap((i) => i.avisos))].map((a) => textoAviso[a]).join("; ")}
            .
          </span>
        </div>
      )}

      {q.isError ? (
        <EstadoErro
          titulo="Não conseguimos carregar o calendário"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : (
        <>
          {/* Computador: grade do mês */}
          <div className="hidden overflow-hidden rounded-2xl border border-hub-borda bg-white md:block">
            <div className="grid grid-cols-7 border-b border-hub-borda text-[13px] text-hub-suave">
              {semana.map((d) => (
                <span key={d} className="px-2 py-2">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grade.dias.map((d) => {
                const itens = porDia.get(d) ?? [];
                const fora = !d.startsWith(mes);
                return (
                  <div
                    key={d}
                    className={cn(
                      "flex min-h-28 flex-col gap-1 border-b border-r border-[#F0F0EA] p-1.5 [&:nth-child(7n)]:border-r-0",
                      fora && "bg-[#FAFAF7]",
                    )}
                  >
                    <span
                      className={cn(
                        "self-start rounded-md px-1.5 text-[12.5px] tabular-nums",
                        d === hoje
                          ? "bg-hub-tinta font-semibold text-white"
                          : fora
                            ? "text-[#B0B0A9]"
                            : "text-[#4A4D54]",
                      )}
                    >
                      {Number(d.slice(8))}
                    </span>
                    {itens.map((i) => (
                      <Item key={i.versao_id} i={i} aoAbrir={() => aoAbrir(i.peca_id)} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Celular: agenda por dia */}
          <ol className="flex flex-col gap-3 md:hidden">
            {grade.dias
              .filter((d) => d.startsWith(mes) && (porDia.get(d)?.length ?? 0) > 0)
              .map((d) => (
                <li key={d} className="flex flex-col gap-1.5">
                  <h3 className={cn("text-[14px] font-semibold", d === hoje && "text-[#1E3FA8]")}>
                    {new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h3>
                  {(porDia.get(d) ?? []).map((i) => (
                    <Item key={i.versao_id} i={i} aoAbrir={() => aoAbrir(i.peca_id)} />
                  ))}
                </li>
              ))}
            {doMes.length === 0 && !q.isPending && (
              <p className="rounded-2xl border border-dashed border-[#D6D6CF] p-6 text-center text-[14.5px] text-hub-suave">
                Nada agendado neste mês. Aprove uma peça e marque a data de cada versão.
              </p>
            )}
          </ol>
        </>
      )}
    </div>
  );
}
