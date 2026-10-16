import { cn } from "@/lib/utils";

/** Grupo de opções em pílulas (Simples · Média · Alta). */
export function Opcoes<T extends number | string>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
  bloqueado,
}: {
  rotulo: string;
  opcoes: { id: T; rotulo: string }[];
  valor: T;
  aoEscolher: (v: T) => void;
  bloqueado?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[14px] font-medium">{rotulo}</legend>
      <div className="flex gap-1 rounded-xl bg-coluna p-1">
        {opcoes.map((o) => (
          <button
            key={String(o.id)}
            type="button"
            aria-pressed={valor === o.id}
            disabled={bloqueado}
            onClick={() => aoEscolher(o.id)}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-2 text-[14px] transition-colors",
              valor === o.id
                ? "bg-white font-semibold text-hub-tinta shadow-[0_1px_2px_rgba(14,16,19,0.08)]"
                : "text-hub-suave hover:text-hub-tinta",
            )}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
