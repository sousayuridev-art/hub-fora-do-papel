import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EditorPagina } from "@/components/editor/EditorPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FazerPedidoPainel } from "@/components/portal/FazerPedidoPainel";
import { useMutacoesPortal } from "@/components/portal/useMutacoesPortal";
import { useSitesPortal } from "@/hooks/useSitesPortal";
import { buscarPagina, chavesPaginas, secoesDoSite } from "@/lib/paginasCliente";
import type { ContextoPedido } from "@/lib/pedidos";

export const Route = createFileRoute("/portal/site/paginas/$id")({
  head: () => ({ meta: [{ title: "Editar página · Painel Fora do Papel" }] }),
  component: EditarPagina,
});

/** Editor de página do cliente (card PC-4), em tela cheia. */
function EditarPagina() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();
  const { site } = useSitesPortal();
  const m = useMutacoesPortal();
  const [pedido, setPedido] = useState<ContextoPedido | null>(null);
  const pagina = useQuery({
    queryKey: chavesPaginas.pagina(id),
    queryFn: () => buscarPagina(id),
    // O editor guarda a própria cópia; não recarrega por baixo enquanto a pessoa edita
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const secoes = useQuery({
    queryKey: chavesPaginas.secoes(pagina.data?.site_id ?? ""),
    queryFn: () => secoesDoSite(pagina.data?.site_id ?? ""),
    enabled: Boolean(pagina.data),
  });
  const voltar = () => void navigate({ to: "/portal/site/paginas" });

  if (pagina.isError || secoes.isError)
    return (
      <EstadoErro
        titulo="Não foi possível abrir a página"
        aoTentarDeNovo={() => void (pagina.isError ? pagina.refetch() : secoes.refetch())}
      />
    );
  if (!pagina.data || !secoes.data || !site)
    return <div className="h-[60dvh] animate-pulse rounded-2xl bg-white" aria-busy="true" />;

  return (
    <>
      <EditorPagina
        key={`${pagina.data.id}-${pagina.dataUpdatedAt}`}
        pagina={pagina.data}
        site={{ id: site.id, dominio: site.dominio }}
        secoes={secoes.data}
        aoVoltar={voltar}
        aoRecarregar={() => void pagina.refetch()}
        aoPedirAjuste={setPedido}
      />
      <FazerPedidoPainel
        aberto={pedido !== null}
        aoMudar={(v) => !v && setPedido(null)}
        aoEnviar={(v) => m.pedido.mutateAsync(v)}
        origem={pedido ? { siteId: site.id, contexto: pedido } : undefined}
      />
    </>
  );
}
