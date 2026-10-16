import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import {
  CampanhaPainel,
  OrcamentoPainel,
  RegistrarInvestimentoPainel,
} from "@/components/trafego/PaineisTrafego";
import { TrafegoCampanhas } from "@/components/trafego/TrafegoCampanhas";
import { TrafegoComparacao } from "@/components/trafego/TrafegoComparacao";
import { TrafegoFunil } from "@/components/trafego/TrafegoFunil";
import { TrafegoIndicadores } from "@/components/trafego/TrafegoIndicadores";
import { TrafegoInvestimentos } from "@/components/trafego/TrafegoInvestimentos";
import { TrafegoOrcamento } from "@/components/trafego/TrafegoOrcamento";
import { TrafegoRetorno } from "@/components/trafego/TrafegoRetorno";
import { useMutacoesTrafego } from "@/components/trafego/useMutacoesTrafego";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { diaMes, moeda } from "@/lib/formatar";
import {
  chavesTrafego,
  painelTrafego,
  periodos,
  type CampanhaPainel as Campanha,
  type Periodo,
} from "@/lib/trafego";

const busca = z.object({
  periodo: z.enum(["mes", "3meses", "ano"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/trafego")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Tráfego pago · Hub Fora do Papel" }] }),
  component: Trafego,
});

/** Tráfego pago (card S5): investimento lançado à mão, resultado vindo do funil. */
function Trafego() {
  const { periodo: p } = Route.useSearch();
  const navigate = Route.useNavigate();
  const periodo: Periodo = p ?? "mes";
  const dados = useQuery({
    queryKey: chavesTrafego.painel(periodo),
    queryFn: () => painelTrafego(periodo),
  });
  const m = useMutacoesTrafego(periodo);
  const [registrar, setRegistrar] = useState(false);
  const [campanha, setCampanha] = useState<{ aberta: boolean; c: Campanha | null }>({
    aberta: false,
    c: null,
  });
  const [orcamento, setOrcamento] = useState(false);

  const d = dados.data;
  const etiqueta = d ? `${diaMes(`${d.periodo.inicio}T12:00:00`)} até hoje` : "";

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Tráfego pago"
        resumo={
          d ? (
            <>
              Orçamento de{" "}
              <strong className="font-semibold text-hub-tinta">
                {moeda(d.orcamento.mensal_cents)} por mês
              </strong>{" "}
              · Google (busca) e Instagram e Facebook · cada contato conta no mês em que chegou
            </>
          ) : (
            <span className="inline-block h-5 w-72 animate-pulse rounded bg-[#E4E4DF]" />
          )
        }
        acao={
          <button type="button" className={classeAcaoPrincipal} onClick={() => setRegistrar(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Registrar investimento
          </button>
        }
      />
      <FiltrosChip
        rotulo="Período"
        opcoes={periodos}
        ativo={periodo}
        aoEscolher={(id) => void navigate({ search: { periodo: id === "mes" ? undefined : id } })}
      />

      {dados.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-48 animate-pulse rounded-2xl bg-white" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : dados.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o tráfego"
          aoTentarDeNovo={() => void dados.refetch()}
        />
      ) : (
        <>
          <TrafegoOrcamento o={dados.data.orcamento} aoAjustar={() => setOrcamento(true)} />
          <TrafegoIndicadores p={dados.data} />
          <TrafegoFunil p={dados.data} etiqueta={etiqueta} />
          <TrafegoCampanhas
            p={dados.data}
            etiqueta={etiqueta}
            aoNova={() => setCampanha({ aberta: true, c: null })}
            aoEditar={(c) => setCampanha({ aberta: true, c })}
          />
          <TrafegoRetorno p={dados.data} etiqueta={etiqueta} />
          <div className="grid gap-5 xl:grid-cols-2">
            <TrafegoComparacao p={dados.data} etiqueta={etiqueta} />
            <TrafegoInvestimentos
              p={dados.data}
              etiqueta={etiqueta}
              aoRemover={(id) => {
                const v = dados.data.investimentos.find((x) => x.id === id);
                if (v) m.remover.mutate(v);
              }}
            />
          </div>
        </>
      )}

      <RegistrarInvestimentoPainel
        aberto={registrar}
        aoFechar={() => setRegistrar(false)}
        campanhas={d?.campanhas ?? []}
        aoSalvar={(v) => m.registrar.mutate(v)}
        aoNovaCampanha={() => {
          setRegistrar(false);
          setCampanha({ aberta: true, c: null });
        }}
      />
      <CampanhaPainel
        aberto={campanha.aberta}
        campanha={campanha.c}
        aoFechar={() => setCampanha({ aberta: false, c: null })}
        aoSalvar={(v) => m.campanha.mutate(v)}
      />
      <OrcamentoPainel
        aberto={orcamento}
        aoFechar={() => setOrcamento(false)}
        o={d?.orcamento}
        aoSalvar={(v) => m.orcamento.mutate(v)}
      />
    </div>
  );
}
