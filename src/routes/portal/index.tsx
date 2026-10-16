import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "Início · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Início"
      descricao="Aqui você vai acompanhar o seu projeto: fases, o que precisa da sua aprovação e os próximos passos."
      enquantoIsso="fale com o seu responsável pelo WhatsApp."
    />
  ),
});
