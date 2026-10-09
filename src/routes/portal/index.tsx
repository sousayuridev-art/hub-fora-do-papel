import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "Início · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Início" />,
});
