import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/portal/arquivos")({
  head: () => ({ meta: [{ title: "Arquivos · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Arquivos"
      descricao="Contrato, comprovantes e materiais do projeto para baixar quando precisar."
      enquantoIsso="o comprovante do aceite fica no mesmo link da proposta."
    />
  ),
});
