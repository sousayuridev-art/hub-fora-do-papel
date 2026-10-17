import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { RelatorioEntrega } from "@/components/relatorios/RelatorioEntrega";
import { RelatorioMargem } from "@/components/relatorios/RelatorioMargem";
import { RelatorioReceita } from "@/components/relatorios/RelatorioReceita";
import { RelatorioVendas } from "@/components/relatorios/RelatorioVendas";
import { classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import {
  chavesRelatorios,
  lerRelatorio,
  periodosRelatorio,
  rotuloEtapaRelatorio,
  type PeriodoRelatorio,
  type Relatorio,
} from "@/lib/relatorios";

const busca = z.object({ periodo: z.enum(["mes", "3meses", "ano"]).optional().catch(undefined) });

export const Route = createFileRoute("/app/relatorios")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Relatórios · Hub Fora do Papel" }] }),
  component: Relatorios,
});

/** Quatro frases do topo, escritas a partir dos números do banco. */
function frases(r: Relatorio): { rotulo: string; texto: string }[] {
  const perda = r.vendas.maior_perda
    ? r.vendas.funil.find((e) => e.etapa === r.vendas.maior_perda)
    : null;
  const abaixo = r.margem.projetos.filter(
    (p) => (p.vh_real_cents ?? p.vh_estimado_cents ?? Infinity) < r.margem.piso_cents,
  );
  return [
    {
      rotulo: "Vendas",
      texto:
        r.vendas.contatos === 0
          ? "Nenhum contato novo no período."
          : `${r.vendas.contatos} contatos; ${r.vendas.funil.find((e) => e.etapa === "fechado")?.chegaram ?? 0} fecharam.${
              perda
                ? ` Maior perda antes de ${rotuloEtapaRelatorio[perda.etapa]?.toLowerCase()}.`
                : ""
            }`,
    },
    {
      rotulo: "Margem",
      texto:
        r.margem.projetos.length === 0
          ? "Nenhum projeto em andamento."
          : abaixo.length === 0
            ? "Nenhum projeto abaixo do piso por hora."
            : `${abaixo.length} ${abaixo.length === 1 ? "projeto está" : "projetos estão"} abaixo do piso: ${abaixo.map((p) => p.empresa).join(", ")}.`,
    },
    {
      rotulo: "Entrega",
      texto:
        r.entrega.aprovacao_media_dias === null
          ? `${r.entrega.aprovacoes_abertas.length} aprovações abertas.`
          : `Clientes aprovam em ${r.entrega.aprovacao_media_dias.toLocaleString("pt-BR")} dias; ${r.entrega.aprovacoes_abertas.length} abertas.`,
    },
    {
      rotulo: "Receita",
      texto: `${moeda(r.receita.recebido_cents)} recebidos; ${moeda(r.receita.a_receber_30_cents)} nos próximos 30 dias.`,
    },
  ];
}

function Relatorios() {
  const { periodo = "3meses" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({
    queryKey: chavesRelatorios.periodo(periodo),
    queryFn: () => lerRelatorio(periodo),
  });
  const r = q.data;

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        grupo="Gestão"
        titulo="Relatórios"
        resumo={
          r
            ? `De ${diaMes(dataLocal(r.periodo.inicio))} a ${diaMes(dataLocal(r.periodo.fim))}. Mesma base do Painel, do Funil e do Financeiro.`
            : " "
        }
        acao={
          <button
            type="button"
            className={`${classeBotaoSecundario} print:hidden`}
            onClick={() => window.print()}
          >
            <Printer className="size-4" aria-hidden="true" /> Imprimir ou salvar em PDF
          </button>
        }
      />
      <div className="print:hidden">
        <FiltrosChip<PeriodoRelatorio>
          rotulo="Período"
          ativo={periodo}
          aoEscolher={(p) =>
            void navigate({ search: { periodo: p === "3meses" ? undefined : p }, replace: true })
          }
          opcoes={periodosRelatorio}
        />
      </div>

      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os relatórios"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !r ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : (
        <>
          <section aria-label="O que mudou" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {frases(r).map((f) => (
              <div
                key={f.rotulo}
                className="flex flex-col gap-1.5 rounded-2xl border border-hub-borda bg-white p-4"
              >
                <span className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.12em] text-marca-escura">
                  {f.rotulo}
                </span>
                <p className="text-[14.5px]">{f.texto}</p>
              </div>
            ))}
          </section>
          <RelatorioVendas v={r.vendas} />
          <RelatorioReceita r={r.receita} />
          <RelatorioMargem m={r.margem} />
          <RelatorioEntrega e={r.entrega} />
        </>
      )}
    </div>
  );
}
