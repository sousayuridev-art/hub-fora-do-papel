import { SlidersHorizontal } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { cn } from "@/lib/utils";

export type OrigemMaterial = "todas" | "nosso" | "cliente";

const origens: { id: OrigemMaterial; rotulo: string }[] = [
  { id: "todas", rotulo: "Tudo" },
  { id: "nosso", rotulo: "Nossos" },
  { id: "cliente", rotulo: "Do cliente" },
];

/** Botão "Filtros" (card RD-7): cliente e origem, os filtros que não são categoria nem busca. */
export function MateriaisFiltros({
  clientes,
  cliente,
  aoCliente,
  origem,
  aoOrigem,
}: {
  clientes: [string, string][];
  cliente: string | undefined;
  aoCliente: (id: string | undefined) => void;
  origem: OrigemMaterial;
  aoOrigem: (o: OrigemMaterial) => void;
}) {
  const ativos = (cliente ? 1 : 0) + (origem !== "todas" ? 1 : 0);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn(classeBotaoSecundario, "h-12 shrink-0")}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filtros
          {ativos > 0 && (
            <span className="rounded-md bg-hub-tinta px-1.5 font-rotulo text-[12.5px] tabular-nums text-white">
              {ativos}
              <span className="sr-only"> ativos</span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-[min(320px,calc(100vw-32px))] flex-col gap-4 rounded-2xl border-hub-borda bg-white p-4 text-hub-tinta"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13.5px] text-hub-suave">Cliente</span>
          <select
            value={cliente ?? ""}
            onChange={(e) => aoCliente(e.target.value || undefined)}
            className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base md:text-[15px]"
          >
            <option value="">Todos os clientes</option>
            {clientes.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13.5px] text-hub-suave">Quem mandou</legend>
          <div className="flex gap-1 rounded-xl bg-coluna p-1">
            {origens.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={origem === o.id}
                onClick={() => aoOrigem(o.id)}
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-center rounded-lg px-2 text-[14px] transition-colors",
                  origem === o.id
                    ? "bg-white font-semibold shadow-[0_1px_2px_rgba(14,16,19,0.08)]"
                    : "text-hub-suave hover:text-hub-tinta",
                )}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
        </fieldset>
        {ativos > 0 && (
          <button
            type="button"
            onClick={() => {
              aoCliente(undefined);
              aoOrigem("todas");
            }}
            className={`${classeAcaoTexto} self-start`}
          >
            Limpar filtros
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
