import { useNavigate } from "@tanstack/react-router";

import type { AcaoRapida } from "@/components/layout/navegacao";

/** Para onde cada ação rápida leva (Início e botão "Criar"). */
export function useAbrirAcao(aoPedir: () => void) {
  const navigate = useNavigate();
  return (a: AcaoRapida) => {
    if (a.id === "artigo")
      void navigate({ to: "/portal/site/artigos", search: { artigo: "novo" } });
    else if (a.id === "capa") void navigate({ to: "/portal/site/paginas" });
    else if (a.id === "horario") void navigate({ to: "/portal/ajustes" });
    else aoPedir();
  };
}
