import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/propostas")({
  head: () => ({ meta: [{ title: "Propostas · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Propostas" />,
});
