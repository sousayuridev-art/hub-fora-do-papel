import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { GoogleCabecalho } from "@/components/reunioes/GoogleCabecalho";
import { LigarReunioes } from "@/components/reunioes/LigarReunioes";
import { ReuniaoPainel } from "@/components/reunioes/ReuniaoPainel";
import { ReunioesLista } from "@/components/reunioes/ReunioesLista";
import { buscarReunioes, chavesReunioes, type FiltroReunioes, type Reuniao } from "@/lib/reunioes";
import { classeAcaoTexto } from "@/lib/estilos";

const busca = z.object({
  filtro: z.enum(["todas", "sem_cliente", "sem_transcricao"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/reunioes")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Reuniões · Hub Fora do Papel" }] }),
  component: Reunioes,
});

/** Hub › Reuniões (cards RE-1 e RD-4): reuniões do Meet com transcrição, ligadas aos clientes. */
function Reunioes() {
  const { filtro = "todas" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [aberta, setAberta] = useState<Reuniao | null>(null);
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
    void navigate({ search: { filtro: f === "todas" ? undefined : f }, replace: true });

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina grupo="Vender" titulo="Reuniões" acao={<GoogleCabecalho />} />

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
      <ReuniaoPainel reuniao={aberta} aoFechar={() => setAberta(null)} />
    </div>
  );
}
