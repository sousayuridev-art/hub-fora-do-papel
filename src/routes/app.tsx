import { createFileRoute, Outlet } from "@tanstack/react-router";

import { OperatorLayout } from "@/components/layout/OperatorLayout";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { fecharEspelho, lerEspelho } from "@/lib/espelho";
import { exigirPapel } from "@/lib/acesso";

/** Área do operador (/app). Só o dono do tenant entra; roda só no navegador por causa da sessão. */
export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: ({ context, location }) => {
    // Voltar ao Hub por qualquer caminho encerra o "Ver como o cliente" (RD2-8): no Hub nada é barrado
    if (lerEspelho()) {
      fecharEspelho();
      context.queryClient.clear();
    }
    return exigirPapel(context.queryClient, "owner", location.href);
  },
  pendingComponent: () => <TelaCarregando />,
  component: () => (
    <OperatorLayout>
      <Outlet />
    </OperatorLayout>
  ),
});
