import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, SlidersHorizontal } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { NovaPropostaPainel } from "@/components/propostas/NovaPropostaPainel";
import { PropostaEditor } from "@/components/propostas/PropostaEditor";
import { PropostasLista } from "@/components/propostas/PropostasLista";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { moeda } from "@/lib/formatar";
import {
  abasPropostas,
  chavesPropostas,
  detalheProposta,
  listarPropostas,
  resumoPropostas,
  type AbaPropostas,
} from "@/lib/propostas";
import { cn } from "@/lib/utils";

const busca = z.object({
  id: z.string().uuid().optional().catch(undefined),
  aba: z.enum(["rascunho", "enviada", "aceita", "recusada"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/propostas")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Propostas · Hub Fora do Papel" }] }),
  component: Propostas,
});

function Propostas() {
  const { id, aba: abaUrl } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [nova, setNova] = useState(false);

  const lista = useQuery({ queryKey: chavesPropostas.lista, queryFn: listarPropostas });
  const resumo = useQuery({ queryKey: chavesPropostas.resumo, queryFn: resumoPropostas });
  const detalhe = useQuery({
    queryKey: chavesPropostas.detalhe(id ?? ""),
    queryFn: () => detalheProposta(id ?? ""),
    enabled: Boolean(id),
  });

  const selecionada = lista.data?.find((p) => p.id === id);
  const aba: AbaPropostas = abaUrl ?? selecionada?.status ?? "rascunho";
  const daAba = (lista.data ?? []).filter((p) => p.status === aba);
  const r = resumo.data;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Propostas"
        resumo={
          r ? (
            <>
              {r.enviada} {r.enviada === 1 ? "enviada" : "enviadas"} e {r.rascunho}{" "}
              {r.rascunho === 1 ? "rascunho" : "rascunhos"} ·{" "}
              <strong className="font-semibold text-hub-tinta">
                {moeda(r.em_negociacao_cents)}
              </strong>{" "}
              em negociação · {r.aceitas_no_ano} {r.aceitas_no_ano === 1 ? "aceita" : "aceitas"}{" "}
              neste ano
            </>
          ) : (
            <span className="inline-block h-5 w-72 animate-pulse rounded bg-[#E4E4DF]" />
          )
        }
        acao={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/app/configuracoes" className={classeBotaoSecundario}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Preços
            </Link>
            <button type="button" className={classeAcaoPrincipal} onClick={() => setNova(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Nova proposta
            </button>
          </div>
        }
      />

      <div
        className={cn(
          "grid gap-4",
          id ? "2xl:grid-cols-[280px_minmax(0,1fr)]" : "lg:grid-cols-[280px_minmax(0,1fr)]",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-3 lg:sticky lg:top-6 lg:self-start",
            id && "max-2xl:hidden",
          )}
        >
          <FiltrosChip
            rotulo="Situação das propostas"
            opcoes={abasPropostas.map((a) => ({ id: a.id, rotulo: a.rotulo, contagem: r?.[a.id] }))}
            ativo={aba}
            aoEscolher={(novaAba) => void navigate({ search: (s) => ({ ...s, aba: novaAba }) })}
          />
          {lista.isPending ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-hub-fundo" />
              ))}
            </div>
          ) : lista.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar"
              aoTentarDeNovo={() => void lista.refetch()}
            />
          ) : daAba.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14px] text-hub-suave">
              {aba === "rascunho"
                ? 'Nenhum rascunho. Comece em "Nova proposta" ou pela ficha do cliente.'
                : aba === "recusada"
                  ? "Nenhuma proposta recusada. Quando acontecer, o motivo aparece aqui."
                  : aba === "aceita"
                    ? "Nenhuma proposta aceita ainda."
                    : "Nenhuma proposta enviada."}
            </p>
          ) : (
            <PropostasLista itens={daAba} selecionada={id} />
          )}
          <p className="border-t border-hub-borda px-1 pt-3 text-[13px] text-hub-suave">
            O valor vem de Configurações › Preços. O que já foi enviado mantém o valor combinado.
          </p>
        </div>

        <div className={cn("min-w-0", !id && "max-lg:hidden")}>
          {!id ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-8">
              <FileText className="size-8 text-hub-suave" aria-hidden="true" />
              <h2 className="font-titulo text-xl font-bold">Escolha uma proposta</h2>
              <p className="max-w-lg text-[15px] text-hub-suave">
                Abra uma da lista ou crie uma nova a partir de uma oportunidade do funil. O valor é
                calculado pelas regras de preço e o cliente aceita pelo link.
              </p>
              <button type="button" className={classeAcaoPrincipal} onClick={() => setNova(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Nova proposta
              </button>
            </div>
          ) : detalhe.isPending ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_340px]" aria-busy="true">
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

      <NovaPropostaPainel aberto={nova} aoMudar={setNova} propostas={lista.data ?? []} />
    </div>
  );
}
