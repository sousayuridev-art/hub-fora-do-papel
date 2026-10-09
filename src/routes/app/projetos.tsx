import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/projetos")({
  head: () => ({ meta: [{ title: "Projetos · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Projetos" />,
});
