import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Abas } from "@/components/hub/Abas";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { ContatoPainel } from "@/components/portal/contatos/ContatoPainel";
import { ContatosLista } from "@/components/portal/contatos/ContatosLista";
import { useMutacoesContatos } from "@/components/portal/contatos/useMutacoesContatos";
import { SemSite } from "@/components/portal/site/SemSite";
import { useEmpresaPortal } from "@/hooks/useEmpresaPortal";
import { useSitesPortal } from "@/hooks/useSitesPortal";
import { chavesContatos, contatosDoSite, type FiltroContatos } from "@/lib/contatosSite";

const busca = z.object({ aba: z.enum(["esperando", "todos"]).optional().catch(undefined) });

export const Route = createFileRoute("/portal/clientes/contatos")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Contatos · Painel Fora do Papel" }] }),
  component: Contatos,
});

/** Contatos do site (card PC-5): formulário e cliques no WhatsApp numa caixa só. */
function Contatos() {
  const sites = useSitesPortal();
  const site = sites.site;
  const pode = site?.modulos.includes("contatos") ?? false;
  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo="Clientes"
        titulo="Contatos"
        texto="Quem procurou você pelo site: formulários e cliques no WhatsApp, juntos."
      />
      {sites.carregando ? (
        <SemSite motivo="carregando" />
      ) : sites.falhou ? (
        <SemSite motivo="erro" aoTentarDeNovo={sites.tentarDeNovo} />
      ) : !site ? (
        <SemSite motivo="sem-site" />
      ) : !pode ? (
        <SemSite motivo="sem-modulo" modulo="Contatos" />
      ) : (
        <Caixa siteId={site.id} />
      )}
    </div>
  );
}

function Caixa({ siteId }: { siteId: string }) {
  const { aba = "esperando" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const empresa = useEmpresaPortal();
  const q = useQuery({
    queryKey: chavesContatos.lista(siteId, aba),
    queryFn: () => contatosDoSite(siteId, aba),
  });
  const { respondido } = useMutacoesContatos(siteId);
  const [aberto, setAberto] = useState<string | null>(null);
  const contato = q.data?.itens.find((c) => c.id === aberto) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Abas<FiltroContatos>
        rotulo="Contatos"
        ativa={aba}
        aoEscolher={(a) =>
          void navigate({ search: { aba: a === "esperando" ? undefined : a }, replace: true })
        }
        opcoes={[
          { id: "esperando", rotulo: "Esperando resposta", contagem: q.data?.contagem.esperando },
          { id: "todos", rotulo: "Todos", contagem: q.data?.contagem.todos },
        ]}
      />
      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os contatos"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !q.data ? (
        <div className="h-60 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : q.data.itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {aba === "esperando"
            ? "Nenhum contato esperando. Quando chegar um novo, ele aparece aqui."
            : "Nenhum contato ainda. Quando alguém escrever pelo site, aparece aqui."}
        </p>
      ) : (
        <ContatosLista itens={q.data.itens} aoAbrir={(c) => setAberto(c.id)} />
      )}
      <ContatoPainel
        c={contato}
        empresa={empresa.data?.empresa ?? ""}
        aoFechar={() => setAberto(null)}
        aoMarcar={(id, r) => respondido.mutate({ id, respondido: r })}
      />
    </div>
  );
}
