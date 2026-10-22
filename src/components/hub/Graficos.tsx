import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Gráficos simples do Hub (card RD-0), sem biblioteca: barras e linha.
 * Regras (dataviz): um eixo só; até 2 séries nas cores --serie-1/--serie-2 (validadas para daltonismo);
 * legenda sempre que houver 2 séries; rótulo de valor só onde importa; dica ao passar o mouse
 * ou tocar; tabela escondida para leitor de tela. Os números chegam prontos do banco.
 */

export type Serie = { nome: string; cor: string; valores: number[] };

/** Teto "redondo" do eixo (1, 2, 2,5, 5 × 10^n). */
function tetoRedondo(max: number): number {
  if (max <= 0) return 1;
  const pot = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pot >= max) return m * pot;
  return 10 * pot;
}

export function Legenda({ series }: { series: Pick<Serie, "nome" | "cor">[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#2A2D33]">
      {series.map((s) => (
        <span key={s.nome} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-[3px]"
            style={{ background: s.cor }}
          />
          {s.nome}
        </span>
      ))}
    </div>
  );
}

/** Fundo listrado para valores previstos (não realizados). */
export const listrado = (cor: string) =>
  `repeating-linear-gradient(45deg, ${cor} 0 2px, color-mix(in srgb, ${cor} 18%, white) 2px 5px)`;

export function GraficoBarras({
  rotulo,
  categorias,
  series,
  empilhado = false,
  formatar,
  formatarEixo,
  rodape,
  previstas = [],
  altura = 200,
}: {
  /** Descrição curta para leitor de tela. */
  rotulo: string;
  categorias: string[];
  series: Serie[];
  empilhado?: boolean;
  formatar: (n: number) => string;
  formatarEixo?: (n: number) => string;
  /** Linha embaixo de cada categoria (ex.: resultado do mês, contatos da semana). */
  rodape?: (indice: number) => ReactNode;
  /** Índices de categorias previstas (barra listrada). */
  previstas?: number[];
  altura?: number;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const tabelaId = useId();
  const somas = categorias.map((_, i) =>
    empilhado
      ? series.reduce((t, s) => t + (s.valores[i] ?? 0), 0)
      : Math.max(0, ...series.map((s) => s.valores[i] ?? 0)),
  );
  const teto = tetoRedondo(Math.max(0, ...somas));
  const px = (v: number) => Math.max(v > 0 ? 2 : 0, Math.round((v / teto) * altura));
  const eixo = formatarEixo ?? formatar;
  const larguraBarra =
    empilhado || series.length === 1 ? "w-[clamp(14px,45%,40px)]" : "w-[clamp(8px,30%,24px)]";

  return (
    <figure className="m-0 flex flex-col gap-2" aria-describedby={tabelaId}>
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `48px repeat(${categorias.length}, minmax(0, 1fr))` }}
      >
        <div
          aria-hidden="true"
          className="flex flex-col justify-between pr-2 text-right text-[12px] tabular-nums text-hub-suave"
          style={{ height: altura }}
        >
          <span className="-translate-y-2">{eixo(teto)}</span>
          <span>{eixo(teto / 2)}</span>
          <span className="translate-y-2">0</span>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 border-t border-dashed border-[#ECECE6]"
          style={{ left: 48 }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 border-t border-dashed border-[#ECECE6]"
          style={{ left: 48, top: altura / 2 }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 border-t border-[#D6D6CF]"
          style={{ left: 48, top: altura }}
        />
        {categorias.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={`${c}: ${series.map((s) => `${s.nome} ${formatar(s.valores[i] ?? 0)}`).join(", ")}`}
            onMouseEnter={() => setFoco(i)}
            onMouseLeave={() => setFoco(null)}
            onFocus={() => setFoco(i)}
            onBlur={() => setFoco(null)}
            onClick={() => setFoco((f) => (f === i ? null : i))}
            className={cn(
              "relative flex items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-hub-tinta",
              foco === i && "bg-hub-fundo",
              empilhado ? "flex-col-reverse items-center justify-start" : "gap-0.5",
            )}
            style={{ height: altura }}
          >
            {series.map((s, k) => (
              <span
                key={s.nome}
                className={cn(
                  larguraBarra,
                  (!empilhado || k === series.length - 1) && "rounded-t-[4px]",
                )}
                style={{
                  height: px(s.valores[i] ?? 0),
                  background: previstas.includes(i) ? listrado(s.cor) : s.cor,
                  marginTop: empilhado && k > 0 ? 2 : undefined,
                }}
              />
            ))}
            {foco === i && (
              <span
                role="status"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-hub-tinta px-2.5 py-1.5 text-left text-[12.5px] text-white shadow-lg"
              >
                <b className="block font-semibold">
                  {c}
                  {previstas.includes(i) ? " · previsto" : ""}
                </b>
                {series.map((s) => (
                  <span key={s.nome} className="block tabular-nums">
                    {s.nome}: {formatar(s.valores[i] ?? 0)}
                  </span>
                ))}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className="grid text-center text-[12.5px]"
        style={{ gridTemplateColumns: `48px repeat(${categorias.length}, minmax(0, 1fr))` }}
      >
        <span />
        {categorias.map((c, i) => (
          <span key={c} className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[#2A2D33]">{c}</span>
            {rodape?.(i)}
          </span>
        ))}
      </div>
      {/* A tabela não respeita a largura de 1px do sr-only: a caixa em volta é que esconde (sem rolagem lateral) */}
      <div className="sr-only">
        <table id={tabelaId}>
          <caption>{rotulo}</caption>
          <thead>
            <tr>
              <th scope="col">Período</th>
              {series.map((s) => (
                <th key={s.nome} scope="col">
                  {s.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categorias.map((c, i) => (
              <tr key={c}>
                <th scope="row">{c}</th>
                {series.map((s) => (
                  <td key={s.nome}>{formatar(s.valores[i] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export function GraficoLinha({
  rotulo,
  pontos,
  cor = "var(--color-serie-1)",
  formatar,
  referencia,
}: {
  rotulo: string;
  pontos: { rotulo: string; valor: number }[];
  cor?: string;
  formatar: (n: number) => string;
  /** Linha tracejada de limite ou meta. */
  referencia?: { valor: number; rotulo: string; cor?: string };
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const tabelaId = useId();
  const W = 300;
  const H = 140;
  const topo = 16;
  const teto = tetoRedondo(Math.max(referencia?.valor ?? 0, ...pontos.map((p) => p.valor)) * 1.1);
  const x = (i: number) => (pontos.length <= 1 ? W / 2 : 8 + (i * (W - 16)) / (pontos.length - 1));
  const y = (v: number) => H - ((H - topo) * v) / teto;
  const ultimo = pontos.length - 1;
  const alvo = foco ?? ultimo;
  const p = pontos[alvo];

  return (
    <figure className="m-0 flex flex-col gap-2" aria-describedby={tabelaId}>
      <svg
        viewBox={`0 0 ${W} ${H + 4}`}
        className="h-auto w-full overflow-visible"
        aria-hidden="true"
      >
        <line x1="0" y1={H} x2={W} y2={H} stroke="#D6D6CF" strokeWidth="1" />
        <line
          x1="0"
          y1={y(teto / 2)}
          x2={W}
          y2={y(teto / 2)}
          stroke="#ECECE6"
          strokeDasharray="3 3"
        />
        {referencia && (
          <>
            <line
              x1="0"
              y1={y(referencia.valor)}
              x2={W}
              y2={y(referencia.valor)}
              stroke={referencia.cor ?? "#9A1C12"}
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text
              x={W}
              y={y(referencia.valor) - 5}
              textAnchor="end"
              fontSize="11"
              fill={referencia.cor ?? "#9A1C12"}
            >
              {referencia.rotulo}
            </text>
          </>
        )}
        {pontos.length > 1 && (
          <polyline
            points={pontos.map((pt, i) => `${x(i)},${y(pt.valor)}`).join(" ")}
            fill="none"
            stroke={cor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {p && (
          <circle cx={x(alvo)} cy={y(p.valor)} r="4.5" fill={cor} stroke="#fff" strokeWidth="2" />
        )}
        {pontos.map((pt, i) => (
          <rect
            key={pt.rotulo}
            x={x(i) - W / Math.max(2, pontos.length) / 2}
            y="0"
            width={W / Math.max(2, pontos.length)}
            height={H}
            fill="transparent"
            onMouseEnter={() => setFoco(i)}
            onMouseLeave={() => setFoco(null)}
          />
        ))}
      </svg>
      <div className="flex justify-between text-[12.5px] text-hub-suave">
        {pontos.map((pt, i) => (
          <span key={pt.rotulo} className={cn(i === alvo && "font-semibold text-hub-tinta")}>
            {pt.rotulo}
          </span>
        ))}
      </div>
      {p && (
        <p role="status" className="m-0 text-[12.5px] text-[#2A2D33]">
          {p.rotulo}: <b className="font-semibold tabular-nums">{formatar(p.valor)}</b>
        </p>
      )}
      {/* A tabela não respeita a largura de 1px do sr-only: a caixa em volta é que esconde (sem rolagem lateral) */}
      <div className="sr-only">
        <table id={tabelaId}>
          <caption>{rotulo}</caption>
          <tbody>
            {pontos.map((pt) => (
              <tr key={pt.rotulo}>
                <th scope="row">{pt.rotulo}</th>
                <td>{formatar(pt.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
