import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/clientes")({
  head: () => ({ meta: [{ title: "Clientes · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Clientes" />,
});
