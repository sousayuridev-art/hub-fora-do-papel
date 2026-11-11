import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarPlus, Search } from "lucide-react";
import { z } from "zod";

import { Abas } from "@/components/hub/Abas";
import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { AgendaEventoPainel } from "@/components/reunioes/AgendaEventoPainel";
import { AgendaSemana } from "@/components/reunioes/AgendaSemana";
import { MarcarReuniaoPainel } from "@/components/reunioes/MarcarReuniaoPainel";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { GoogleCabecalho } from "@/components/reunioes/GoogleCabecalho";
import { LigarReunioes } from "@/components/reunioes/LigarReunioes";
import { ReuniaoPainel } from "@/components/reunioes/ReuniaoPainel";
import { ReunioesLista } from "@/components/reunioes/ReunioesLista";
import {
  carregarSemana,
  chavesAgenda,
  dataIso,
  deDataIso,
  mensagemDaAgenda,
  segundaDa,
  semanaParaAbrir,
  type EventoAgenda,
} from "@/lib/agenda";
import { buscarReunioes, chavesReunioes, type FiltroReunioes, type Reuniao } from "@/lib/reunioes";
import { classeAcaoPrincipal, classeAcaoTexto } from "@/lib/estilos";

const busca = z.object({
  aba: z.enum(["agenda", "gravacoes"]).optional().catch(undefined),
  semana: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  filtro: z.enum(["todas", "sem_cliente", "sem_transcricao"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/reunioes")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Reuniões · Hub Fora do Papel" }] }),
  component: Reunioes,
});

/**
 * Hub › Reuniões. Aba Agenda (card RD2-3): semana de segunda a sexta da Google Agenda, com o
 * contexto do Hub em cada reunião. Aba Gravações (cards RE-1 e RD-4): reuniões do Meet com
 * transcrição, ligadas aos clientes.
 */
function Reunioes() {
  const { aba = "agenda", semana } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [aberta, setAberta] = useState<Reuniao | null>(null);
  const [marcar, setMarcar] = useState(false);
  const acaoMarcar = (
    <button type="button" className={classeAcaoPrincipal} onClick={() => setMarcar(true)}>
      <CalendarPlus className="size-4" aria-hidden="true" />
      Marcar reunião
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        grupo="Vender"
        titulo="Reuniões"
        acao={<GoogleCabecalho acao={acaoMarcar} />}
        abas={
          <Abas
            rotulo="Reuniões"
            ativa={aba}
            opcoes={[
              { id: "agenda", rotulo: "Agenda" },
              { id: "gravacoes", rotulo: "Gravações" },
            ]}
            aoEscolher={(id) =>
              void navigate({
                search: (s) => ({ ...s, aba: id === "agenda" ? undefined : id }),
                replace: true,
              })
            }
          />
        }
      />
      {aba === "agenda" ? (
        <Agenda semana={semana} aoVerGravacao={setAberta} aoMarcar={() => setMarcar(true)} />
      ) : (
        <Gravacoes aoAbrir={setAberta} />
      )}
      <ReuniaoPainel reuniao={aberta} aoFechar={() => setAberta(null)} />
      <MarcarReuniaoPainel aberto={marcar} aoMudar={setMarcar} />
    </div>
  );
}

/** Aba Agenda: semana na grade e o painel da reunião clicada. */
function Agenda({
  semana,
  aoVerGravacao,
  aoMarcar,
}: {
  semana: string | undefined;
  aoVerGravacao: (r: Reuniao) => void;
  aoMarcar: () => void;
}) {
  const navigate = Route.useNavigate();
  const segunda = useMemo(() => {
    const pedida = deDataIso(semana);
    return pedida ? segundaDa(pedida) : semanaParaAbrir(new Date());
  }, [semana]);
  const chave = dataIso(segunda);
  const [evento, setEvento] = useState<EventoAgenda | null>(null);
  const q = useQuery({
    queryKey: chavesAgenda.semana(chave),
    queryFn: () => carregarSemana(segunda),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const mudarSemana = (passo: -1 | 0 | 1) => {
    const alvo = passo === 0 ? semanaParaAbrir(new Date()) : new Date(segunda);
    if (passo !== 0) alvo.setDate(alvo.getDate() + passo * 7);
    const hoje = dataIso(semanaParaAbrir(new Date()));
    void navigate({
      search: (s) => ({ ...s, semana: dataIso(alvo) === hoje ? undefined : dataIso(alvo) }),
      replace: true,
    });
  };

  if (q.isError) {
    return (
      <EstadoErro
        titulo="Não foi possível ler a Google Agenda"
        mensagem={mensagemDaAgenda(q.error)}
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  }
  if (q.data && !q.data.ligada) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-[#C3CAD3] bg-white p-6 text-[15px] text-hub-suave">
        <p>Ligue o Google para ver aqui a sua semana e marcar reuniões com link do Meet.</p>
        <Link to="/app/configuracoes" className={classeAcaoTexto}>
          Ligar ao Google ›
        </Link>
      </div>
    );
  }
  if (!q.data)
    return <div className="h-[560px] animate-pulse rounded-2xl bg-white" aria-busy="true" />;

  const ligacao = evento ? q.data.ligacoes[evento.id] : undefined;
  return (
    <>
      <AgendaSemana
        segunda={segunda}
        eventos={q.data.eventos}
        ligacoes={q.data.ligacoes}
        carregando={q.isFetching}
        aoAbrir={setEvento}
        aoMudarSemana={mudarSemana}
        aoMarcar={aoMarcar}
      />
      <AgendaEventoPainel
        evento={evento}
        ligacao={ligacao}
        aoFechar={() => setEvento(null)}
        aoVerGravacao={(e, l) => {
          if (!l.reuniao_id) return;
          setEvento(null);
          aoVerGravacao({
            id: l.reuniao_id,
            titulo: e.titulo,
            inicio: e.inicio,
            fim: e.fim,
            situacao: l.reuniao_situacao ?? "transcrita",
            codigo: null,
            convidados: e.convidados.length,
            vinculo: null,
            cliente: l.cliente ? { id: l.cliente.id, nome: l.cliente.nome } : null,
            deal_id: l.deal?.id ?? null,
            projeto: null,
          });
        }}
      />
    </>
  );
}

/** Aba Gravações: a tela de antes (busca, filtros, ligar reuniões a clientes). */
function Gravacoes({ aoAbrir: setAberta }: { aoAbrir: (r: Reuniao) => void }) {
  const { filtro = "todas" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [texto, setTexto] = useState("");
  const [termo, setTermo] = useState("");

  // A busca roda no banco: espera a pessoa parar de digitar
  useEffect(() => {
    const t = window.setTimeout(() => setTermo(texto.trim()), 300);
    return () => window.clearTimeout(t);
  }, [texto]);

  const lista = useQuery({
    queryKey: chavesReunioes.busca(filtro, termo),
    queryFn: () => buscarReunioes(filtro, termo),
    placeholderData: keepPreviousData,
  });
  const escolherFiltro = (f: FiltroReunioes) =>
    void navigate({
      search: (s) => ({ ...s, filtro: f === "todas" ? undefined : f }),
      replace: true,
    });

  return (
    <div className="flex flex-col gap-5">
      <LigarReunioes aoEscolher={setAberta} aoVerTodas={() => escolherFiltro("sem_cliente")} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1 lg:max-w-sm">
          <span className="sr-only">Buscar por título, cliente ou trecho falado</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hub-suave"
            aria-hidden="true"
          />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar título, cliente ou trecho falado"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={100}
            className="h-11 w-full rounded-xl border border-[#DADAD3] bg-white pl-9 pr-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
          />
        </label>
        <FiltrosChip<FiltroReunioes>
          rotulo="Filtrar reuniões"
          ativo={filtro}
          aoEscolher={escolherFiltro}
          opcoes={[
            { id: "todas", rotulo: "Todas", contagem: lista.data?.todas },
            { id: "sem_cliente", rotulo: "Sem cliente", contagem: lista.data?.sem_cliente },
            {
              id: "sem_transcricao",
              rotulo: "Sem transcrição",
              contagem: lista.data?.sem_transcricao,
            },
          ]}
        />
      </div>

      {lista.isPending ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : lista.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar as reuniões"
          aoTentarDeNovo={() => void lista.refetch()}
        />
      ) : lista.data.itens.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {termo ? (
            <p>Nada encontrado para “{termo}”.</p>
          ) : filtro === "todas" ? (
            <>
              <p>
                Nenhuma reunião ainda. Elas aparecem aqui depois que o Google estiver ligado e a
                reunião tiver transcrição.
              </p>
              <Link to="/app/configuracoes" className={classeAcaoTexto}>
                Ver a ligação com o Google ›
              </Link>
            </>
          ) : (
            <p>Nada por aqui.</p>
          )}
        </div>
      ) : (
        <div aria-busy={lista.isFetching} className={lista.isPlaceholderData ? "opacity-70" : ""}>
          <ReunioesLista
            itens={lista.data.itens}
            semanas={lista.data.semanas}
            aoAbrir={setAberta}
          />
        </div>
      )}
    </div>
  );
}
