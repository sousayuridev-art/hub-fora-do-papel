import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Pipeline" />,
});
