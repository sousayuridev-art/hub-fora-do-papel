import { forwardRef } from "react";
import { TriangleAlert } from "lucide-react";

/** Lista do que impede salvar ou publicar (da conferência na tela ou recusado pelo banco). */
export const AvisosDoArtigo = forwardRef<HTMLDivElement, { titulo: string; itens: string[] }>(
  function AvisosDoArtigo({ titulo, itens }, ref) {
    return (
      <div
        ref={ref}
        role="alert"
        tabIndex={-1}
        className="flex gap-3 rounded-xl border border-[#F4C7C2] bg-sit-risco p-4 text-[14.5px] text-sit-risco-t outline-none"
      >
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-semibold">{titulo}</p>
          <ul className="list-disc space-y-1 pl-5">
            {itens.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  },
);
