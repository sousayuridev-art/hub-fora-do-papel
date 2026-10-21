import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { ReuniaoPainel } from "@/components/reunioes/ReuniaoPainel";
import { ReunioesLista } from "@/components/reunioes/ReunioesLista";
import { chavesReunioes, listarReunioes, type FiltroReunioes, type Reuniao } from "@/lib/reunioes";

const busca = z.object({
  filtro: z.enum(["todas", "sem_cliente", "sem_transcricao"]).optional().catch(undefined),
});

export const Route = createFileRoute("/app/reunioes")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Reuniões · Hub Fora do Papel" }] }),
  component: Reunioes,
});

/** Hub › Reuniões (card RE-1): reuniões do Meet com transcrição, ligadas aos clientes. */
function Reunioes() {
  const { filtro = "todas" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [aberta, setAberta] = useState<Reuniao | null>(null);
  const lista = useQuery({
    queryKey: chavesReunioes.lista(filtro, null),
    queryFn: () => listarReunioes(filtro, null),
  });

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Reuniões"
        resumo="Reuniões do Google Meet com transcrição. Entram sozinhas a cada 15 minutos e se ligam ao cliente pelo e-mail dos convidados."
      />
      <FiltrosChip<FiltroReunioes>
        rotulo="Filtrar reuniões"
        ativo={filtro}
        aoEscolher={(f) =>
          void navigate({ search: { filtro: f === "todas" ? undefined : f }, replace: true })
        }
        opcoes={[
          { id: "todas", rotulo: "Todas" },
          { id: "sem_cliente", rotulo: "Sem cliente", contagem: lista.data?.sem_cliente },
          {
            id: "sem_transcricao",
            rotulo: "Sem transcrição",
            contagem: lista.data?.sem_transcricao,
          },
        ]}
      />
      {lista.isPending ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : lista.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar as reuniões"
          aoTentarDeNovo={() => void lista.refetch()}
        />
      ) : lista.data.itens.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {filtro === "todas" ? (
            <>
              <p>
                Nenhuma reunião ainda. Elas aparecem aqui depois que o Google estiver ligado e a
                reunião tiver transcrição.
              </p>
              <Link to="/app/configuracoes" className="font-medium text-[#1E3FA8] underline">
                Ver a ligação com o Google
              </Link>
            </>
          ) : (
            <p>Nada por aqui.</p>
          )}
        </div>
      ) : (
        <ReunioesLista itens={lista.data.itens} aoAbrir={setAberta} />
      )}
      <ReuniaoPainel reuniao={aberta} aoFechar={() => setAberta(null)} />
    </div>
  );
}
