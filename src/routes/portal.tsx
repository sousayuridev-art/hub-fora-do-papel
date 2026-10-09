import { createFileRoute, Outlet } from "@tanstack/react-router";

import { PortalLayout } from "@/components/layout/PortalLayout";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { exigirPapel } from "@/lib/acesso";

/** Portal do cliente (/portal). Só quem tem papel de cliente entra. */
export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: ({ context, location }) =>
    exigirPapel(context.queryClient, "client", location.pathname),
  pendingComponent: () => <TelaCarregando />,
  component: () => (
    <PortalLayout>
      <Outlet />
    </PortalLayout>
  ),
});
