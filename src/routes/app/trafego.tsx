import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/trafego")({
  head: () => ({ meta: [{ title: "Tráfego pago · Hub Fora do Papel" }] }),
  component: () => <EmConstrucao titulo="Tráfego pago" />,
});
