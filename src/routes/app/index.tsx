import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Painel · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Painel" />,
});
