import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { IndiceRelatorio } from "@/components/relatorios/IndiceRelatorio";
import { RelatorioEntrega } from "@/components/relatorios/RelatorioEntrega";
import { RelatorioMargem } from "@/components/relatorios/RelatorioMargem";
import { RelatorioNumeros } from "@/components/relatorios/RelatorioNumeros";
import { RelatorioReceita } from "@/components/relatorios/RelatorioReceita";
import { RelatorioVendas } from "@/components/relatorios/RelatorioVendas";
import { classeBotaoSecundario } from "@/lib/estilos";
import {
  chavesRelatorios,
  lerRelatorio,
  lerResumoRelatorio,
  periodosRelatorio,
  rotuloAnterior,
  type PeriodoRelatorio,
} from "@/lib/relatorios";

const busca = z.object({ periodo: z.enum(["mes", "3meses", "ano"]).optional().catch(undefined) });

export const Route = createFileRoute("/app/relatorios")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Relatórios · Hub Fora do Papel" }] }),
  component: Relatorios,
});

function Relatorios() {
  const { periodo = "3meses" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({
    queryKey: chavesRelatorios.periodo(periodo),
    queryFn: () => lerRelatorio(periodo),
  });
  const resumo = useQuery({
    queryKey: chavesRelatorios.resumo(periodo),
    queryFn: () => lerResumoRelatorio(periodo),
  });
  const r = q.data;
  const s = resumo.data;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Gestão"
        titulo="Relatórios"
        acao={
          <div className="flex w-full flex-wrap items-center gap-2.5 print:hidden sm:w-auto">
            <FiltrosChip<PeriodoRelatorio>
              rotulo="Período"
              ativo={periodo}
              aoEscolher={(p) =>
                void navigate({
                  search: { periodo: p === "3meses" ? undefined : p },
                  replace: true,
                })
              }
              opcoes={periodosRelatorio}
            />
            <button
              type="button"
              className={`${classeBotaoSecundario} max-sm:w-full`}
              onClick={() => window.print()}
            >
              <Printer className="size-4" aria-hidden="true" /> Salvar em PDF
            </button>
          </div>
        }
        abas={<IndiceRelatorio pronto={Boolean(r)} />}
      />

      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os relatórios"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !r ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-24 animate-pulse rounded-2xl bg-white" />
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : (
        <>
          {resumo.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar os números do período"
              aoTentarDeNovo={() => void resumo.refetch()}
            />
          ) : s ? (
            <RelatorioNumeros r={s} periodo={periodo} />
          ) : (
            <div className="h-24 animate-pulse rounded-2xl bg-white" aria-busy="true" />
          )}
          <RelatorioVendas
            v={r.vendas}
            contatos={s?.contatos}
            rotuloAnterior={rotuloAnterior[periodo]}
          />
          <RelatorioReceita r={r.receita} meses={s?.receita_meses} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <RelatorioMargem m={r.margem} />
            <RelatorioEntrega e={r.entrega} />
          </div>
        </>
      )}
    </div>
  );
}
