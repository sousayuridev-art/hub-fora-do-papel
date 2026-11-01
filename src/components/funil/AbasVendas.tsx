import { useNavigate } from "@tanstack/react-router";

import { Abas } from "@/components/hub/Abas";

/**
 * Vendas em uma área só (RD2-2): oportunidades (quadro) e propostas (documentos),
 * como abas da mesma página no menu "Vendas".
 */
export function AbasVendas({
  ativa,
  propostas,
}: {
  ativa: "oportunidades" | "propostas";
  /** Quantidade de propostas em negociação (opcional). */
  propostas?: number | undefined;
}) {
  const navigate = useNavigate();
  return (
    <Abas
      rotulo="Vendas"
      ativa={ativa}
      opcoes={[
        { id: "oportunidades", rotulo: "Oportunidades" },
        { id: "propostas", rotulo: "Propostas", contagem: propostas },
      ]}
      aoEscolher={(id) => {
        if (id === ativa) return;
        void navigate({ to: id === "propostas" ? "/app/propostas" : "/app/pipeline" });
      }}
    />
  );
}
