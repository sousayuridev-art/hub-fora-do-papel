import { cn } from "@/lib/utils";

/** Ficha de atalho de prazo (Atrasadas 4, Hoje 3, Esta semana 5). Clicar de novo desliga. */
export function AtalhoPrazo({
  rotulo,
  contagem,
  ativo,
  risco = false,
  aoClicar,
  className,
}: {
  rotulo: string;
  contagem: number | undefined;
  ativo: boolean;
  risco?: boolean;
  aoClicar: () => void;
  className?: string | undefined;
}) {
  const alerta = risco && (contagem ?? 0) > 0;
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoClicar}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] transition-colors md:h-10",
        ativo
          ? alerta
            ? "border-sit-risco-t bg-sit-risco-t font-semibold text-white"
            : "border-hub-tinta bg-hub-tinta font-semibold text-white"
          : alerta
            ? "border-[#F3D3CF] bg-sit-risco font-semibold text-sit-risco-t"
            : "border-[#DADAD3] bg-white text-hub-tinta hover:bg-hub-selecao",
        className,
      )}
    >
      {rotulo}
      {contagem !== undefined && <span className="tabular-nums">{contagem}</span>}
    </button>
  );
}
