import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/projetos")({
  head: () => ({ meta: [{ title: "Projetos · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Projetos"
      descricao="Cada proposta aceita vira um projeto, com fases, entregas e aprovações do cliente (card S3)."
      enquantoIsso="as propostas aceitas ficam em Propostas › Aceitas, e o próximo passo de cada cliente aparece no Painel."
    />
  ),
});
