import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Abas } from "@/components/hub/Abas";
import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import {
  CampanhaPainel,
  OrcamentoPainel,
  RegistrarInvestimentoPainel,
} from "@/components/trafego/PaineisTrafego";
import { TrafegoCampanhas } from "@/components/trafego/TrafegoCampanhas";
import { TrafegoFunil } from "@/components/trafego/TrafegoFunil";
import { TrafegoGraficos } from "@/components/trafego/TrafegoGraficos";
import { TrafegoLancamentos } from "@/components/trafego/TrafegoLancamentos";
import { TrafegoRetorno } from "@/components/trafego/TrafegoRetorno";
import { TrafegoTopo } from "@/components/trafego/TrafegoTopo";
import { useMutacoesTrafego } from "@/components/trafego/useMutacoesTrafego";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { diaMes } from "@/lib/formatar";
import {
  chavesTrafego,
  lancamentosTrafego,
  painelTrafego,
  periodos,
  tendenciaTrafego,
  type CampanhaPainel as Campanha,
  type Periodo,
} from "@/lib/trafego";

const abas = ["campanhas", "retorno", "lancamentos"] as const;
type Aba = (typeof abas)[number];

const busca = z.object({
  periodo: z.enum(["mes", "3meses", "ano"]).optional().catch(undefined),
  aba: z.enum(abas).optional().catch(undefined),
});

export const Route = createFileRoute("/app/trafego")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Tráfego pago · Hub Fora do Papel" }] }),
  component: Trafego,
});

/**
 * Tráfego pago (cards S5 e RD-6): topo de decisão (orçamento + 3 números com variação),
 * gráficos de 8 semanas, funil compacto e abas Campanhas · Retorno · Lançamentos.
 * Investimento lançado à mão; resultado vindo do funil; contas no banco.
 */
function Trafego() {
  const { periodo: p, aba: a } = Route.useSearch();
  const navigate = Route.useNavigate();
  const periodo: Periodo = p ?? "mes";
  const aba: Aba = a ?? "campanhas";
  const dados = useQuery({
    queryKey: chavesTrafego.painel(periodo),
    queryFn: () => painelTrafego(periodo),
  });
  const tendencia = useQuery({
    queryKey: chavesTrafego.tendencia(periodo),
    queryFn: () => tendenciaTrafego(periodo),
  });
  // Mesma chave da 1ª página da aba Lançamentos: o total do rótulo vem do banco, sem pedido extra
  const lancamentos = useQuery({
    queryKey: chavesTrafego.lancamentos(periodo, null, 0),
    queryFn: () => lancamentosTrafego(periodo, null, 0),
  });
  const m = useMutacoesTrafego(periodo);
  const [registrar, setRegistrar] = useState<{ aberto: boolean; campanha: string | null }>({
    aberto: false,
    campanha: null,
  });
  const [campanha, setCampanha] = useState<{ aberta: boolean; c: Campanha | null }>({
    aberta: false,
    c: null,
  });
  const [orcamento, setOrcamento] = useState(false);

  const d = dados.data;
  const etiqueta = d ? `${diaMes(`${d.periodo.inicio}T12:00:00`)} até hoje` : "";
  const abrirRegistrar = (c: string | null = null) => setRegistrar({ aberto: true, campanha: c });

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Tráfego pago"
        resumo={etiqueta ? `${etiqueta} · cada contato conta no mês em que chegou` : undefined}
        acao={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <FiltrosChip
              rotulo="Período"
              opcoes={periodos}
              ativo={periodo}
              aoEscolher={(id) =>
                void navigate({
                  search: (s) => ({ ...s, periodo: id === "mes" ? undefined : id }),
                })
              }
            />
            <button type="button" className={classeAcaoPrincipal} onClick={() => abrirRegistrar()}>
              <Plus className="size-4" aria-hidden="true" />
              Registrar investimento
            </button>
          </div>
        }
      />

      {dados.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="h-72 animate-pulse rounded-2xl bg-white" />
            <div className="h-72 animate-pulse rounded-2xl bg-white max-md:hidden" />
          </div>
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : dados.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o tráfego"
          aoTentarDeNovo={() => void dados.refetch()}
        />
      ) : (
        <>
          <TrafegoTopo
            p={dados.data}
            t={tendencia.data}
            tFalhou={tendencia.isError}
            aoAjustar={() => setOrcamento(true)}
          />
          <TrafegoGraficos t={tendencia.data} falhou={tendencia.isError} />
          <TrafegoFunil p={dados.data} etiqueta={etiqueta} />

          <div className="flex flex-col gap-4">
            <div className="border-b border-hub-borda">
              <Abas
                rotulo="Detalhes do tráfego"
                className="-mb-px"
                opcoes={[
                  { id: "campanhas", rotulo: "Campanhas", contagem: dados.data.campanhas.length },
                  { id: "retorno", rotulo: "Retorno por mês de entrada" },
                  {
                    id: "lancamentos",
                    rotulo: "Lançamentos",
                    contagem: lancamentos.data?.total,
                  },
                ]}
                ativa={aba}
                aoEscolher={(id) =>
                  void navigate({
                    search: (s) => ({ ...s, aba: id === "campanhas" ? undefined : id }),
                    replace: true,
                  })
                }
              />
            </div>
            <div role="tabpanel" aria-label={etiqueta}>
              {aba === "campanhas" && (
                <TrafegoCampanhas
                  p={dados.data}
                  aoNova={() => setCampanha({ aberta: true, c: null })}
                  aoEditar={(c) => setCampanha({ aberta: true, c })}
                  aoLancar={(c) => abrirRegistrar(c.id)}
                />
              )}
              {aba === "retorno" && <TrafegoRetorno p={dados.data} />}
              {aba === "lancamentos" && (
                <TrafegoLancamentos
                  periodo={periodo}
                  campanhas={dados.data.campanhas}
                  aoRemover={(l) => m.remover.mutate(l)}
                />
              )}
            </div>
          </div>
        </>
      )}

      <RegistrarInvestimentoPainel
        aberto={registrar.aberto}
        aoFechar={() => setRegistrar({ aberto: false, campanha: null })}
        campanhas={d?.campanhas ?? []}
        campanhaInicial={registrar.campanha}
        aoSalvar={(v) => m.registrar.mutate(v)}
        aoNovaCampanha={() => {
          setRegistrar({ aberto: false, campanha: null });
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
