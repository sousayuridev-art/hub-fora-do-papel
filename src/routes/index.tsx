import { createFileRoute, redirect } from "@tanstack/react-router";

import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { carregarAcesso, inicioDoPapel } from "@/lib/acesso";

/** Raiz: manda cada pessoa para a sua área. */
export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { session, acesso } = await carregarAcesso(context.queryClient);
    if (!session) throw redirect({ to: "/entrar" });
    throw redirect({ to: acesso?.papel ? inicioDoPapel[acesso.papel] : "/sem-acesso" });
  },
  pendingComponent: Redirecionando,
  component: Redirecionando,
});

function Redirecionando() {
  return <TelaCarregando />;
}
