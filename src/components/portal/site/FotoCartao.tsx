import { AlertCircle } from "lucide-react";

import type { FotoSite } from "@/lib/fotosSite";

/** Miniatura da grade: a foto, a descrição (ou o aviso de que falta) e onde é usada. */
export function FotoCartao({ foto, aoAbrir }: { foto: FotoSite; aoAbrir: () => void }) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={aoAbrir}
        className="flex w-full flex-col overflow-hidden rounded-2xl border border-hub-borda bg-white text-left hover:border-hub-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta"
      >
        <span className="block aspect-[4/3] w-full bg-hub-fundo">
          <img
            src={foto.url}
            alt={foto.descricao ?? ""}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        </span>
        <span className="flex min-h-[64px] flex-col gap-1 p-3">
          {foto.descricao ? (
            <span className="line-clamp-2 text-[14px]">{foto.descricao}</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-sit-atencao-t">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> Sem descrição
            </span>
          )}
          <span className="text-[13px] text-hub-suave">
            {foto.usos.length === 0
              ? "Não usada"
              : foto.usos.length === 1
                ? "Usada em 1 lugar"
                : `Usada em ${foto.usos.length} lugares`}
          </span>
        </span>
      </button>
    </li>
  );
}
