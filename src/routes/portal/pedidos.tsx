import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/portal/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Pedidos"
      descricao="Aqui você vai pedir ajustes e acompanhar cada pedido."
      enquantoIsso="mande o pedido ao seu responsável pelo WhatsApp."
    />
  ),
});
