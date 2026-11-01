import { useId, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

/**
 * Gráficos do Hub com Recharts (card RD2-6), carregados só nas telas do /app que os usam
 * (Financeiro, Relatórios e Tráfego pago), fora do pacote do site e do portal.
 * Regras (dataviz): um eixo só; cores --serie-1..4 em ordem fixa (validadas para daltonismo);
 * legenda sempre que houver 2 séries; dica ao passar o mouse ou tocar; tabela escondida para
 * leitor de tela. Os números chegam prontos do banco.
 */

export type Serie = { nome: string; cor: string; valores: number[] };

const LARGURA_EIXO = 48;
const tinta = "#0E1013";
const suave = "#4A4D54";
const grade = "#ECECE6";
const base = "#D6D6CF";

/** Teto "redondo" do eixo (1, 2, 2,5, 5 × 10^n). */
function tetoRedondo(max: number): number {
  if (max <= 0) return 1;
  const pot = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * pot >= max) return m * pot;
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

/** Caixa da dica (escura, texto branco), igual nos dois gráficos. */
function Dica({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { nome?: string; cor?: string; valor: string }[];
}) {
  return (
    <div className="pointer-events-none whitespace-nowrap rounded-lg bg-hub-tinta px-2.5 py-1.5 text-[12.5px] text-white shadow-lg">
      <b className="block font-semibold">{titulo}</b>
      {linhas.map((l, i) => (
        <span key={l.nome ?? i} className="flex items-center gap-1.5 tabular-nums">
          {l.cor && (
            <span
              aria-hidden="true"
              className="size-2 rounded-[2px]"
              style={{ background: l.cor }}
            />
          )}
          {l.nome ? `${l.nome}: ` : ""}
          {l.valor}
        </span>
      ))}
    </div>
  );
}

/** Tabela para leitor de tela (dentro de um div: "sr-only" direto na tabela cria rolagem lateral). */
function TabelaOculta({
  id,
  rotulo,
  categorias,
  series,
  formatar,
}: {
  id: string;
  rotulo: string;
  categorias: string[];
  series: Pick<Serie, "nome" | "valores">[];
  formatar: (n: number) => string;
}) {
  return (
    <div className="sr-only">
      <table id={id}>
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
  );
}

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
  const tabelaId = useId();
  const padrao = useId().replace(/:/g, "");
  const dados = categorias.map((c, i) => {
    const linha: Record<string, string | number> = { categoria: c };
    series.forEach((s, k) => (linha[`s${k}`] = s.valores[i] ?? 0));
    return linha;
  });
  const somas = categorias.map((_, i) =>
    empilhado
      ? series.reduce((t, s) => t + (s.valores[i] ?? 0), 0)
      : Math.max(0, ...series.map((s) => s.valores[i] ?? 0)),
  );
  const teto = tetoRedondo(Math.max(0, ...somas));
  const eixo = formatarEixo ?? formatar;

  const dica = ({ active, label }: TooltipProps<number, string>) => {
    if (!active || typeof label !== "string") return null;
    const i = categorias.indexOf(label);
    return (
      <Dica
        titulo={`${label}${previstas.includes(i) ? " · previsto" : ""}`}
        linhas={series.map((s) => ({
          nome: s.nome,
          cor: s.cor,
          valor: formatar(s.valores[i] ?? 0),
        }))}
      />
    );
  };

  return (
    <figure className="m-0 flex flex-col gap-2" aria-describedby={tabelaId}>
      <div
        aria-hidden="true"
        style={{ height: altura }}
        className="[&_.recharts-surface]:overflow-visible"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            margin={{ top: 6, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={empilhado || series.length === 1 ? "28%" : "22%"}
            barGap={2}
            accessibilityLayer={false}
          >
            <defs>
              {series.map((s, k) => (
                <pattern
                  key={s.nome}
                  id={`${padrao}-${k}`}
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="6" height="6" style={{ fill: "#fff" }} />
                  <rect width="3" height="6" style={{ fill: s.cor }} />
                </pattern>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={grade} strokeDasharray="3 3" />
            <XAxis dataKey="categoria" hide />
            <YAxis
              width={LARGURA_EIXO}
              domain={[0, teto]}
              ticks={[0, teto / 2, teto]}
              tick={(t: { x: number; y: number; payload: { value: number } }) => (
                // Texto próprio: o tick padrão quebra "R$ 800" em duas linhas
                <text
                  x={t.x - 6}
                  y={t.y}
                  dy={4}
                  textAnchor="end"
                  fontSize={12.5}
                  style={{ fill: suave, fontVariantNumeric: "tabular-nums" }}
                >
                  {t.payload.value === 0 ? "0" : eixo(t.payload.value)}
                </text>
              )}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={dica} cursor={{ fill: "#F5F7FA" }} isAnimationActive={false} />
            <ReferenceLine y={0} stroke={base} />
            {series.map((s, k) => {
              const topo = !empilhado || k === series.length - 1;
              // Empilhado: contorno na cor do fundo dá 2 px de respiro entre os segmentos
              return (
                <Bar
                  key={s.nome}
                  dataKey={`s${k}`}
                  name={s.nome}
                  {...(empilhado ? { stackId: "pilha", stroke: "#fff", strokeWidth: 1 } : {})}
                  radius={topo ? [4, 4, 0, 0] : 0}
                  maxBarSize={empilhado || series.length === 1 ? 40 : 24}
                  isAnimationActive={false}
                >
                  {dados.map((d, i) => (
                    <Cell
                      key={String(d["categoria"])}
                      style={{ fill: previstas.includes(i) ? `url(#${padrao}-${k})` : s.cor }}
                    />
                  ))}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        className="grid text-center text-[12.5px]"
        style={{
          gridTemplateColumns: `${LARGURA_EIXO}px repeat(${categorias.length}, minmax(0, 1fr))`,
        }}
      >
        <span />
        {categorias.map((c, i) => (
          <span key={c} className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[#2A2D33]">{c}</span>
            {rodape?.(i)}
          </span>
        ))}
      </div>
      <TabelaOculta
        id={tabelaId}
        rotulo={rotulo}
        categorias={categorias}
        series={series}
        formatar={formatar}
      />
    </figure>
  );
}

export function GraficoLinha({
  rotulo,
  pontos,
  cor = "var(--color-serie-1)",
  formatar,
  referencia,
  altura = 150,
}: {
  rotulo: string;
  pontos: { rotulo: string; valor: number }[];
  cor?: string;
  formatar: (n: number) => string;
  /** Linha tracejada de limite ou meta. */
  referencia?: { valor: number; rotulo: string; cor?: string };
  altura?: number;
}) {
  const tabelaId = useId();
  const [foco, setFoco] = useState<number | null>(null);
  const teto = tetoRedondo(Math.max(referencia?.valor ?? 0, ...pontos.map((p) => p.valor)) * 1.1);
  const alvo = foco ?? pontos.length - 1;
  const p = pontos[alvo];
  const corRef = referencia?.cor ?? "#9A1C12";

  const dica = ({ active, label }: TooltipProps<number, string>) => {
    if (!active || typeof label !== "string") return null;
    const pt = pontos.find((x) => x.rotulo === label);
    return pt ? <Dica titulo={label} linhas={[{ valor: formatar(pt.valor) }]} /> : null;
  };

  return (
    <figure className="m-0 flex flex-col gap-2" aria-describedby={tabelaId}>
      <div aria-hidden="true" style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={pontos}
            margin={{ top: 16, right: 8, bottom: 4, left: 8 }}
            onMouseMove={(e) =>
              setFoco(typeof e?.activeTooltipIndex === "number" ? e.activeTooltipIndex : null)
            }
            onMouseLeave={() => setFoco(null)}
            accessibilityLayer={false}
          >
            <CartesianGrid vertical={false} stroke={grade} strokeDasharray="3 3" />
            <XAxis dataKey="rotulo" hide />
            <YAxis domain={[0, teto]} hide />
            <ReferenceLine y={0} stroke={base} />
            {referencia && (
              <ReferenceLine
                y={referencia.valor}
                stroke={corRef}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                label={(l: { viewBox?: { x?: number; y?: number; width?: number } }) => (
                  // Rótulo acima da linha, alinhado à direita
                  <text
                    x={(l.viewBox?.x ?? 0) + (l.viewBox?.width ?? 0)}
                    y={(l.viewBox?.y ?? 0) - 5}
                    textAnchor="end"
                    fontSize={12.5}
                    style={{ fill: corRef }}
                  >
                    {referencia.rotulo}
                  </text>
                )}
              />
            )}
            <Tooltip
              content={dica}
              cursor={{ stroke: "#C9D0DA", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="valor"
              stroke={cor}
              style={{ stroke: cor }}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; index?: number }) =>
                props.index === pontos.length - 1 && foco === null ? (
                  <circle
                    key="ultimo"
                    cx={props.cx}
                    cy={props.cy}
                    r={4.5}
                    style={{ fill: cor }}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ) : (
                  <g key={`p${props.index ?? 0}`} />
                )
              }
              activeDot={{ r: 4.5, stroke: "#fff", strokeWidth: 2, style: { fill: cor } }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[12.5px] text-hub-suave">
        {pontos.map((pt, i) => (
          <span
            key={pt.rotulo}
            className={i === alvo ? "font-semibold text-hub-tinta" : undefined}
            style={i === alvo ? { color: tinta } : undefined}
          >
            {pt.rotulo}
          </span>
        ))}
      </div>
      {p && (
        <p role="status" className="m-0 text-[12.5px] text-[#2A2D33]">
          {p.rotulo}: <b className="font-semibold tabular-nums">{formatar(p.valor)}</b>
        </p>
      )}
      <TabelaOculta
        id={tabelaId}
        rotulo={rotulo}
        categorias={pontos.map((x) => x.rotulo)}
        series={[{ nome: "Valor", valores: pontos.map((x) => x.valor) }]}
        formatar={formatar}
      />
    </figure>
  );
}
