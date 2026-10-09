import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/portal/aprovacoes")({
  head: () => ({ meta: [{ title: "Aprovações · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Aprovações" />,
});
