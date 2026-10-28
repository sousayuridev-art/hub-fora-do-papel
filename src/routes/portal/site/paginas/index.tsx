import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, MessageSquarePlus } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { FazerPedidoPainel } from "@/components/portal/FazerPedidoPainel";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { SemSite } from "@/components/portal/site/SemSite";
import { useMutacoesPortal } from "@/components/portal/useMutacoesPortal";
import { useSitesPortal } from "@/hooks/useSitesPortal";
import { diaMes } from "@/lib/formatar";
import { chavesPaginas, paginasDoSite } from "@/lib/paginasCliente";

export const Route = createFileRoute("/portal/site/paginas/")({
  head: () => ({ meta: [{ title: "Páginas · Painel Fora do Papel" }] }),
  component: Paginas,
});

/** Páginas do site (card PC-4): abrir para editar na própria página; página nova é pedido de ajuste. */
function Paginas() {
  const sites = useSitesPortal();
  const site = sites.site;
  const m = useMutacoesPortal();
  const [pedindo, setPedindo] = useState(false);
  const pode = site?.modulos.includes("paginas") ?? false;
  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo="Meu site"
        titulo="Páginas"
        texto="Abra uma página, toque no texto ou na foto e edite ali mesmo. Publicou, o site muda."
        acao={
          pode && (
            <button
              type="button"
              onClick={() => setPedindo(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-hub-borda bg-white px-5 text-[15px] font-semibold hover:bg-hub-fundo max-md:w-full"
            >
              <MessageSquarePlus className="size-4" aria-hidden="true" /> Pedir página nova
            </button>
          )
        }
      />
      {sites.carregando ? (
        <SemSite motivo="carregando" />
      ) : sites.falhou ? (
        <SemSite motivo="erro" aoTentarDeNovo={sites.tentarDeNovo} />
      ) : !site ? (
        <SemSite motivo="sem-site" />
      ) : !pode ? (
        <SemSite motivo="sem-modulo" modulo="Editar páginas" />
      ) : (
        <Lista siteId={site.id} dominio={site.dominio} aoPedir={() => setPedindo(true)} />
      )}
      <FazerPedidoPainel
        aberto={pedindo}
        aoMudar={setPedindo}
        aoEnviar={(v) => m.pedido.mutateAsync(v)}
        origem={site ? { siteId: site.id, contexto: { pagina: "Página nova" } } : undefined}
      />
    </div>
  );
}

function Lista({
  siteId,
  dominio,
  aoPedir,
}: {
  siteId: string;
  dominio: string;
  aoPedir: () => void;
}) {
  const q = useQuery({
    queryKey: chavesPaginas.doSite(siteId),
    queryFn: () => paginasDoSite(siteId),
  });
  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar as páginas"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data) return <div className="h-60 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  // Site que ainda não migrou: a Fora do Papel ainda não montou as páginas aqui
  const liberadas = q.data.filter((p) => p.publicado_em);
  if (liberadas.length === 0)
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-hub-borda bg-white p-6">
        <p className="text-[15.5px]">
          Para editar as páginas do seu site por aqui, a Fora do Papel ainda precisa prepará-las.
          Até lá, peça a mudança e a gente faz.
        </p>
        <button
          type="button"
          onClick={aoPedir}
          className="inline-flex h-12 items-center rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white max-sm:w-full max-sm:justify-center"
        >
          Pedir um ajuste
        </button>
      </div>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {liberadas.map((p) => (
        <li key={p.id}>
          <Link
            to="/portal/site/paginas/$id"
            params={{ id: p.id }}
            className="flex min-h-[88px] items-center gap-4 rounded-2xl border border-hub-borda bg-white p-4 hover:border-hub-tinta"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-hub-fundo">
              <FileText className="size-5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[16px] font-semibold">{p.nome}</span>
              <span className="truncate text-[13.5px] text-hub-suave">
                {dominio}
                {p.caminho === "/" ? "" : p.caminho}
              </span>
              <span className="flex items-center gap-1.5 text-[13px] text-[#145A37]">
                <span aria-hidden="true" className="size-2 rounded-full bg-[#3BB273]" />
                No ar{p.publicado_em ? ` · publicada em ${diaMes(p.publicado_em)}` : ""}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-hub-suave" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
