import { useQuery } from "@tanstack/react-query";

import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { chavesFinanceiro, financeiroDoProjeto } from "@/lib/financeiro";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { horasMin, type DetalheProjeto } from "@/lib/projetos";
import { cn } from "@/lib/utils";

/** Horas, valor (recebido e próxima parcela) e lançamento numa faixa só (RD-2). */
export function ProjetoNumeros({ d }: { d: DetalheProjeto }) {
  const p = d.projeto;
  const fin = useQuery({
    queryKey: chavesFinanceiro.projeto(p.id),
    queryFn: () => financeiroDoProjeto(p.id),
  });
  const pct =
    p.hours_estimated > 0 ? Math.round((d.minutos_usados / 60 / p.hours_estimated) * 100) : null;
  const dias = p.launch_date
    ? Math.round((dataLocal(p.launch_date).getTime() - dataLocal(d.hoje).getTime()) / 86_400_000)
    : null;
  const atrasoLancamento = dias !== null && dias < 0 && !p.launched_at;
  const recebido = fin.data && fin.data.total_cents > 0;

  return (
    <FaixaNumeros
      itens={[
        {
          rotulo: "Horas",
          tom: pct !== null && pct >= 100 ? "risco" : undefined,
          valor: (
            <>
              {horasMin(d.minutos_usados)}{" "}
              <span className="text-[14px] font-normal text-hub-suave">
                de {p.hours_estimated.toLocaleString("pt-BR")} h
              </span>
            </>
          ),
          apoio:
            pct === null ? (
              "Sem estimativa de horas"
            ) : (
              <span className="flex flex-col gap-1.5">
                <span
                  aria-hidden="true"
                  className="block h-1.5 overflow-hidden rounded-full bg-[#E6E6E0]"
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      pct >= 100 ? "bg-[#9A1C12]" : pct >= 80 ? "bg-[#D48A00]" : "bg-hub-tinta",
                    )}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </span>
                {pct}% do estimado
              </span>
            ),
        },
        {
          rotulo: recebido ? "Recebido" : "Valor do projeto",
          valor: recebido ? (
            <>
              {moeda(fin.data.pago_cents)}{" "}
              <span className="text-[14px] font-normal text-hub-suave">
                de {moeda(fin.data.total_cents)}
              </span>
            </>
          ) : (
            moeda(p.value_cents)
          ),
          apoio: recebido
            ? fin.data.proxima
              ? `Próxima: ${moeda(fin.data.proxima.valor_cents)} ${
                  fin.data.proxima.vencimento
                    ? `em ${diaMes(dataLocal(fin.data.proxima.vencimento))}`
                    : "na entrega"
                }`
              : `Valor do projeto: ${moeda(p.value_cents)}`
            : "Parcelas e cobranças ficam no Financeiro.",
        },
        {
          rotulo: "Lançamento",
          tom: atrasoLancamento ? "risco" : undefined,
          valor: p.launched_at
            ? diaMes(p.launched_at)
            : p.launch_date
              ? diaMes(dataLocal(p.launch_date))
              : "Sem data",
          apoio: p.launched_at
            ? "Projeto lançado"
            : dias === null
              ? "Defina a data no Encerramento"
              : dias < 0
                ? `${-dias} ${dias === -1 ? "dia" : "dias"} de atraso`
                : dias === 0
                  ? "É hoje"
                  : `Faltam ${dias} ${dias === 1 ? "dia" : "dias"}`,
        },
      ]}
    />
  );
}
