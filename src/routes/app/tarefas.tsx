import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Abas } from "@/components/hub/Abas";
import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosPainel } from "@/components/tarefas/FiltrosPainel";
import { FiltrosTarefas } from "@/components/tarefas/FiltrosTarefas";
import { KanbanTarefas } from "@/components/tarefas/KanbanTarefas";
import { NovaTarefaCentralPainel } from "@/components/tarefas/NovaTarefaCentralPainel";
import { NovaTarefaRapida } from "@/components/tarefas/NovaTarefaRapida";
import { Segmentos } from "@/components/tarefas/Segmentos";
import { TarefaPainel } from "@/components/tarefas/TarefaPainel";
import { TarefasLista } from "@/components/tarefas/TarefasLista";
import { naoRemovida, useMutacoesTarefa } from "@/components/tarefas/useMutacoesTarefa";
import { useProjetosAtivos } from "@/components/tarefas/useProjetosAtivos";
import { useIsMobile } from "@/hooks/use-mobile";
import { classeAcaoPrincipal } from "@/lib/estilos";
import type { TipoTarefa } from "@/lib/projetos";
import {
  buscaTarefas,
  chavesTarefas,
  filtrosDaBusca,
  filtrosDoResumo,
  listarTarefas,
  opcoesDosFiltros,
  resumoTarefas,
  tarefaProvisoria,
  type BuscaTarefas,
  type NovaTarefa,
  type ProjetoOpcao,
  type TarefaVista,
  buscarTarefa,
} from "@/lib/tarefas";

export const Route = createFileRoute("/app/tarefas")({
  validateSearch: buscaTarefas,
  head: () => ({ meta: [{ title: "Tarefas · Hub Fora do Papel" }] }),
  component: Tarefas,
});

type AbaTipo = "todas" | TipoTarefa;

/** Central de Tarefas (TA-3): as tarefas de todos os projetos e as internas, num lugar só. */
function Tarefas() {
  const busca = Route.useSearch();
  const navigate = Route.useNavigate();
  const celular = useIsMobile();
  const vista = celular ? "lista" : (busca.vista ?? "lista");
  // Filtros e abas trocam o endereço sem encher o histórico; abrir ou fechar uma tarefa cria
  // entrada, para "Voltar" fechar o painel em vez de sair da Central.
  const mudar = (p: Partial<BuscaTarefas>) =>
    void navigate({ search: (s) => ({ ...s, ...p }), replace: !("tarefa" in p) });

  const filtros = filtrosDaBusca(busca);
  const lista = useQuery({
    queryKey: chavesTarefas.lista(filtros),
    queryFn: () => listarTarefas(filtros),
    placeholderData: keepPreviousData,
  });
  const fResumo = filtrosDoResumo(busca, true);
  const resumo = useQuery({
    queryKey: chavesTarefas.resumo(fResumo),
    queryFn: () => resumoTarefas(fResumo),
  });
  const fAbas = filtrosDoResumo(busca, false);
  const resumoAbas = useQuery({
    queryKey: chavesTarefas.resumo(fAbas),
    queryFn: () => resumoTarefas(fAbas),
  });
  const projetos = useProjetosAtivos();
  const m = useMutacoesTarefa();
  const [novaAberta, setNovaAberta] = useState(false);
  const [filtrosCel, setFiltrosCel] = useState(false);

  const hoje = lista.data?.hoje ?? resumo.data?.hoje ?? "";
  const itens = useMemo(() => (lista.data?.itens ?? []).filter(naoRemovida), [lista.data]);
  const opcoes = useMemo(() => opcoesDosFiltros(projetos, itens, busca), [projetos, itens, busca]);
  const naLista = busca.tarefa ? (itens.find((t) => t.id === busca.tarefa) ?? null) : null;
  // Tarefa aberta que saiu do filtro (ex.: mudou o prazo com "Atrasadas" ativo) ou que a lista
  // não traz (pronta antiga, projeto encerrado): o painel continua aberto, lendo pelo id.
  const sozinha = useQuery({
    queryKey: chavesTarefas.uma(busca.tarefa ?? ""),
    queryFn: () => buscarTarefa(busca.tarefa ?? ""),
    enabled: !!busca.tarefa && !naLista && lista.isSuccess,
  });
  const aberta = naLista ?? (busca.tarefa ? (sozinha.data ?? null) : null);
  const abrir = (t: TarefaVista) => mudar({ tarefa: t.id });

  function criar(v: NovaTarefa, p: ProjetoOpcao | null) {
    m.criar.mutate(hoje ? { ...v, vista: tarefaProvisoria(v, p, hoje) } : v);
  }

  const ra = resumoAbas.data;
  const r = resumo.data;
  const tipoAtivo: AbaTipo = busca.tipo ?? "todas";

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Tarefas"
        resumo={
          r
            ? r.atrasadas + r.para_hoje === 0
              ? "Nada atrasado nem para hoje."
              : [
                  r.atrasadas
                    ? `${r.atrasadas} ${r.atrasadas === 1 ? "atrasada" : "atrasadas"}`
                    : null,
                  r.para_hoje ? `${r.para_hoje} para hoje` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
            : " "
        }
        acao={
          <>
            <Segmentos
              rotulo="Vista"
              valor={vista}
              opcoes={[
                { id: "lista", rotulo: "Lista" },
                { id: "kanban", rotulo: "Kanban" },
              ]}
              aoEscolher={(v) => mudar({ vista: v === "lista" ? undefined : v })}
              className="hidden w-44 md:flex"
            />
            <button
              type="button"
              className={classeAcaoPrincipal}
              onClick={() => setNovaAberta(true)}
            >
              <Plus className="size-4" aria-hidden="true" /> Nova tarefa
            </button>
          </>
        }
        abas={
          <Abas<AbaTipo>
            rotulo="Tipo de tarefa"
            ativa={tipoAtivo}
            aoEscolher={(id) => mudar({ tipo: id === "todas" ? undefined : id })}
            opcoes={[
              { id: "todas", rotulo: "Todas", contagem: ra?.abertas },
              { id: "cliente", rotulo: "Clientes", contagem: ra?.cliente },
              { id: "interna", rotulo: "Internas", contagem: ra?.interna },
              { id: "hub", rotulo: "Hub", contagem: ra?.hub },
            ]}
          />
        }
      />

      <FiltrosTarefas
        busca={busca}
        resumo={r}
        opcoes={opcoes}
        aoMudar={mudar}
        aoAbrirFiltrosCel={() => setFiltrosCel(true)}
      />

      {vista === "lista" && hoje && (
        <div className="hidden md:block">
          <NovaTarefaRapida
            hoje={hoje}
            projetos={projetos}
            projetoPadrao={busca.projeto}
            tipoPadrao={busca.tipo === "hub" ? "hub" : undefined}
            aoCriar={criar}
          />
        </div>
      )}

      {lista.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar as tarefas"
          aoTentarDeNovo={() => void lista.refetch()}
        />
      ) : !lista.data ? (
        <div className="h-80 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {Object.keys(filtros).length > 0
            ? "Nenhuma tarefa com esses filtros."
            : "Nenhuma tarefa ainda. Escreva acima e aperte Enter: sem projeto, ela entra como interna."}
        </p>
      ) : vista === "kanban" ? (
        <KanbanTarefas
          itens={itens}
          hoje={hoje}
          resumo={r}
          aoAbrir={abrir}
          aoMover={(t, s) => m.mover.mutate({ id: t.id, situacao: s })}
          aoRemover={(t) => m.remover(t)}
        />
      ) : (
        <TarefasLista itens={itens} hoje={hoje} aoAbrir={abrir} aoConcluir={m.alternarPronta} />
      )}

      <TarefaPainel tarefa={aberta} hoje={hoje} aoFechar={() => mudar({ tarefa: undefined })} />
      <NovaTarefaCentralPainel
        aberto={novaAberta}
        aoMudar={setNovaAberta}
        projetos={projetos}
        projetoPadrao={busca.projeto}
        tipoPadrao={busca.tipo === "hub" ? "hub" : undefined}
        aoCriar={criar}
      />
      <FiltrosPainel
        aberto={filtrosCel}
        aoMudarAberto={setFiltrosCel}
        busca={busca}
        opcoes={opcoes}
        aoMudar={mudar}
      />
    </div>
  );
}
