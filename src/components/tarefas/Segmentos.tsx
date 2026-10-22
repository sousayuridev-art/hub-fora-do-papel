import { cn } from "@/lib/utils";

/** Controle segmentado (uma escolha entre poucas): situação, prioridade, tipo, vista. */
export function Segmentos<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
  className,
  tomAtivo,
}: {
  rotulo: string;
  opcoes: { id: T; rotulo: string }[];
  valor: T;
  aoEscolher: (id: T) => void;
  className?: string;
  /** Cor do texto da opção ativa (ex.: prioridade alta em vermelho). */
  tomAtivo?: (id: T) => string | undefined;
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={cn("flex min-w-0 gap-1 rounded-xl bg-coluna p-1", className)}
    >
      {opcoes.map((o) => {
        const sel = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={sel}
            onClick={() => !sel && aoEscolher(o.id)}
            className={cn(
              "flex min-h-11 min-w-0 flex-auto items-center justify-center rounded-lg px-2.5 text-[14px] transition-colors md:min-h-10",
              sel
                ? cn(
                    "bg-white font-semibold shadow-[0_1px_2px_rgba(14,16,19,0.08)]",
                    tomAtivo?.(o.id) ?? "text-hub-tinta",
                  )
                : "text-[#4A4D54] hover:text-hub-tinta",
            )}
          >
            <span className="truncate">{o.rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
