import { cn } from "@/lib/utils";

/** Filtros em pílulas com contagem (Todos 10 · Este mês 5 …). */
export function FiltrosChip<T extends string>({
  rotulo,
  opcoes,
  ativo,
  aoEscolher,
}: {
  rotulo: string;
  opcoes: { id: T; rotulo: string; contagem?: number | undefined; cor?: string | undefined }[];
  ativo: T;
  aoEscolher: (id: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:self-start sm:rounded-xl sm:bg-coluna sm:p-1"
    >
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={ativo === o.id}
          onClick={() => aoEscolher(o.id)}
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3.5 text-[14.5px] transition-colors sm:min-h-10",
            ativo === o.id
              ? "bg-white font-semibold text-hub-tinta shadow-[0_1px_2px_rgba(14,16,19,0.08)]"
              : "text-hub-suave hover:text-hub-tinta max-sm:border max-sm:border-hub-borda max-sm:bg-white",
          )}
        >
          {o.cor && (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: o.cor }}
            />
          )}
          {o.rotulo}
          {o.contagem !== undefined && (
            <span
              className={cn(
                "rounded-md px-1.5 font-rotulo text-[12.5px] tabular-nums",
                ativo === o.id ? "bg-hub-tinta text-white" : "bg-[#E1E1DA] text-hub-tinta",
              )}
            >
              {o.contagem}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
