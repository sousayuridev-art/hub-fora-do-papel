import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { FunilQuadro } from "@/components/funil/FunilQuadro";
import { FunilCarregando } from "@/components/funil/FunilCarregando";
import { NovoContatoPainel } from "@/components/funil/NovoContatoPainel";
import { ArquivarPainel } from "@/components/funil/ArquivarPainel";
import { MoverParaPainel } from "@/components/funil/MoverParaPainel";
import { ProximoPassoPainel } from "@/components/funil/ProximoPassoPainel";
import type { AcaoCartao } from "@/components/funil/FunilCartao";
import { useMutacoesFunil } from "@/components/funil/useMutacoesFunil";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { moeda } from "@/lib/formatar";
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
  filtro: z.enum(["todos", "este_mes", "vencidos", "arquivados"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/pipeline")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Funil de vendas · Hub Fora do Papel" }] }),
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
  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Funil de vendas"
        resumo={
          r ? (
            <>
              <strong className="font-semibold text-hub-tinta">{r.ativos} contatos ativos</strong> ·{" "}
              <strong className="font-semibold text-hub-tinta">
                {moeda(r.em_negociacao_cents)}
              </strong>{" "}
              em diagnósticos e propostas
            </>
          ) : (
            <span className="inline-block h-5 w-72 animate-pulse rounded bg-[#E4E4DF]" />
          )
        }
        acao={
          <button type="button" className={classeAcaoPrincipal} onClick={() => setNovo(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Novo contato
          </button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FiltrosChip
          rotulo="Filtrar oportunidades"
          opcoes={filtrosFunil.map((f) => ({
            id: f.id,
            rotulo: f.rotulo,
            contagem: r?.filtros[f.id],
          }))}
          ativo={filtro}
          aoEscolher={(id) =>
            void navigate({
              search: { filtro: id === "todos" ? undefined : (id as FiltroFunil) },
              replace: true,
            })
          }
        />
        <ul
          className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-hub-suave"
          aria-label="Legenda"
        >
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sit-risco-t" aria-hidden="true" /> Passo vencido
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#E08A00]" aria-hidden="true" /> Para hoje
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sit-ok-t" aria-hidden="true" /> Diagnóstico pago
          </li>
        </ul>
      </div>

      {lista.isPending ? (
        <FunilCarregando />
      ) : lista.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o funil"
          aoTentarDeNovo={() => void lista.refetch()}
        />
      ) : lista.data.length === 0 && filtro === "todos" ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-8">
          <h2 className="font-titulo text-xl font-bold">O funil está vazio</h2>
          <p className="max-w-lg text-[15px] text-hub-suave">
            Os pedidos de horário do site entram aqui sozinhos. Contatos do WhatsApp, Instagram ou
            indicação você cria em "Novo contato".
          </p>
          <button type="button" className={classeAcaoPrincipal} onClick={() => setNovo(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Novo contato
          </button>
        </div>
      ) : (
        <FunilQuadro
          itens={lista.data}
          resumo={r}
          arquivados={filtro === "arquivados"}
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
