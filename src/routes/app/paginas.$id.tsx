import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EditorPagina } from "@/components/editor/EditorPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { buscarPagina, chavesPaginas } from "@/lib/paginasCliente";
import { chavesSitesCliente, sitesDoHub } from "@/lib/sitesCliente";

export const Route = createFileRoute("/app/paginas/$id")({
  head: () => ({ meta: [{ title: "Editar página · Hub Fora do Papel" }] }),
  component: EditarPaginaHub,
});

/**
 * Editor de página no Hub (card PC-4): mesmo editor do cliente, com todas as seções e sem travas.
 * A primeira publicação do Yuri é o que libera a página para o cliente.
 */
function EditarPaginaHub() {
  const { id } = Route.useParams();
  const pagina = useQuery({
    queryKey: chavesPaginas.pagina(id),
    queryFn: () => buscarPagina(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const sites = useQuery({ queryKey: chavesSitesCliente.hub, queryFn: sitesDoHub });
  const site = sites.data?.find((s) => s.id === pagina.data?.site_id);
  const navigate = Route.useNavigate();
  const voltar = () =>
    site?.client_id
      ? void navigate({ to: "/app/clientes/$id", params: { id: site.client_id } })
      : void navigate({ to: "/app/site" });

  if (pagina.isError || sites.isError)
    return (
      <EstadoErro
        titulo="Não foi possível abrir a página"
        aoTentarDeNovo={() => void (pagina.isError ? pagina.refetch() : sites.refetch())}
      />
    );
  if (!pagina.data || !site)
    return <div className="h-[60dvh] animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  return (
    <EditorPagina
      key={`${pagina.data.id}-${pagina.dataUpdatedAt}`}
      pagina={pagina.data}
      site={{ id: site.id, dominio: site.dominio }}
      secoes="todas"
      aoVoltar={voltar}
      aoRecarregar={() => void pagina.refetch()}
    />
  );
}
