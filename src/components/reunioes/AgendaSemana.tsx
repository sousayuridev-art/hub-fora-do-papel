import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  blocosDoDia,
  diasUteis,
  horasDaGrade,
  mesmoDia,
  rotuloSemanaUtil,
  type EventoAgenda,
  type LigacaoEvento,
} from "@/lib/agenda";
import { hora } from "@/lib/formatar";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { cn } from "@/lib/utils";

const ALTURA_HORA = 52;
const nomesDia = ["SEG", "TER", "QUA", "QUI", "SEX"];

/** Hora atual em minutos, atualizada a cada minuto (linha vermelha da grade). */
function useAgora(): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return agora;
}

/**
 * Agenda de segunda a sexta (card RD2-3), como a Google Agenda: reuniões nos horários,
 * hoje marcado e a linha da hora atual. No celular, um dia por vez com os 5 dias em botões.
 */
export function AgendaSemana({
  segunda,
  eventos,
  ligacoes,
  carregando,
  aoAbrir,
  aoMudarSemana,
  aoMarcar,
}: {
  segunda: Date;
  eventos: EventoAgenda[];
  ligacoes: Record<string, LigacaoEvento>;
  carregando: boolean;
  aoAbrir: (e: EventoAgenda) => void;
  aoMudarSemana: (passo: -1 | 0 | 1) => void;
  /** Semana vazia: em vez da grade em branco, um aviso curto com esta ação (REV-6). */
  aoMarcar?: () => void;
}) {
  const celular = useIsMobile();
  const agora = useAgora();
  const dias = useMemo(() => diasUteis(segunda), [segunda]);
  const indiceHoje = dias.findIndex((d) => mesmoDia(d, agora));
  const [diaCelular, setDiaCelular] = useState(Math.max(0, indiceHoje));
  useEffect(
    () =>
      setDiaCelular(
        Math.max(
          0,
          dias.findIndex((d) => mesmoDia(d, new Date())),
        ),
      ),
    [dias],
  );

  const { de, ate } = horasDaGrade(eventos);
  const horas = Array.from({ length: ate - de }, (_, i) => de + i);
  const visiveis = celular ? [dias[diaCelular] ?? dias[0]!] : dias;
  const minutosAgora = (agora.getHours() - de) * 60 + agora.getMinutes();

  return (
    <section aria-label="Agenda da semana" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(classeBotaoSecundario, "h-10")}
          onClick={() => aoMudarSemana(0)}
        >
          Hoje
        </button>
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={() => aoMudarSemana(-1)}
          className="flex size-11 items-center justify-center rounded-xl border border-[#D9DEE5] bg-white hover:bg-hub-selecao md:size-10"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Próxima semana"
          onClick={() => aoMudarSemana(1)}
          className="flex size-11 items-center justify-center rounded-xl border border-[#D9DEE5] bg-white hover:bg-hub-selecao md:size-10"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <h2 className="ml-1 text-[17px] font-semibold md:text-[18px]" aria-live="polite">
          {rotuloSemanaUtil(segunda)}
        </h2>
        {carregando && <span className="text-[13px] text-hub-suave">Atualizando…</span>}
      </div>

      {!carregando && eventos.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-[#C3CAD3] bg-white p-6 text-[15px] text-hub-suave">
          <p>Nenhuma reunião nesta semana. Use as setas para ver as próximas.</p>
          {aoMarcar && (
            <button type="button" className={classeAcaoTexto} onClick={aoMarcar}>
              Marcar reunião ›
            </button>
          )}
        </div>
      ) : (
        <>
          {celular && (
            <div role="tablist" aria-label="Dia" className="grid grid-cols-5 gap-1.5">
              {dias.map((d, i) => (
                <button
                  key={d.toISOString()}
                  type="button"
                  role="tab"
                  aria-selected={i === diaCelular}
                  onClick={() => setDiaCelular(i)}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center rounded-xl border text-[12.5px]",
                    i === diaCelular
                      ? "border-hub-tinta bg-hub-tinta text-white"
                      : "border-[#E3E7ED] bg-white text-[#5A6070]",
                  )}
                >
                  {nomesDia[i]}
                  <b className="text-[17px] font-semibold">{d.getDate()}</b>
                </button>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white">
            {!celular && (
              <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] border-b border-[#E3E7ED]">
                <span />
                {dias.map((d, i) => {
                  const hoje = i === indiceHoje;
                  return (
                    <span
                      key={d.toISOString()}
                      className={cn(
                        "flex flex-col items-center gap-0.5 border-l border-[#EEF1F5] py-2.5 text-[12px]",
                        hoje ? "font-semibold text-hub-tinta" : "text-[#5A6070]",
                      )}
                    >
                      {nomesDia[i]}
                      <b
                        className={cn(
                          "grid size-9 place-items-center rounded-full text-[19px] font-medium",
                          hoje ? "bg-hub-tinta font-semibold text-white" : "text-hub-tinta",
                        )}
                      >
                        {d.getDate()}
                      </b>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Dia inteiro (feriados, viagens): fora da grade de horas */}
            {eventos.some((e) => e.dia_inteiro) && (
              <div
                className={cn(
                  "grid border-b border-[#E3E7ED]",
                  celular
                    ? "grid-cols-[56px_minmax(0,1fr)]"
                    : "grid-cols-[56px_repeat(5,minmax(0,1fr))]",
                )}
              >
                <span className="py-1.5 pr-2 text-right text-[11.5px] text-[#5A6070]">
                  dia todo
                </span>
                {visiveis.map((d) => (
                  <span
                    key={d.toISOString()}
                    className="flex flex-col gap-1 border-l border-[#EEF1F5] p-1"
                  >
                    {eventos
                      .filter((e) => e.dia_inteiro && mesmoDia(new Date(e.inicio), d))
                      .map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => aoAbrir(e)}
                          className="truncate rounded-md bg-[#F1F4F8] px-2 py-1 text-left text-[12.5px] font-medium"
                        >
                          {e.titulo}
                        </button>
                      ))}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-[56px_minmax(0,1fr)] py-2">
              <div aria-hidden="true">
                {horas.map((h) => (
                  <div
                    key={h}
                    className="-translate-y-[7px] pr-2 text-right text-[11.5px] text-[#5A6070]"
                    style={{ height: ALTURA_HORA }}
                  >
                    {h}h
                  </div>
                ))}
              </div>
              <div
                className={cn("relative grid", celular ? "grid-cols-1" : "grid-cols-5")}
                style={{ height: horas.length * ALTURA_HORA }}
              >
                {/* Linhas das horas */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  {horas.map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-[#EEF1F5]"
                      style={{ top: i * ALTURA_HORA }}
                    />
                  ))}
                </div>
                {visiveis.map((d) => {
                  const hoje = mesmoDia(d, agora);
                  const blocos = blocosDoDia(eventos, d, de);
                  return (
                    <div
                      key={d.toISOString()}
                      role="list"
                      aria-label={new Intl.DateTimeFormat("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }).format(d)}
                      className="relative border-l border-[#EEF1F5]"
                    >
                      {hoje && minutosAgora >= 0 && minutosAgora <= horas.length * 60 && (
                        <div
                          aria-hidden="true"
                          className="absolute inset-x-0 z-10 h-0.5 bg-sit-risco-t"
                          style={{ top: (minutosAgora / 60) * ALTURA_HORA }}
                        >
                          <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-sit-risco-t" />
                        </div>
                      )}
                      {blocos.map((b) => {
                        const l = ligacoes[b.evento.id];
                        const passou = new Date(b.evento.fim) < agora;
                        const semCliente = !l?.cliente;
                        const curto = b.altura < 45;
                        return (
                          <div
                            key={b.evento.id}
                            role="listitem"
                            className="absolute px-[3px]"
                            style={{
                              top: (b.topo / 60) * ALTURA_HORA + 1,
                              height: Math.max((b.altura / 60) * ALTURA_HORA - 3, 22),
                              left: `${(b.coluna / b.colunas) * 100}%`,
                              width: `${100 / b.colunas}%`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => aoAbrir(b.evento)}
                              className={cn(
                                "flex h-full w-full flex-col overflow-hidden rounded-md px-2 py-1 text-left text-[12.5px] leading-tight transition-shadow hover:shadow-[0_6px_16px_-8px_rgba(14,16,19,0.35)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-hub-tinta",
                                semCliente
                                  ? "border border-dashed border-[#9AA3AF] bg-white text-[#2A2D33]"
                                  : "border border-[#D3DDF2] bg-[#E8EEF9] text-[#16336E]",
                                passou && "opacity-60",
                              )}
                            >
                              <span className="truncate font-semibold">{b.evento.titulo}</span>
                              {!curto && (
                                <span className="truncate">
                                  {hora(b.evento.inicio)} · {l?.cliente?.nome ?? "sem cliente"}
                                </span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
