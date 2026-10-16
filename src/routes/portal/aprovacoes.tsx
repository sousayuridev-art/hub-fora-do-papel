import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/portal/aprovacoes")({
  head: () => ({ meta: [{ title: "Aprovações · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Aprovações"
      descricao="As entregas do seu projeto chegam aqui para você ver e aprovar."
      enquantoIsso="as aprovações são feitas com o seu responsável pelo WhatsApp."
    />
  ),
});
