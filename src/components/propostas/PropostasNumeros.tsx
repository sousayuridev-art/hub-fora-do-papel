import { FaixaNumeros, type ItemNumero } from "@/components/hub/FaixaNumeros";
import { moeda } from "@/lib/formatar";
import type { ResumoPropostas } from "@/lib/propostas";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Faixa de números das propostas (card RD-5). Tudo vem de propostas_resumo(). */
export function PropostasNumeros({
  r,
  filtroSemAbrir,
  aoFiltrarSemAbrir,
}: {
  r: ResumoPropostas | undefined;
  filtroSemAbrir: boolean;
  aoFiltrarSemAbrir: () => void;
}) {
  if (!r) {
    return (
      <div
        className="h-[104px] animate-pulse rounded-2xl border border-hub-borda bg-white"
        aria-busy="true"
        aria-label="Carregando os números"
      />
    );
  }

  const antiga = r.sem_abrir_mais_antiga;
  const itens: ItemNumero[] = [
    {
      rotulo: "Em negociação",
      valor: moeda(r.em_negociacao_cents),
      apoio: plural(r.em_negociacao_qtd, "proposta enviada", "propostas enviadas"),
    },
    {
      rotulo: "Sem abrir há mais de 3 dias",
      valor: r.sem_abrir_3_dias,
      apoio:
        antiga === null
          ? "Todas as enviadas foram abertas"
          : `${antiga.empresa} · enviada há ${antiga.dias} dias${r.sem_abrir_3_dias > 1 ? ` e mais ${r.sem_abrir_3_dias - 1}` : ""}`,
      tom: r.sem_abrir_3_dias > 0 ? "atencao" : undefined,
      aoClicar: r.sem_abrir_3_dias > 0 || filtroSemAbrir ? aoFiltrarSemAbrir : undefined,
      ativo: filtroSemAbrir,
    },
    {
      rotulo: "Aceitas no ano",
      valor: moeda(r.aceitas_no_ano_cents),
      apoio: plural(r.aceitas_no_ano, "proposta", "propostas"),
    },
    {
      rotulo: "Taxa de aceite",
      valor: r.taxa_aceite_pct === null ? "—" : `${r.taxa_aceite_pct}%`,
      apoio:
        r.respondidas_no_ano === 0
          ? "Nenhuma resposta no ano"
          : `${r.aceitas_no_ano} de ${plural(r.respondidas_no_ano, "respondida", "respondidas")}`,
    },
  ];
  return <FaixaNumeros itens={itens} />;
}
