import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Abas } from "@/components/hub/Abas";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { ClienteCabecalho } from "@/components/clientes/ClienteCabecalho";
import {
  ClienteOportunidade,
  type AcaoOportunidade,
} from "@/components/clientes/ClienteOportunidade";
import { ClienteContato } from "@/components/clientes/ClienteContato";
import { ClienteNumeros } from "@/components/clientes/ClienteNumeros";
import { ClientePropostas } from "@/components/clientes/ClientePropostas";
import { ClienteProjetos } from "@/components/clientes/ClienteProjetos";
import { ClienteAcessoPortal } from "@/components/clientes/ClienteAcessoPortal";
import { ClienteFinanceiro } from "@/components/clientes/ClienteFinanceiro";
import { ClienteAnotacoes } from "@/components/clientes/ClienteAnotacoes";
import { ClienteLinhaDoTempo } from "@/components/clientes/ClienteLinhaDoTempo";
import { ClienteReunioes } from "@/components/clientes/ClienteReunioes";
import { EditarClientePainel } from "@/components/clientes/EditarClientePainel";
import { ValorDiagnosticoPainel } from "@/components/clientes/ValorDiagnosticoPainel";
import { ArquivarPainel } from "@/components/funil/ArquivarPainel";
import { MoverParaPainel } from "@/components/funil/MoverParaPainel";
import { ProximoPassoPainel } from "@/components/funil/ProximoPassoPainel";
import { useMutacoesFunil } from "@/components/funil/useMutacoesFunil";
import {
  buscarCliente,
  buscarOportunidade,
  chavesClientes,
  linhaDoTempo,
  type Oportunidade,
} from "@/lib/funil";
import { chavesReunioes, listarReunioes } from "@/lib/reunioes";

const busca = z.object({ aba: z.enum(["visao", "linha", "reunioes"]).optional().catch(undefined) });

export const Route = createFileRoute("/app/clientes/$id")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Ficha do cliente · Hub Fora do Papel" }] }),
  component: Ficha,
});

function Ficha() {
  const { id } = Route.useParams();
  const { aba = "visao" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editar, setEditar] = useState(false);
  const [painel, setPainel] = useState<{ acao: AcaoOportunidade; o: Oportunidade } | null>(null);
  const m = useMutacoesFunil();

  const cliente = useQuery({
    queryKey: chavesClientes.ficha(id),
    queryFn: () => buscarCliente(id),
  });
  const dealId = cliente.data?.deal_id ?? null;
  const oportunidade = useQuery({
    queryKey: chavesClientes.oportunidade(dealId ?? "nenhuma"),
    queryFn: () => buscarOportunidade(dealId ?? ""),
    enabled: Boolean(dealId),
  });
  const linha = useQuery({ queryKey: chavesClientes.linha(id), queryFn: () => linhaDoTempo(id) });
  // Mesma consulta da aba Reuniões (fica em cache): mostra quantas há no rótulo da aba
  const reunioes = useQuery({
    queryKey: chavesReunioes.lista("todas", id),
    queryFn: () => listarReunioes("todas", id),
  });

  if (cliente.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <div className="h-16 w-80 animate-pulse rounded-xl bg-white" />
        <div className="h-64 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }
  if (cliente.isError) {
    return (
      <EstadoErro
        titulo="Não foi possível abrir a ficha"
        aoTentarDeNovo={() => void cliente.refetch()}
      />
    );
  }
  if (!cliente.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-titulo text-2xl font-bold">Ficha não encontrada</h1>
        <p className="text-hub-suave">Ela pode ter sido removida ou o endereço está errado.</p>
        <Link to="/app/clientes" className="font-medium text-[#1E3FA8] underline">
          Voltar para Clientes
        </Link>
      </div>
    );
  }

  const c = cliente.data;
  const o = oportunidade.data ?? null;
  function agir(acao: AcaoOportunidade) {
    if (!o) return;
    if (acao === "desarquivar") m.desarquivar.mutate({ o });
    else setPainel({ acao, o });
  }
  const abas = [
    { id: "visao" as const, rotulo: "Visão geral" },
    { id: "linha" as const, rotulo: "Linha do tempo", contagem: linha.data?.length },
    { id: "reunioes" as const, rotulo: "Reuniões", contagem: reunioes.data?.itens.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ClienteCabecalho
        c={c}
        aoEditar={() => setEditar(true)}
        abas={
          <Abas
            rotulo="Seções da ficha"
            opcoes={abas}
            ativa={aba}
            aoEscolher={(id) =>
              void navigate({ search: { aba: id === "visao" ? undefined : id }, replace: true })
            }
          />
        }
      />

      <ClienteNumeros c={c} o={o} />

      {aba === "reunioes" ? (
        <ClienteReunioes clienteId={c.id} />
      ) : aba === "linha" ? (
        linha.isError ? (
          <EstadoErro
            titulo="Não foi possível carregar a linha do tempo"
            aoTentarDeNovo={() => void linha.refetch()}
          />
        ) : linha.isPending ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />
        ) : (
          <ClienteLinhaDoTempo itens={linha.data} />
        )
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            {dealId ? (
              o ? (
                <ClienteOportunidade o={o} aoAgir={agir} />
              ) : oportunidade.isError ? (
                <EstadoErro
                  titulo="Não foi possível carregar a oportunidade"
                  aoTentarDeNovo={() => void oportunidade.refetch()}
                />
              ) : (
                <div className="h-64 animate-pulse rounded-2xl bg-white" />
              )
            ) : (
              <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
                Esta ficha ainda não tem oportunidade no funil.
              </p>
            )}
            <ClienteProjetos clienteId={c.id} />
            <ClientePropostas clienteId={c.id} />
          </div>
          <div className="flex flex-col gap-4">
            <ClienteContato c={c} aoEditar={() => setEditar(true)} />
            <ClienteFinanceiro clienteId={c.id} />
            <Link
              to="/app/materiais"
              search={{ cliente: c.id }}
              className="flex min-h-11 items-center justify-between rounded-2xl border border-hub-borda bg-white px-5 py-3 text-[15px] font-medium hover:bg-hub-fundo"
            >
              Materiais deste cliente <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/app/pedidos"
              search={{ cliente: c.id }}
              className="flex min-h-11 items-center justify-between rounded-2xl border border-hub-borda bg-white px-5 py-3 text-[15px] font-medium hover:bg-hub-fundo"
            >
              Pedidos deste cliente <span aria-hidden="true">→</span>
            </Link>
            <ClienteAcessoPortal
              clienteId={c.id}
              emailSugerido={c.email}
              whatsapp={c.whatsapp}
              contato={c.contact_name}
              empresa={c.company_name}
            />
            <ClienteAnotacoes clienteId={c.id} linha={linha.data} />
          </div>
        </div>
      )}

      <EditarClientePainel c={c} aberto={editar} aoMudar={setEditar} />
      <MoverParaPainel
        o={painel?.acao === "mover" ? painel.o : null}
        aoFechar={() => setPainel(null)}
        aoMover={(op, etapa, passo) => m.mover.mutate({ o: op, etapa, passo })}
      />
      <ProximoPassoPainel
        o={painel?.acao === "passo" ? painel.o : null}
        aoFechar={() => setPainel(null)}
        aoSalvar={(op, p) =>
          m.atualizar.mutate({
            o: op,
            campos: { proximo_passo: p.texto, data: p.data, hora: p.hora || null },
          })
        }
      />
      <ValorDiagnosticoPainel
        o={painel?.acao === "valor" ? painel.o : null}
        aoFechar={() => setPainel(null)}
        aoSalvar={(op, campos) => m.atualizar.mutate({ o: op, campos })}
      />
      <ArquivarPainel
        o={painel?.acao === "arquivar" ? painel.o : null}
        aoFechar={() => setPainel(null)}
        aoArquivar={(op, motivo, nota) => m.arquivar.mutate({ o: op, motivo, nota })}
      />
    </div>
  );
}
