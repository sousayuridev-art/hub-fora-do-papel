import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/portal/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Pagamentos" />,
});
