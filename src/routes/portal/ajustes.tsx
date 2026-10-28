import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Abas } from "@/components/hub/Abas";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { SaudeSite } from "@/components/portal/SaudeSite";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { AbaEquipe } from "@/components/portal/ajustes/AbaEquipe";
import { AbaGoogle } from "@/components/portal/ajustes/AbaGoogle";
import { AbaNegocio } from "@/components/portal/ajustes/AbaNegocio";
import { useMutacoesAjustes } from "@/components/portal/ajustes/useMutacoesAjustes";
import { SemSite } from "@/components/portal/site/SemSite";
import { useSitesPortal } from "@/hooks/useSitesPortal";
import { ajustesDoSite, chavesAjustes } from "@/lib/ajustesSite";
import type { SitePortal } from "@/lib/sitesCliente";

type Aba = "negocio" | "google" | "equipe" | "site";
const busca = z.object({
  aba: z.enum(["negocio", "google", "equipe", "site"]).optional().catch(undefined),
});

export const Route = createFileRoute("/portal/ajustes")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Ajustes · Painel Fora do Papel" }] }),
  component: Ajustes,
});

/** Ajustes (card PC-6): dados do negócio, Google, equipe e o site. */
function Ajustes() {
  const sites = useSitesPortal();
  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo="Ajustes"
        titulo="Ajustes"
        texto="Dados do negócio, como o site aparece no Google, quem tem acesso e o seu site."
      />
      {sites.carregando ? (
        <SemSite motivo="carregando" />
      ) : sites.falhou ? (
        <SemSite motivo="erro" aoTentarDeNovo={sites.tentarDeNovo} />
      ) : !sites.site ? (
        <SemSite motivo="sem-site" />
      ) : (
        <Conteudo site={sites.site} />
      )}
    </div>
  );
}

function Conteudo({ site }: { site: SitePortal }) {
  const { aba = "negocio" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({
    queryKey: chavesAjustes.doSite(site.id),
    queryFn: () => ajustesDoSite(site.id),
  });
  const m = useMutacoesAjustes(site.id);
  return (
    <div className="flex flex-col gap-6">
      <Abas<Aba>
        rotulo="Ajustes"
        ativa={aba}
        aoEscolher={(a) =>
          void navigate({ search: { aba: a === "negocio" ? undefined : a }, replace: true })
        }
        opcoes={[
          { id: "negocio", rotulo: "Seu negócio" },
          { id: "google", rotulo: "Aparecer no Google" },
          { id: "equipe", rotulo: "Equipe" },
          { id: "site", rotulo: "Seu site" },
        ]}
      />
      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os ajustes"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !q.data ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : aba === "negocio" ? (
        <AbaNegocio
          inicial={q.data.negocio}
          salvando={m.negocio.isPending}
          aoSalvar={(n) => m.negocio.mutate(n)}
        />
      ) : aba === "google" ? (
        <AbaGoogle
          inicial={q.data.google}
          dominio={q.data.dominio}
          salvando={m.google.isPending}
          aoSalvar={(g) => m.google.mutate(g)}
        />
      ) : aba === "equipe" ? (
        <AbaEquipe equipe={q.data.equipe} />
      ) : (
        <div className="flex max-w-xl flex-col gap-4">
          <div className="rounded-2xl border border-hub-borda bg-white p-5">
            <p className="text-[13.5px] text-hub-suave">Endereço do site</p>
            <a
              href={`https://${q.data.dominio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex min-h-11 items-center text-[17px] font-semibold text-[#1E3FA8] underline"
            >
              {q.data.dominio}
            </a>
            <p className="mt-2 text-[13.5px] text-hub-suave">
              Domínio e e-mail ficam com a Fora do Papel. Para mudar, faça um pedido de ajuste.
            </p>
          </div>
          <SaudeSite site={site} />
        </div>
      )}
    </div>
  );
}
