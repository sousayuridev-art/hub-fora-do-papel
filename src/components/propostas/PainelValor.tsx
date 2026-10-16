import { moeda } from "@/lib/formatar";
import { rotuloDiagnostico } from "@/lib/funil";
import type { Calculo } from "@/lib/propostas";
import { cn } from "@/lib/utils";

/** Valor da proposta (conta linha a linha, do banco) e a régua do valor por hora. */
export function PainelValor({ c }: { c: Calculo }) {
  const linhas: [string, string][] = [
    [`${c.horas.toLocaleString("pt-BR")} h × ${moeda(c.hora_cents)}`, moeda(c.base_cents)],
    [
      `Complexidade × ${c.complexidade.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}`,
      c.complexidade_cents ? `+ ${moeda(c.complexidade_cents)}` : "sem acréscimo",
    ],
    [`Contingência ${c.contingencia_pct}%`, `+ ${moeda(c.contingencia_cents)}`],
    [
      "Arredondamento a R$ 500",
      c.arredondamento_cents > 0 ? `+ ${moeda(c.arredondamento_cents)}` : "R$ 0",
    ],
    [
      "Diagnóstico",
      c.diagnostico
        ? `− ${moeda(c.diagnostico.cents)} (${rotuloDiagnostico[c.diagnostico.tipo].toLowerCase()})`
        : "sem diagnóstico pago",
    ],
  ];
  if (c.desconto_cents > 0) linhas.push(["Desconto comercial", `− ${moeda(c.desconto_cents)}`]);

  // Régua: 0 até 1,5 × alvo
  const max = Math.max(c.alvo_cents * 1.5, c.valor_hora_cents);
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const tom =
    c.horas === 0
      ? {
          barra: "bg-[#DADAD3]",
          caixa: "bg-hub-fundo text-hub-suave",
          msg: "Coloque as horas dos itens para ver o valor por hora.",
        }
      : c.abaixo_do_piso
        ? {
            barra: "bg-sit-risco-t",
            caixa: "bg-sit-risco text-sit-risco-t",
            msg: `Abaixo do piso de ${moeda(c.piso_cents)} por hora. O envio pede um motivo.`,
          }
        : c.valor_hora_cents < c.alvo_cents
          ? {
              barra: "bg-[#B36B00]",
              caixa: "bg-sit-atencao text-sit-atencao-t",
              msg: "Entre o piso e o alvo. Pode enviar; o desconto fica registrado.",
            }
          : {
              barra: "bg-sit-ok-t",
              caixa: "bg-sit-ok text-sit-ok-t",
              msg: `Acima do alvo de ${moeda(c.alvo_cents)} por hora.`,
            };

  return (
    <section
      aria-labelledby="valor-proposta-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div>
        <h2
          id="valor-proposta-t"
          className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-hub-suave"
        >
          Valor da proposta
        </h2>
        <p
          className="font-titulo text-[32px] font-bold leading-tight tabular-nums"
          aria-live="polite"
        >
          {moeda(c.total_cents)}
        </p>
        <p className="text-[13.5px] text-hub-suave">
          {c.parcelas.length} partes: {c.parcelas.map((p) => `${p.pct}%`).join(" · ")} ·{" "}
          {moeda(c.parcelas[0]?.cents ?? 0)} no aceite
        </p>
      </div>
      <dl className="flex flex-col text-[14px]">
        {linhas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-hub-borda py-2">
            <dt>{k}</dt>
            <dd className="text-right tabular-nums">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 py-2 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{moeda(c.total_cents)}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-hub-suave">
            Valor por hora
          </span>
          <span className="font-titulo text-lg font-bold tabular-nums">
            {moeda(c.valor_hora_cents)}/h
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-[#ECECE6]" aria-hidden="true">
          <span
            className={cn("absolute inset-y-0 left-0 rounded-full", tom.barra)}
            style={{ width: pos(c.valor_hora_cents) }}
          />
          <span
            className="absolute -top-1 h-4 w-0.5 bg-hub-tinta"
            style={{ left: pos(c.piso_cents) }}
          />
          <span
            className="absolute -top-1 h-4 w-0.5 bg-hub-tinta"
            style={{ left: pos(c.alvo_cents) }}
          />
        </div>
        <div className="relative h-4 text-[12.5px] text-hub-suave" aria-hidden="true">
          <span className="absolute -translate-x-full pr-1" style={{ left: pos(c.piso_cents) }}>
            piso {c.piso_cents / 100}
          </span>
          <span className="absolute pl-1" style={{ left: pos(c.alvo_cents) }}>
            alvo {c.alvo_cents / 100}
          </span>
        </div>
        <p className={cn("rounded-xl px-3 py-2.5 text-[14px]", tom.caixa)}>{tom.msg}</p>
      </div>
    </section>
  );
}
