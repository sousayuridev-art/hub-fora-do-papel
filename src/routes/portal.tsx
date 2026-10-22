import { createFileRoute, Outlet } from "@tanstack/react-router";

import { FonteCliente, linkGeist } from "@/components/layout/FonteCliente";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { exigirPapel } from "@/lib/acesso";
import { previaDoLink } from "@/lib/enderecoPublico";

/** Portal do cliente (/portal). Só quem tem papel de cliente entra. */
export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: previaDoLink(
      "Seu portal do projeto",
      "Acompanhe o projeto, aprove cada entrega e fale com o responsável. Fora do Papel.",
      "portal",
    ),
    links: [linkGeist],
  }),
  beforeLoad: ({ context, location }) => exigirPapel(context.queryClient, "client", location.href),
  pendingComponent: () => (
    <FonteCliente>
      <TelaCarregando />
    </FonteCliente>
  ),
  component: () => (
    <FonteCliente>
      <PortalLayout>
        <Outlet />
      </PortalLayout>
    </FonteCliente>
  ),
});
