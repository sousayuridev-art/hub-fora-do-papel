import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { ListaLateral } from "@/components/propostas/ListaLateral";
import { NovaPropostaPainel } from "@/components/propostas/NovaPropostaPainel";
import { PropostaEditor } from "@/components/propostas/PropostaEditor";
import { PropostasNumeros } from "@/components/propostas/PropostasNumeros";
import { PropostasQuadro } from "@/components/propostas/PropostasQuadro";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import {
  chavesPropostas,
  detalheProposta,
  quadroPropostas,
  resumoPropostas,
  type AbaPropostas,
} from "@/lib/propostas";

const busca = z.object({
  id: z.string().uuid().optional().catch(undefined),
  aba: z.enum(["rascunho", "enviada", "aceita", "recusada"]).optional().catch(undefined),
  filtro: z.enum(["sem_abrir"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/propostas")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Propostas · Hub Fora do Papel" }] }),
  component: Propostas,
});

/** Lista ao lado do editor: aberta em telas largas; a escolha de quem usa fica guardada. */
const CHAVE_LISTA = "hub:propostas:lista-recolhida";
function listaRecolhidaInicial(): boolean {
  try {
    const salvo = window.localStorage.getItem(CHAVE_LISTA);
    if (salvo !== null) return salvo === "1";
  } catch {
    // Sem armazenamento (janela privada): segue a largura da tela
  }
  return !window.matchMedia("(min-width: 1536px)").matches;
}

/**
 * Propostas (card RD-5). Sem proposta aberta: números do topo e quadro em colunas.
 * Com proposta aberta (?id=): editor em largura total, com a lista recolhível à esquerda.
 */
function Propostas() {
  const { id, aba: abaUrl, filtro } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [nova, setNova] = useState(false);
  const [recolhida, setRecolhida] = useState(listaRecolhidaInicial);

  const quadro = useQuery({ queryKey: chavesPropostas.quadro, queryFn: quadroPropostas });
  const resumo = useQuery({ queryKey: chavesPropostas.resumo, queryFn: resumoPropostas });
  const detalhe = useQuery({
    queryKey: chavesPropostas.detalhe(id ?? ""),
    queryFn: () => detalheProposta(id ?? ""),
    enabled: Boolean(id),
  });

  const selecionada = quadro.data?.find((p) => p.id === id);
  const aba: AbaPropostas = abaUrl ?? selecionada?.status ?? "rascunho";
  const semAbrir = filtro === "sem_abrir";

  const alternarLista = () =>
    setRecolhida((atual) => {
      try {
        window.localStorage.setItem(CHAVE_LISTA, atual ? "0" : "1");
      } catch {
        // Preferência só nesta visita
      }
      return !atual;
    });

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Propostas"
        acao={
          <button
            type="button"
            className={id ? classeBotaoSecundario : classeAcaoPrincipal}
            onClick={() => setNova(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            Nova proposta
          </button>
        }
      />

      {!id ? (
        <>
          {resumo.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar os números"
              aoTentarDeNovo={() => void resumo.refetch()}
            />
          ) : (
            <PropostasNumeros
              r={resumo.data}
              filtroSemAbrir={semAbrir}
              aoFiltrarSemAbrir={() =>
                void navigate({
                  search: (s) => ({ ...s, filtro: semAbrir ? undefined : "sem_abrir" }),
                })
              }
            />
          )}
          {quadro.isPending ? (
            <div className="grid gap-4 md:grid-cols-4" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : quadro.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar as propostas"
              aoTentarDeNovo={() => void quadro.refetch()}
            />
          ) : (
            <PropostasQuadro
              cartoes={quadro.data}
              r={resumo.data}
              filtroSemAbrir={semAbrir}
              aoLimparFiltro={() => void navigate({ search: (s) => ({ ...s, filtro: undefined }) })}
            />
          )}
        </>
      ) : (
        <div className="flex items-start gap-4">
          <ListaLateral
            cartoes={quadro.data ?? []}
            carregando={quadro.isPending}
            falhou={quadro.isError}
            aoTentarDeNovo={() => void quadro.refetch()}
            r={resumo.data}
            aba={aba}
            aoEscolherAba={(novaAba) => void navigate({ search: (s) => ({ ...s, aba: novaAba }) })}
            selecionada={id}
            recolhida={recolhida}
            aoAlternar={alternarLista}
          />
          <div className="@container min-w-0 flex-1">
            {detalhe.isPending ? (
              <div className="grid gap-4 @min-[960px]:grid-cols-[1fr_340px]" aria-busy="true">
                <div className="h-[600px] animate-pulse rounded-2xl bg-white" />
                <div className="h-80 animate-pulse rounded-2xl bg-white" />
              </div>
            ) : detalhe.isError ? (
              <EstadoErro
                titulo="Não foi possível abrir a proposta"
                aoTentarDeNovo={() => void detalhe.refetch()}
              />
            ) : (
              <PropostaEditor key={detalhe.data.proposta.id} detalhe={detalhe.data} />
            )}
          </div>
        </div>
      )}

      <NovaPropostaPainel aberto={nova} aoMudar={setNova} propostas={quadro.data ?? []} />
    </div>
  );
}
