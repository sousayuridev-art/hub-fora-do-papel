import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/portal/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Pagamentos"
      descricao="Parcelas, mensalidade e comprovantes num lugar só."
      enquantoIsso="as cobranças são combinadas com o seu responsável."
    />
  ),
});
