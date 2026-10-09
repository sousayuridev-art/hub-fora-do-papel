import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Pedidos" />,
});
