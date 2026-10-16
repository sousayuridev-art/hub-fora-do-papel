import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Financeiro"
      descricao="Parcelas das propostas aceitas, mensalidades e o que entra no mês (card S4)."
      enquantoIsso="os valores fechados aparecem na etapa Fechado do funil e nas propostas aceitas."
    />
  ),
});
