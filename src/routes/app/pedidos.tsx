import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Pedidos"
      descricao="Pedidos de ajuste e serviços adicionais dos clientes, com valor aprovado antes de começar (card S3)."
      enquantoIsso="registre o pedido como anotação na ficha do cliente."
    />
  ),
});
