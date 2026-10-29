import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { AbasVendas } from "@/components/funil/AbasVendas";
import { FunilQuadro } from "@/components/funil/FunilQuadro";
import { FunilCarregando } from "@/components/funil/FunilCarregando";
import { NovoContatoPainel } from "@/components/funil/NovoContatoPainel";
import { ArquivarPainel } from "@/components/funil/ArquivarPainel";
import { MoverParaPainel } from "@/components/funil/MoverParaPainel";
import { ProximoPassoPainel } from "@/components/funil/ProximoPassoPainel";
import type { AcaoCartao } from "@/components/funil/FunilCartao";
import { useMutacoesFunil } from "@/components/funil/useMutacoesFunil";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { moeda, plural } from "@/lib/formatar";
import {
  chavesFunil,
  filtrosFunil,
  listarFunil,
  resumoFunil,
  type Etapa,
  type FiltroFunil,
  type Oportunidade,
} from "@/lib/funil";

const busca = z.object({
  filtro: z
    .enum(["todos", "novos", "adicionais", "vencidos", "este_mes", "fechados", "arquivados"])
    .optional()
    .catch(undefined),
});

/** "outubro" (nome do mês atual, para o número "Ganho em …"). */
const mesAtual = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());

export const Route = createFileRoute("/app/pipeline")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Vendas · Hub Fora do Papel" }] }),
  component: Funil,
});

function Funil() {
  const { filtro: filtroUrl } = Route.useSearch();
  const navigate = Route.useNavigate();
  const filtro: FiltroFunil = filtroUrl ?? "todos";
  const [novo, setNovo] = useState(false);
  const [mover, setMover] = useState<Oportunidade | null>(null);
  const [etapaSolta, setEtapaSolta] = useState<Etapa | null>(null);
  const [passo, setPasso] = useState<Oportunidade | null>(null);
  const [arquivar, setArquivar] = useState<Oportunidade | null>(null);
  const m = useMutacoesFunil();

  const lista = useQuery({
    queryKey: chavesFunil.lista(filtro),
    queryFn: () => listarFunil(filtro),
  });
  const resumo = useQuery({
    queryKey: chavesFunil.resumo(filtro),
    queryFn: () => resumoFunil(filtro),
  });

  function agir(acao: AcaoCartao, o: Oportunidade) {
    if (acao === "mover") {
      setEtapaSolta(null);
      setMover(o);
    }
    if (acao === "passo") setPasso(o);
    if (acao === "arquivar") setArquivar(o);
    if (acao === "desarquivar") m.desarquivar.mutate({ o });
  }

  const r = resumo.data;
  const irPara = (id: FiltroFunil) =>
    void navigate({
      search: { filtro: id === "todos" || id === filtro ? undefined : id },
      replace: true,
    });
  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Vendas"
        acao={
          <button type="button" className={classeAcaoPrincipal} onClick={() => setNovo(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nova oportunidade
          </button>
        }
        abas={<AbasVendas ativa="oportunidades" />}
      />

      {resumo.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os números"
          aoTentarDeNovo={() => void resumo.refetch()}
        />
      ) : (
        <FaixaNumeros
          itens={[
            {
              rotulo: "Em negociação",
              valor: r ? moeda(r.em_negociacao_cents) : "…",
              apoio: r ? plural(r.abertas, "oportunidade aberta", "oportunidades abertas") : "",
            },
            {
              rotulo: "Propostas sem resposta",
              valor: r ? r.propostas_sem_resposta : "…",
              apoio: "há mais de 3 dias",
              tom: r && r.propostas_sem_resposta > 0 ? "atencao" : undefined,
            },
            {
              rotulo: `Ganho em ${mesAtual}`,
              valor: r ? moeda(r.ganho_mes.soma_cents) : "…",
              apoio: r
                ? `${plural(r.ganho_mes.quantidade, "ganho", "ganhos")} · ${plural(r.perdidos_mes, "perdido", "perdidos")}`
                : "",
              aoClicar: () => irPara("fechados"),
              ativo: filtro === "fechados",
            },
            {
              rotulo: "Taxa de ganho",
              valor: r ? (r.taxa_ganho_90 == null ? "—" : `${r.taxa_ganho_90}%`) : "…",
              apoio: "nos últimos 90 dias",
            },
          ]}
        />
      )}

      <FiltrosChip
        rotulo="Filtrar oportunidades"
        opcoes={filtrosFunil.map((f) => ({
          id: f.id,
          rotulo: f.rotulo,
          cor: f.cor,
          contagem: r?.filtros[f.id],
        }))}
        ativo={filtro}
        aoEscolher={(id) => irPara(id)}
      />

      {lista.isPending ? (
        <FunilCarregando />
      ) : lista.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o funil"
          aoTentarDeNovo={() => void lista.refetch()}
        />
      ) : lista.data.length === 0 && filtro === "todos" ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-8">
          <h2 className="font-titulo text-xl font-bold">Nenhuma oportunidade aberta</h2>
          <p className="max-w-lg text-[15px] text-hub-suave">
            Os pedidos de horário do site entram aqui sozinhos. Contatos do WhatsApp, Instagram ou
            indicação você cria em "Nova oportunidade".
          </p>
          <button type="button" className={classeAcaoPrincipal} onClick={() => setNovo(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nova oportunidade
          </button>
        </div>
      ) : (
        <FunilQuadro
          itens={lista.data}
          resumo={r}
          arquivados={filtro === "arquivados"}
          fechados={filtro === "fechados"}
          aoAgir={agir}
          aoSoltar={(o, etapa) => {
            // Fechado à mão pede motivo; etapa aberta sem próximo passo pede o passo
            if (etapa === "fechado" || !o.next_step) {
              setEtapaSolta(etapa);
              setMover(o);
            } else m.mover.mutate({ o, etapa });
          }}
        />
      )}

      <NovoContatoPainel aberto={novo} aoMudar={setNovo} />
      <MoverParaPainel
        o={mover}
        etapaInicial={etapaSolta}
        aoFechar={() => setMover(null)}
        aoMover={(o, etapa, p, motivoFechar) =>
          m.mover.mutate({ o, etapa, passo: p, motivoFechar })
        }
      />
      <ProximoPassoPainel
        o={passo}
        aoFechar={() => setPasso(null)}
        aoSalvar={(o, p) =>
          m.atualizar.mutate({
            o,
            campos: { proximo_passo: p.texto, data: p.data, hora: p.hora || null },
          })
        }
      />
      <ArquivarPainel
        o={arquivar}
        aoFechar={() => setArquivar(null)}
        aoArquivar={(o, motivo, nota) => m.arquivar.mutate({ o, motivo, nota })}
      />
    </div>
  );
}
