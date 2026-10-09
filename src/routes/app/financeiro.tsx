import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Financeiro" />,
});
