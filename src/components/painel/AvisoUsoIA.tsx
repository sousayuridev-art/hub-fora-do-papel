import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";

import { chavesMarketing, dolares, usoDaIA } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/** Regra de IA 5 (card MK-3): aos 80% do teto do mês, o Painel avisa. Abaixo disso, nada aparece. */
export function AvisoUsoIA() {
  const { data: u } = useQuery({ queryKey: chavesMarketing.usoIA, queryFn: usoDaIA });
  if (!u || u.percentual < 80) return null;
  const noTeto = u.gasto >= u.teto;
  return (
    <p
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-4 py-3 text-[14px]",
        noTeto ? "bg-sit-risco text-sit-risco-t" : "bg-sit-atencao text-sit-atencao-t",
      )}
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      <span className="tabular-nums">
        IA da Central de conteúdo: {dolares(u.gasto)} de {dolares(u.teto)} neste mês
        {noTeto ? ". O teto foi atingido e as sugestões pararam." : ` (${u.percentual}% do teto).`}
      </span>
      <Link to="/app/marketing" className="flex min-h-11 items-center font-semibold md:min-h-0">
        Ver a Central ›
      </Link>
    </p>
  );
}
