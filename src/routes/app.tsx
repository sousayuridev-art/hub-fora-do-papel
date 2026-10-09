import { createFileRoute, Outlet } from "@tanstack/react-router";

import { OperatorLayout } from "@/components/layout/OperatorLayout";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { exigirPapel } from "@/lib/acesso";

/** Área do operador (/app). Só o dono do tenant entra; roda só no navegador por causa da sessão. */
export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: ({ context, location }) =>
    exigirPapel(context.queryClient, "owner", location.pathname),
  pendingComponent: () => <TelaCarregando />,
  component: () => (
    <OperatorLayout>
      <Outlet />
    </OperatorLayout>
  ),
});
