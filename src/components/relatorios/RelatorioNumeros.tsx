import { FaixaNumeros, type ItemNumero } from "@/components/hub/FaixaNumeros";
import { moeda } from "@/lib/formatar";
import {
  plural,
  porHora,
  rotuloAnterior,
  type PeriodoRelatorio,
  type ResumoRelatorio,
  type Variacao,
} from "@/lib/relatorios";

/** "▲ R$ 6.200 vs. mês passado", "▼ 18% vs. 3 meses antes" ou "Igual ao mês passado". */
function TextoVariacao({
  v,
  periodo,
  emPct = false,
}: {
  v: Variacao;
  periodo: PeriodoRelatorio;
  emPct?: boolean;
}) {
  const ref = rotuloAnterior[periodo];
  if (v.diferenca === 0)
    return <span>{v.atual === 0 ? `Nada no período nem no ${ref}` : `Igual ao ${ref}`}</span>;
  if (v.anterior === 0) return <span>Nada no {ref}</span>;
  const sobe = v.diferenca > 0;
  const quanto = emPct && v.pct !== null ? `${Math.abs(v.pct)}%` : moeda(Math.abs(v.diferenca));
  return (
    <span className={sobe ? "text-sit-ok-t" : "text-sit-risco-t"}>
      <span aria-hidden="true">{sobe ? "▲" : "▼"} </span>
      <span className="sr-only">{sobe ? "Subiu" : "Caiu"} </span>
      {quanto} vs. {ref}
    </span>
  );
}

/** Faixa do topo dos relatórios (card RD-8): números do período com variação calculada no banco. */
export function RelatorioNumeros({
  r,
  periodo,
}: {
  r: ResumoRelatorio;
  periodo: PeriodoRelatorio;
}) {
  const vh = r.valor_hora;
  const l = r.lancamentos;
  const atrasados = l.total - l.no_prazo;
  const itens: ItemNumero[] = [
    {
      rotulo: "Vendido",
      valor: moeda(r.vendido.atual),
      apoio: <TextoVariacao v={r.vendido} periodo={periodo} />,
    },
    {
      rotulo: "Recebido",
      valor: moeda(r.recebido.atual),
      apoio: <TextoVariacao v={r.recebido} periodo={periodo} emPct />,
    },
    {
      rotulo: "Valor por hora",
      valor: vh.media_cents === null ? "—" : porHora(vh.media_cents),
      apoio:
        vh.media_cents === null
          ? "Nenhum projeto em andamento"
          : `alvo ${porHora(vh.alvo_cents)} · piso ${porHora(vh.piso_cents)}`,
      tom:
        vh.media_cents === null
          ? undefined
          : vh.media_cents < vh.piso_cents
            ? "risco"
            : vh.media_cents < vh.alvo_cents
              ? "atencao"
              : undefined,
    },
    {
      rotulo: "Lançamentos no prazo",
      valor: l.total === 0 ? "—" : `${l.no_prazo} de ${l.total}`,
      apoio:
        l.total === 0
          ? "Nenhum lançamento com data no período"
          : atrasados === 0
            ? "Todos no prazo"
            : atrasados === 1
              ? `1 atrasou ${plural(l.maior_atraso_dias, "dia", "dias")}`
              : `${atrasados} atrasaram, o maior ${plural(l.maior_atraso_dias, "dia", "dias")}`,
    },
  ];
  return <FaixaNumeros itens={itens} />;
}
