import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Relatórios" />,
});
