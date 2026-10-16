import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/materiais")({
  head: () => ({ meta: [{ title: "Materiais · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Materiais"
      descricao="Modelos, guias para clientes e textos prontos num lugar só. Chega com os projetos (card S3)."
      enquantoIsso="os modelos ficam no manual de comunicação."
    />
  ),
});
