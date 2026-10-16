import { createFileRoute } from "@tanstack/react-router";

import { EmConstrucao } from "@/components/paginas/EmConstrucao";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · Hub Fora do Papel" }] }),
  component: () => (
    <EmConstrucao
      titulo="Relatórios"
      descricao="Conversão por etapa, motivos de perda, tempo até o aceite e previsão de fechamento (card S7)."
      enquantoIsso="o Painel, o funil e a tela de Tráfego pago já mostram os números principais."
    />
  ),
});
